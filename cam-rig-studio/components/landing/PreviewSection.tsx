"use client";
import { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, RoundedBox, Float, MeshTransmissionMaterial } from '@react-three/drei'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TiltCard } from '../ui/TiltCard'

gsap.registerPlugin(ScrollTrigger)

const RotatingModel = () => {
  return (
    <group dispose={null}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <group scale={1} position={[0, -0.2, 0]}>
          <RoundedBox args={[1.5, 2.5, 1.2]} radius={0.4} smoothness={4} position={[0,0,0]}>
              <meshStandardMaterial color="#0F172A" emissive="#1E293B" roughness={0.2} metalness={0.8} />
          </RoundedBox>
          <RoundedBox args={[1.55, 2.55, 1.25]} radius={0.4} smoothness={4} position={[0,0,0]}>
              <meshBasicMaterial color="#22D3EE" wireframe transparent opacity={0.2} />
          </RoundedBox>
          <RoundedBox args={[1.2, 0.8, 0.5]} radius={0.2} smoothness={4} position={[0, 0.5, 0.7]}>
              <MeshTransmissionMaterial 
                  backside
                  samples={2}
                  thickness={0.5}
                  color="#22D3EE"
              />
          </RoundedBox>
        </group>
      </Float>
      <OrbitControls autoRotate autoRotateSpeed={2} enableZoom={false} enablePan={false} />
    </group>
  )
}

export const PreviewSection = () => {
  const sectionRef = useRef(null)

  useEffect(() => {
    let ctx = gsap.context(() => {
      gsap.fromTo('.preview-card', 
        { y: 80, opacity: 0 },
        { 
          y: 0, opacity: 1, 
          duration: 1, 
          stagger: 0.1, 
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          }
        }
      )
      
      gsap.fromTo('.trust-banner',
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: '.trust-banner',
            start: "top 90%",
          }
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="py-24 relative z-10 w-full min-h-screen flex flex-col items-center bg-slate-900/40">
      <div className="w-full px-8 md:px-16 lg:px-24 flex-grow flex flex-col justify-center">

        {/* 4 Portrait Cards aligned side by side exactly like the screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-20 w-full justify-center">
          
          {/* Card 1: Original Source Placeholder */}
          <TiltCard className="preview-card group relative aspect-[9/16] rounded-2xl glass-card transition-all duration-300 neon-glow-hover hover:-translate-y-2 overflow-hidden shadow-2xl translate-y-12">
             <div className="absolute inset-0 bg-[#0c101d] flex flex-col items-center justify-center border border-white/5 rounded-2xl">
               {/* Simulating input human */}
               <div className="w-16 h-32 rounded-full border-2 border-indigo-500/30 flex items-center justify-center animate-pulse">
                 <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
               </div>
               <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-slate-300 border border-white/10">Input.mp4</div>
             </div>
          </TiltCard>

          {/* Card 2: Output Avatar Animated */}
          <TiltCard className="preview-card group relative aspect-[9/16] rounded-2xl glass-card transition-all duration-300 neon-glow-hover hover:-translate-y-2 overflow-hidden shadow-2xl translate-y-0">
             <div className="absolute inset-0 bg-gradient-to-b from-[#1a1b35] to-[#0c101d] border border-white/5 flex items-center justify-center rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute inset-0 pointer-events-auto">
                    <Canvas camera={{ position: [0, 0, 5], fov: 40 }} className="w-full h-full cursor-grab">
                      <ambientLight intensity={1} />
                      <directionalLight position={[2, 5, 2]} intensity={2} color="#6366F1" />
                      <RotatingModel />
                    </Canvas>
                </div>
               <div className="absolute top-4 left-4 flex gap-2">
                 <span className="bg-cyan-500/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-cyan-300 border border-cyan-500/30 flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                   Live Render
                 </span>
               </div>
               {/* Scanline overlay */}
               <div className="absolute inset-0 bg-scan-line pointer-events-none mix-blend-overlay opacity-30"></div>
             </div>
          </TiltCard>

          {/* Card 3: Original Source 2 Placeholder */}
          <TiltCard className="preview-card group relative aspect-[9/16] rounded-2xl glass-card transition-all duration-300 neon-glow-hover hover:-translate-y-2 overflow-hidden shadow-2xl translate-y-12">
             <div className="absolute inset-0 bg-[#0c101d] flex flex-col items-center justify-center border border-white/5 rounded-2xl">
               <div className="w-20 h-28 rounded-2xl border-2 border-pink-500/30 flex items-center justify-center opacity-70 animate-float">
                 <svg className="w-8 h-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-slate-300 border border-white/10">Capture_Rec.mov</div>
             </div>
          </TiltCard>

          {/* Card 4: Processing / Wireframe */}
          <TiltCard className="preview-card group relative aspect-[9/16] rounded-2xl glass-card transition-all duration-300 neon-glow-hover hover:-translate-y-2 overflow-hidden shadow-2xl translate-y-0 bg-black/20">
             <div className="absolute inset-0 border border-dashed border-slate-600/50 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-indigo-400 animate-spin mb-4"></div>
                <span className="text-indigo-400 font-mono text-xs uppercase tracking-widest animate-pulse">Mapping Topology</span>
             </div>
          </TiltCard>

        </div>

        {/* Trust Banner / Bottom section like the screenshot */}
        <div className="trust-banner pt-12 text-center w-full mt-auto">
          <p className="text-slate-400 font-medium mb-8 text-sm md:text-base">
            We're helping the best teams create
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Logos placeholder imitating Nexon / Square Enix */}
            <div className="flex items-center gap-2 translate-y-2">
              <div className="w-6 h-6 border-2 border-white rounded-[4px] rotate-45"></div>
              <span className="font-heading font-black text-xl italic tracking-tighter text-white">NEXON</span>
            </div>
            <div className="flex items-center -translate-y-2">
              <span className="font-heading font-bold text-lg tracking-widest text-white">SQUARE ENIX</span>
            </div>
            <div className="flex items-center gap-2 translate-y-2">
              <div className="w-6 h-6 border-2 border-white rounded-[4px] rotate-45"></div>
              <span className="font-heading font-black text-xl italic tracking-tighter text-white">NEXON</span>
            </div>
            <div className="flex items-center -translate-y-2">
              <span className="font-heading font-bold text-lg tracking-widest text-white">SONY</span>
            </div>
          </div>
        </div>
        
      </div>
    </section>
  )
}
