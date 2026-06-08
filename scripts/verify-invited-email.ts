import { admin } from '../lib/server/firebase-admin'

async function main() {
  const email = process.argv[2]
  if (!email) throw new Error('Usage: npx tsx scripts/verify-invited-email.ts <email>')

  const user = await admin.auth().getUserByEmail(email)
  if (user.emailVerified) {
    console.log(`Already verified: ${email}`)
    return
  }

  await admin.auth().updateUser(user.uid, { emailVerified: true })
  console.log(`Marked email as verified: ${email}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
