"use client";
import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Constants
const PARTICLE_COUNT = 400
const MAX_TRAIL_LENGTH = 30

const MOUSE_INFLUENCE_RADIUS = 3 // WebGL units

// Custom Ripple Shader
const RippleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    center: { value: new THREE.Vector2(0.5, 0.5) },
    radius: { value: 0 },
    opacity: { value: 1.0 },
    color: { value: new THREE.Color("#22D3EE") }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float radius;
    uniform float opacity;
    uniform vec3 color;
    varying vec2 vUv;
    void main() {
      // Offset center to align with standard UVs if mapped to a screen-sized plane
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(vUv, center);
      
      // Calculate ring thickness and intensity
      float ring = smoothstep(radius - 0.05, radius, dist) - smoothstep(radius, radius + 0.05, dist);
      float glow = exp(-pow(dist - radius, 2.0) * 100.0) * 0.5;
      
      vec3 finalColor = color * (ring + glow);
      gl_FragColor = vec4(finalColor, (ring + glow) * opacity);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
})

const ParticleSystem = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  
  // Initialize particle data (positions, velocities)
  const particles = useMemo(() => {
    const data = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        data.push({
            position: new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 10 - 2 // z depth parallax
            ),
            velocity: new THREE.Vector3(0, 0, 0),
            baseSpeed: Math.random() * 0.02 + 0.01
        })
    }
    return data
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  
  // Shared vector for calculations to avoid GC
  const tempVec = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    if (!meshRef.current) return

    // Unproject mouse coordinate to 3D world space loosely
    const mouseX = (state.mouse.x * state.viewport.width) / 2
    const mouseY = (state.mouse.y * state.viewport.height) / 2
    const mousePos = new THREE.Vector3(mouseX, mouseY, 0)
    
    // Determine force zone based on screen normalized coordinates (-1 to 1)
    // Left side (x < 0) = Attract, Right side (x > 0) = Repel
    const isAttracting = state.mouse.x < 0

    particles.forEach((particle, i) => {
        // Natural float
        particle.position.y += Math.sin(state.clock.elapsedTime * particle.baseSpeed + i) * 0.01
        particle.position.x += Math.cos(state.clock.elapsedTime * particle.baseSpeed + i) * 0.005

        // Calculate distance to mouse
        tempVec.subVectors(particle.position, mousePos)
        // Only use X/Y plane mostly, ignore deep Z interactions
        tempVec.z *= 0.1 
        const dist = tempVec.length()

        if (dist < MOUSE_INFLUENCE_RADIUS) {
            // Apply force
            const force = (MOUSE_INFLUENCE_RADIUS - dist) / MOUSE_INFLUENCE_RADIUS
            tempVec.normalize().multiplyScalar(force * 0.05)
            
            if (isAttracting) {
                // Attract (velocity moves towards mouse, meaning subtract tempVec if it points away)
                particle.velocity.sub(tempVec)
            } else {
                // Repel (velocity moves away from mouse)
                particle.velocity.add(tempVec)
            }
        }

        // Apply slight drag/friction to velocity
        particle.velocity.multiplyScalar(0.9)
        particle.position.add(particle.velocity)

        // Screen wrap
        if (particle.position.y > 10) particle.position.y = -10
        if (particle.position.y < -10) particle.position.y = 10
        if (particle.position.x > 15) particle.position.x = -15
        if (particle.position.x < -15) particle.position.x = 15

        // Update instance matrix
        dummy.position.copy(particle.position)
        
        // Scale down particles further back
        const scale = Math.max(0.1, 1 - (particle.position.z / -10))
        dummy.scale.set(scale * 0.05, scale * 0.05, scale * 0.05)
        
        dummy.updateMatrix()
        meshRef.current?.setMatrixAt(i, dummy.matrix)
    })
    
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#6366F1" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  )
}

const EnergyTrail = () => {
    const meshRef = useRef<THREE.InstancedMesh>(null)
    const { viewport } = useThree()
    
    const trailPositions = useMemo(() => Array(MAX_TRAIL_LENGTH).fill(new THREE.Vector3(-1000, 0, 0)), [])
    const dummy = useMemo(() => new THREE.Object3D(), [])

    useFrame((state) => {
        if (!meshRef.current) return

        const mouseX = (state.mouse.x * viewport.width) / 2
        const mouseY = (state.mouse.y * viewport.height) / 2
        
        // Push new position to front, pop last
        trailPositions.unshift(new THREE.Vector3(mouseX, mouseY, 0))
        if (trailPositions.length > MAX_TRAIL_LENGTH) {
            trailPositions.pop()
        }

        // Update instances, blending small to large
        for (let i = 0; i < MAX_TRAIL_LENGTH; i++) {
            dummy.position.copy(trailPositions[i])
            
            // Shrink over array length
            const scale = Math.max(0, 1 - (i / MAX_TRAIL_LENGTH)) * 0.15
            dummy.scale.set(scale, scale, scale)
            dummy.updateMatrix()
            
            meshRef.current.setMatrixAt(i, dummy.matrix)
        }
        
        meshRef.current.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_TRAIL_LENGTH]}>
             <sphereGeometry args={[1, 16, 16]} />
             <meshBasicMaterial color="#22D3EE" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
        </instancedMesh>
    )
}

const RippleSystem = () => {
    const planeRef = useRef<THREE.Mesh>(null)
    const materialRef = useRef<THREE.ShaderMaterial>(null)
    const [ripples, setRipples] = useState<{ id: number, start: number, pos: THREE.Vector3 }[]>([])

    const { viewport } = useThree()

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            // Map screen coords to normalized viewport coords
            const nx = (e.clientX / window.innerWidth) * 2 - 1
            const ny = -(e.clientY / window.innerHeight) * 2 + 1
            
            const x = (nx * viewport.width) / 2
            const y = (ny * viewport.height) / 2
            
            setRipples(prev => [...prev.slice(-4), { id: Date.now(), start: performance.now(), pos: new THREE.Vector3(x, y, 0.1) }])
        }
        
        window.addEventListener('click', handleClick)
        return () => window.removeEventListener('click', handleClick)
    }, [viewport])

    useFrame(() => {
        // Simplified: Handle the newest ripple only for this shader material
        // To handle multiple simultaneous properly, we'd need instanced planes or uniform arrays.
        // For simplicity, we animate the latest ripple or overlay.
        if (ripples.length > 0 && planeRef.current && materialRef.current) {
            const activeRipple = ripples[ripples.length - 1]
            const age = (performance.now() - activeRipple.start) / 1000 // age in seconds
            
            if (age < 1.5) {
                planeRef.current.position.copy(activeRipple.pos)
                planeRef.current.visible = true
                materialRef.current.uniforms.radius.value = age * 2.0 // expand speed
                materialRef.current.uniforms.opacity.value = 1.0 - (age / 1.5) // fade
            } else {
                planeRef.current.visible = false
            }
        }
    })

    return (
        <mesh ref={planeRef} visible={false}>
            <planeGeometry args={[10, 10]} />
            <shaderMaterial ref={materialRef} args={[RippleMaterial]} />
        </mesh>
    )
}

export const CursorEffects = () => {
  const [eventSource, setEventSource] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setEventSource(document.body);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none w-full h-full select-none">
        <Canvas 
          camera={{ position: [0, 0, 5], fov: 50 }} 
          dpr={[1, 2]} 
          gl={{ powerPreference: "high-performance" }}
          eventSource={eventSource || undefined}
        >
            <ParticleSystem />
            <EnergyTrail />
            <RippleSystem />
        </Canvas>
    </div>
  )
}
