import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { EASE_OUT, SPRING_SNAPPY, useMotionEnabled } from '../../lib/motion'
import AnimatedRupee from './AnimatedRupee'
import { ChartNoAxesColumn, Clock3, Layers, Wallet } from 'lucide-react'
import CategoryIcon from '../../components/CategoryIcon'
import { categories } from '../../lib/subscriptionFormatting'
import { formatPreviewINR, monthlyPreviewSpend, paidSubscriptions, trialPreview } from './previewData'
import { replayViewport } from './landingMotion'
import styles from './Landing.module.css'

const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']
const monthly = formatPreviewINR(monthlyPreviewSpend)
const trial = formatPreviewINR(trialPreview.amount)
const baseline = 184
const height = (amount: number) => amount * 0.08
const lift = { hover: { y: -4 }, rest: { y: 0 } }
const iconPop = { hover: { scale: 1.08 }, rest: { scale: 1 } }

function roundedTopBar(x: number, y: number, bottom: number) {
  return 'M' + x + ' ' + bottom + ' V' + (y + 6) +
    ' q0 -6 6 -6 h6 q6 0 6 6 V' + bottom + ' Z'
}

export default function SpendPreview() {
  const enabled = useMotionEnabled() && typeof IntersectionObserver !== 'undefined'
  const grid = useRef<HTMLDivElement>(null)
  const inView = useInView(grid, replayViewport)
  const visible = !enabled || inView
  const [hovered, setHovered] = useState<string | null>(null)
  const cardMotion = {
    animate: 'rest',
    whileHover: enabled ? 'hover' : undefined,
    variants: lift,
    transition: enabled ? SPRING_SNAPPY : { duration: 0 },
  }
  const fill = (duration: number, delay = 0) => ({
    initial: enabled ? { scaleX: 0 } : false as const,
    animate: { scaleX: visible ? 1 : 0 },
    transition: { duration: enabled && visible ? duration : 0, delay: enabled && visible ? delay : 0, ease: EASE_OUT },
  })
  return <div className={styles.spendGrid} ref={enabled ? grid : undefined}>
    <motion.div className={styles.spendCard} {...cardMotion}>
      <h3><motion.span className={styles.spendIcon} variants={iconPop}><Wallet size={18} aria-hidden="true" /></motion.span>Recurring spend
        <motion.span className={styles.spendDivider} aria-hidden="true" {...fill(.45)} />
      </h3>
      <dl className={styles.totals}>
        <div><dt>Monthly</dt><dd><AnimatedRupee amount={monthlyPreviewSpend} visible={visible} /></dd></div>
        <div><dt>Yearly</dt><dd><AnimatedRupee amount={monthlyPreviewSpend * 12} visible={visible} /></dd></div>
      </dl>
      <div className={styles.pending}><Clock3 size={18} aria-hidden="true" />
        <p><strong>Pending Trials</strong> &middot; +<AnimatedRupee amount={trialPreview.amount} visible={visible} />/mo if converted</p>
      </div>
    </motion.div>
    <motion.div className={styles.spendCard} {...cardMotion}>
      <h3><motion.span className={styles.spendIcon} variants={iconPop}><Layers size={18} aria-hidden="true" /></motion.span>Spend by category
        <motion.span className={styles.spendDivider} aria-hidden="true" {...fill(.45)} />
      </h3>
      <div className={styles.spendSegments} aria-hidden="true" onPointerLeave={() => setHovered(null)}>
        {paidSubscriptions.map(({ category, amount, bar }, index) =>
          <div key={category} data-category={category} style={{ flexGrow: amount / monthlyPreviewSpend }}
            onPointerEnter={() => setHovered(category)}>
            <span data-dimmed={hovered !== null && hovered !== category || undefined}>
              <motion.span className={styles[bar]} {...fill(.7, index * .05)} />
            </span>
          </div>)}
      </div>
      <ul className={styles.breakdown}>
        {paidSubscriptions.map(({ category, amount, bar }, index) => <li key={category} data-highlighted={hovered === category || undefined}
          onPointerEnter={() => setHovered(category)} onPointerLeave={() => setHovered(null)}>
          <span className={styles.category}><CategoryIcon category={category} />{categories[category]}</span>
          <strong className={styles.money}><AnimatedRupee amount={amount} visible={visible} delay={index * .05} /></strong>
          <span className={styles.categoryTrack} aria-hidden="true">
            <motion.span className={styles[bar]} style={{ width: (amount / monthlyPreviewSpend * 100) + '%' }}
              {...fill(.7, index * .05)} />
          </span>
        </li>)}
      </ul>
    </motion.div>
    <motion.figure className={styles.spendCard + ' ' + styles.projection} {...cardMotion}>
      <h3><motion.span className={styles.spendIcon} variants={iconPop}><ChartNoAxesColumn size={18} aria-hidden="true" /></motion.span>6-month spend projection
        <motion.span className={styles.spendDivider} aria-hidden="true" {...fill(.45)} />
      </h3>
      <svg className={styles.forecast} viewBox="0 0 352 214" role="img"
        aria-label={'November through April: ' + monthly + ' per month in active spend. April adds ' + trial + ' if the trial converts.'}>
        {[0, 1000, 2000].map(amount => {
          const y = baseline - height(amount)
          return <g key={amount}>
            <text x="0" y={y + 4}>{'\u20B9'}{amount === 0 ? '0' : amount / 1000 + 'k'}</text>
            <line x1="38" y1={y} x2="350" y2={y} className={styles.axis} />
          </g>
        })}
        {months.map((month, index) => {
          const x = 53 + index * 51
          const top = baseline - height(monthlyPreviewSpend)
          const upcoming = index === months.length - 1
          return <g key={month}>
            <motion.g className={styles.chartBars}
              initial={enabled ? { scaleY: 0 } : false}
              animate={{ scaleY: visible ? 1 : 0 }}
              transition={{ duration: enabled && visible ? .7 : 0, ease: EASE_OUT, delay: enabled && visible ? index * .04 : 0 }}>
              {upcoming ? <>
                <rect x={x} y={top} width="18" height={baseline - top} />
                <path className={styles.forecastExtra} d={roundedTopBar(x, top - height(trialPreview.amount), top)} />
              </> : <path d={roundedTopBar(x, top, baseline)} />}
            </motion.g>
            <text x={x + 9} y="205" textAnchor="middle">{month}</text>
          </g>
        })}
      </svg>
      <figcaption>
        <ul className={styles.chartLegend}>
          <li><span aria-hidden="true" />Active spend</li>
          <li><span aria-hidden="true" />If trial converts</li>
        </ul>
        <p>April adds {trial} if the Education trial converts.</p>
      </figcaption>
    </motion.figure>
  </div>
}
