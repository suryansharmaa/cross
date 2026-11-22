import { useLocation } from 'react-router'
import AuthForm from './AuthForm'
import { useAuth } from './auth-context'

export default function LoginPage() {
  const { state } = useLocation()
  const { signIn } = useAuth()
  const notice = typeof state?.notice === 'string' ? state.notice : undefined
  return <AuthForm registering={false} submit={signIn} notice={notice} />
}
