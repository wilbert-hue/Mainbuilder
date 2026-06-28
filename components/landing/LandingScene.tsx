'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Line } from '@react-three/drei'
import * as THREE from 'three'

const BAR_HEIGHTS = [1.1, 2.2, 1.5, 2.9, 1.8, 2.5, 1.3, 2.1]
const BAR_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#3b82f6', '#22d3ee', '#6366f1', '#8b5cf6', '#3b82f6']

function CameraRig() {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 0.5, 0))

  useFrame((state) => {
    const mx = state.mouse.x * 0.45
    const my = state.mouse.y * 0.25
    camera.position.x += (mx - camera.position.x) * 0.04
    camera.position.y += (1.2 + my - camera.position.y) * 0.04
    camera.lookAt(target.current)
  })

  return null
}

function FloatingBars() {
  const groupRef = useRef<THREE.Group>(null)
  const barRefs = useRef<THREE.Mesh[]>([])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.rotation.y = Math.sin(t * 0.12) * 0.35
    groupRef.current.position.y = Math.sin(t * 0.5) * 0.08

    barRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const pulse = 1 + Math.sin(t * 1.8 + i * 0.7) * 0.12
      mesh.scale.y = pulse
    })
  })

  return (
    <group ref={groupRef} position={[-1.4, -1.1, 0]}>
      {BAR_HEIGHTS.map((h, i) => (
        <Float key={i} speed={1.2 + i * 0.08} rotationIntensity={0.12} floatIntensity={0.35}>
          <mesh
            ref={(el) => {
              if (el) barRefs.current[i] = el
            }}
            position={[i * 0.42, h / 2, Math.sin(i) * 0.15]}
          >
            <boxGeometry args={[0.32, h, 0.32]} />
            <meshStandardMaterial
              color={BAR_COLORS[i]}
              metalness={0.7}
              roughness={0.15}
              emissive={BAR_COLORS[i]}
              emissiveIntensity={0.22}
            />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

function ParticleField() {
  const count = 160
  const pointsRef = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10
      pos[i * 3 + 1] = (Math.random() - 0.5) * 7
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5 - 1
    }
    return pos
  }, [])

  useFrame((state) => {
    if (!pointsRef.current) return
    const t = state.clock.elapsedTime
    pointsRef.current.rotation.y = t * 0.018
    pointsRef.current.rotation.x = Math.sin(t * 0.1) * 0.05
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#7dd3fc"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function DataArcs() {
  const lines = useMemo(() => {
    const arcs: [THREE.Vector3, THREE.Vector3][] = []
    for (let i = 0; i < 6; i++) {
      const start = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3,
        (Math.random() - 0.5) * 2 - 1
      )
      const end = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3,
        (Math.random() - 0.5) * 2 - 1
      )
      arcs.push([start, end])
    }
    return arcs
  }, [])

  return (
    <group>
      {lines.map(([start, end], i) => (
        <Line
          key={i}
          points={[start, end]}
          color="#6366f1"
          transparent
          opacity={0.2}
          lineWidth={1}
        />
      ))}
    </group>
  )
}

function OrbitRing({
  position,
  scale,
  speed,
}: {
  position: [number, number, number]
  scale: number
  speed: number
}) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ringRef.current) return
    ringRef.current.rotation.x = state.clock.elapsedTime * speed
    ringRef.current.rotation.z = state.clock.elapsedTime * (speed * 0.6)
  })

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.4}>
      <mesh ref={ringRef} position={position} scale={scale}>
        <torusGeometry args={[1.1, 0.05, 24, 64]} />
        <meshStandardMaterial
          color="#818cf8"
          metalness={0.9}
          roughness={0.1}
          emissive="#4f46e5"
          emissiveIntensity={0.25}
        />
      </mesh>
    </Float>
  )
}

function SceneContent() {
  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.35} />
      <pointLight position={[8, 8, 6]} intensity={1.4} color="#93c5fd" />
      <pointLight position={[-6, -2, 4]} intensity={0.7} color="#c4b5fd" />
      <spotLight position={[0, 6, 4]} angle={0.4} penumbra={0.8} intensity={0.55} color="#38bdf8" />
      <ParticleField />
      <DataArcs />
      <FloatingBars />
      <OrbitRing position={[2.2, 1.8, -0.5]} scale={1} speed={0.2} />
      <OrbitRing position={[-1.5, 2.2, -1.2]} scale={0.65} speed={-0.15} />
    </>
  )
}

export function LandingScene() {
  return (
    <div className="landing-scene-wrap pointer-events-none absolute inset-0 md:relative md:inset-auto md:h-full md:min-h-[420px]">
      <Canvas
        camera={{ position: [0, 1.2, 5.5], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <SceneContent />
      </Canvas>
      <div className="landing-scene-glow landing-scene-glow-pulse" aria-hidden />
    </div>
  )
}
