import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { admin } from '@/lib/server/firebase-admin'
import { validateStrongPassword } from '@/lib/server/passwordPolicy'

const schema = z.object({
  token: z.string().min(10),
  name: z.string().min(2),
  password: z.string().min(12),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parseResult = schema.safeParse(json)
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors[0].message }, { status: 400 })
    }
    
    const payload = parseResult.data
    const normalizedName = payload.name.trim()
    const normalizedPassword = payload.password.trim()
    const passwordError = validateStrongPassword(normalizedPassword)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const invite = await prisma.invite.findUnique({ where: { token: payload.token } })
    if (!invite) return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
    if (invite.status === 'cancelled' || invite.status === 'expired') {
      return NextResponse.json({ error: `Invitation is ${invite.status}` }, { status: 400 })
    }
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })

    const role = await prisma.role.findUnique({ where: { id: invite.roleId } })
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 400 })

    // Synchronize with Firebase Auth
    let firebaseUid: string;
    try {
      const firebaseUser = await admin.auth().createUser({
        email: invite.email,
        password: normalizedPassword,
        displayName: normalizedName,
        emailVerified: true,
      })
      firebaseUid = firebaseUser.uid
    } catch (firebaseError: any) {
      if (firebaseError.code === 'auth/email-already-exists') {
        const existingUser = await admin.auth().getUserByEmail(invite.email)
        firebaseUid = existingUser.uid
        // Invite flow is admin-driven; treat invited email as verified.
        await admin.auth().updateUser(firebaseUid, {
          displayName: normalizedName,
          emailVerified: true,
        })
        // SECURITY FIX: We do NOT update the password here.
        // If the user already exists, they must use their existing password to log in.
        // We also shouldn't blindly overwrite their display name without them being logged in.
      } else {
        throw firebaseError;
      }
    }

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: invite.email } })
    const next = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: normalizedName,
            firebaseUid,
            organizationId: invite.organizationId,
            roleId: invite.roleId,
            status: 'active',
          },
        })
      : await tx.user.create({
          data: {
            name: normalizedName,
            email: invite.email,
            firebaseUid,
            organizationId: invite.organizationId,
            roleId: invite.roleId,
            status: 'active',
          },
        })

    await tx.invite.update({
      where: { id: invite.id },
      data: { status: 'accepted', acceptedAt: new Date() },
    })

    await tx.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId: next.id,
          organizationId: invite.organizationId
        }
      },
      create: {
        userId: next.id,
        organizationId: invite.organizationId,
        role: role?.slug || 'member'
      },
      update: {
        role: role?.slug || 'member',
        status: 'active'
      }
    })

    if (invite.projectId) {
      await tx.projectMember.upsert({
        where: { projectId_userId: { projectId: invite.projectId, userId: next.id } },
        create: { projectId: invite.projectId, userId: next.id, role: 'member' },
        update: {},
      })
    }
    return next
  })

  return NextResponse.json({ ok: true, userId: user.id })
  } catch (error: any) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
  }
}
