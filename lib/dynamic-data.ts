'use client'

import { roles as seedRoles } from '@/data/roles'
import { users as seedUsers } from '@/data/users'
import { invites as seedInvites } from '@/data/invites'
import { organizations as seedOrganizations } from '@/data/organizations'
import { payments as seedPayments } from '@/data/payments'
import { activities as seedActivities } from '@/data/activity'
import { subscriptionPlans, organizationSubscriptions } from '@/data/subscriptions'

type EntityKey =
  | 'roles'
  | 'users'
  | 'invites'
  | 'organizations'
  | 'payments'
  | 'activities'
  | 'subscriptionPlans'
  | 'organizationSubscriptions'

const STORAGE_PREFIX = 'saas_rbac_dynamic'

const seeds: Record<EntityKey, unknown[]> = {
  roles: seedRoles,
  users: seedUsers,
  invites: seedInvites,
  organizations: seedOrganizations,
  payments: seedPayments,
  activities: seedActivities,
  subscriptionPlans,
  organizationSubscriptions,
}

function key(entity: EntityKey) {
  return `${STORAGE_PREFIX}:${entity}`
}

export function getEntity<T>(entity: EntityKey): T[] {
  if (typeof window === 'undefined') return (seeds[entity] as T[]) ?? []
  const raw = localStorage.getItem(key(entity))
  if (!raw) return (seeds[entity] as T[]) ?? []
  try {
    return JSON.parse(raw) as T[]
  } catch {
    return (seeds[entity] as T[]) ?? []
  }
}

export function setEntity<T>(entity: EntityKey, items: T[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key(entity), JSON.stringify(items))
}

export function addEntityItem<T>(entity: EntityKey, item: T) {
  const items = getEntity<T>(entity)
  setEntity(entity, [...items, item])
}

export function removeEntityItemById<T extends { id: string }>(entity: EntityKey, id: string) {
  const items = getEntity<T>(entity)
  setEntity(entity, items.filter((i) => i.id !== id))
}

export function initializeDynamicData() {
  if (typeof window === 'undefined') return
  ;(Object.keys(seeds) as EntityKey[]).forEach((entity) => {
    if (!localStorage.getItem(key(entity))) {
      localStorage.setItem(key(entity), JSON.stringify(seeds[entity]))
    }
  })
}
