import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import AuthProvider from './features/auth/AuthProvider'
import GuestOnly from './features/auth/GuestOnly'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import RequireAuth from './features/auth/RequireAuth'
import HomePage from './features/home/HomePage'
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
          <Route element={<RequireAuth />}><Route path="/" element={<HomePage />} /></Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
}
