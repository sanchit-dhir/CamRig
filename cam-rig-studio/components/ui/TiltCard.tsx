"use client";
import { useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import gsap from 'gsap'

export const TiltCard = ({ children, className = '', maxDegree = 15 }: { children: ReactNode, className?: string, maxDegree?: number }) => {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!cardRef.current) return
    
    // QuickTo functions for performance
    const xTo = gsap.quickTo(cardRef.current, "rotateX", { duration: 0.5, ease: "power2.out" })
    const yTo = gsap.quickTo(cardRef.current, "rotateY", { duration: 0.5, ease: "power2.out" })
    const zTo = gsap.quickTo(cardRef.current, "translateZ", { duration: 0.5, ease: "power2.out" })

    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return
      
      const rect = cardRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      
      const deltaX = (x - centerX) / centerX // -1 to 1
      const deltaY = (y - centerY) / centerY // -1 to 1
      
      // Calculate rotation based on cursor position relative to center
      xTo(-deltaY * maxDegree)
      yTo(deltaX * maxDegree)
      zTo(30) // Lift card toward user slightly
    }

    const handleMouseLeave = () => {
      xTo(0)
      yTo(0)
      zTo(0)
    }

    cardRef.current.addEventListener('mousemove', handleMouseMove)
    cardRef.current.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      if (cardRef.current) {
        cardRef.current.removeEventListener('mousemove', handleMouseMove)
        cardRef.current.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [maxDegree])

  return (
    <div className={`perspective-[1000px] transform-style-3d ${className}`}>
      <div ref={cardRef} className="w-full h-full transform-gpu transition-all duration-300 pointer-events-auto">
        {children}
      </div>
    </div>
  )
}
