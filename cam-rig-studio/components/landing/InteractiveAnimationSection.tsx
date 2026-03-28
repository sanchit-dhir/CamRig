"use client";
import { useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Float, Environment, RoundedBox } from '@react-three/drei'
import gsap from 'gsap'

const FloatingEntity = ({ position, color, scale = 1 }: { position: [number, number, number], color: string, scale?: number }) => {
  return (
    <Float speed={1.5} rotationIntensity={2} floatIntensity={3} floatingRange={[-1, 1]} position={position}>
      <group scale={scale}>
        <RoundedBox args={[1, 1.4, 0.8]} radius={0.3} smoothness={4}>
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} emissive={color} emissiveIntensity={0.2} />
        </RoundedBox>
        {/* Visor */}
        <RoundedBox args={[0.8, 0.5, 0.4]} radius={0.15} position={[0, 0.3, 0.45]}>
          <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.9} emissive="#22D3EE" emissiveIntensity={0.5} />
        </RoundedBox>
      </group>
    </Float>
  )
}

export const InteractiveAnimationSection = () => {
  const containerRef = useRef<HTMLElement>(null)
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      
      const { clientX, clientY } = e
      const xPos = (clientX / window.innerWidth - 0.5) * 40
      const yPos = (clientY / window.innerHeight - 0.5) * 40

      gsap.to('.parallax-bg', {
        x: xPos,
        y: yPos,
        duration: 1.5,
        ease: "power2.out"
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <section ref={containerRef} className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-[#0a0f1d] border-t border-slate-800/50">
      
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 z-0 parallax-bg opacity-70">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} color="#6366F1" />
          <directionalLight position={[-5, -10, -5]} intensity={1.5} color="#22D3EE" />
          <Environment preset="city" />

          {/* Floating Entities in Space */}
          <FloatingEntity position={[-6, 2, -4]} color="#FF3366" scale={1.2} />
          <FloatingEntity position={[5, -3, -5]} color="#33FF99" scale={0.8} />
          <FloatingEntity position={[-4, -4, -2]} color="#FF9933" scale={0.9} />
          <FloatingEntity position={[7, 4, -3]} color="#9933FF" scale={1.5} />
          <FloatingEntity position={[0, 0, -8]} color="#6366F1" scale={2} />
        </Canvas>
      </div>

      <div className="relative z-10 text-center max-w-3xl px-6 glass-card p-12 rounded-3xl border border-indigo-500/20 backdrop-blur-xl shadow-[0_0_50px_rgba(99,102,241,0.15)] transition-all hover:shadow-[0_0_80px_rgba(34,211,238,0.25)] hover:border-cyan-500/30">
        <h2 className="text-4xl md:text-6xl font-heading font-black mb-6 text-white drop-shadow-xl">
          Ready to join the <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 neon-glow">Crew?</span>
        </h2>
        <p className="text-xl text-slate-300 mb-8 max-w-xl mx-auto">
          Sign up early to get your personalized CamRig suit and start animating today.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <input 
            type="email" 
            placeholder="Enter your email" 
            className="px-6 py-4 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-medium md:min-w-[300px] transition-all"
          />
          <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)] transition-all duration-300 transform hover:-translate-y-1">
            Request Access
          </button>
        </div>
      </div>

    </section>
  )
}
