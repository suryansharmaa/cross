import { Link } from 'react-router'
import AuthLayout from '../auth/AuthLayout'

export default function NotFoundPage() {
  return <AuthLayout title="Page not found"><Link to="/">Home</Link></AuthLayout>
}
