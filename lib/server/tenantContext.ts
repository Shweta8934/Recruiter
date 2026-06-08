import { prisma } from './prisma'
import { cookies, headers } from 'next/headers'
import { verifyToken } from './jwt'

export async function getTenantContext() {
  const cookieStore = await cookies()
  const headersList = await headers()
  
  const sessionCookie = cookieStore.get('session')?.value
  const authHeader = headersList.get('authorization')
  
  const token = sessionCookie || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null)
  
  if (!token) {
    return null
  }

  try {
    const decoded = await verifyToken(token)
    if (!decoded || !decoded.id) return null
    
    // Check if middleware passed a specific tenant slug
    const tenantSlug = headersList.get('x-tenant-slug')
    
    if (tenantSlug) {
      // Find the organization by slug and check membership
      const org = await prisma.organization.findUnique({
        where: { slug: tenantSlug },
        include: {
          memberships: {
            where: { userId: decoded.id, status: 'active' }
          }
        }
      })
      
      if (org && org.status === 'active' && org.memberships.length > 0) {
        return {
          userId: decoded.id,
          organizationId: org.id,
          isSuperAdmin: false // Or determine from user role if needed globally
        }
      }
    }
    
    // Fallback: Use the user's default/last active organization
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { organizationId: true, role: true }
    })
    
    if (!user || !user.organizationId) return null
    
    return {
      userId: decoded.id,
      organizationId: user.organizationId,
      isSuperAdmin: user.role?.slug === 'super-admin'
    }
  } catch (err) {
    console.error('Error in getTenantContext:', err)
    return null
  }
}

// A helper to get a tenant-scoped prisma client
export async function getTenantPrisma() {
  const ctx = await getTenantContext()
  
  if (!ctx) {
    throw new Error('Unauthorized or missing tenant context')
  }

  // If super admin, they can query across tenants
  if (ctx.isSuperAdmin) {
    return prisma
  }

  // For regular users, wrap prisma to always filter by their organizationId
  // Note: For a robust implementation, Prisma Client Extensions (RLS) is recommended.
  // Here we use a simpler extension.
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Models that are globally shared, DO NOT filter them
          const globalModels = ['User', 'Role', 'Organization', 'OrganizationMembership', 'AuditLog']
          
          if (!globalModels.includes(model)) {
            // Check if the model has an organizationId field
            const hasOrgId = 'organizationId' in (prisma as any)[model].fields
            
            if (hasOrgId) {
              // Inject organizationId into where clause
              if (['findUnique', 'findFirst', 'findMany', 'count', 'update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
                args.where = { ...args.where, organizationId: ctx.organizationId }
              }
              
              if (['create', 'createMany'].includes(operation)) {
                if (Array.isArray(args.data)) {
                  args.data = args.data.map(d => ({ ...d, organizationId: ctx.organizationId }))
                } else {
                  args.data = { ...args.data, organizationId: ctx.organizationId }
                }
              }
              
              if (['upsert'].includes(operation)) {
                args.where = { ...args.where, organizationId: ctx.organizationId }
                args.create = { ...args.create, organizationId: ctx.organizationId }
              }
            }
          }
          
          return query(args)
        }
      }
    }
  })
}
