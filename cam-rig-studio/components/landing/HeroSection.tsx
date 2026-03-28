'use client';
import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, RoundedBox, Stars, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { MagneticButton } from '../ui/MagicButton'

const CharacterPlaceholder = () => {
    const headRef = useRef<THREE.Group>(null)
    const target = new THREE.Vector3()

    useFrame((state) => {
        if (!headRef.current) return
        
        // Map 2D cursor coords to 3D roughly in front of character
        target.set(
            (state.mouse.x * 5),
            (state.mouse.y * 5),
            5
        )
        // Lerp rotation for smooth organic movement
        const currentQ = headRef.current.quaternion.clone()
        headRef.current.lookAt(target)
        const targetQ = headRef.current.quaternion.clone()
        headRef.current.quaternion.copy(currentQ)
        headRef.current.quaternion.slerp(targetQ, 0.05) // Smooth delay
    })

    return (
        <group dispose={null}>
            <Float speed={2} rotationIntensity={1.5} floatIntensity={1.5} floatingRange={[-0.5, 0.5]}>
                
                <group ref={headRef}>
                  {/* Body */}
                  <RoundedBox args={[1.5, 2.5, 1.2]} radius={0.4} smoothness={4} position={[0,0,0]} castShadow>
                    <meshStandardMaterial color="#0F172A" emissive="#1E293B" roughness={0.2} metalness={0.8} />
                </RoundedBox>
                {/* Glowing Outline/Edge - using simple color and emissive */}
                <RoundedBox args={[1.55, 2.55, 1.25]} radius={0.4} smoothness={4} position={[0,0,0]}>
                    <meshBasicMaterial color="#6366F1" wireframe transparent opacity={0.3} />
                </RoundedBox>
                
                {/* Visor */}
                <RoundedBox args={[1.2, 0.8, 0.5]} radius={0.2} smoothness={4} position={[0, 0.5, 0.7]}>
                    <MeshTransmissionMaterial 
                        backside
                        samples={4}
                        thickness={1}
                        chromaticAberration={0.1}
                        anisotropy={0.2}
                        distortion={0.3}
                        distortionScale={0.5}
                        temporalDistortion={0.1}
                        color="#22D3EE"
                    />
                </RoundedBox>
                {/* Visor Inner Light */}
                <pointLight position={[0, 0.5, 1]} intensity={0.5} color="#22D3EE" />

                {/* Backpack */}
                 <RoundedBox args={[1, 1.5, 0.6]} radius={0.2} smoothness={4} position={[0, 0, -0.8]}>
                    <meshStandardMaterial color="#6366F1" emissive="#6366F1" emissiveIntensity={0.2} />
                </RoundedBox>
                </group>
            </Float>
        </group>
    )
}

export const HeroSection = () => {
  useEffect(() => {
    gsap.fromTo('.hero-anim', 
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, stagger: 0.15, ease: "power3.out", delay: 0.2 }
    )
  }, [])

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
         <Canvas camera={{ position: [0, 0, 8], fov: 45 }} className="w-full h-full">
           <ambientLight intensity={0.7} />
           <directionalLight position={[5, 10, 5]} intensity={2} color="#22D3EE" />
           <pointLight position={[-5, -5, -5]} intensity={2} color="#6366F1" />
           <Environment preset="night" />
           <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1.5} />
           
           <group position={[3.5, 0, 0]}>
             <CharacterPlaceholder />
           </group>
         </Canvas>
      </div>

      <div className="w-full px-8 md:px-16 lg:px-24 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col items-start gap-8">
          {/* Badge Removed */}
          
          <h1 className="hero-anim font-heading text-5xl md:text-7xl font-bold leading-tight tracking-tighter drop-shadow-lg">
            Turn Your Videos <br/> Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 animate-gradient bg-300%">
              Living Characters 🎭
            </span>
          </h1>
          
          <p className="hero-anim text-lg md:text-xl text-slate-300 max-w-lg leading-relaxed mix-blend-lighten">
            Instantly convert your videos into animated avatars and go live like never before. Welcome to the future of animation in deep space.
          </p>
          
          <div className="hero-anim flex flex-col sm:flex-row gap-5 mt-4 w-full sm:w-auto z-20">
             <MagneticButton>
              <a href='http://localhost:3000/studio'>
               <button className="px-8 py-4 w-full rounded-xl bg-indigo-600 text-white font-semibold shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:bg-indigo-500 hover:shadow-[0_0_30px_rgba(34,211,238,0.7)] transition-all duration-300 transform hover:-translate-y-1 relative group overflow-hidden">
                 <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                 <span className="relative z-10 pointer-events-none">Open Studio</span>
               </button>
               </a>
             </MagneticButton>
             
             <MagneticButton>
               <button className="px-8 py-4 w-full rounded-xl bg-slate-800/80 backdrop-blur-md font-semibold border border-slate-700 hover:border-indigo-400/80 hover:bg-slate-700/80 transition-all duration-300 shadow-lg pointer-events-auto">
                 Contribute GitHub
               </button>
             </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  )
}
