import { useNavigate } from 'react-router'
import { register } from '../../api/auth'
import AuthForm from './AuthForm'

export default function RegisterPage() {
  const navigate = useNavigate()
  return <AuthForm registering submit={async credentials => {
    await register(credentials)
    void navigate('/login', { replace: true, state: { notice: 'Account created. Log in to continue.' } })
  }} />
}
