import { motion } from 'framer-motion'
import { useMotionEnabled } from '../lib/motion'
import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import styles from '../styles/Actions.module.css'

const MotionLink = motion.create(Link)
const MotionPlus = motion.create(Plus)

export default function AddSubscriptionLink({ dashboard = false }: { dashboard?: boolean }) {
  const enabled = useMotionEnabled()
  return <MotionLink animate="rest" whileHover={enabled && dashboard ? 'hover' : undefined}
    variants={{ hover: { y: -1 }, rest: { y: 0 } }}
    whileTap={enabled ? { scale: dashboard ? .96 : .97 } : undefined}
    className={styles.primary + ' ' + styles.compactPill} to="/subscriptions/new">
    <MotionPlus size={16} aria-hidden="true" variants={{ hover: { rotate: 90 }, rest: { rotate: 0 } }}
      transition={{ duration: enabled ? .22 : 0 }} />Add subscription
  </MotionLink>
}
