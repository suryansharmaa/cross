import { Link } from 'react-router'
import BrandMark from './BrandMark'

export default function Wordmark({ to = '/', className = '' }: { to?: string; className?: string }) {
  return <Link className={['wordmark', className].filter(Boolean).join(' ')} to={to}><BrandMark /></Link>
}
