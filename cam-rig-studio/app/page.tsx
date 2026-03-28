"use client";
import { useEffect, useState } from 'react'
import { Navbar } from '../components/landing/Navbar'
import { HeroSection } from '../components/landing/HeroSection'
import { PreviewSection } from '../components/landing/PreviewSection'
import { ProcessSection } from '../components/landing/ProcessSection'
import { InteractiveAnimationSection } from '../components/landing/InteractiveAnimationSection'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CursorEffects } from '../components/landing/CursorEffects'
import gsap from 'gsap'

gsap.registerPlugin(ScrollTrigger)

const LoadingOverlay = ({ isLoaded }: { isLoaded: boolean }) => {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A] transition-all duration-700 ease-in-out ${isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex flex-col items-center gap-6">
        <div className="w-24 h-24 rounded-full border-4 border-slate-800 border-t-cyan-400 animate-spin shadow-[0_0_30px_rgba(34,211,238,0.3)]"></div>
        <div className="text-cyan-400 font-heading tracking-[0.2em] font-bold text-sm animate-pulse">
           INITIALIZING CamRig ENGINE
        </div>
      </div>
      <div className="absolute inset-0 bg-scan-line pointer-events-none opacity-20"></div>
    </div>
  )
}


export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Simulate loading assets
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-50 overflow-hidden font-sans selection:bg-indigo-500/30 cursor-crosshair">
      <LoadingOverlay isLoaded={isLoaded} />
      <CursorEffects />
      <Navbar />
      
      {/* Background ambient noise/gradient */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))] pointer-events-none"></div>
      
      <main className="relative z-10 w-full flex flex-col">
        <HeroSection />
        <PreviewSection />
        <ProcessSection />
        <InteractiveAnimationSection />
      </main>
    </div>
  )
}