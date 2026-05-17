/**
 * ISLToText — live ISL recognition using MediaPipe HandLandmarker +
 * a nearest-neighbour classifier over the reference landmarks extracted
 * by `img_to_handsign/extract_landmarks.py` (e.g. numbers 1-9).
 *
 * Pipeline per frame:
 *   1. MediaPipe HandLandmarker → 21 world-space landmarks of the live hand.
 *   2. Normalize (centroid-subtract + L2-normalize) to a 63-dim unit vector.
 *   3. Cosine-similarity match against every reference vector.
 *   4. Also compare the x-mirrored live vector so left/right hand both work.
 *   5. EMA confidence smoothing + motion gate + rolling-buffer majority vote.
 *   6. Confirmed labels go to the UI / speech synthesis.
 */

import { useState, useRef, useEffect } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { motion, AnimatePresence } from 'framer-motion'
import { publicAsset } from '../publicAsset'
import './ISLToText.css'

interface ISLToTextProps {
  onBack?: () => void
}

// ─── Easing ───────────────────────────────────────────────────────
const ease = [0.22, 0.61, 0.36, 1] as const

// ─── Variants ────────────────────────────────────────────────────
const sectionVariants = (delay = 0) => ({
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.45, delay, ease } }
})

// ─── Landmark types & helpers ─────────────────────────────────────
type LM = { x: number; y: number; z: number }

interface RefRecord {
  className: string
  vec: Float32Array          // 63-dim L2-normalized, centroid-centered
}

const smoothLandmarks = (curr: LM[], prev: LM[] | null, alpha: number): LM[] => {
  if (!prev || prev.length !== curr.length) return curr
  return curr.map((c, i) => ({
    x: alpha * c.x + (1 - alpha) * prev[i].x,
    y: alpha * c.y + (1 - alpha) * prev[i].y,
    z: alpha * c.z + (1 - alpha) * prev[i].z,
  }))
}

/** RMS displacement across all 21 landmarks between two frames. */
const computeVelocity = (curr: LM[], prev: LM[] | null): number => {
  if (!prev || prev.length === 0) return 0
  let sum = 0
  for (let i = 0; i < curr.length; i++) {
    const dx = curr[i].x - prev[i].x
    const dy = curr[i].y - prev[i].y
    sum += dx * dx + dy * dy
  }
  return Math.sqrt(sum / curr.length)
}

/**
 * Convert 21 landmarks into a 63-D unit vector that's invariant to:
 *   - hand position (subtract centroid)
 *   - hand size     (divide by L2 norm)
 * Returns null if the input is malformed.
 */
const buildFeatureVector = (lms: LM[]): Float32Array | null => {
  if (!lms || lms.length !== 21) return null
  let cx = 0, cy = 0, cz = 0
  for (const lm of lms) { cx += lm.x; cy += lm.y; cz += lm.z }
  cx /= 21; cy /= 21; cz /= 21

  const vec = new Float32Array(63)
  let norm = 0
  for (let i = 0; i < 21; i++) {
    const x = lms[i].x - cx
    const y = lms[i].y - cy
    const z = lms[i].z - cz
    vec[i * 3]     = x
    vec[i * 3 + 1] = y
    vec[i * 3 + 2] = z
    norm += x * x + y * y + z * z
  }
  norm = Math.sqrt(norm) + 1e-8
  for (let i = 0; i < 63; i++) vec[i] /= norm
  return vec
}

/** Cosine similarity of two unit-length 63-vectors (∈ [-1, 1]). */
const cosineSim = (a: Float32Array, b: Float32Array): number => {
  let dot = 0
  for (let i = 0; i < 63; i++) dot += a[i] * b[i]
  return dot
}

/** Return a new vector with every x-coordinate flipped — used so that the
 *  classifier works regardless of whether the user uses their left or right hand. */
const mirrorX = (v: Float32Array): Float32Array => {
  const out = new Float32Array(63)
  for (let i = 0; i < 21; i++) {
    out[i * 3]     = -v[i * 3]
    out[i * 3 + 1] =  v[i * 3 + 1]
    out[i * 3 + 2] =  v[i * 3 + 2]
  }
  return out
}

// ─── Reference landmark database ──────────────────────────────────
// Loaded synchronously at module init via Vite's eager glob import.
// Add more JSON files (e.g. alphabets) to expand the recognizable vocabulary.
interface RefJson {
  class: string
  world_landmarks?: LM[] | null
  image_landmarks?: LM[]
}

const refNumberModules = import.meta.glob<RefJson>(
  '../../img_to_handsign/numbers/*.json',
  { eager: true, import: 'default' }
)
const refAlphabetModules = import.meta.glob<RefJson>(
  '../../img_to_handsign/alphabets/*.json',
  { eager: true, import: 'default' }
)

const REFERENCES: RefRecord[] = [
  ...Object.values(refNumberModules),
  ...Object.values(refAlphabetModules),
]
  .map((data) => {
    const lms = data.world_landmarks ?? data.image_landmarks
    if (!lms) return null
    const vec = buildFeatureVector(lms)
    if (!vec) return null
    return { className: String(data.class), vec }
  })
  .filter((r): r is RefRecord => r !== null)
  .sort((a, b) =>
    a.className.localeCompare(b.className, undefined, { numeric: true })
  )

export const ISLToText = ({ onBack }: ISLToTextProps) => {
  // ── UI state ─────────────────────────────────────────────────────
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [recognizedText, setRecognizedText] = useState<string>('')
  const [transcript, setTranscript]         = useState<string>('')
  const [modelStatus, setModelStatus]       = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [detectionState, setDetectionState] = useState<'waiting' | 'scanning' | 'moving' | 'locking' | 'locked'>('waiting')
  const [confidence, setConfidence]         = useState(0)

  // ── Refs ──────────────────────────────────────────────────────────
  const videoRef           = useRef<HTMLVideoElement>(null)
  const streamRef          = useRef<MediaStream | null>(null)
  const handLandmarkerRef  = useRef<HandLandmarker | null>(null)
  const predictIntervalRef = useRef<number | null>(null)
  const isPredictingRef    = useRef(false)
  const isCameraActiveRef  = useRef(false)

  // ── Temporal stabilisation refs ───────────────────────────────────
  const predBufferRef    = useRef<string[]>([])
  const prevLandmarksRef = useRef<LM[] | null>(null)
  const smoothConfRef    = useRef(0)
  const lastConfirmedRef = useRef({ label: '', ts: 0 })

  // ── Tuning constants ──────────────────────────────────────────────
  const mediapipeModelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
  const mediapipeWasmRoot = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'

  /** EMA alpha for landmark smoothing (higher = snappier, less smoothing). */
  const SMOOTH_ALPHA   = 0.72
  /** Per-frame motion threshold — above this, classification is paused. */
  const MOTION_THRESH  = 0.013
  /** Minimum cosine similarity to count a match as plausible (out of 1.0). */
  const CONF_THRESH    = 0.78
  /** Rolling prediction buffer size and majority-vote requirements. */
  const BUF_SIZE       = 12
  const VOTE_NEEDED    = 6
  const MIN_BUF        = 5
  /** Cooldown after a confirmed gesture (ms) to avoid duplicate triggers. */
  const COOLDOWN_MS    = 1200
  /** EMA alpha for the displayed confidence value. */
  const CONF_EMA       = 0.28

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        isCameraActiveRef.current = true
        setIsCameraActive(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    isCameraActiveRef.current = false
    predBufferRef.current     = []
    prevLandmarksRef.current  = null
    smoothConfRef.current     = 0
    setIsCameraActive(false)
    setRecognizedText('')
    setDetectionState('waiting')
    setConfidence(0)
  }

  const loadHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(mediapipeWasmRoot)
    return HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: mediapipeModelUrl },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    })
  }

  const loadModel = async () => {
    setModelStatus('loading')
    if (REFERENCES.length === 0) {
      console.error('No reference landmarks found. Run: python img_to_handsign/extract_landmarks.py --classes 1-9')
      setModelStatus('error')
      return
    }
    try {
      const hl = await loadHandLandmarker()
      handLandmarkerRef.current = hl
      setModelStatus('ready')
      console.info(`[ISLToText] HandLandmarker ready. Reference classes: ${REFERENCES.map(r => r.className).join(', ')}`)
    } catch (error) {
      console.error('Failed to load HandLandmarker:', error)
      setModelStatus('error')
    }
  }

  const predictFrame = () => {
    if (!videoRef.current || !handLandmarkerRef.current || !isCameraActiveRef.current) return
    if (videoRef.current.readyState < 2) return
    if (isPredictingRef.current) return
    isPredictingRef.current = true

    try {
      const video = videoRef.current
      const result = handLandmarkerRef.current.detectForVideo(video, performance.now())

      const imgLm   = result.landmarks?.[0]
      const worldLm = result.worldLandmarks?.[0]

      if (!imgLm || imgLm.length === 0) {
        predBufferRef.current    = []
        prevLandmarksRef.current = null
        smoothConfRef.current    = 0
        setDetectionState('waiting')
        setConfidence(0)
        return
      }

      // Smooth image landmarks for the motion-velocity gate.
      const smoothed = smoothLandmarks(imgLm, prevLandmarksRef.current, SMOOTH_ALPHA)
      const vel = computeVelocity(smoothed, prevLandmarksRef.current)
      prevLandmarksRef.current = smoothed

      if (vel > MOTION_THRESH) {
        predBufferRef.current = []
        setDetectionState('moving')
        return
      }

      // Build a normalized feature vector for nearest-neighbour matching.
      // Prefer world landmarks (size/position invariant); fall back to image lms.
      const featLm: LM[] = worldLm && worldLm.length === 21 ? worldLm : smoothed
      const live = buildFeatureVector(featLm)
      if (!live) {
        setDetectionState('scanning')
        return
      }
      const liveMirror = mirrorX(live)

      let bestSim = -Infinity
      let bestClass = ''
      for (const ref of REFERENCES) {
        const sim = Math.max(cosineSim(live, ref.vec), cosineSim(liveMirror, ref.vec))
        if (sim > bestSim) { bestSim = sim; bestClass = ref.className }
      }

      // EMA-smooth the confidence reading shown in the UI.
      const conf = Math.max(0, bestSim)
      smoothConfRef.current = CONF_EMA * conf + (1 - CONF_EMA) * smoothConfRef.current
      setConfidence(smoothConfRef.current)

      if (bestSim < CONF_THRESH) {
        predBufferRef.current = []
        setDetectionState('scanning')
        return
      }

      // Rolling buffer for temporal stability.
      const buf = predBufferRef.current
      buf.push(bestClass)
      if (buf.length > BUF_SIZE) buf.shift()
      if (buf.length < MIN_BUF) {
        setDetectionState('scanning')
        return
      }

      // Majority vote across the buffer.
      const counts: Record<string, number> = {}
      for (const p of buf) counts[p] = (counts[p] ?? 0) + 1
      const [topLabel, topCount] = Object.entries(counts).sort(
        ([, a], [, b]) => b - a
      )[0]

      if (topCount < VOTE_NEEDED) {
        setDetectionState('scanning')
        return
      }

      setDetectionState('locking')

      // Cooldown so the same gesture isn't re-fired immediately.
      const now = Date.now()
      const { label: lastLabel, ts: lastTs } = lastConfirmedRef.current
      if (topLabel === lastLabel && now - lastTs < COOLDOWN_MS) return

      lastConfirmedRef.current = { label: topLabel, ts: now }
      predBufferRef.current    = []

      setRecognizedText(topLabel)
      // Append to running transcript. Single-char labels (digits/letters)
      // concatenate; multi-char labels (phrases) get a space separator.
      setTranscript((prev) => {
        if (!prev) return topLabel
        const needsSpace = topLabel.length > 1 || prev.slice(-1) === ' '
        const lastIsMulti = prev.split(' ').slice(-1)[0].length > 1
        const sep = needsSpace || lastIsMulti ? ' ' : ''
        return prev + sep + topLabel
      })
      setDetectionState('locked')

      setTimeout(() => {
        if (isCameraActiveRef.current) setDetectionState('scanning')
      }, 900)
    } catch (err) {
      console.error('Prediction error:', err)
    } finally {
      isPredictingRef.current = false
    }
  }

  const startPredictionLoop = () => {
    if (predictIntervalRef.current) return
    predictIntervalRef.current = window.setInterval(() => predictFrame(), 100)
  }

  const stopPredictionLoop = () => {
    if (predictIntervalRef.current) {
      window.clearInterval(predictIntervalRef.current)
      predictIntervalRef.current = null
    }
  }

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'; utterance.rate = 0.9; utterance.pitch = 1; utterance.volume = 1
      window.speechSynthesis.speak(utterance)
    }
  }

  const stopSpeech = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }

  useEffect(() => {
    if (isCameraActive && modelStatus === 'ready') startPredictionLoop()
    else stopPredictionLoop()
    return () => stopPredictionLoop()
  }, [isCameraActive, modelStatus])

  useEffect(() => {
    loadModel()
    startCamera()
    return () => {
      stopCamera()
      stopPredictionLoop()
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close()
        handLandmarkerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="isl-to-text-container">
      <div className="isl-background"><div className="isl-background-overlay" /></div>

      {/* ── Neon floating accents ──────────────────────────────────── */}
      <svg className="nf isl-nf-tri" viewBox="0 0 56 49" fill="none" aria-hidden="true">
        <polygon points="28,3 53,46 3,46" stroke="#00e5ff" strokeWidth="1.5" fill="rgba(0,229,255,0.05)" strokeLinejoin="round"/>
      </svg>
      <svg className="nf isl-nf-ring" viewBox="0 0 54 54" fill="none" aria-hidden="true">
        <circle cx="27" cy="27" r="24" stroke="#ff2cf5" strokeWidth="1.2" strokeDasharray="7 5"/>
      </svg>
      <svg className="nf isl-nf-hand" viewBox="0 0 72 96" fill="none" aria-hidden="true">
        <path d="M36 88C20 88 10 75 10 62L10 44C10 39.6 13.6 36 18 36C22.4 36 26 39.6 26 44L26 62M26 40L26 18C26 13.6 29.6 10 34 10C38.4 10 42 13.6 42 18L42 60M42 18L42 14C42 9.6 45.6 6 50 6C54.4 6 58 9.6 58 14L58 52C62 48 64 44 63 40C62.4 37 65 34 68 36C71 38 72 42 69 46L56 62L56 68C56 78 47 88 36 88Z" stroke="#bf5fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      {/* ── Header ───────────────────────────────────────────────── */}
      <motion.header
        className="isl-header"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        <div className="isl-header-content">
          <div className="isl-brand">
            <img className="isl-brand-mark" src={publicAsset('logo.jpg')} alt="LinguoSign logo" />
            <div className="isl-logo">
              <h1 className="isl-logo-text">ISL to Text</h1>
              <p className="isl-subtitle">Convert Indian Sign Language to Text &amp; Speech</p>
            </div>
          </div>
          <motion.button
            className="back-button"
            onClick={onBack}
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back to Dashboard</span>
          </motion.button>
        </div>
      </motion.header>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="isl-main">
        <div className="isl-content-wrapper">

          {/* Video Section */}
          <motion.section
            className="isl-video-section"
            variants={sectionVariants(0.05)}
            initial="hidden"
            animate="visible"
          >
            <div className="video-container-card">
              <h3 className="section-title">Video Input</h3>

              <div className="video-display-wrapper">
                <video ref={videoRef} className="video-display" autoPlay playsInline muted />
                <AnimatePresence>
                  {!isCameraActive && (
                    <motion.div
                      className="video-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="placeholder-icon">📹</div>
                      <p className="placeholder-text">No video source</p>
                      <p className="placeholder-subtext">Start the camera to begin live recognition</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="video-controls">
                <div className="control-group">
                  <motion.button
                    className={`control-button ${isCameraActive ? 'active' : ''}`}
                    onClick={isCameraActive ? stopCamera : startCamera}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                  >
                    {isCameraActive ? (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="6" y="6" width="12" height="12" rx="2"/>
                          <path d="M10 10v4M14 10v4"/>
                        </svg>
                        <span>Stop Camera</span>
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <span>Start Camera</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Results Section */}
          <motion.section
            className="isl-results-section"
            variants={sectionVariants(0.14)}
            initial="hidden"
            animate="visible"
          >
            <div className="results-card results-card--holo">

              {/* ── Recognition output panel ─────────────────── */}
              <div className="recog-panel">
                <header className="recog-panel__header">
                  <div className="recog-panel__title">
                    <span className="recog-panel__title-dot" />
                    Sign Recognition
                  </div>
                  <div
                    className={`recog-panel__status recog-panel__status--${
                      modelStatus === 'ready' ? 'ready' : modelStatus === 'loading' ? 'loading' : 'off'
                    }`}
                  >
                    <span className="recog-panel__status-dot" />
                    {modelStatus === 'ready' ? 'Model Ready' : modelStatus === 'loading' ? 'Loading…' : 'Model Offline'}
                  </div>
                </header>

                {/* Live current sign — small pill */}
                <div className="recog-live">
                  <span className="recog-live__label">Current</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      className={`recog-live__glyph ${recognizedText ? 'is-active' : ''}`}
                      key={recognizedText || 'empty'}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      {recognizedText || '—'}
                    </motion.span>
                  </AnimatePresence>
                  {recognizedText && (
                    <span className="recog-live__meta">{(confidence * 100).toFixed(1)}%</span>
                  )}
                </div>

                {/* Transcript — the "text box" */}
                <div className="recog-transcript">
                  <div className="recog-transcript__topbar">
                    <span className="recog-transcript__label">Transcript</span>
                    <span className="recog-transcript__count">
                      {transcript.replace(/\s/g, '').length} {transcript.replace(/\s/g, '').length === 1 ? 'char' : 'chars'}
                    </span>
                  </div>

                  <div
                    className="recog-transcript__field"
                    role="textbox"
                    aria-readonly="true"
                    aria-live="polite"
                  >
                    {transcript ? (
                      <span className="recog-transcript__text">
                        {transcript}
                        <span className="recog-transcript__caret" aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="recog-transcript__placeholder">
                        {isCameraActive && modelStatus === 'ready'
                          ? 'Show a sign to start a transcript…'
                          : 'Start the camera to begin'}
                      </span>
                    )}
                  </div>

                  <div className="recog-transcript__actions">
                    <button
                      type="button"
                      className="recog-action"
                      onClick={() => setTranscript((t) => t + ' ')}
                      disabled={!transcript}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M4 10v4h16v-4M4 10h16" />
                      </svg>
                      Space
                    </button>
                    <button
                      type="button"
                      className="recog-action"
                      onClick={() => setTranscript((t) => t.slice(0, -1))}
                      disabled={!transcript}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12l5-5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8z" />
                        <path d="M12 9l4 4M16 9l-4 4" />
                      </svg>
                      Back
                    </button>
                    <button
                      type="button"
                      className="recog-action recog-action--danger"
                      onClick={() => setTranscript('')}
                      disabled={!transcript}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Detection HUD strip ──────────────────────── */}
              <div className="holo-hud-strip">

                {/* Detection state chip */}
                <div className={`holo-det-chip holo-det-chip--${detectionState}`}>
                  <span className="holo-det-dot" />
                  {{
                    waiting:  'Waiting for hand',
                    scanning: 'Scanning…',
                    moving:   'Hand moving',
                    locking:  'Locking in…',
                    locked:   'Gesture locked',
                  }[detectionState]}
                </div>

                {/* Confidence bar */}
                <div className="holo-conf-bar-wrap">
                  <span className="holo-conf-bar-label">Confidence</span>
                  <div className="holo-conf-bar-track">
                    <motion.div
                      className={`holo-conf-bar-fill holo-conf-bar-fill--${detectionState}`}
                      animate={{ scaleX: Math.max(0, Math.min(1, confidence)) }}
                      transition={{ duration: 0.12, ease: 'linear' }}
                      style={{ originX: 0 }}
                    />
                  </div>
                  <span className="holo-conf-bar-pct">
                    {(confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* ── Output strip ─────────────────────────────── */}
              <div className="holo-output-strip">
                <div className="holo-text-row">
                  <span className="holo-output-label">Transcript</span>
                  <AnimatePresence mode="wait">
                    {transcript ? (
                      <motion.span className="holo-output-value"
                        key="filled"
                        initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                        {transcript}
                      </motion.span>
                    ) : (
                      <motion.span className="holo-output-placeholder"
                        key="empty"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}>
                        —
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                <div className="holo-voice-controls">
                  <motion.button className="holo-voice-btn"
                    onClick={() => transcript && speakText(transcript)}
                    disabled={!transcript}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.13 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                    Speak
                  </motion.button>
                  <motion.button className="holo-voice-btn holo-voice-btn--stop"
                    onClick={stopSpeech}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.13 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="6" y="6" width="12" height="12" rx="2"/>
                    </svg>
                    Stop
                  </motion.button>
                </div>
              </div>

            </div>
          </motion.section>

        </div>
      </main>
    </div>
  )
}
