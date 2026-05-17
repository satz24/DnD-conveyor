import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, type HTMLMotionProps } from 'framer-motion'

type TiltCardProps = HTMLMotionProps<'div'> & {
  maxTilt?: number
}

/**
 * Mouse-reactive 3D tilt — spring-smoothed, GPU-friendly.
 */
export function TiltCard({ children, className, maxTilt = 7, style, ...rest }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)

  const rotateX = useSpring(useTransform(my, [0, 1], [maxTilt, -maxTilt]), { stiffness: 280, damping: 26 })
  const rotateY = useSpring(useTransform(mx, [0, 1], [-maxTilt, maxTilt]), { stiffness: 280, damping: 26 })

  const move = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top) / r.height)
  }

  const leave = () => {
    mx.set(0.5)
    my.set(0.5)
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        transformStyle: 'preserve-3d',
        transformPerspective: 1200,
        rotateX,
        rotateY,
        ...style,
      }}
      onMouseMove={move}
      onMouseLeave={leave}
      whileHover={{ scale: 1.012, transition: { type: 'spring', stiffness: 420, damping: 30 } }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
