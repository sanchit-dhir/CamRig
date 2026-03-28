"use client";
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TiltCard } from '../ui/TiltCard'
import { landVideos } from '../../lib/assets'

gsap.registerPlugin(ScrollTrigger)

export const PreviewSection = () => {
  const sectionRef = useRef(null)

  useEffect(() => {
    let ctx = gsap.context(() => {
      gsap.fromTo(
        '.preview-card',
        { y: 80, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
          },
        }
      )

      gsap.fromTo(
        '.trust-banner',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.trust-banner',
            start: 'top 90%',
          },
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const rotations = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2']

  return (
    <section id="templates" ref={sectionRef} className="py-24 relative z-10 w-full min-h-screen flex flex-col items-center bg-slate-900/40">
      <div className="w-full px-8 md:px-16 lg:px-24 flex-grow flex flex-col justify-center">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-20 w-full justify-center">
          {landVideos.map((video, index) => (
            <TiltCard
              key={video.name}
              className={`preview-card group relative aspect-[9/16] rounded-2xl glass-card transition-all duration-300 neon-glow-hover hover:-translate-y-2 overflow-hidden shadow-2xl ${rotations[index % rotations.length]}`}
            >
              <div className="absolute inset-0 bg-[#0c101d] border border-white/5 rounded-2xl overflow-hidden">
                <video
                  src={video.url}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-slate-300 border border-white/10">
                  {video.name}
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  )
}
