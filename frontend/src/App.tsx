import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter, Route, Routes } from 'react-router'
import LandingPage from './features/home/LandingPage'
import AuthProvider from './features/auth/AuthProvider'
import GuestOnly from './features/auth/GuestOnly'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import RequireAuth from './features/auth/RequireAuth'
import AppShell from './features/home/AppShell'
import SubscriptionsPage from './features/subscriptions/SubscriptionsPage'
import CreateSubscriptionPage from './features/subscriptions/CreateSubscriptionPage'
import EditSubscriptionPage from './features/subscriptions/EditSubscriptionPage'
import NotFoundPage from './features/not-found/NotFoundPage'

import DashboardPage from './features/dashboard/DashboardPage'
import NotificationsPage from './features/notifications/NotificationsPage'
import AccountPage from './features/account/AccountPage'

const queryClient = new QueryClient()

export default function App({ client = queryClient }: { client?: QueryClient }) {
  return <QueryClientProvider client={client}>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<GuestOnly />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/subscriptions/new" element={<CreateSubscriptionPage />} />
                <Route path="/subscriptions/:id/edit" element={<EditSubscriptionPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  </QueryClientProvider>
}

