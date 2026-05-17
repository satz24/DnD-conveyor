/**
 * Library — Framer Motion enhanced
 * All data loading logic preserved; motion layer added on top.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getPhraseVideoUrl } from '../signVideos'
import './Library.css'

interface LibraryProps {
  onBack?: () => void
}

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

// ─── Easing ───────────────────────────────────────────────────────
const ease = [0.22, 0.61, 0.36, 1] as const

// ─── Variants ────────────────────────────────────────────────────
const gridContainerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } }
}

const signCardVariants = {
  hidden:  { opacity: 0, scale: 0.88, y: 10 },
  visible: { opacity: 1, scale: 1,    y: 0,   transition: { duration: 0.28, ease } }
}

const tabContentVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.3, ease } },
  exit:    { opacity: 0, y: -8,  transition: { duration: 0.18 } }
}

// ─── Reusable SignCard ────────────────────────────────────────────
interface SignCardProps {
  className?: string
  children: React.ReactNode
}

const SignCard = ({ className = 'sign-card', children }: SignCardProps) => (
  <motion.div
    className={className}
    variants={signCardVariants}
    whileHover={{ y: -4, scale: 1.04, transition: { duration: 0.15 } }}
    whileTap={{ scale: 0.97 }}
  >
    {children}
  </motion.div>
)

export const Library = ({ onBack }: LibraryProps) => {
  const [activeTab, setActiveTab] = useState<'alphabets' | 'numbers' | 'phrases'>('alphabets')
  const [zoomedPhrase, setZoomedPhrase] = useState<string | null>(null)
  const zoomedVideoSrc = zoomedPhrase ? getPhraseVideoUrl(zoomedPhrase) : null

  // Close modal on Escape
  useEffect(() => {
    if (!zoomedPhrase) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedPhrase(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomedPhrase])

  return (
    <div className="library-container">
      <div className="library-background"><div className="library-background-overlay" /></div>

      {/* ── Neon floating accents ──────────────────────────────────── */}
      <svg className="nf lib-nf-tri" viewBox="0 0 54 47" fill="none" aria-hidden="true">
        <polygon points="27,3 51,44 3,44" stroke="#00ffb3" strokeWidth="1.5" fill="rgba(0,255,179,0.05)" strokeLinejoin="round"/>
      </svg>
      <svg className="nf lib-nf-ring" viewBox="0 0 60 60" fill="none" aria-hidden="true">
        <circle cx="30" cy="30" r="27" stroke="#00e5ff" strokeWidth="1.2" strokeDasharray="8 5"/>
      </svg>
      <svg className="nf lib-nf-hand" viewBox="0 0 52 84" fill="none" aria-hidden="true">
        <path d="M26 76C15 76 7 67 7 55L7 43C7 38.8 10.4 35 15 35C19.6 35 23 38.8 23 43L23 58M23 39L23 14C23 9.8 26.4 6 31 6C35.6 6 39 9.8 39 14L39 58C43 55 45 51 45 47C45 43.6 48 41 51 42.5C54 44 55 48 53 52C49 62 39 72 26 76Z" stroke="#ff2cf5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      {/* ── Header ───────────────────────────────────────────────── */}
      <motion.header
        className="library-header"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        <div className="library-header-content">
          <div className="library-brand">
            <img className="library-brand-mark" src="/logo.jpg" alt="LinguoSign logo" />
            <div className="library-logo">
              <h1 className="library-logo-text">LinguoSign</h1>
              <p className="library-tagline">Bridging Silence Through Signs</p>
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
      <main className="library-main">
        <div className="library-content-wrapper">

          <motion.h2
            className="library-page-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease }}
          >
            Sign Language Library
          </motion.h2>

          <motion.p
            className="library-page-subtitle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.07, ease }}
          >
            Explore alphabets, numbers, and common phrases in Indian Sign Language
          </motion.p>

          {/* ── Tabs ─────────────────────────────────────────────── */}
          <motion.div
            className="library-tabs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12, ease }}
          >
            {(['alphabets', 'numbers', 'phrases'] as const).map((tab) => (
              <motion.button
                key={tab}
                className={`library-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                whileHover={{ scale: activeTab === tab ? 1 : 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <span className="tab-icon">
                  {tab === 'alphabets' ? '🔤' : tab === 'numbers' ? '🔢' : '💬'}
                </span>
                <span>
                  {tab === 'alphabets' ? 'Alphabets' : tab === 'numbers' ? 'Numbers' : 'Common Phrases'}
                </span>
              </motion.button>
            ))}
          </motion.div>

          {/* ── Library Content ───────────────────────────────────── */}
          <motion.div
            className="library-content"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.18, ease }}
          >
            <AnimatePresence mode="wait">

              {/* Alphabets */}
              {activeTab === 'alphabets' && (
                <motion.div
                  key="alphabets"
                  className="library-grid"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <AnimatePresence>
                    <motion.div
                      className="library-grid"
                      style={{ display: 'contents' }}
                      variants={gridContainerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {Array.from({ length: 26 }, (_, i) => {
                        const letter  = String.fromCharCode(65 + i)
                        const imageSrc = datasetAlphabetMap[letter] || `/signs/alphabets/${letter}.png`
                        return (
                          <SignCard key={letter}>
                            <div className="sign-image-placeholder">
                              <img
                                className="sign-image"
                                src={imageSrc}
                                alt={`ISL sign for ${letter}`}
                                loading="lazy"
                                onLoad={(e) => e.currentTarget.parentElement?.classList.add('has-image')}
                                onError={(e) => {
                                  e.currentTarget.parentElement?.classList.remove('has-image')
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                              <span className="sign-letter">{letter}</span>
                            </div>
                            <div className="sign-label">{letter}</div>
                          </SignCard>
                        )
                      })}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Numbers */}
              {activeTab === 'numbers' && (
                <motion.div
                  key="numbers"
                  className="library-grid"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.div
                    className="library-grid"
                    style={{ display: 'contents' }}
                    variants={gridContainerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const number   = i.toString()
                      const imageSrc = datasetNumberMap[number] || `/signs/numbers/${number}.png`
                      return (
                        <SignCard key={number}>
                          <div className="sign-image-placeholder">
                            <img
                              className="sign-image"
                              src={imageSrc}
                              alt={`ISL sign for ${number}`}
                              loading="lazy"
                              onLoad={(e) => e.currentTarget.parentElement?.classList.add('has-image')}
                              onError={(e) => {
                                e.currentTarget.parentElement?.classList.remove('has-image')
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                            <span className="sign-number">{number}</span>
                          </div>
                          <div className="sign-label">{number}</div>
                        </SignCard>
                      )
                    })}
                  </motion.div>
                </motion.div>
              )}

              {/* Phrases */}
              {activeTab === 'phrases' && (
                <motion.div
                  key="phrases"
                  className="library-grid phrases-grid"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.div
                    className="library-grid phrases-grid"
                    style={{ display: 'contents' }}
                    variants={gridContainerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {[
                      // Videos first (cards with playable clips)
                      'Hello', 'Namaste',
                      'Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night',
                      'How are you?', 'Happy Birthday',
                      // Remaining placeholder phrases (no video yet)
                      'Thank You', 'Please', 'Sorry', 'Yes', 'No',
                      'I love you', 'Help me', 'Water', 'Food', 'Bathroom', 'Goodbye',
                    ].map((phrase) => {
                      const videoSrc = getPhraseVideoUrl(phrase)
                      const isClickable = !!videoSrc
                      return (
                        <SignCard
                          key={phrase}
                          className={`sign-card phrase-card${isClickable ? ' phrase-card--clickable' : ''}`}
                        >
                          <div
                            className="sign-image-placeholder phrase-placeholder"
                            onClick={() => isClickable && setZoomedPhrase(phrase)}
                            onKeyDown={(e) => {
                              if (!isClickable) return
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setZoomedPhrase(phrase)
                              }
                            }}
                            role={isClickable ? 'button' : undefined}
                            tabIndex={isClickable ? 0 : undefined}
                            aria-label={isClickable ? `Open ${phrase} sign in zoomed view` : undefined}
                          >
                            {videoSrc ? (
                              <video
                                className="phrase-video"
                                src={videoSrc}
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="metadata"
                                aria-label={`ISL sign for ${phrase}`}
                              />
                            ) : (
                              <span className="sign-phrase-icon">👋</span>
                            )}
                          </div>
                          <div className="sign-label phrase-label">{phrase}</div>
                        </SignCard>
                      )
                    })}
                  </motion.div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>

        </div>
      </main>

      {/* ── Zoomed phrase video modal ─────────────────────────────── */}
      <AnimatePresence>
        {zoomedPhrase && zoomedVideoSrc && (
          <motion.div
            key="phrase-zoom-overlay"
            className="phrase-zoom-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            onClick={() => setZoomedPhrase(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${zoomedPhrase} sign zoomed view`}
          >
            <motion.div
              className="phrase-zoom-modal"
              initial={{ scale: 0.85, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 8 }}
              transition={{ duration: 0.28, ease }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="phrase-zoom-close"
                onClick={() => setZoomedPhrase(null)}
                aria-label="Close zoomed sign"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18"/>
                </svg>
              </button>
              <video
                className="phrase-zoom-video"
                src={zoomedVideoSrc}
                autoPlay
                loop
                controls
                playsInline
                aria-label={`ISL sign for ${zoomedPhrase}`}
              />
              <div className="phrase-zoom-label">{zoomedPhrase}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
