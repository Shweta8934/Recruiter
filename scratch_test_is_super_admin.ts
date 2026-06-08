import fs from 'fs'
import path from 'path'

// Load .env file manually
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1)
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  })
}

async function main() {
  try {
    const { prisma } = await import('./lib/server/prisma')
    const { isSuperAdmin, isOrgAdmin } = await import('./lib/rbac')

    const users = await prisma.user.findMany({
      include: { role: true }
    })

    console.log('Testing RBAC functions on users:')
    for (const u of users) {
      const userParam = {
        ...u,
        roleSlug: u.role?.slug || null
      }
      console.log(`- User: ${u.email}, Name: ${u.name}, RoleSlug: ${u.role?.slug}`)
      console.log(`  isSuperAdmin: ${isSuperAdmin(userParam)}`)
      console.log(`  isOrgAdmin: ${isOrgAdmin(userParam)}`)
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

main()
