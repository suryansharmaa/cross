import { AnimatePresence, motion, useIsPresent } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import styles from './Motion.module.css'

import { EASE_OUT, SPRING_SNAPPY, useMotionEnabled } from '../lib/motion'

export function PageTransition(props: HTMLMotionProps<'section'>) {
  const enabled = useMotionEnabled()
  return <motion.section initial={enabled ? { opacity: 0, y: 8 } : false}
    animate={{ opacity: 1, y: 0 }} transition={{ duration: enabled ? .28 : 0, ease: EASE_OUT }} {...props} />
}

export function Reveal(props: HTMLMotionProps<'div'>) {
  const enabled = useMotionEnabled() && typeof IntersectionObserver !== 'undefined'
  const [focused, setFocused] = useState(false)
  return <motion.div initial={enabled ? { opacity: 0, y: 20 } : false}
    animate={focused ? { opacity: 1, y: 0 } : undefined}
    onFocusCapture={() => setFocused(true)}
    whileInView={enabled ? { opacity: 1, y: 0 } : undefined}
    viewport={{ once: true, amount: .2 }} transition={{ duration: .5, ease: EASE_OUT }} {...props} />
}

export function StaggerList({ visible, ...props }: HTMLMotionProps<'ul'> & { visible: boolean }) {
  const enabled = useMotionEnabled() && typeof IntersectionObserver !== 'undefined'
  return <motion.ul initial={enabled ? 'hidden' : false} animate={visible || !enabled ? 'visible' : 'hidden'}
    variants={{ visible: { transition: { staggerChildren: enabled ? .05 : 0 } } }} {...props} />
}

const staggerItemVariants = {
  hidden: { opacity: 0, y: 10, transition: { duration: .16, ease: EASE_OUT } },
  visible: { opacity: 1, y: 0, transition: { duration: .26, ease: EASE_OUT } },
}

export function StaggerItem(props: HTMLMotionProps<'li'>) {
  const enabled = useMotionEnabled() && typeof IntersectionObserver !== 'undefined'
  return <motion.li variants={enabled ? staggerItemVariants : undefined} {...props} />
}

export function ListTransition({ listKey, ready, children, className }: {
  listKey: string
  ready: boolean
  children: ReactNode
  className: string
}) {
  const enabled = useMotionEnabled()
  if (!enabled) return <ul key={listKey} className={className}>{children}</ul>
  return <AnimatePresence mode="wait" initial={false}>
    {ready && <TransitionList key={listKey} className={className}>{children}</TransitionList>}
  </AnimatePresence>
}

function TransitionList({ children, className }: { children: ReactNode; className: string }) {
  const present = useIsPresent()
  return <motion.ul className={className} inert={!present}
    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
    transition={{ duration: .12, ease: EASE_OUT }}>{children}</motion.ul>
}

export function MotionPresence({ children, custom }: { children: ReactNode; custom?: string }) {
  const enabled = useMotionEnabled()
  return enabled ? <AnimatePresence initial={false} custom={custom}>{children}</AnimatePresence> : <>{children}</>
}

export function ActivePill({ id, className = '' }: { id: string; className?: string }) {
  const enabled = useMotionEnabled()
  return <motion.span aria-hidden="true" className={styles.pill + ' ' + className}
    layoutId={enabled ? id : undefined} transition={SPRING_SNAPPY} />
}

export function TactileButton({ type = 'button', ...props }: ComponentProps<typeof motion.button>) {
  const enabled = useMotionEnabled()
  return <motion.button type={type} whileTap={enabled && !props.disabled ? { scale: .97 } : undefined} {...props} />
}

export function FilterButton({ id, active, className, children, ...props }: ComponentProps<'button'> & {
  id: string
  active: boolean
}) {
  return <button type="button" {...props} className={styles.filter + ' ' + className} aria-pressed={active}>
    {active && <ActivePill id={id} className={styles.filterPill} />}
    <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
  </button>
}

export function Collapse({ children, duration = .23 }: { children: ReactNode; duration?: number }) {
  const enabled = useMotionEnabled()
  const present = useIsPresent()
  return <motion.div inert={!present} initial={enabled ? { height: 0, opacity: 0, overflow: 'hidden' } : false}
    animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
    exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
    transition={{ duration: enabled ? duration : 0, ease: EASE_OUT }}>
    {children}
  </motion.div>
}
