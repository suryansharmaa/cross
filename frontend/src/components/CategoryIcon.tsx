import { BookOpen, Cloud, Headphones, Layers3, ListTodo, ShoppingBag, Tv, Zap } from 'lucide-react'
import type { Category } from '../api/types'

const icons = {
  ENTERTAINMENT: Tv, MUSIC: Headphones, PRODUCTIVITY: ListTodo, CLOUD_AND_AI: Cloud,
  EDUCATION: BookOpen, UTILITIES: Zap, SHOPPING: ShoppingBag, OTHER: Layers3,
}

export default function CategoryIcon({ category }: { category: Category }) {
  const Icon = icons[category]
  return <Icon size={16} aria-hidden="true" />
}
