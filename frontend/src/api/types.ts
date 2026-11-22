export type Category = 'ENTERTAINMENT' | 'MUSIC' | 'PRODUCTIVITY' | 'CLOUD_AND_AI' | 'EDUCATION' | 'UTILITIES' | 'SHOPPING' | 'OTHER'
export type BillingCycle = 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED'
export interface SubscriptionBody {
  name: string
  category: Category
  amount: number
  billingCycle: BillingCycle
  startDate: string
  isTrial: boolean
  trialEndDate: string | null
  notes: string | null
}
export interface Subscription extends SubscriptionBody {
  id: string
  status: SubscriptionStatus
  nextBillingDate: string | null
  createdAt: string
  updatedAt: string
  cancelledAt: string | null
}
export interface SubscriptionPage {
  items: Subscription[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface Credentials {
  email: string
  password: string
}

export interface UserResponse {
  id: string
  email: string
  createdAt: string
}

export interface LoginResponse {
  accessToken: string
  expiresAt: string
}

export interface FieldError {
  field: string
  message: string
}

export interface CategorySpend {
  category: Category
  count: number
  monthlySpend: number
  yearlySpend: number
}

export interface UpcomingRenewal {
  id: string
  name: string
  category: Category
  amount: number
  billingCycle: BillingCycle
  isTrial: boolean
  nextBillingDate: string
  daysUntil: number
}

export interface DashboardResponse {
  generatedOn: string
  activeCount: number
  monthlySpend: number
  yearlySpend: number
  categoryBreakdown: CategorySpend[]
  trialsPending: { count: number; monthlyIfConverted: number }
  upcomingRenewals: UpcomingRenewal[]
}

export interface NotificationItem {
  id: string
  subscriptionId: string
  kind: 'TRIAL_ENDING' | 'RENEWAL'
  alertType: 'THREE_DAYS' | 'ONE_DAY'
  billingDate: string
  message: string
  createdAt: string
  readAt: string | null
}

export interface NotificationPage {
  items: NotificationItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface UnreadCountResponse { count: number }
export interface ReadAllResponse { updated: number }
