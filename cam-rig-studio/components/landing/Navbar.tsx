"use client";
import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import Link from 'next/link'

export const Navbar = () => {
  const blobRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)

  // Track mouse position within the navbar for the liquid blob effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!navRef.current || !blobRef.current) return
      
      const rect = navRef.current.getBoundingClientRect()
      // Check if mouse is hovering the navbar area generally
      const isInside = e.clientY >= rect.top && e.clientY <= rect.bottom && e.clientX >= rect.left && e.clientX <= rect.right

      if (isInside) {
        // Move the blob towards the mouse position smoothly
        const xPos = e.clientX - rect.left
        gsap.to(blobRef.current, {
          x: xPos - 150, // Center blob (blob is 300px wide roughly)
          y: -20, // keep slightly offset vertically
          duration: 1,
          ease: "power3.out",
          scale: 1.2,
          opacity: 0.8
        })
      } else {
        // Reset blob to default passive position
        gsap.to(blobRef.current, {
          x: "50%",
          y: 0,
          duration: 2,
          ease: "power2.inOut",
          scale: 1,
          opacity: 0.4
        })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <nav ref={navRef} className="fixed top-0 left-0 right-0 z-[100] px-6 py-4 transition-all duration-300">
      {/* Outer Container with the glassmorphism and clipping */}
      <div className="relative mx-auto max-w-7xl h-16 rounded-2xl border border-white/10 bg-[#0F172A]/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden flex items-center justify-between px-6 transition-colors duration-500 hover:border-indigo-500/30">
        
        {/* Dynamic Liquid Blob Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div 
            ref={blobRef}
            className="absolute top-[-50%] left-0 w-[300px] h-[150px] bg-gradient-to-r from-purple-500 via-pink-400 to-cyan-400 blur-3xl rounded-full opacity-40 mix-blend-screen animate-liquid transform-gpu origin-center"
          />
        </div>

        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 bg-noise z-0 pointer-events-none rounded-2xl"></div>

        {/* Navbar Content */}
        <div className="relative z-10 flex items-center justify-between w-full">
          
          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <span className="font-heading font-black text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 group-hover:to-cyan-200 transition-all uppercase">
              CAMRIG
            </span>
          </div>

          {/* Desktop Menu */}
          <ul className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-300">
            {[
              { label: 'Home', href: '#home' },
              { label: 'Templates', href: '#templates' },
              { label: 'Use Cases', href: '#use-cases' },
              { label: 'How it Works', href: '#how-it-works' },
            ].map((item) => (
              <li key={item.label}>
                <a href={item.href} className="relative group px-1 py-2 hover:text-white transition-colors duration-300 block">
                  {item.label}
                  <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-cyan-400 rounded-full transition-all duration-300 group-hover:w-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                </a>
              </li>
            ))}
          </ul>

          {/* CTA Right */}
          <div className="flex items-center">
             <Link href='/studio'>
               <button className="relative px-5 py-2 text-sm font-semibold text-white rounded-lg bg-indigo-600/80 border border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:bg-indigo-500 hover:shadow-[0_0_25px_rgba(34,211,238,0.6)] transition-all duration-300 overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/30 to-cyan-400/0 -translate-x-[150%] skew-x-[-20deg] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                 <span className="relative z-10">Open Studio</span>
               </button>
             </Link>
             {/* Mobile Menu Icon (Placeholder) */}
             <button className="md:hidden ml-4 text-slate-300 hover:text-white">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
             </button>
          </div>
          
        </div>
      </div>
    </nav>
  )
}
