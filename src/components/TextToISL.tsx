/**
 * TextToISL — Framer Motion enhanced
 * Letter-by-letter reference images (0.8s each); playback starts only after Play.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './TextToISL.css'

interface TextToISLProps {
  onBack?: () => void
}

const LETTER_SLOT_MS = 800

const datasetNumberImages = import.meta.glob(
  '../../data train_test/Combined/{1,2,3,4,5,6,7,8,9}/*.{jpg,jpeg,png}',
  { eager: true, import: 'default' }
) as Record<string, string>

const datasetNumberMap = Object.entries(datasetNumberImages).reduce<Record<string, string>>((acc, [path, url]) => {
  const match = path.match(/\/Combined\/([^/]+)\//)
  if (!match) return acc
  const key = match[1]
  if (!acc[key]) acc[key] = url
  return acc
}, {})

const datasetAlphabetImages = import.meta.glob(
  '../../data train_test/Combined/[A-Za-z]/*.{jpg,jpeg,png}',
  { eager: true, import: 'default' }
) as Record<string, string>

const datasetAlphabetMap = Object.entries(datasetAlphabetImages).reduce<Record<string, string>>((acc, [path, url]) => {
  const match = path.match(/\/Combined\/([^/]+)\//)
  if (!match) return acc
  const key = match[1]?.toUpperCase()
  if (!key) return acc
  if (!acc[key]) acc[key] = url
  return acc
}, {})

interface LetterFrame {
  ch: string
  src: string | null
}

function buildLetterFrames(words: string[]): LetterFrame[] {
  const frames: LetterFrame[] = []
  for (const word of words) {
    for (const raw of word.split('')) {
      const ch = raw.toUpperCase()
      if (!/[A-Z0-9]/.test(ch)) continue
      const src = /^[0-9]$/.test(ch)
        ? datasetNumberMap[ch] ?? null
        : datasetAlphabetMap[ch] ?? null
      frames.push({ ch, src })
    }
  }
  return frames
}

// ─── Easing ───────────────────────────────────────────────────────
const ease = [0.22, 0.61, 0.36, 1] as const

export const TextToISL = ({ onBack }: TextToISLProps) => {
  const [inputText, setInputText]             = useState<string>('')
  const [isProcessing, setIsProcessing]       = useState(false)
  const [isListening, setIsListening]         = useState(false)
  const [recognizedWords, setRecognizedWords] = useState<string[]>([])
  /** Waiting for user to press Play (after convert or after a full run). */
  const [awaitingPlay, setAwaitingPlay]       = useState(false)
  const [isPlaying, setIsPlaying]             = useState(false)
  const [frameIdx, setFrameIdx]               = useState(0)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const playIntervalRef = useRef<number | null>(null)

  const letterFrames = useMemo(() => buildLetterFrames(recognizedWords), [recognizedWords])
  const displayLine = recognizedWords.join(' ').toUpperCase()

  const stopPlayback = useCallback(() => {
    if (playIntervalRef.current !== null) {
      window.clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const finishSequence = useCallback(() => {
    stopPlayback()
    setFrameIdx(0)
    setAwaitingPlay(true)
  }, [stopPlayback])

  useEffect(() => () => stopPlayback(), [stopPlayback])

  useEffect(() => {
    setFrameIdx(0)
    setAwaitingPlay(recognizedWords.length > 0)
    stopPlayback()
  }, [recognizedWords, stopPlayback])

  const armLetterInterval = useCallback(() => {
    if (playIntervalRef.current !== null) window.clearInterval(playIntervalRef.current)
    playIntervalRef.current = window.setInterval(() => {
      setFrameIdx(i => {
        const next = i + 1
        if (next >= letterFrames.length) {
          queueMicrotask(() => finishSequence())
          return i
        }
        return next
      })
    }, LETTER_SLOT_MS)
  }, [letterFrames.length, finishSequence])

  const startPlayback = useCallback(() => {
    if (letterFrames.length === 0) return
    setAwaitingPlay(false)
    setIsPlaying(true)
    setFrameIdx(0)
    armLetterInterval()
  }, [letterFrames.length, armLetterInterval])

  const resumePlayback = useCallback(() => {
    if (letterFrames.length === 0) return
    setAwaitingPlay(false)
    setIsPlaying(true)
    armLetterInterval()
  }, [letterFrames.length, armLetterInterval])

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopPlayback()
      return
    }
    if (letterFrames.length === 0) return
    if (awaitingPlay) {
      startPlayback()
      return
    }
    if (frameIdx >= letterFrames.length - 1) {
      startPlayback()
      return
    }
    resumePlayback()
  }, [isPlaying, awaitingPlay, letterFrames.length, frameIdx, startPlayback, resumePlayback, stopPlayback])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)

  const processTextToISL = async () => {
    if (!inputText.trim()) { alert('Please enter some text'); return }
    setIsProcessing(true)
    setTimeout(() => {
      setRecognizedWords(inputText.trim().split(/\s+/))
      setIsProcessing(false)
    }, 1500)
  }

  const handleClear = () => {
    setInputText('')
    setRecognizedWords([])
    setAwaitingPlay(false)
    stopPlayback()
    setFrameIdx(0)
  }

  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US'
      recognition.onstart  = () => setIsListening(true)
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        setInputText(prev => prev + (prev ? ' ' : '') + event.results[0][0].transcript)
        setIsListening(false)
      }
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        alert('Speech recognition error. Please try again.')
      }
      recognition.onend = () => setIsListening(false)
      recognitionRef.current = recognition
      recognition.start()
    } else {
      alert('Speech recognition is not supported in your browser')
    }
  }

  const stopVoiceInput = () => { if (recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false) } }

  const currentFrame = letterFrames[frameIdx] ?? null

  return (
    <div className="text-to-isl-container">
      <div className="text-isl-background"><div className="text-isl-background-overlay" /></div>

      {/* ── Neon floating accents ──────────────────────────────────── */}
      <svg className="nf tisl-nf-tri" viewBox="0 0 52 46" fill="none" aria-hidden="true">
        <polygon points="26,3 49,43 3,43" stroke="#bf5fff" strokeWidth="1.5" fill="rgba(191,95,255,0.05)" strokeLinejoin="round"/>
      </svg>
      <svg className="nf tisl-nf-ring" viewBox="0 0 58 58" fill="none" aria-hidden="true">
        <circle cx="29" cy="29" r="26" stroke="#ff2cf5" strokeWidth="1.2" strokeDasharray="7 5"/>
      </svg>
      <svg className="nf tisl-nf-hand" viewBox="0 0 56 88" fill="none" aria-hidden="true">
        <path d="M28 80C16 80 8 70 8 58L8 46C8 41.6 11.6 38 16 38C20.4 38 24 41.6 24 46L24 62M24 40L24 12C24 7.6 27.6 4 32 4C36.4 4 40 7.6 40 12L40 40M24 40L24 18C24 13.6 27.6 10 32 10C36.4 10 40 13.6 40 18L40 60C44 57 46 53 46 49C46 45.6 49 43 52 44.5C55 46 56 50 54 54C50 64 40 74 28 80Z" stroke="#bf5fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      {/* ── Header ───────────────────────────────────────────────── */}
      <motion.header
        className="text-isl-header"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        <div className="text-isl-header-content">
          <div className="text-isl-brand">
            <img className="text-isl-brand-mark" src="/logo.jpg" alt="LinguoSign logo" />
            <div className="text-isl-logo">
              <h1 className="text-isl-logo-text">Text to ISL</h1>
              <p className="text-isl-subtitle">Convert Text to Indian Sign Language</p>
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
      <main className="text-isl-main">
        <div className="text-isl-content-wrapper">

          {/* Input Section */}
          <motion.section
            className="text-isl-input-section"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease }}
          >
            <div className="input-container-card">
              <h3 className="section-title">Text Input</h3>

              <div className="text-input-wrapper">
                <textarea
                  className="text-input"
                  placeholder="Enter text to convert to Indian Sign Language…"
                  value={inputText}
                  onChange={handleTextChange}
                  rows={6}
                />
                <div className="input-footer">
                  <span className="character-count">{inputText.length} characters</span>
                </div>
              </div>

              <div className="input-controls">
                <div className="control-group">
                  <motion.button
                    className={`voice-input-button ${isListening ? 'listening' : ''}`}
                    onClick={isListening ? stopVoiceInput : startVoiceInput}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                  >
                    {isListening ? (
                      <>
                        <div className="pulse-dot" />
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="6" y="6" width="12" height="12" rx="2"/>
                        </svg>
                        <span>Stop Recording</span>
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                        <span>Voice Input</span>
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    className="clear-button"
                    onClick={handleClear}
                    disabled={!inputText && recognizedWords.length === 0}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    <span>Clear</span>
                  </motion.button>
                </div>

                <motion.button
                  className="convert-button"
                  onClick={processTextToISL}
                  disabled={isProcessing || !inputText.trim()}
                  whileHover={isProcessing ? {} : { scale: 1.03, y: -1 }}
                  whileTap={isProcessing ? {} : { scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  {isProcessing ? (
                    <><div className="spinner" /><span>Converting…</span></>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Convert to ISL</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.section>

          {/* Visualization Section */}
          <motion.section
            className="text-isl-visualization-section"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.06, ease }}
          >
            <div className="visualization-card">
              <h3 className="section-title">Sign Language Visualization</h3>

              <AnimatePresence mode="wait">
                {recognizedWords.length > 0 && letterFrames.length > 0 ? (
                  <motion.div
                    className="isl-visualization isl-visualization--letters-only"
                    key="visualization"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28 }}
                  >
                    <div className="sign-slideshow-stage">
                      <div className="sign-slideshow-meta-row">
                        <span className="sign-slide-phrase">{displayLine}</span>
                        {!awaitingPlay && (
                          <span className="sign-slide-letter-hint">
                            Letter {frameIdx + 1} / {letterFrames.length}
                            {' · '}
                            <span className="sign-slide-current-char">{currentFrame?.ch}</span>
                          </span>
                        )}
                      </div>

                      <div className="sign-slideshow-media">
                        <AnimatePresence mode="wait">
                          {!awaitingPlay && currentFrame?.src ? (
                            <motion.img
                              key={`${frameIdx}-${currentFrame.ch}`}
                              className="sign-slideshow-img"
                              src={currentFrame.src}
                              alt={`Sign for letter ${currentFrame.ch}`}
                              initial={{ opacity: 0.25 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0.15 }}
                              transition={{ duration: 0.18 }}
                            />
                          ) : !awaitingPlay && currentFrame ? (
                            <motion.div
                              key={`fallback-${frameIdx}`}
                              className="sign-slideshow-fallback"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.18 }}
                            >
                              <span className="sign-slideshow-fallback-word sign-slideshow-fallback-letter">{currentFrame.ch}</span>
                              <span className="sign-slideshow-fallback-hint">No dataset photo for this letter</span>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>

                        {awaitingPlay && (
                          <div className="sign-play-prompt" role="region" aria-label="Start playback">
                            <p className="sign-play-prompt-title">Ready</p>
                            <p className="sign-play-prompt-sub">
                              Press <strong>Play</strong> to show each letter for {LETTER_SLOT_MS / 1000} seconds
                            </p>
                            <motion.button
                              type="button"
                              className="sign-play-prompt-btn"
                              onClick={startPlayback}
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.97 }}
                              transition={{ duration: 0.15 }}
                            >
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <polygon points="8,5 20,12 8,19" />
                              </svg>
                              Play
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="sign-playback-toolbar">
                      <motion.button
                        type="button"
                        className={`autoplay-btn${isPlaying ? ' playing' : ''}`}
                        onClick={togglePlayback}
                        disabled={letterFrames.length === 0}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        title={isPlaying ? 'Pause' : awaitingPlay ? 'Play letter sequence' : 'Resume or replay'}
                      >
                        {isPlaying ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                        )}
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                      </motion.button>
                      <span className="sign-playback-hint">
                        {awaitingPlay ? 'Tap Play to begin' : `${LETTER_SLOT_MS / 1000}s per letter`}
                      </span>
                    </div>
                  </motion.div>
                ) : recognizedWords.length > 0 && letterFrames.length === 0 ? (
                  <motion.div
                    className="no-visualization"
                    key="no-letters"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="sign-slideshow-stage sign-slideshow-stage--empty">
                      <div className="sign-slideshow-fallback sign-slideshow-fallback--idle">
                        <span className="sign-slideshow-fallback-word">No letters to spell</span>
                        <span className="sign-slideshow-fallback-hint">
                          Use A–Z or digits in your text (e.g. &quot;hii&quot; or &quot;hi 2&quot;)
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    className="no-visualization"
                    key="empty"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="sign-slideshow-stage sign-slideshow-stage--empty">
                      <div className="sign-slideshow-fallback sign-slideshow-fallback--idle">
                        <span className="sign-slideshow-fallback-word">Letter signs</span>
                        <span className="sign-slideshow-fallback-hint">
                          Convert text, then press Play to step through each letter (0.8s each)
                        </span>
                      </div>
                    </div>
                    <p className="no-visualization-text" style={{ marginTop: 16 }}>No text converted yet</p>
                    <p className="no-visualization-subtext">Enter text and click &quot;Convert to ISL&quot;</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          <motion.aside
            className="text-isl-avatar-soon-banner"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease }}
            aria-label="Upcoming feature"
          >
            <div className="text-isl-avatar-soon-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 4L42 14v20L24 44 6 34V14L24 4z"
                  stroke="url(#tisl-soon-grad)"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  fill="rgba(99,102,241,0.08)"
                />
                <path d="M24 4v20M6 14l18 10 18-10M24 24l18 10M24 24L6 34" stroke="url(#tisl-soon-grad)" strokeWidth="1.2" strokeLinecap="round" />
                <defs>
                  <linearGradient id="tisl-soon-grad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1" />
                    <stop offset="1" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="text-isl-avatar-soon-copy">
              <p className="text-isl-avatar-soon-title">3D avatar — coming soon</p>
              <p className="text-isl-avatar-soon-sub">
                An interactive 3D signing hand will appear here in a future update.
              </p>
            </div>
            <span className="text-isl-avatar-soon-badge">Soon</span>
          </motion.aside>

        </div>
      </main>
    </div>
  )
}

// ─── Type declarations (unchanged) ───────────────────────────────
interface SpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string
  start(): void; stop(): void
  onstart:  ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror:  ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend:    ((this: SpeechRecognition, ev: Event) => any) | null
}
interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList }
interface SpeechRecognitionErrorEvent extends Event { error: string }
interface SpeechRecognitionResultList { [index: number]: SpeechRecognitionResult; length: number }
interface SpeechRecognitionResult { [index: number]: SpeechRecognitionAlternative; length: number; isFinal: boolean }
interface SpeechRecognitionAlternative { transcript: string; confidence: number }
declare global {
  interface Window {
    webkitSpeechRecognition: { new(): SpeechRecognition }
    SpeechRecognition:       { new(): SpeechRecognition }
  }
}
