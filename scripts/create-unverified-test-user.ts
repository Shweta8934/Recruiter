import { admin } from '../lib/server/firebase-admin'
import { prisma } from '../lib/server/prisma'

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  const name = process.argv[4] || 'Unverified Test User'

  if (!email || !password) {
    console.error('Usage: pnpm tsx scripts/create-unverified-test-user.ts <email> <password> [name]')
    process.exit(1)
  }

  if (password.length < 12) {
    console.error('Password should meet policy: 12+ chars recommended for realistic testing.')
    process.exit(1)
  }

  let fbUser
  try {
    fbUser = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
      disabled: false,
    })
  } catch (err: any) {
    if (err?.code === 'auth/email-already-exists') {
      fbUser = await admin.auth().getUserByEmail(email)
      await admin.auth().updateUser(fbUser.uid, {
        displayName: name,
        emailVerified: false,
        disabled: false,
      })
    } else {
      throw err
    }
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      name,
      email,
      firebaseUid: fbUser.uid,
      status: 'active',
    },
    update: {
      name,
      firebaseUid: fbUser.uid,
      status: 'active',
    },
  })

  console.log('Created/updated unverified test user:')
  console.log(JSON.stringify({ id: user.id, email: user.email, firebaseUid: fbUser.uid, emailVerified: false }, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

