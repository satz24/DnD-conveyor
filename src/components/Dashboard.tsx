/**
 * LinguoSign Dashboard — Premium AI SaaS Redesign
 * Futuristic · Glassmorphic · Neon · Production-quality
 */

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { publicAsset } from '../publicAsset'
import './Dashboard.css'

interface DashboardProps {
  onLogout?: () => void
  onNavigateToLibrary?: () => void
  onNavigateToISLToText?: () => void
  onNavigateToTextToISL?: () => void
}

const ease = [0.22, 0.61, 0.36, 1] as const
const fadeUp = (delay = 0) => ({
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.52, delay, ease } }
})
const stagger = (delay = 0) => ({
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: delay } }
})
const cardV = {
  hidden:  { opacity: 0, y: 28, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.46, ease } }
}

// ─── Animated counter ────────────────────────────────────────────
function AnimCounter({ to, suffix = '', decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const [val, setVal]   = useState(0)
  const ref             = useRef<HTMLSpanElement>(null)
  const inView          = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    const dur   = 1500
    const tick  = (now: number) => {
      const t    = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(parseFloat((to * ease).toFixed(decimals)))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, to, decimals])

  return <span ref={ref}>{val.toFixed(decimals)}{suffix}</span>
}

// ─── Main component ───────────────────────────────────────────────
export const Dashboard = ({
  onLogout, onNavigateToLibrary, onNavigateToISLToText, onNavigateToTextToISL
}: DashboardProps) => {

  const userData = (() => {
    try { const d = localStorage.getItem('dndconveyor_user'); return d ? JSON.parse(d) : {} }
    catch { return {} }
  })()
  const userName  = userData.name  || 'User'
  const userEmail = userData.email || ''
  const initial   = userName.charAt(0).toUpperCase()
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const sessionCount = (() => {
    try { const p = JSON.parse(localStorage.getItem('dndconveyor_recent_modules') ?? '[]'); return Array.isArray(p) ? Math.max(p.length, 1) : 1 }
    catch { return 1 }
  })()

  const moduleMeta = {
    dashboard: { label: 'Dashboard' },
    islToText:  { label: 'ISL to Text' },
    textToIsl:  { label: 'Text to ISL' },
    library:    { label: 'Library' },
  }

  const [, setRecent] = useState<unknown[]>([])
  useEffect(() => {
    if (!localStorage.getItem('dndconveyor_last_module'))
      localStorage.setItem('dndconveyor_last_module', JSON.stringify({ module: 'dashboard', timestamp: new Date().toISOString() }))
  }, [])

  const setLastModule = (key: keyof typeof moduleMeta) => {
    const payload = { module: key, timestamp: new Date().toISOString() }
    localStorage.setItem('dndconveyor_last_module', JSON.stringify(payload))
    let h: { module: string; timestamp: string }[] = []
    try { h = JSON.parse(localStorage.getItem('dndconveyor_recent_modules') ?? '[]'); if (!Array.isArray(h)) h = [] } catch { h = [] }
    h = [payload, ...h.filter(e => e.module !== key)].slice(0, 5)
    localStorage.setItem('dndconveyor_recent_modules', JSON.stringify(h))
    setRecent(h)
  }

  const handleLogout = () => { localStorage.removeItem('dndconveyor_user'); onLogout?.() }

  return (
    <div className="db-page">

      {/* ── Cyber grid ──────────────────────────────────────────── */}
      <div className="db-cyber-grid" aria-hidden="true" />
      <div className="db-grid-vignette" aria-hidden="true" />

      {/* ── Neon floats ─────────────────────────────────────────── */}
      <svg className="nf db-nf-tri"  viewBox="0 0 60 52" fill="none" aria-hidden="true">
        <polygon points="30,3 57,49 3,49" stroke="#00f0ff" strokeWidth="1.5" fill="rgba(0,240,255,0.05)" strokeLinejoin="round"/>
      </svg>
      <svg className="nf db-nf-ring" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="29" stroke="#9b4dff" strokeWidth="1.2" strokeDasharray="8 6"/>
      </svg>
      <svg className="nf db-nf-hand" viewBox="0 0 80 100" fill="none" aria-hidden="true">
        <path d="M40 92C24 92 13 79 13 65L13 33C13 28.8 16.6 25 21 25C25.4 25 29 28.8 29 33L29 54M29 31L29 20C29 15.8 32.6 12 37 12C41.4 12 45 15.8 45 20L45 52M45 18L45 14C45 9.8 48.6 6 53 6C57.4 6 61 9.8 61 14L61 52M61 20L61 16C61 11.8 64.6 8 69 8C73.4 8 77 11.8 77 16L77 54C81 50 83 46 83 42C83 38.5 86 36 89 38C92 40 93 44.5 90.5 49C84 63 68 78 47 85"
          stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      {/* ── Top Navigation ──────────────────────────────────────── */}
      <motion.nav className="db-nav" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease }}>
        <div className="db-nav-inner">

          {/* Brand */}
          <div className="db-brand">
            <div className="db-brand-icon" aria-hidden="true">
              <img className="db-brand-icon-img" src={publicAsset('logo.jpg')} alt="LinguoSign logo" />
            </div>
            <span className="db-brand-name">LinguoSign</span>
          </div>

          {/* Nav links */}
          <nav className="db-nav-links">
            <span className="db-nav-link db-nav-link--active">Dashboard</span>
            {[
              { label: 'ISL to Text', key: 'islToText' as const, fn: onNavigateToISLToText },
              { label: 'Text to ISL', key: 'textToIsl' as const, fn: onNavigateToTextToISL },
              { label: 'Library',     key: 'library'   as const, fn: onNavigateToLibrary },
            ].map(({ label, key, fn }) => (
              <motion.button key={key} className="db-nav-link" whileHover={{ y: -1 }} transition={{ duration: 0.12 }}
                onClick={() => { setLastModule(key); fn?.() }}>
                {label}
              </motion.button>
            ))}
          </nav>

          {/* Right side */}
          <div className="db-nav-right">
            {/* AI status */}
            <div className="db-ai-status">
              <span className="db-ai-dot" />
              <span className="db-ai-label">AI Online</span>
            </div>
            {/* Bell */}
            <motion.button className="db-icon-btn" whileHover={{ scale: 1.1 }} transition={{ duration: 0.13 }} aria-label="Notifications">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </motion.button>
            {/* User */}
            <div className="db-avatar" title={userName}>{initial}</div>
            <span className="db-username">{userName}</span>
            {userEmail && <span className="db-user-email">{userEmail}</span>}
            <motion.button className="db-logout" onClick={handleLogout} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} transition={{ duration: 0.12 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Logout</span>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ── Page body ───────────────────────────────────────────── */}
      <main className="db-main">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <motion.section className="db-hero" variants={stagger(0.04)} initial="hidden" animate="visible">

          <motion.div className="db-hero-eyebrow" variants={fadeUp(0)}>
            <span className="db-ai-pill">
              <span className="db-ai-pill-dot" />
              Powered by CNN + MediaPipe
            </span>
            <span className="db-greeting-tag">{greeting}, {userName}</span>
          </motion.div>

          <motion.h1 className="db-hero-headline" variants={fadeUp(0.06)}>
            Breaking Communication<br/>
            <span className="db-headline-gradient">Barriers with AI</span>
          </motion.h1>

          <motion.p className="db-hero-sub" variants={fadeUp(0.12)}>
            Real-time Indian Sign Language recognition &amp; translation — 35 signs, &lt;50ms latency, built for everyone.
          </motion.p>

          {/* Quick stats in hero */}
          <motion.div className="db-hero-stats" variants={stagger(0.22)}>
            {[
              { label: 'Sessions',        value: sessionCount, suffix: '',    color: 'cyan',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
              { label: 'Avg Latency',     value: 48,           suffix: 'ms',  color: 'green',  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
              { label: 'Signs Available', value: 35,           suffix: '',    color: 'violet', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> },
              { label: 'Model Active',    value: 1,            suffix: '',    color: 'orange', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>, valueStr: 'CNN' },
            ].map(({ label, value, suffix, color, icon, valueStr }) => (
              <motion.div key={label} className={`stat-chip stat-chip--${color}`} variants={fadeUp()}>
                <span className="stat-chip-icon">{icon}</span>
                <div>
                  <p className="stat-chip-value">
                    {valueStr ?? <AnimCounter to={value} suffix={suffix} />}
                  </p>
                  <p className="stat-chip-label">{label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ── Modules ───────────────────────────────────────────── */}
        <section className="db-modules">
          <motion.div className="db-section-head" variants={fadeUp(0.15)} initial="hidden" animate="visible">
            <h2 className="db-section-title">Modules</h2>
            <p className="db-section-sub">Choose your workflow</p>
          </motion.div>

          <motion.div className="action-cards" variants={stagger(0.2)} initial="hidden" animate="visible">

            {/* ── Featured: ISL → Text ───────────────────────── */}
            <motion.div className="action-card action-card--featured" variants={cardV}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}>

              {/* Scan line animation */}
              <div className="card-scan-line" aria-hidden="true" />
              {/* Radar ring */}
              <div className="card-radar" aria-hidden="true">
                <div className="card-radar-ring card-radar-ring--1" />
                <div className="card-radar-ring card-radar-ring--2" />
              </div>
              {/* Decorative hand */}
              <svg className="featured-hand-art" viewBox="0 0 88 108" fill="none" aria-hidden="true">
                <path d="M44 100C26 100 14 86 14 70L14 36C14 31.6 17.6 28 22 28C26.4 28 30 31.6 30 36L30 58M30 34L30 22C30 17.6 33.6 14 38 14C42.4 14 46 17.6 46 22L46 56M46 20L46 16C46 11.6 49.6 8 54 8C58.4 8 62 11.6 62 16L62 56M62 22L62 18C62 13.6 65.6 10 70 10C74.4 10 78 13.6 78 18L78 58C82 54 84 50 84 46C84 42 87 39 90 41C93 43 94 47.5 91.5 52C85 66 70 82 50 88"
                  stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>

              <div className="card-inner-glow card-inner-glow--cyan" />
              <div className="action-card-top-row">
                <div className="action-icon action-icon--lg">👋</div>
                <span className="card-live-badge"><span className="card-live-dot" />Live</span>
              </div>
              <h4 className="action-title action-title--lg">ISL to Text</h4>
              <p className="action-description">
                Point your camera at any Indian Sign Language gesture — our CNN detects 35 signs in real-time with &lt;50ms latency.
              </p>

              <div className="action-card-footer">
                <div className="action-stat-row">
                  <span className="action-stat"><strong>35</strong> signs</span>
                  <span className="action-stat-sep">·</span>
                  <span className="action-stat"><strong>Real-time</strong> CNN inference</span>
                  <span className="action-stat-sep">·</span>
                  <span className="action-stat"><strong>MediaPipe</strong> landmarks</span>
                </div>
                <motion.button className="action-cta-btn"
                  onClick={() => { setLastModule('islToText'); onNavigateToISLToText?.() }}
                  whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.14 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                  Launch Camera
                </motion.button>
              </div>
            </motion.div>

            {/* ── Right column ──────────────────────────────── */}
            <div className="action-cards-col">

              {/* Text → ISL */}
              <motion.div className="action-card action-card--compact" variants={cardV}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}>
                <div className="card-inner-glow card-inner-glow--violet" />
                <svg className="compact-deco compact-deco--violet" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <rect x="4" y="10" width="40" height="28" rx="5" stroke="#9b4dff" strokeWidth="1.4"/>
                  <path d="M12 20h8M12 26h12M12 32h5" stroke="#9b4dff" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <div className="action-card-top-row">
                  <div className="action-icon">📝</div>
                  <span className="compact-badge compact-badge--violet">3D Avatar</span>
                </div>
                <h4 className="action-title">Text to ISL</h4>
                <p className="action-description action-description--sm">Type or speak text and watch a real-time 3D hand avatar perform each ISL sign.</p>
                <motion.button className="action-link action-link--violet"
                  onClick={() => { setLastModule('textToIsl'); onNavigateToTextToISL?.() }}
                  whileHover={{ x: 5 }} transition={{ duration: 0.13 }}>
                  Start Translating →
                </motion.button>
              </motion.div>

              {/* Library */}
              <motion.div className="action-card action-card--compact" variants={cardV}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}>
                <div className="card-inner-glow card-inner-glow--green" />
                <div className="compact-alpha-grid" aria-hidden="true">
                  {'ABCDEFGHI'.split('').map(l => (
                    <span key={l} className="compact-alpha-cell">{l}</span>
                  ))}
                </div>
                <div className="action-card-top-row">
                  <div className="action-icon">📚</div>
                  <span className="compact-badge compact-badge--green">35 Signs</span>
                </div>
                <h4 className="action-title">Library</h4>
                <p className="action-description action-description--sm">Explore every ISL alphabet and number with reference images and gesture guides.</p>
                <motion.button className="action-link action-link--green"
                  onClick={() => { setLastModule('library'); onNavigateToLibrary?.() }}
                  whileHover={{ x: 5 }} transition={{ duration: 0.13 }}>
                  Open Library →
                </motion.button>
              </motion.div>

            </div>
          </motion.div>
        </section>

        {/* ── Analytics row ─────────────────────────────────────── */}
        <motion.section className="db-analytics" variants={stagger(0.3)} initial="hidden" animate="visible">
          <motion.div className="db-section-head" variants={fadeUp(0)}>
            <h2 className="db-section-title">AI Analytics</h2>
            <p className="db-section-sub">Real-time model performance</p>
          </motion.div>

          <motion.div className="db-analytics-grid" variants={stagger(0.1)}>
            {[
              { label: 'Model Accuracy',  value: 94.2, suffix: '%',  bar: 0.942, color: 'cyan',   decimals: 1, desc: 'CNN validation accuracy' },
              { label: 'Avg Response',    value: 48,   suffix: 'ms', bar: 0.62,  color: 'green',  decimals: 0, desc: 'Inference latency' },
              { label: 'Hand Landmarks',  value: 21,   suffix: '',   bar: 1.0,   color: 'violet', decimals: 0, desc: 'MediaPipe keypoints' },
              { label: 'AI Confidence',   value: 87,   suffix: '%',  bar: 0.87,  color: 'orange', decimals: 0, desc: 'Avg prediction score' },
            ].map(({ label, value, suffix, bar, color, decimals, desc }) => (
              <motion.div key={label} className={`db-analytic-card db-analytic-card--${color}`} variants={cardV}
                whileHover={{ y: -4, transition: { duration: 0.18 } }}>
                <p className="db-analytic-label">{label}</p>
                <p className="db-analytic-value">
                  <AnimCounter to={value} suffix={suffix} decimals={decimals} />
                </p>
                <p className="db-analytic-desc">{desc}</p>
                <div className="db-analytic-track">
                  <motion.div
                    className={`db-analytic-bar db-analytic-bar--${color}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: bar }}
                    transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
                    style={{ originX: 0 }}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

      </main>
    </div>
  )
}
