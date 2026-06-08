// Payment Types

export type PaymentStatus = 'success' | 'failed' | 'cancelled' | 'pending'
export type PaymentMethod = 'credit_card' | 'paypal' | 'bank_transfer'

export interface Payment {
  id: string
  organizationId: string
  planId: string
  amount: number
  currency: string
  status: PaymentStatus
  paymentMethod: PaymentMethod
  description: string
  createdAt: string
}

export interface PaymentFormData {
  cardNumber: string
  expiryDate: string
  cvv: string
  cardholderName: string
}

export interface CheckoutSession {
  planId: string
  organizationId: string
  amount: number
  currency: string
}
