"use client";
import { useEffect, useRef } from 'react'
import { UploadCloud, Users, Download } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const ProcessSection = () => {
  const sectionRef = useRef(null)

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Line animation
      gsap.fromTo('.progress-line',
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 1.5,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 50%",
            end: "bottom 80%",
            scrub: 1,
          }
        }
      )

      // Items animation
      gsap.fromTo('.process-item',
        { x: -50, opacity: 0 },
        {
          x: 0, opacity: 1,
          duration: 0.8,
          stagger: 0.3,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 60%",
          }
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const steps = [
    {
      id: "01",
      title: "Upload Motion Data",
      description: "Drop your video or motion capture file into our secure vault. We support MP4, MOV, and direct webcam feed.",
      icon: <UploadCloud className="w-8 h-8 text-cyan-400" />
    },
    {
      id: "02",
      title: "Select Avatar Skin",
      description: "Choose from our preset space crew library or upload your own .glb/.gltf model for rigging.",
      icon: <Users className="w-8 h-8 text-indigo-400" />
    },
    {
      id: "03",
      title: "Download & Deploy",
      description: "Export the rendered animation as a video, or grab the live stream link for OBS and real-time VTubing.",
      icon: <Download className="w-8 h-8 text-cyan-400" />
    }
  ]

  return (
    <section ref={sectionRef} className="py-32 relative bg-[#0B1120] overflow-hidden">
      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        
        <div className="text-center mb-20 animate-float">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full border border-indigo-500/30 bg-indigo-900/20 text-indigo-300 text-sm font-medium tracking-wide mb-6">
            SYSTEM WORKFLOW
          </div>
          <h2 className="text-4xl md:text-5xl font-heading font-bold drop-shadow-lg">
            3 Steps to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 neon-glow">CamRig</span>
          </h2>
        </div>

        <div className="relative pl-8 md:pl-0">
          {/* Vertical Progress Line Desktop */}
          <div className="absolute left-[2.25rem] md:left-1/2 top-4 bottom-4 w-[2px] bg-slate-800 -translate-x-1/2 hidden md:block">
            <div className="progress-line w-full h-full bg-gradient-to-b from-indigo-500 via-cyan-400 to-indigo-500 origin-top shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
          </div>
          {/* Vertical Progress Line Mobile */}
          <div className="absolute left-[38px] top-4 bottom-4 w-[2px] bg-slate-800 md:hidden">
            <div className="progress-line w-full h-full bg-gradient-to-b from-indigo-500 via-cyan-400 to-indigo-500 origin-top shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
          </div>

          <div className="space-y-16">
            {steps.map((step, index) => (
              <div key={index} className={`process-item relative flex flex-col md:flex-row items-center justify-between group ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                
                {/* Content */}
                <div className={`md:w-5/12 ml-16 md:ml-0 ${index % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}>
                  <div className="p-6 rounded-3xl glass-card transition-all duration-300 border border-slate-700/50 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] hover:-translate-y-2 relative overflow-hidden">
                    <div className="absolute right-0 top-0 text-8xl font-black text-slate-800/30 -mt-4 -mr-4 pointer-events-none select-none transition-transform group-hover:scale-110">
                      {step.id}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-slate-100 flex items-center gap-3">
                      {step.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed relative z-10">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Center Icon */}
                <div className="absolute left-0 md:left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-[#0F172A] border-2 border-slate-700 flex items-center justify-center shadow-xl z-20 transition-all duration-300 group-hover:border-cyan-400 group-hover:shadow-[0_0_25px_rgba(34,211,238,0.6)] group-hover:scale-110 mt-2 md:mt-0">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-gradient-to-br from-indigo-900 to-cyan-900 transition-colors">
                    {step.icon}
                  </div>
                </div>

                {/* Empty Space for layout */}
                <div className="hidden md:block w-5/12"></div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
