/**
 * Hand3D — Stylized 3D ISL hand avatar (React Three Fiber)
 * Procedural rig with smooth pose blending for A–Z and digits 1–9.
 */
import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { RoundedBox, OrbitControls, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

type FP = { base: number; mid: number; spread: number }
interface Pose { thumb: FP; index: FP; middle: FP; ring: FP; pinky: FP }
const fp = (base: number, mid: number, spread = 0): FP => ({ base, mid, spread })

const POSES: Record<string, Pose> = {
  A: { thumb: fp(0.3, 0.1, 0.45), index: fp(1.4, 1.1), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  B: { thumb: fp(1.1, 0.0, -0.3), index: fp(0, 0, 0.04), middle: fp(0, 0), ring: fp(0, 0), pinky: fp(0, 0, 0.05) },
  C: { thumb: fp(0.4, 0.2, 0.6), index: fp(0.7, 0.4, -0.04), middle: fp(0.7, 0.4), ring: fp(0.7, 0.4), pinky: fp(0.7, 0.4, 0.05) },
  D: { thumb: fp(0.7, 0.3, 0.4), index: fp(0, 0, -0.05), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  E: { thumb: fp(0.8, 0.4, 0.3), index: fp(1.1, 1.0, -0.05), middle: fp(1.1, 1.0), ring: fp(1.1, 1.0), pinky: fp(1.1, 1.0, 0.05) },
  F: { thumb: fp(0.8, 0.4, 0.3), index: fp(0.9, 0.8, -0.1), middle: fp(0, 0), ring: fp(0, 0), pinky: fp(0, 0, 0.05) },
  G: { thumb: fp(0.4, 0.1, 0.5), index: fp(0.2, 0, -0.4), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  H: { thumb: fp(1.0, 0, 0.2), index: fp(0.2, 0, -0.3), middle: fp(0.2, 0, -0.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  I: { thumb: fp(1.1, 0, -0.1), index: fp(1.4, 1.1), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(0, 0, 0.06) },
  J: { thumb: fp(1.1, 0, -0.1), index: fp(1.4, 1.1), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(0, 0, 0.06) },
  K: { thumb: fp(0.4, 0, 0.3), index: fp(0, 0, -0.1), middle: fp(0, 0, 0.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  L: { thumb: fp(0.1, 0, 0.9), index: fp(0, 0, -0.05), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  M: { thumb: fp(1.0, 0, 0), index: fp(1.4, 0.6), middle: fp(1.4, 0.6), ring: fp(1.4, 0.6), pinky: fp(1.4, 1.1) },
  N: { thumb: fp(1.0, 0, 0), index: fp(1.4, 0.6), middle: fp(1.4, 0.6), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  O: { thumb: fp(0.5, 0.3, 0.7), index: fp(0.8, 0.6, -0.1), middle: fp(0.8, 0.6, -0.04), ring: fp(0.8, 0.6, 0.05), pinky: fp(0.9, 0.7, 0.12) },
  P: { thumb: fp(0.4, 0, 0.3), index: fp(0.6, 0.3, -0.1), middle: fp(0.4, 0.2, 0.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  Q: { thumb: fp(0.4, 0.1, 0.5), index: fp(0.7, 0.4, -0.3), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  R: { thumb: fp(1.1, 0, -0.1), index: fp(0, 0, -0.1), middle: fp(0, 0, 0.12), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  S: { thumb: fp(0.5, 0.3, -0.1), index: fp(1.4, 1.1), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  T: { thumb: fp(0.5, 0, 0.1), index: fp(1.4, 1.1), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  U: { thumb: fp(1.0, 0, -0.1), index: fp(0, 0, -0.05), middle: fp(0, 0, 0.05), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  V: { thumb: fp(1.0, 0, -0.1), index: fp(0, 0, -0.22), middle: fp(0, 0, 0.22), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  W: { thumb: fp(1.0, 0, -0.1), index: fp(0, 0, -0.2), middle: fp(0, 0, 0), ring: fp(0, 0, 0.2), pinky: fp(1.4, 1.1) },
  X: { thumb: fp(1.0, 0, -0.1), index: fp(0.5, 0.9, -0.05), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  Y: { thumb: fp(0.1, 0, 0.9), index: fp(1.4, 1.1), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(0, 0, 0.06) },
  Z: { thumb: fp(1.0, 0, -0.1), index: fp(0.1, 0, -0.05), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  '1': { thumb: fp(1.0, 0, -0.2), index: fp(0, 0, -0.05), middle: fp(1.4, 1.1), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  '2': { thumb: fp(1.0, 0, -0.2), index: fp(0, 0, -0.22), middle: fp(0, 0, 0.22), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  '3': { thumb: fp(0.2, 0, 0.6), index: fp(0, 0, -0.15), middle: fp(0, 0, 0), ring: fp(1.4, 1.1), pinky: fp(1.4, 1.1) },
  '4': { thumb: fp(1.2, 0, -0.4), index: fp(0, 0, -0.15), middle: fp(0, 0, -0.05), ring: fp(0, 0, 0.05), pinky: fp(0, 0, 0.15) },
  '5': { thumb: fp(0, 0, 0.8), index: fp(0, 0, -0.2), middle: fp(0, 0, -0.05), ring: fp(0, 0, 0.1), pinky: fp(0, 0, 0.25) },
  '6': { thumb: fp(0.2, 0, 0.5), index: fp(0, 0, -0.15), middle: fp(0, 0, -0.05), ring: fp(0, 0, 0.05), pinky: fp(0.8, 0.6, 0.15) },
  '7': { thumb: fp(0.2, 0, 0.5), index: fp(0, 0, -0.15), middle: fp(0, 0, -0.05), ring: fp(0.8, 0.6, 0.05), pinky: fp(0, 0, 0.15) },
  '8': { thumb: fp(0.2, 0, 0.5), index: fp(0, 0, -0.15), middle: fp(0.8, 0.6, -0.05), ring: fp(0, 0, 0.05), pinky: fp(0, 0, 0.15) },
  '9': { thumb: fp(0.8, 0.4, 0.3), index: fp(0.8, 0.6, -0.1), middle: fp(0, 0, -0.05), ring: fp(0, 0, 0.05), pinky: fp(0, 0, 0.15) },
}

const IDLE: Pose = {
  thumb: fp(0.25, 0.1, 0.4),
  index: fp(0.18, 0.08),
  middle: fp(0.18, 0.08),
  ring: fp(0.2, 0.1),
  pinky: fp(0.22, 0.12, 0.05),
}

const SKIN = '#1a3a5c'
const SKIN_EMISSIVE = '#2a6cb8'
const TIP_EMISSIVE = '#22d3ee'

function fingerMat() {
  return (
    <meshPhysicalMaterial
      color={SKIN}
      emissive={SKIN_EMISSIVE}
      emissiveIntensity={0.22}
      roughness={0.35}
      metalness={0.15}
      clearcoat={0.35}
      clearcoatRoughness={0.4}
    />
  )
}

function tipMat() {
  return (
    <meshPhysicalMaterial
      color="#0e2844"
      emissive={TIP_EMISSIVE}
      emissiveIntensity={0.45}
      roughness={0.2}
      metalness={0.25}
    />
  )
}

interface FingerProps {
  spreadRef: React.RefObject<THREE.Group | null>
  proxRef: React.RefObject<THREE.Group | null>
  distRef: React.RefObject<THREE.Group | null>
  init: FP
  proxLen: number
  distLen: number
  w: number
}

function Finger({ spreadRef, proxRef, distRef, init, proxLen, distLen, w }: FingerProps) {
  return (
    <group ref={spreadRef} rotation-z={init.spread}>
      <group ref={proxRef} rotation-x={-init.base}>
        <RoundedBox args={[w, proxLen, w * 0.88]} radius={0.022} smoothness={4} position={[0, proxLen / 2, 0]}>
          {fingerMat()}
        </RoundedBox>
        <mesh position={[0, proxLen, 0]}>
          <sphereGeometry args={[w * 0.5, 12, 10]} />
          {fingerMat()}
        </mesh>
        <group ref={distRef} position={[0, proxLen, 0]} rotation-x={-init.mid}>
          <RoundedBox args={[w * 0.86, distLen, w * 0.78]} radius={0.018} smoothness={4} position={[0, distLen / 2, 0]}>
            {fingerMat()}
          </RoundedBox>
          <mesh position={[0, distLen, 0]}>
            <sphereGeometry args={[w * 0.42, 12, 10]} />
            {tipMat()}
          </mesh>
        </group>
      </group>
    </group>
  )
}

function ISLHandScene({ sign }: { sign: string }) {
  const key = sign.toUpperCase()
  const targetPose = POSES[key] ?? POSES[sign] ?? IDLE
  const targetRef = useRef<Pose>(targetPose)
  const lerpSpeed = useRef(0.09)

  targetRef.current = targetPose

  useEffect(() => {
    lerpSpeed.current = 0.22
    const t = window.setTimeout(() => { lerpSpeed.current = 0.09 }, 400)
    return () => window.clearTimeout(t)
  }, [sign])

  const wristRef = useRef<THREE.Group>(null)
  const pS = useRef<THREE.Group>(null), pP = useRef<THREE.Group>(null), pD = useRef<THREE.Group>(null)
  const iS = useRef<THREE.Group>(null), iP = useRef<THREE.Group>(null), iD = useRef<THREE.Group>(null)
  const mS = useRef<THREE.Group>(null), mP = useRef<THREE.Group>(null), mD = useRef<THREE.Group>(null)
  const rS = useRef<THREE.Group>(null), rP = useRef<THREE.Group>(null), rD = useRef<THREE.Group>(null)
  const kS = useRef<THREE.Group>(null), kP = useRef<THREE.Group>(null), kD = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const t = targetRef.current
    const s = lerpSpeed.current
    const lp = (cur: number, tgt: number) => cur + (tgt - cur) * s

    if (wristRef.current) {
      wristRef.current.rotation.y = 0.1 + Math.sin(clock.elapsedTime * 0.55) * 0.04
      wristRef.current.rotation.x = 0.12 + Math.sin(clock.elapsedTime * 0.38) * 0.02
    }

    const fingers = [
      [pS, pP, pD, t.thumb],
      [iS, iP, iD, t.index],
      [mS, mP, mD, t.middle],
      [rS, rP, rD, t.ring],
      [kS, kP, kD, t.pinky],
    ] as const

    for (const [sRef, pRef, dRef, fpose] of fingers) {
      if (sRef.current) sRef.current.rotation.z = lp(sRef.current.rotation.z, fpose.spread)
      if (pRef.current) pRef.current.rotation.x = lp(pRef.current.rotation.x, -fpose.base)
      if (dRef.current) dRef.current.rotation.x = lp(dRef.current.rotation.x, -fpose.mid)
    }
  })

  const p = targetPose

  return (
    <group position={[0, -0.08, 0]}>
      {/* Forearm / sleeve — gives an "avatar" anchor */}
      <group position={[0, -0.42, -0.06]} rotation-x={0.15}>
        <RoundedBox args={[0.52, 0.55, 0.42]} radius={0.08} smoothness={4}>
          <meshPhysicalMaterial
            color="#0a1628"
            emissive="#1e3a5f"
            emissiveIntensity={0.12}
            roughness={0.5}
            metalness={0.2}
          />
        </RoundedBox>
        <RoundedBox args={[0.58, 0.12, 0.46]} radius={0.04} position={[0, 0.28, 0]}>
          <meshPhysicalMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.15} roughness={0.3} />
        </RoundedBox>
      </group>

      <group ref={wristRef} rotation-y={0.1} rotation-x={0.12}>
        <RoundedBox args={[0.74, 0.68, 0.16]} radius={0.08} smoothness={4}>
          <meshPhysicalMaterial
            color="#0c1e38"
            emissive="#1a4a8a"
            emissiveIntensity={0.18}
            roughness={0.32}
            metalness={0.18}
            clearcoat={0.4}
          />
        </RoundedBox>

        <group position={[-0.268, 0.34, 0]}>
          <Finger spreadRef={kS} proxRef={kP} distRef={kD} init={p.pinky} proxLen={0.2} distLen={0.16} w={0.096} />
        </group>
        <group position={[-0.09, 0.34, 0]}>
          <Finger spreadRef={rS} proxRef={rP} distRef={rD} init={p.ring} proxLen={0.23} distLen={0.18} w={0.102} />
        </group>
        <group position={[0.09, 0.34, 0]}>
          <Finger spreadRef={mS} proxRef={mP} distRef={mD} init={p.middle} proxLen={0.25} distLen={0.19} w={0.108} />
        </group>
        <group position={[0.27, 0.34, 0]}>
          <Finger spreadRef={iS} proxRef={iP} distRef={iD} init={p.index} proxLen={0.23} distLen={0.17} w={0.102} />
        </group>
        <group position={[0.37, 0.06, 0.05]} rotation-z={-0.62} rotation-y={-0.22}>
          <Finger spreadRef={pS} proxRef={pP} distRef={pD} init={p.thumb} proxLen={0.2} distLen={0.15} w={0.114} />
        </group>
      </group>
    </group>
  )
}

export interface Hand3DProps {
  sign: string
}

export function Hand3D({ sign }: Hand3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.05, 2.15], fov: 36 }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={['#030810']} />
      <fog attach="fog" args={['#030810', 2.5, 5]} />
      <ambientLight color="#4a6fa5" intensity={0.9} />
      <directionalLight position={[2, 4, 3]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-1.5, 1.5, 2]} color="#22d3ee" intensity={2.5} distance={6} />
      <pointLight position={[1.5, -0.5, -1]} color="#a78bfa" intensity={1.2} distance={5} />
      <ISLHandScene sign={sign} />
      <ContactShadows position={[0, -0.72, 0]} opacity={0.45} scale={2.2} blur={2.2} far={1.2} color="#22d3ee" />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.72}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </Canvas>
  )
}
