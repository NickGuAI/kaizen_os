// VetoCarousel — ReactBits Carousel (exact impl) adapted for SeasonVeto data
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'motion/react'
import type { PanInfo, MotionValue } from 'motion/react'
import type { SeasonVeto } from '../../lib/api'
import './VetoCarousel.css'

interface VetoCarouselProps {
  vetoes: SeasonVeto[]
  autoplay?: boolean
  autoplayDelay?: number
  pauseOnHover?: boolean
  loop?: boolean
  loading?: boolean
}

const DRAG_BUFFER = 0
const VELOCITY_THRESHOLD = 500
const GAP = 16
const SPRING_OPTIONS = { type: 'spring' as const, stiffness: 300, damping: 30 }

interface VetoItemProps {
  veto: SeasonVeto
  index: number
  itemWidth: number
  trackItemOffset: number
  x: MotionValue<number>
  transition: object
}

function VetoItem({ veto, index, itemWidth, trackItemOffset, x, transition }: VetoItemProps) {
  const range = [
    -(index + 1) * trackItemOffset,
    -index * trackItemOffset,
    -(index - 1) * trackItemOffset,
  ]
  const rotateY = useTransform(x, range, [90, 0, -90], { clamp: false })

  return (
    <motion.div
      className="veto-carousel-card"
      style={{ width: itemWidth, rotateY }}
      transition={transition}
    >
      <div className="veto-card-body">
        <div className="veto-card-title">{veto.title}</div>
        {veto.description && <p className="veto-card-desc">{veto.description}</p>}
      </div>
    </motion.div>
  )
}

export function VetoCarousel({
  vetoes,
  autoplay = true,
  autoplayDelay = 4000,
  pauseOnHover = true,
  loop = true,
  loading = false,
}: VetoCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [baseWidth, setBaseWidth] = useState(300)

  // Responsive: measure container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setBaseWidth(el.clientWidth))
    obs.observe(el)
    setBaseWidth(el.clientWidth)
    return () => obs.disconnect()
  }, [])

  const containerPadding = 0
  const itemWidth = Math.max(1, baseWidth - containerPadding * 2)
  const trackItemOffset = itemWidth + GAP

  const itemsForRender = useMemo(() => {
    if (!loop) return vetoes
    if (vetoes.length === 0) return []
    return [vetoes[vetoes.length - 1], ...vetoes, vetoes[0]]
  }, [vetoes, loop])

  const [position, setPosition] = useState<number>(loop ? 1 : 0)
  const x = useMotionValue(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isJumping, setIsJumping] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!pauseOnHover || !containerRef.current) return
    const el = containerRef.current
    const enter = () => setIsHovered(true)
    const leave = () => setIsHovered(false)
    el.addEventListener('mouseenter', enter)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mouseenter', enter)
      el.removeEventListener('mouseleave', leave)
    }
  }, [pauseOnHover])

  useEffect(() => {
    if (!autoplay || itemsForRender.length <= 1) return undefined
    if (pauseOnHover && isHovered) return undefined
    const timer = setInterval(() => {
      setPosition(prev => Math.min(prev + 1, itemsForRender.length - 1))
    }, autoplayDelay)
    return () => clearInterval(timer)
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, itemsForRender.length])

  // Reset position when items or trackItemOffset change
  useEffect(() => {
    const startingPosition = loop ? 1 : 0
    setPosition(startingPosition)
    x.set(-startingPosition * trackItemOffset)
  }, [vetoes.length, loop, trackItemOffset, x])

  useEffect(() => {
    if (!loop && position > itemsForRender.length - 1) {
      setPosition(Math.max(0, itemsForRender.length - 1))
    }
  }, [itemsForRender.length, loop, position])

  const effectiveTransition = isJumping ? { duration: 0 } : SPRING_OPTIONS

  const handleAnimationComplete = () => {
    if (!loop || itemsForRender.length <= 1) {
      setIsAnimating(false)
      return
    }
    const lastCloneIndex = itemsForRender.length - 1

    if (position === lastCloneIndex) {
      setIsJumping(true)
      const target = 1
      setPosition(target)
      x.set(-target * trackItemOffset)
      requestAnimationFrame(() => {
        setIsJumping(false)
        setIsAnimating(false)
      })
      return
    }

    if (position === 0) {
      setIsJumping(true)
      const target = vetoes.length
      setPosition(target)
      x.set(-target * trackItemOffset)
      requestAnimationFrame(() => {
        setIsJumping(false)
        setIsAnimating(false)
      })
      return
    }

    setIsAnimating(false)
  }

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD
        ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD
          ? -1
          : 0

    if (direction === 0) return

    setPosition(prev => {
      const next = prev + direction
      const max = itemsForRender.length - 1
      return Math.max(0, Math.min(next, max))
    })
  }

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -trackItemOffset * Math.max(itemsForRender.length - 1, 0),
          right: 0,
        },
      }

  const activeIndex =
    vetoes.length === 0
      ? 0
      : loop
        ? (position - 1 + vetoes.length) % vetoes.length
        : Math.min(position, vetoes.length - 1)

  if (loading || vetoes.length === 0) return null

  return (
    <div ref={containerRef} className="veto-carousel-outer">
      <div className="veto-carousel-header">
        <span className="daily-plan-section-title">Season Guardrails</span>
        <span className="daily-plan-section-subtitle">{vetoes.length} active</span>
      </div>
      <motion.div
        className="veto-carousel-track"
        drag={isAnimating ? false : 'x'}
        {...dragProps}
        style={{
          width: itemWidth,
          gap: `${GAP}px`,
          perspective: 1000,
          perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
          x,
        }}
        onDragEnd={handleDragEnd}
        animate={{ x: -(position * trackItemOffset) }}
        transition={effectiveTransition}
        onAnimationStart={() => setIsAnimating(true)}
        onAnimationComplete={handleAnimationComplete}
      >
        {itemsForRender.map((veto, index) => (
          <VetoItem
            key={`${veto.id}-${index}`}
            veto={veto}
            index={index}
            itemWidth={itemWidth}
            trackItemOffset={trackItemOffset}
            x={x}
            transition={effectiveTransition}
          />
        ))}
      </motion.div>

      <div className="veto-carousel-dots-row">
        <div className="veto-carousel-dots">
          {vetoes.map((_, index) => (
            <motion.div
              key={index}
              className={`veto-carousel-dot${activeIndex === index ? ' active' : ''}`}
              animate={{ scale: activeIndex === index ? 1.2 : 1 }}
              onClick={() => setPosition(loop ? index + 1 : index)}
              transition={{ duration: 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
