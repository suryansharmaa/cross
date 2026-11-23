import { LayoutGroup, motion } from 'framer-motion'
import { ActivePill, PageTransition } from '../../components/Motion'
import { CreditCard, LayoutGrid, LogOut, UserRound } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import Wordmark from '../../components/Wordmark'
import { SPRING_SNAPPY, useMotionEnabled } from '../../lib/motion'
import NotificationsLink from '../notifications/NotificationsLink'
import { useAuth } from '../auth/auth-context'
import styles from './Home.module.css'

function SidebarPill() {
  return <ActivePill id="sidebar-active-pill" className={styles.activePill} />
}

const MotionLogOut = motion.create(LogOut)

export default function AppShell() {
  const enabled = useMotionEnabled()
  const { pathname } = useLocation()
  const { signOut } = useAuth()
  return <div className={styles.shell}>
    <LayoutGroup>
      <header className={styles.sidebar} aria-label="Application" data-icon-motion={enabled || undefined}>
        <Wordmark className={styles.brand} to="/dashboard" />
        <nav className={styles.nav} aria-label="Primary">
          <NavLink to="/dashboard" end>
          {({ isActive }) => <>{isActive && <SidebarPill />}
            <LayoutGrid size={16} aria-hidden="true" />Dashboard
          </>}
        </NavLink>
          <NavLink to="/subscriptions">
          {({ isActive }) => <>{isActive && <SidebarPill />}
            <CreditCard size={16} aria-hidden="true" />Subscriptions
          </>}
        </NavLink>
          <NotificationsLink activeIndicator={<SidebarPill />} />
        </nav>
        <div className={styles.utilities}>
          <NavLink to="/account">
          {({ isActive }) => <>{isActive && <SidebarPill />}
            <UserRound size={16} aria-hidden="true" />Account
          </>}
        </NavLink>
          <motion.button className={styles.logout} type="button" onClick={signOut}
            animate="rest" whileHover={enabled ? 'hover' : undefined}>
            <MotionLogOut size={16} aria-hidden="true" variants={{ hover: { x: 3 }, rest: { x: 0 } }}
              transition={enabled ? SPRING_SNAPPY : { duration: 0 }} />Logout
          </motion.button>
        </div>
      </header>
    </LayoutGroup>
    <main className={styles.main}><PageTransition key={pathname}><Outlet /></PageTransition></main>
  </div>
}
