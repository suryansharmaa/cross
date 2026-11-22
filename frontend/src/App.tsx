import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
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

const queryClient = new QueryClient()

export default function App({ client = queryClient }: { client?: QueryClient }) {
  return <QueryClientProvider client={client}>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/subscriptions" replace />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/subscriptions/new" element={<CreateSubscriptionPage />} />
              <Route path="/subscriptions/:id/edit" element={<EditSubscriptionPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
}
