import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { useState } from 'react'
import type { CategorySpend } from '../../api/types'
import CategoryIcon from '../../components/CategoryIcon'
import { EASE_OUT } from '../../lib/motion'
import { categories, formatINR } from '../../lib/subscriptionFormatting'
import CountUp from './CountUp'
import styles from './Dashboard.module.css'

const formatPercent = (value: number) => Math.round(value) + '%'

export default function CategorySpendCard({
  breakdown, monthlySpend, yearlySpend, enabled,
}: {
  breakdown: CategorySpend[]
  monthlySpend: number
  yearlySpend: number
  enabled: boolean
}) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const topCategory = breakdown.reduce<CategorySpend | undefined>(
    (top, item) => !top || item.yearlySpend > top.yearlySpend ? item : top, undefined,
  )
  return <section className={styles.card + ' ' + styles.categoryCard} aria-labelledby="category-title">
    <header className={styles.cardHeader}>
      <h2 id="category-title">Category spend</h2>
      <span>Monthly breakdown</span>
    </header>
    {yearlySpend > 0 && <div className={styles.categorySegments} aria-hidden="true" onPointerLeave={() => setHoveredCategory(null)}>
      {breakdown.filter(item => item.yearlySpend > 0).map((item, index) =>
        <div key={item.category} data-category={item.category} style={{ flexGrow: item.yearlySpend / yearlySpend }}
          onPointerEnter={() => setHoveredCategory(item.category)}>
          <motion.span initial={enabled ? { scaleX: 0 } : false}
            animate={{ scaleX: 1, opacity: hoveredCategory && hoveredCategory !== item.category ? .32 : 1 }}
            transition={enabled ? {
              scaleX: { duration: .65, ease: EASE_OUT, delay: index * .06 },
              opacity: { duration: .18, ease: EASE_OUT },
            } : { duration: 0 }} />
        </div>,
      )}
    </div>}
    {breakdown.length === 0 ? <div className={styles.empty}>
      <span className={styles.icon}><Inbox size={20} aria-hidden="true" /></span>
      <p>No paying spend yet.</p>
    </div> : <ul className={styles.list}>
      {breakdown.map((item, index) => {
        const share = yearlySpend > 0 ? 100 * item.yearlySpend / yearlySpend : 0
        const delay = index * .06
        const highlighted = hoveredCategory === item.category
        return <motion.li key={item.category} className={styles.category} data-category={item.category}
          data-highlighted={highlighted || undefined} animate={{ x: enabled && highlighted ? 2 : 0 }}
          transition={{ duration: enabled ? .18 : 0, ease: EASE_OUT }}
          onPointerEnter={() => setHoveredCategory(item.category)} onPointerLeave={() => setHoveredCategory(null)}>
          <strong className={styles.categoryLabel}><CategoryIcon category={item.category} />{categories[item.category]}</strong>
          <span className={styles.categoryValue}>
            <CountUp value={share} format={formatPercent} enabled={enabled} duration={.7} delay={delay} /> &middot; <strong className={styles.money}><CountUp value={item.monthlySpend} format={formatINR} enabled={enabled} duration={.7} delay={delay} /></strong>
          </span>
          <div className={styles.track} aria-hidden="true">
            <motion.span style={{ width: share + '%' }} initial={enabled ? { scaleX: 0 } : false} animate={{ scaleX: 1 }}
              transition={enabled ? { duration: .7, ease: EASE_OUT, delay } : { duration: 0 }} />
          </div>
        </motion.li>
      })}
    </ul>}
    <footer className={styles.categoryFooter}>
      <motion.span aria-hidden="true" className={styles.footerLine} initial={enabled ? { scaleX: 0 } : false}
        animate={{ scaleX: 1 }} transition={enabled ? { duration: .45, ease: EASE_OUT } : { duration: 0 }} />
      <div><span>Top category</span><strong>{topCategory ? categories[topCategory.category] : 'None'}</strong></div>
      <div><span>Total paying monthly spend</span><strong className={styles.money}><CountUp value={monthlySpend} format={formatINR} enabled={enabled} /></strong></div>
    </footer>
  </section>
}
