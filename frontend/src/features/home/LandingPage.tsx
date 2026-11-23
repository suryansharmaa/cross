import { motion } from 'framer-motion'
import { ArrowRight, ChevronDown, Icon, Mail } from 'lucide-react'
import { Link } from 'react-router'
import ContainerScroll from '../../components/ContainerScroll'
import BlurSection from '../../components/BlurSection'
import { ActivePill } from '../../components/Motion'
import ClosingSpotlight from './ClosingSpotlight'
import RemindersTimeline from './RemindersTimeline'
import ReminderBanner from './ReminderBanner'
import { landingSections, useLandingSection } from './useLandingSection'
import Button from '../../components/Button'
import Wordmark from '../../components/Wordmark'
import { SPRING_SNAPPY, useMotionEnabled } from '../../lib/motion'
import { useAuth } from '../auth/auth-context'
import SubscriptionPreview from './SubscriptionPreview'
import SpendPreview from './SpendPreview'
import styles from './Landing.module.css'

const MotionLink = motion.create(Link)

export default function LandingPage() {
  const enabled = useMotionEnabled()
  const [active, setActive] = useLandingSection()
  const { user, restoring, failed, retry } = useAuth()
  const closingLink = <MotionLink className={styles.closingAction} to={user ? '/dashboard' : '/register'}
    initial={false} animate="rest" whileHover={enabled ? 'hover' : undefined}
    whileTap={enabled ? { scale: .97 } : undefined}
    variants={{ hover: { y: -1, scale: 1.01 }, rest: { y: 0, scale: 1 } }}
    transition={enabled ? SPRING_SNAPPY : { duration: 0 }}>
    {user ? 'Open dashboard' : 'Create an account'}
    <motion.span className={styles.iconGlyph} variants={{ hover: { x: 3 }, rest: { x: 0 } }}
      transition={enabled ? SPRING_SNAPPY : { duration: 0 }}>
      <ArrowRight size={16} aria-hidden="true" />
    </motion.span>
  </MotionLink>
  const actions = restoring ? <span role="status">Loading your account{'\u2026'}</span> :
    failed ? <><span role="status">Could not load your account.</span><Button onClick={retry}>Retry</Button></> :
    user ? closingLink :
    <>{closingLink}
      <Link className={styles.ghostAction} to="/login">Log in</Link></>

  return <div className={styles.page} id="top">
    <header className={styles.sticky}>
      <div className={styles.header}>
        <Wordmark className={enabled ? styles.animatedBrand : undefined} />
        <nav aria-label="Page sections">
          {landingSections.map(({ id, label }) => <a key={id} href={'#' + id}
            aria-current={active === id ? 'location' : undefined} onClick={() => setActive(id)}>
            {active === id && <ActivePill id="landing-nav-pill" className={styles.navPill} />}
            {label}
          </a>)}
        </nav>
        <div className={styles.navActions}>
          {user ? <Link className={styles.navAction} to="/dashboard">Open dashboard</Link> :
            !restoring && !failed && <>
              <Link to="/login">Log in</Link>
              <MotionLink className={styles.navAction} to="/register"
                whileHover={enabled ? { y: -1 } : undefined} whileTap={enabled ? { scale: .96 } : undefined}
                transition={enabled ? SPRING_SNAPPY : { duration: 0 }}>Get started</MotionLink>
            </>}
        </div>
      </div>
    </header>
    <main id="main" tabIndex={-1}>
      <section id="overview" className={styles.hero}>
        <ContainerScroll titleComponent={<>
          <h1>Track free trials and subscriptions.</h1>
          <p>Get in-app alerts 3 days and 1 day before billing, and see what you spend in rupees.</p>
        </>}>
          <SubscriptionPreview />
        </ContainerScroll>
        <a className={styles.scrollCue} href="#reminders">Explore reminders <ChevronDown size={16} aria-hidden="true" /></a>
      </section>
      <BlurSection id="reminders" className={styles.alternate}>
        <div className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>A reminder before the charge.</h2>
            <p>Log a trial or subscription and its billing date. Cross gives you time to decide before it renews.</p>
          </div>
          <RemindersTimeline />
          <ReminderBanner />
        </div>
      </BlurSection>
      <BlurSection id="spending" className={styles.spendSection}>
        <div className={styles.sectionHeading}>
          <h2>Subscription spend, in INR.</h2>
          <p>See monthly and yearly totals, where your money goes, and what pending trials could add if they convert.</p>
        </div>
        <SpendPreview />
      </BlurSection>
      <BlurSection><ClosingSpotlight>
        <div>
          <h2>Cancel what you don&rsquo;t use. Keep what you do.</h2>
          <p>Track trials and recurring plans in INR with reminders 3 days and 1 day before billing.</p>
        </div>
        <div className={styles.actions}>{actions}</div>
      </ClosingSpotlight></BlurSection>
    </main>
    <footer className={styles.footer} id="contact">
      <div><Wordmark /><p>Free-trial and subscription tracker built for INR.</p></div>
      <div className={styles.footerLinks}>
        <div>
          <h2>Product</h2>
          <nav aria-label="Footer sections">
            <a href="#overview">Overview</a>
            <a href="#reminders">Reminders</a>
            <a href="#spending">Spending</a>
          </nav>
        </div>
        <div className={styles.contact}>
          <h2>Contact</h2>
          <a href="https://www.linkedin.com/in/suryansharmaa" target="_blank" rel="noopener noreferrer">
            <Icon size={16} aria-hidden="true" iconNode={[
              ['path', { d: 'M4 9h4v12H4z M11 9h4v2a4 4 0 0 1 7 3v7h-4v-6a1.5 1.5 0 0 0-3 0v6h-4z', key: 'letters' }],
              ['circle', { cx: '6', cy: '5', r: '2', key: 'dot' }],
            ]} />LinkedIn
          </a>
          <a href="mailto:suryansharmaa@gmail.com"><Mail size={16} aria-hidden="true" />suryansharmaa@gmail.com</a>
        </div>
      </div>
      <div className={styles.footerMeta}><p>Built by Suryansh Sharma</p><a href="#top">Back to top</a></div>
    </footer>
  </div>
}
