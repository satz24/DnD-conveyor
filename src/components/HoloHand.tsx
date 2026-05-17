/**
 * HoloHand — Holographic AI hand landmark visualization
 * React Three Fiber · @react-three/drei · production-quality
 *
 * Renders 21 MediaPipe-style landmark nodes connected by glowing lines,
 * surrounded by rotating holographic rings, a scan sweep, radar arc,
 * and Sparkles particles — all in a transparent WebGL canvas.
 */
import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line, Sparkles, Float } from '@react-three/drei'
import * as THREE from 'three'

// ─── MediaPipe 21-landmark open-palm positions ────────────────────
// Normalised: centre of palm ≈ origin, Y-up, hand faces viewer
const LMKS: readonly [number, number, number][] = [
  /* 0  wrist      */ [ 0.00, -0.85,  0.00],
  /* 1  thumb-cmc  */ [-0.24, -0.62,  0.08],
  /* 2  thumb-mcp  */ [-0.40, -0.30,  0.14],
  /* 3  thumb-ip   */ [-0.54,  0.02,  0.18],
  /* 4  thumb-tip  */ [-0.66,  0.30,  0.20],
  /* 5  index-mcp  */ [-0.19, -0.13,  0.00],
  /* 6  index-pip  */ [-0.21,  0.21,  0.00],
  /* 7  index-dip  */ [-0.22,  0.50,  0.00],
  /* 8  index-tip  */ [-0.23,  0.79,  0.00],
  /* 9  mid-mcp    */ [ 0.00, -0.08,  0.00],
  /* 10 mid-pip    */ [ 0.00,  0.28,  0.00],
  /* 11 mid-dip    */ [ 0.00,  0.58,  0.00],
  /* 12 mid-tip    */ [ 0.00,  0.87,  0.00],
  /* 13 ring-mcp   */ [ 0.19, -0.12,  0.00],
  /* 14 ring-pip   */ [ 0.21,  0.21,  0.00],
  /* 15 ring-dip   */ [ 0.22,  0.50,  0.00],
  /* 16 ring-tip   */ [ 0.23,  0.77,  0.00],
  /* 17 pinky-mcp  */ [ 0.37, -0.22,  0.00],
  /* 18 pinky-pip  */ [ 0.41,  0.06,  0.00],
  /* 19 pinky-dip  */ [ 0.43,  0.30,  0.00],
  /* 20 pinky-tip  */ [ 0.44,  0.52,  0.00],
] as const

const CONNECTIONS: readonly [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
] as const

const TIPS     = new Set([4, 8, 12, 16, 20])
const KNUCKLES = new Set([5, 9, 13, 17, 1])

const CYAN   = '#00f0ff'
const VIOLET = '#9b4dff'
const PINK   = '#ff2cf5'

// ─── Rotating holographic rings ──────────────────────────────────
function HoloRings() {
  const a = useRef<THREE.Group>(null)
  const b = useRef<THREE.Group>(null)
  const c = useRef<THREE.Group>(null)
  const d = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (a.current) a.current.rotation.z =  t * 0.14
    if (b.current) b.current.rotation.z = -t * 0.09
    if (c.current) { c.current.rotation.z = t * 0.06; c.current.rotation.x = t * 0.04 }
    if (d.current) d.current.rotation.z = -t * 0.11
  })

  return (
    <>
      <group ref={a}>
        <mesh>
          <ringGeometry args={[1.12, 1.145, 128]} />
          <meshBasicMaterial color={CYAN}   transparent opacity={0.24} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      <group ref={b}>
        <mesh>
          <ringGeometry args={[1.28, 1.295, 128]} />
          <meshBasicMaterial color={VIOLET} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {/* tick marks */}
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(angle) * 1.285, Math.sin(angle) * 1.285, 0]}>
              <planeGeometry args={[0.04, 0.008]} />
              <meshBasicMaterial color={VIOLET} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          )
        })}
      </group>
      <group ref={c}>
        <mesh>
          <ringGeometry args={[1.46, 1.47, 128]} />
          <meshBasicMaterial color={CYAN}   transparent opacity={0.09} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      <group ref={d}>
        <mesh>
          <ringGeometry args={[0.80, 0.815, 64]} />
          <meshBasicMaterial color={PINK}   transparent opacity={0.10} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}

// ─── Horizontal scan sweep ────────────────────────────────────────
function ScanPlane() {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    if (!ref.current || !mat.current) return
    const t = (Math.sin(clock.elapsedTime * 0.45) + 1) / 2
    ref.current.position.y = -0.92 + t * 1.88
    mat.current.opacity = 0.06 + Math.sin(clock.elapsedTime * 4) * 0.025
  })

  return (
    <mesh ref={ref}>
      <planeGeometry args={[3, 0.018]} />
      <meshBasicMaterial ref={mat} color={CYAN} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

// ─── Radar arc sweep ─────────────────────────────────────────────
function Radar() {
  const ref = useRef<THREE.Group>(null)
  const arcPoints = useMemo(() => {
    const pts: [number, number, number][] = [[0, 0, 0]]
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 0.55
      pts.push([Math.cos(a) * 1.08, Math.sin(a) * 1.08, 0])
    }
    return pts
  }, [])

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = -clock.elapsedTime * 0.75
  })

  return (
    <group ref={ref}>
      <Line points={arcPoints} color={CYAN} lineWidth={1} transparent opacity={0.28} />
    </group>
  )
}

// ─── Landmark node with halo ──────────────────────────────────────
interface NodeProps {
  position: readonly [number, number, number]
  index: number
  isDetecting: boolean
}
function LandmarkNode({ position, index, isDetecting }: NodeProps) {
  const coreRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)

  const isTip     = TIPS.has(index)
  const isKnuckle = KNUCKLES.has(index)
  const isWrist   = index === 0
  const baseR = isWrist ? 0.058 : isTip ? 0.050 : isKnuckle ? 0.042 : 0.030
  const baseEmi = isTip ? 1.6 : isWrist ? 1.2 : 0.85
  const phase  = index * 0.45

  useFrame(({ clock }) => {
    if (!coreRef.current || !haloRef.current) return
    const t  = clock.elapsedTime
    const bv = Math.sin(t * 1.3 + phase) * 0.012   // breathing
    coreRef.current.position.y = position[1] + bv
    haloRef.current.position.y = position[1] + bv

    const emi = baseEmi + Math.sin(t * 2.2 + phase) * 0.15 + (isDetecting ? 0.3 : 0)
    ;(coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = emi
    haloRef.current.scale.setScalar(1 + Math.sin(t * 1.8 + phase) * 0.06)
  })

  return (
    <>
      <mesh ref={coreRef} position={[position[0], position[1], position[2]]}>
        <sphereGeometry args={[baseR, 14, 10]} />
        <meshStandardMaterial
          color={CYAN} emissive={CYAN} emissiveIntensity={baseEmi}
          roughness={0.08} metalness={0.15}
        />
      </mesh>
      {/* Soft glow halo */}
      <mesh ref={haloRef} position={[position[0], position[1], position[2]]}>
        <sphereGeometry args={[baseR * (isTip ? 3.0 : 2.4), 10, 8]} />
        <meshBasicMaterial color={CYAN} transparent opacity={isTip ? 0.10 : 0.055} depthWrite={false} />
      </mesh>
    </>
  )
}

// ─── Pulse ring (fires when new sign is detected) ─────────────────
function PulseRing({ trigger }: { trigger: string }) {
  const ref  = useRef<THREE.Mesh>(null)
  const mat  = useRef<THREE.MeshBasicMaterial>(null)
  const anim = useRef({ active: false, t: 0 })

  useEffect(() => {
    if (!trigger) return
    anim.current = { active: true, t: 0 }
  }, [trigger])

  useFrame((_, delta) => {
    if (!ref.current || !mat.current || !anim.current.active) return
    anim.current.t += delta * 2.2
    const progress = anim.current.t
    ref.current.scale.setScalar(0.5 + progress * 1.6)
    mat.current.opacity = Math.max(0, 0.65 - progress * 0.7)
    if (progress > 0.9) anim.current.active = false
  })

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <ringGeometry args={[0.38, 0.40, 64]} />
      <meshBasicMaterial ref={mat} color={CYAN} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

// ─── Main scene ───────────────────────────────────────────────────
interface SceneProps { sign: string; isDetecting: boolean }

function HoloScene({ sign, isDetecting }: SceneProps) {
  return (
    <>
      {/* Lighting */}
      <ambientLight color="#0e1f44" intensity={1.5} />
      <directionalLight position={[0, 2, 3]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-1.2, 1.0, 2.0]} color={CYAN}   intensity={3.5} distance={7} />
      <pointLight position={[ 1.2,-0.8,-1.5]} color={VIOLET} intensity={2.0} distance={7} />
      <pointLight position={[ 0.0, 0.5, 2.5]} color={CYAN}   intensity={1.2} distance={5} />

      {/* Environment rings */}
      <HoloRings />
      <ScanPlane />
      <Radar />

      {/* Particles */}
      <Sparkles count={70} scale={2.6} size={0.55} speed={0.22} color={CYAN}   opacity={0.38} />
      <Sparkles count={22} scale={1.8} size={0.35} speed={0.14} color={VIOLET} opacity={0.22} />

      {/* Pulse ring on sign change */}
      <PulseRing trigger={sign} />

      {/* Hand skeleton — gently floating */}
      <Float speed={0.65} rotationIntensity={0.06} floatIntensity={0.14}>
        <group rotation-x={0.10}>

          {/* Connection lines */}
          {CONNECTIONS.map(([a, b], i) => (
            <Line
              key={i}
              points={[LMKS[a] as [number,number,number], LMKS[b] as [number,number,number]]}
              color={CYAN}
              lineWidth={1.3}
              transparent
              opacity={0.58}
            />
          ))}

          {/* Landmark nodes */}
          {LMKS.map((pos, i) => (
            <LandmarkNode key={i} position={pos} index={i} isDetecting={isDetecting} />
          ))}
        </group>
      </Float>
    </>
  )
}

// ─── Public API ───────────────────────────────────────────────────
export interface HoloHandProps {
  sign?: string
  isDetecting?: boolean
}

export function HoloHand({ sign = '', isDetecting = false }: HoloHandProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.08, 2.35], fov: 36 }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <HoloScene sign={sign} isDetecting={isDetecting} />
    </Canvas>
  )
}
