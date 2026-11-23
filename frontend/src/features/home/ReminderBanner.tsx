import { motion, useInView } from 'framer-motion'
import { Bell, Pause, Play } from 'lucide-react'
import { useRef, useState } from 'react'
import { EASE_OUT, useMotionEnabled } from '../../lib/motion'
import { categories } from '../../lib/subscriptionFormatting'
import { formatPreviewINR, trialPreview } from './previewData'
import { bellWiggle, replayViewport } from './landingMotion'
import styles from './Landing.module.css'

export default function ReminderBanner() {
  const ref = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const enabled = useMotionEnabled() && typeof IntersectionObserver !== 'undefined'
  const visible = useInView(ref, replayViewport)
  const entered = !enabled || visible
  const pulsing = enabled && visible && !paused

  return <div ref={enabled ? ref : undefined} className={styles.bannerEntrance}><motion.div className={styles.notificationPreview}
    initial={enabled ? { opacity: 0, y: 18, scale: .98 } : false}
    animate={entered ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 18, scale: .98 }}
    whileHover={enabled ? 'hover' : undefined}
    transition={{ duration: enabled ? entered ? .45 : .16 : 0, ease: EASE_OUT }}>
    <motion.span className={styles.icon} variants={{ hover: bellWiggle }}>
      <Bell size={18} aria-hidden="true" />
    </motion.span>
    <p>{categories[trialPreview.category]} trial ends tomorrow &mdash; {formatPreviewINR(trialPreview.amount)}/mo unless cancelled</p>
    <div className={styles.bannerStatus}>
      <span className={styles.bannerBadge}>
        <motion.span className={styles.pulseWash} aria-hidden="true" animate={{ opacity: pulsing ? [1, .72, 1] : 1 }}
          transition={pulsing ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }} />
        1 day left
      </span>
      {enabled && <button className={styles.pulseToggle} type="button"
        aria-label={paused ? 'Resume reminder pulse' : 'Pause reminder pulse'}
        title={paused ? 'Resume reminder pulse' : 'Pause reminder pulse'}
        onClick={() => setPaused(value => !value)}>
        {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
      </button>}
    </div>
  </motion.div></div>
}
