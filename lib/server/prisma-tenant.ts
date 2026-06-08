import { prisma } from './prisma'

/**
 * Creates a Prisma client scoped to a specific organization.
 * Any query made through this client on the specified models will automatically
 * append `organizationId: activeTenantId` to the `where` clause.
 */
export function getTenantPrisma(activeTenantId: string) {
  if (!activeTenantId) {
    throw new Error('Tenant isolation error: activeTenantId is required to instantiate tenant-scoped Prisma client.')
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantModels = [
            'Job',
            'JobApplication',
            'Skill',
            'Section',
            'Department',
            'Project',
            'Activity',
            'EvaluationTemplate',
            'QuestionPaper',
            'CandidateTestAttempt',
            'CandidatePool',
            'TemplateUsage',
            'Payment'
          ]

          // If the model is tenant-scoped and the operation supports filtering
          if (tenantModels.includes(model)) {
            if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              
              // For operations that require a unique 'where' clause, we must inject organizationId
              // Note: Prisma requires unique fields for findUnique/update/delete.
              // If the unique field doesn't compound with organizationId, injecting it might throw an error.
              // In production, we usually use `findFirst` instead of `findUnique` if we inject organizationId,
              // or ensure all unique constraints include organizationId.
              // For safety in this incremental phase, we just inject it into the `where` payload.
              
              const anyArgs = args as any;
              if (anyArgs.where) {
                anyArgs.where.organizationId = activeTenantId;
              } else {
                anyArgs.where = { organizationId: activeTenantId };
              }
            } else if (operation === 'create' || operation === 'createMany') {
               const anyArgs = args as any;
               if (anyArgs.data) {
                 if (Array.isArray(anyArgs.data)) {
                   anyArgs.data.forEach((d: any) => { d.organizationId = activeTenantId });
                 } else {
                   anyArgs.data.organizationId = activeTenantId;
                 }
               }
            }
          }

          return query(args)
        }
      }
    }
  })
}
