import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { signToken, verifyToken } from '@/lib/server/jwt'
import { cookies } from 'next/headers'

const schema = z.object({
  targetOrganizationId: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyToken(sessionToken)
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const payload = schema.parse(await req.json())
    const targetOrgId = payload.targetOrganizationId

    // Verify if the user belongs to the target organization
    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: decoded.id,
          organizationId: targetOrgId,
        }
      },
      include: {
        organization: true,
      }
    })

    if (!membership || membership.status !== 'active' || membership.organization.status !== 'active') {
      return NextResponse.json({ error: 'You do not have access to this organization or it is inactive.' }, { status: 403 })
    }

    // Since we don't have custom roles for Phase 1, we will map membership role back to Role table.
    // Wait, `membership.role` is a string ('owner', 'recruiter', 'interviewer').
    // The `User.roleId` expects a foreign key to the `Role` table. Let's find the matching Role.
    let roleRecord = await prisma.role.findFirst({
      where: {
        slug: membership.role,
        OR: [
          { organizationId: targetOrgId },
          { organizationId: null }
        ]
      }
    });

    // Update the user's active organization and role
    const updatedUser = await prisma.user.update({
      where: { id: decoded.id },
      data: {
        organizationId: targetOrgId,
        roleId: roleRecord?.id || null,
      },
      include: {
        role: true,
      }
    })

    // Issue new token
    const token = await signToken({
      id: updatedUser.id,
      email: updatedUser.email,
      roleId: updatedUser.roleId,
      roleSlug: updatedUser.role?.slug,
    })

    // Set the new session cookie
    cookieStore.set({
      name: 'session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return NextResponse.json({
      message: 'Switched successfully',
      organizationId: targetOrgId,
      roleId: updatedUser.roleId,
      roleSlug: updatedUser.role?.slug,
    })

  } catch (err: any) {
    console.error('Error switching tenant:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
