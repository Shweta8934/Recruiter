// Dummy Payments Data
import type { Payment } from '@/types/payment'

export const payments: Payment[] = [
  {
    id: 'payment-1',
    organizationId: 'org-1',
    planId: 'plan-professional',
    amount: 79,
    currency: 'USD',
    status: 'success',
    paymentMethod: 'credit_card',
    description: 'Professional Plan - Monthly',
    createdAt: '2024-05-01T10:00:00Z',
  },
  {
    id: 'payment-2',
    organizationId: 'org-1',
    planId: 'plan-professional',
    amount: 79,
    currency: 'USD',
    status: 'success',
    paymentMethod: 'credit_card',
    description: 'Professional Plan - Monthly',
    createdAt: '2024-04-01T10:00:00Z',
  },
  {
    id: 'payment-3',
    organizationId: 'org-1',
    planId: 'plan-starter',
    amount: 29,
    currency: 'USD',
    status: 'success',
    paymentMethod: 'credit_card',
    description: 'Starter Plan - Monthly',
    createdAt: '2024-03-01T10:00:00Z',
  },
  {
    id: 'payment-4',
    organizationId: 'org-2',
    planId: 'plan-enterprise',
    amount: 199,
    currency: 'USD',
    status: 'success',
    paymentMethod: 'bank_transfer',
    description: 'Enterprise Plan - Monthly',
    createdAt: '2024-05-10T09:00:00Z',
  },
  {
    id: 'payment-5',
    organizationId: 'org-3',
    planId: 'plan-starter',
    amount: 29,
    currency: 'USD',
    status: 'success',
    paymentMethod: 'credit_card',
    description: 'Starter Plan - Monthly',
    createdAt: '2024-05-05T11:00:00Z',
  },
  {
    id: 'payment-6',
    organizationId: 'org-5',
    planId: 'plan-professional',
    amount: 79,
    currency: 'USD',
    status: 'failed',
    paymentMethod: 'credit_card',
    description: 'Professional Plan - Monthly (Failed)',
    createdAt: '2024-05-12T14:00:00Z',
  },
  {
    id: 'payment-7',
    organizationId: 'org-5',
    planId: 'plan-professional',
    amount: 79,
    currency: 'USD',
    status: 'success',
    paymentMethod: 'credit_card',
    description: 'Professional Plan - Monthly (Retry)',
    createdAt: '2024-05-12T15:00:00Z',
  },
]

export function getPaymentById(id: string): Payment | undefined {
  return payments.find(p => p.id === id)
}

export function getPaymentsByOrganization(orgId: string): Payment[] {
  return payments.filter(p => p.organizationId === orgId)
}

export function getSuccessfulPayments(): Payment[] {
  return payments.filter(p => p.status === 'success')
}

export function getTotalRevenue(): number {
  return getSuccessfulPayments().reduce((sum, p) => sum + p.amount, 0)
}
