import { useRef, useState } from 'react'
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react'

interface ShinyTextProps {
  text: string
  disabled?: boolean
  speed?: number
  className?: string
  color?: string
  shineColor?: string
  spread?: number
  pauseOnHover?: boolean
}

export default function ShinyText({
  text,
  disabled = false,
  speed = 3,
  className = '',
  color = '#cad6c5',
  shineColor = '#ffffff',
  spread = 118,
  pauseOnHover = false,
}: ShinyTextProps) {
  const [paused, setPaused] = useState(false)
  const progress = useMotionValue(0)
  const lastFrameTimeRef = useRef<number | null>(null)
  const duration = Math.max(speed, 0.2) * 1000

  useAnimationFrame((time) => {
    if (disabled || paused) {
      lastFrameTimeRef.current = null
      return
    }

    if (lastFrameTimeRef.current === null) {
      lastFrameTimeRef.current = time
      return
    }

    const delta = time - lastFrameTimeRef.current
    lastFrameTimeRef.current = time

    let next = progress.get() + (delta / duration) * 100
    if (next > 100) {
      next %= 100
    }
    progress.set(next)
  })

  const backgroundPosition = useTransform(progress, (value) => `${150 - value * 2}% center`)

  return (
    <motion.span
      className={className}
      style={{
        display: 'inline-block',
        color,
        backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundPosition,
      }}
      onMouseEnter={() => {
        if (pauseOnHover) {
          setPaused(true)
        }
      }}
      onMouseLeave={() => {
        if (pauseOnHover) {
          setPaused(false)
        }
      }}
    >
      {text}
    </motion.span>
  )
}
