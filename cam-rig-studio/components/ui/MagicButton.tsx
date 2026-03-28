'use client';
import { useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import gsap from 'gsap'

export const MagneticButton = ({ children, className = '' }: { children: ReactNode, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    let xTo: gsap.QuickToFunc
    let yTo: gsap.QuickToFunc

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      
      const rect = containerRef.current.getBoundingClientRect()
      // Center of element
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      
      // Distance from center
      const dx = e.clientX - cx
      const dy = e.clientY - cy

      // Stronger pull when closer, max at edges. We'll set a magnetic radius of ~100px around it.
      const dist = Math.sqrt(dx * dx + dy * dy)
      const magneticRadius = 150
      
      if (dist < magneticRadius) {
        // Calculate elastic pull power
        const powerX = (dx / magneticRadius) * 20 // Max 20px pull
        const powerY = (dy / magneticRadius) * 15 // Max 15px pull
        
        xTo(powerX)
        yTo(powerY)
      } else {
        // Snap back if outside
        xTo(0)
        yTo(0)
      }
    }

    const handleMouseLeave = () => {
      xTo(0)
      yTo(0)
    }

    if (containerRef.current) {
      xTo = gsap.quickTo(containerRef.current, "x", { duration: 0.8, ease: "elastic.out(1, 0.3)" })
      yTo = gsap.quickTo(containerRef.current, "y", { duration: 0.8, ease: "elastic.out(1, 0.3)" })
      
      window.addEventListener('mousemove', handleMouseMove)
      containerRef.current.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (containerRef.current) {
        containerRef.current.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className={`inline-block relative ${className}`}>
      {children}
    </div>
  )
}
