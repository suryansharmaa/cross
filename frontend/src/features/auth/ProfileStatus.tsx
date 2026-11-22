import Alert from '../../components/Alert'
import Button from '../../components/Button'
import AuthLayout from './AuthLayout'
import { useAuth } from './auth-context'

export default function ProfileStatus() {
  const { restoring, retry } = useAuth()
  return <AuthLayout title="Your account">
    {restoring ? <Alert>Loading your account...</Alert> : <>
      <Alert error>Could not load your account. Please try again.</Alert>
      <Button onClick={retry}>Retry</Button>
    </>}
  </AuthLayout>
}
