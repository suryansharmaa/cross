import { AnimatePresence, LayoutGroup, motion, useInView } from 'framer-motion'
import { EASE_OUT, SPRING_SNAPPY, useMotionEnabled } from '../../lib/motion'
import { useRef, useState } from 'react'
import AnimatedRupee from './AnimatedRupee'
import { StaggerItem, StaggerList } from '../../components/Motion'
import { Bell, CalendarDays, CreditCard, LayoutDashboard } from 'lucide-react'
import CategoryIcon from '../../components/CategoryIcon'
import { categories, formatCalendarDate } from '../../lib/subscriptionFormatting'
import { monthlyPreviewSpend, paidSubscriptions, trialPreview } from './previewData'
import { bellWiggle, replayViewport } from './landingMotion'
import styles from './Landing.module.css'

const subscriptions = [...paidSubscriptions, trialPreview]
type Plan = typeof subscriptions[number]

export default function SubscriptionPreview() {
  const enabled = useMotionEnabled()
  const preview = useRef<HTMLElement>(null)
  const canReveal = enabled && typeof IntersectionObserver !== 'undefined'
  const visible = useInView(preview, replayViewport)
  const inView = !canReveal || visible
  const [{ plan: selected, previousAmount, interacted }, setSelection] = useState<{
    plan: Plan
    previousAmount: number
    interacted: boolean
  }>({
    plan: trialPreview, previousAmount: trialPreview.amount, interacted: false,
  })
  const ring = enabled && interacted && selected.tone !== 'neutral'
  const isTrial = selected === trialPreview
  const reminder = isTrial ? "Trial ends tomorrow" : selected.tone === "warning" ? "3-day reminder" : "No reminder due yet"

  const detail = <div className={styles.previewDetail}>
    <motion.span className={styles.icon} variants={{ hover: bellWiggle }}>
      <motion.span className={styles.iconGlyph} animate={ring ? bellWiggle : undefined}>
        <Bell size={20} aria-hidden="true" />
      </motion.span>
    </motion.span>
    <span className={styles[selected.tone]}>{selected.status}</span>
    <h3>{reminder}</h3>
    <strong className={styles.alertAmount}><AnimatedRupee amount={selected.amount} startAt={previousAmount} duration={.35} replay={false} /></strong>
    <span>{categories[selected.category]} {isTrial ? "per month after the trial" : "per month"}</span>
    <span className={styles.alertDate}><CalendarDays size={16} aria-hidden="true" /><time dateTime={selected.next}>{formatCalendarDate(selected.next)}</time></span>
  </div>

  return <section ref={canReveal ? preview : undefined} className={styles.canvas} id="preview" aria-labelledby="preview-title">
    <div className={styles.window}>
      <div className={styles.windowBar}>
        <span className={styles.windowBrand}>Cross</span>
        <span className={styles.previewNav}><LayoutDashboard size={16} aria-hidden="true" />Dashboard</span>
        <span className={styles.previewCurrent}><CreditCard size={16} aria-hidden="true" />Subscriptions</span>
        <span className={styles.burn}><strong><AnimatedRupee amount={monthlyPreviewSpend} visible={inView} /></strong> / month</span>
      </div>
      <div className={styles.productBody}>
        <div>
          <h2 id="preview-title">Upcoming subscriptions</h2>
          <LayoutGroup>
            <StaggerList className={styles.rows} visible={inView}>
              {subscriptions.map((plan, index) => <StaggerItem key={plan.category}>
                {selected === plan && <motion.div className={styles.previewSelection} aria-hidden="true"
                  layoutId={enabled ? 'hero-preview-active-row' : undefined} transition={SPRING_SNAPPY} />}
                <motion.button type="button" aria-pressed={selected === plan} aria-controls="preview-detail"
                  animate="rest" whileHover={enabled ? 'hover' : undefined}
                  onClick={() => setSelection(current => current.plan === plan ? current :
                    { plan, previousAmount: current.plan.amount, interacted: true })}>
                  <motion.span className={styles.icon} variants={{ hover: { scale: 1.06 }, rest: { scale: 1 } }}
                    transition={SPRING_SNAPPY}><CategoryIcon category={plan.category} /></motion.span>
                  <motion.span className={styles.rowName} variants={{ hover: { x: 2 }, rest: { x: 0 } }}
                    transition={SPRING_SNAPPY}><strong>{categories[plan.category]}</strong><small>{plan === trialPreview ? "14-day Trial" : "Monthly"} &middot; <time dateTime={plan.next}>{formatCalendarDate(plan.next)}</time></small></motion.span>
                  <motion.span className={styles[plan.tone] + ' ' + styles.previewStatus}
                    animate={enabled && inView && plan.tone === 'urgent' ? { opacity: [1, .72, 1] } : { opacity: 1 }}
                    transition={enabled && inView && plan.tone === 'urgent' ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }}>
                    {plan.tone !== 'neutral' && <span className={styles.alertDot} aria-hidden="true">
                      {enabled && inView && <motion.span className={styles.alertSonar} initial={{ scale: 1, opacity: .55 }}
                        animate={{ scale: [1, 2.1], opacity: [.55, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }} />}
                    </span>}
                    {plan.status}
                  </motion.span>
                  <strong className={styles.money}><AnimatedRupee amount={plan.amount} visible={inView} delay={index * .05} /></strong>
                </motion.button>
              </StaggerItem>)}
            </StaggerList>
          </LayoutGroup>
        </div>
        <motion.aside className={styles.alertPanel} id="preview-detail" aria-label="Plan details" aria-live="polite"
          whileHover={enabled ? 'hover' : undefined}>
          {enabled ? <AnimatePresence mode="wait" initial={false}>
            <motion.div key={selected.category}
              initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
              transition={{ duration: .2, ease: EASE_OUT }}>
              {detail}
            </motion.div>
          </AnimatePresence> : detail}
        </motion.aside>
      </div>
    </div>
  </section>
}
