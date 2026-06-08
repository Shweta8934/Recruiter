import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { logAudit } from '@/lib/server/audit'
import { admin } from '@/lib/server/firebase-admin'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { validateStrongPassword } from '@/lib/server/passwordPolicy'

const passwordSchema = z.object({
  newPassword: z.string().min(12),
  actorUserId: z.string().optional(),
})


export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = passwordSchema.parse(await req.json())
    const passwordError = validateStrongPassword(payload.newPassword)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user || !user.firebaseUid) {
      return NextResponse.json({ error: 'User not found or not linked to Firebase' }, { status: 404 })
    }
    if (user.organizationId) {
      const access = await requireTenantAccess(user.organizationId)
      if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    }

    await admin.auth().updateUser(user.firebaseUid, { password: payload.newPassword })
    await logAudit({
      actorUserId: payload.actorUserId,
      entityType: 'user',
      entityId: id,
      action: 'update',
      metadata: { changed: 'password' }
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update password'
    const status = message.toLowerCase().includes('password') || message.toLowerCase().includes('firebase')
      ? 400
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}
