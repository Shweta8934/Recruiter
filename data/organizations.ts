// Dummy Organizations Data
import type { Organization } from '@/types/organization'

export const organizations: Organization[] = [
  {
    id: 'org-1',
    name: 'TechCorp Inc.',
    slug: 'techcorp',
    email: 'admin@techcorp.com',
    industry: 'technology',
    status: 'active',
    createdAt: '2024-01-15T00:00:00Z',
    subscriptionPlanId: 'plan-professional',
    ownerId: 'user-2',
    description: 'Leading technology solutions provider',
  },
  {
    id: 'org-2',
    name: 'HealthFirst Medical',
    slug: 'healthfirst',
    email: 'contact@healthfirst.com',
    industry: 'healthcare',
    status: 'active',
    createdAt: '2024-02-10T00:00:00Z',
    subscriptionPlanId: 'plan-enterprise',
    ownerId: 'user-8',
    description: 'Comprehensive healthcare services',
  },
  {
    id: 'org-3',
    name: 'EduLearn Academy',
    slug: 'edulearn',
    email: 'info@edulearn.com',
    industry: 'education',
    status: 'active',
    createdAt: '2024-03-05T00:00:00Z',
    subscriptionPlanId: 'plan-starter',
    ownerId: 'user-9',
    description: 'Online education platform',
  },
  {
    id: 'org-4',
    name: 'FinanceHub Solutions',
    slug: 'financehub',
    email: 'support@financehub.com',
    industry: 'finance',
    status: 'inactive',
    createdAt: '2024-01-20T00:00:00Z',
    subscriptionPlanId: 'plan-free',
    ownerId: 'user-10',
    description: 'Financial consulting services',
  },
  {
    id: 'org-5',
    name: 'RetailMax Store',
    slug: 'retailmax',
    email: 'hello@retailmax.com',
    industry: 'retail',
    status: 'active',
    createdAt: '2024-04-12T00:00:00Z',
    subscriptionPlanId: 'plan-professional',
    ownerId: 'user-11',
    description: 'E-commerce and retail solutions',
  },
]

export function getOrganizationById(id: string): Organization | undefined {
  return organizations.find(o => o.id === id)
}

export function getOrganizationBySlug(slug: string): Organization | undefined {
  return organizations.find(o => o.slug === slug)
}

export function getActiveOrganizations(): Organization[] {
  return organizations.filter(o => o.status === 'active')
}
