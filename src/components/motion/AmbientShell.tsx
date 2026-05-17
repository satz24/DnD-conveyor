/**
 * Full-viewport ambient layers — always subtly alive (CSS + lightweight DOM).
 */
export function AmbientShell() {
  const particles = [
    { left: '8%', top: '18%', delay: '0s' },
    { left: '22%', top: '72%', delay: '-3s' },
    { left: '78%', top: '24%', delay: '-7s' },
    { left: '88%', top: '58%', delay: '-2s' },
    { left: '45%', top: '12%', delay: '-5s' },
    { left: '62%', top: '82%', delay: '-9s' },
    { left: '15%', top: '44%', delay: '-4s' },
    { left: '92%', top: '38%', delay: '-11s' },
    { left: '52%', top: '62%', delay: '-6s' },
    { left: '34%', top: '88%', delay: '-8s' },
    { left: '71%', top: '14%', delay: '-1s' },
    { left: '6%', top: '56%', delay: '-10s' },
  ]

  return (
    <div className="ls-ambient-shell" aria-hidden>
      <div className="ls-ambient-blob ls-ambient-blob--a" />
      <div className="ls-ambient-blob ls-ambient-blob--b" />
      <div className="ls-ambient-blob ls-ambient-blob--c" />
      <div className="ls-ambient-grid" />
      <div className="ls-ambient-scan" />
      <div className="ls-ambient-particles">
        {particles.map((p, i) => (
          <span
            key={i}
            className="ls-ambient-particle"
            style={{ left: p.left, top: p.top, animationDelay: p.delay }}
          />
        ))}
      </div>
    </div>
  )
}
