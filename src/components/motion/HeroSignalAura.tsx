import { motion } from 'framer-motion'

/** Cinematic hero ornament: slow holographic rings + animated waveform. */
export function HeroSignalAura() {
  const bars = 28
  return (
    <div className="db-hero-signal" aria-hidden>
      <motion.div
        className="db-signal-ring db-signal-ring--outer"
        animate={{ rotate: 360 }}
        transition={{ duration: 56, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="db-signal-ring db-signal-ring--mid"
        animate={{ rotate: -360 }}
        transition={{ duration: 38, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="db-signal-ring db-signal-ring--inner"
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      />
      <div className="db-signal-core">
        <div className="db-waveform">
          {Array.from({ length: bars }, (_, i) => (
            <motion.span
              key={i}
              className="db-waveform-bar"
              animate={{
                scaleY: [0.35, 1, 0.5, 0.85, 0.4],
                opacity: [0.45, 0.95, 0.55, 0.85, 0.5],
              }}
              transition={{
                duration: 2.2 + (i % 5) * 0.12,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.045,
              }}
              style={{ transformOrigin: 'center bottom' }}
            />
          ))}
        </div>
        <motion.div
          className="db-signal-pulse"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.08, 0.4] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  )
}
