import { motion, useScroll, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { Bell, CalendarDays, Clock3 } from 'lucide-react'
import { useRef, useState } from 'react'
import { EASE_OUT, SPRING_SNAPPY, useMotionEnabled } from '../../lib/motion'
import { replayViewport } from './landingMotion'
import styles from './Landing.module.css'

const steps = [
  { label: '3 days before', title: 'Get a heads-up', text: 'Your first reminder appears in Cross.', Icon: Bell, tone: styles.warning, threshold: .15 },
  { label: '1 day before', title: 'Make the call', text: 'Decide whether to keep the plan or cancel with the provider.', Icon: Clock3, tone: styles.urgent, threshold: .5 },
  { label: 'Billing day', title: 'Know what is due', text: 'Your provider charges you if the plan is still active.', Icon: CalendarDays, tone: styles.neutral, threshold: .85 },
]

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: .45, ease: EASE_OUT } },
}

function Milestone({ step, progress, enabled, highlighted, selected, hovered, onHover, onSelect }: {
  step: typeof steps[number]
  progress: MotionValue<number>
  enabled: boolean
  highlighted: boolean
  selected: boolean
  hovered: boolean
  onHover: (hovering: boolean) => void
  onSelect: () => void
}) {
  const scale = useTransform(progress, [step.threshold - .12, step.threshold], [.94, 1])
  const opacity = useTransform(progress, [step.threshold - .12, step.threshold], [.68, 1])
  return <li>
    <div className={styles.stepNode}>
      <motion.span className={styles.stepBadgeWrap}
        style={enabled ? { scale, opacity: highlighted ? 1 : opacity } : undefined}>
        <motion.span className={step.tone} data-highlighted={highlighted}
          animate={enabled ? { scale: highlighted ? 1.05 : 1 } : undefined}
          transition={SPRING_SNAPPY}>{step.label}</motion.span>
      </motion.span>
    </div>
    <motion.div className={styles.stepCard} variants={enabled ? cardVariants : undefined}
      whileHover={enabled ? { y: -4, transition: SPRING_SNAPPY } : undefined}
      onHoverStart={() => onHover(true)} onHoverEnd={() => onHover(false)}>
      <motion.span className={styles.icon} animate={{ scale: enabled && hovered ? 1.08 : 1 }}
        transition={enabled ? SPRING_SNAPPY : { duration: 0 }}><step.Icon size={20} aria-hidden="true" /></motion.span>
      <h3>{step.title}</h3><p>{step.text}</p>
      <button className={styles.stepAction} type="button" aria-label={step.title} aria-pressed={selected} onClick={onSelect} />
    </motion.div>
  </li>
}

export default function RemindersTimeline() {
  const ref = useRef<HTMLDivElement>(null)
  const enabled = useMotionEnabled() && typeof IntersectionObserver !== 'undefined'
  const [activeStep, setActiveStep] = useState(1)
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] })
  return <div className={styles.timelineShell} ref={ref}>
    <span className={styles.timelineTrack} aria-hidden="true">
      <motion.span className={styles.railHorizontal} style={enabled ? { scaleX: scrollYProgress } : undefined} />
      <motion.span className={styles.railVertical} style={enabled ? { scaleY: scrollYProgress } : undefined} />
    </span>
    <motion.ol className={styles.timeline}
      initial={enabled ? 'hidden' : false}
      whileInView={enabled ? 'visible' : undefined}
      viewport={replayViewport}
      variants={{ visible: { transition: { staggerChildren: .08 } } }}>
      {steps.map((step, index) => <Milestone key={step.label} step={step} progress={scrollYProgress} enabled={enabled}
        selected={activeStep === index} highlighted={(hoveredStep ?? activeStep) === index} hovered={hoveredStep === index}
        onHover={hovering => setHoveredStep(hovering ? index : null)} onSelect={() => setActiveStep(index)} />)}
    </motion.ol>
  </div>
}
