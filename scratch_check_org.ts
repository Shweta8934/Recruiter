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
    const org = await prisma.organization.findUnique({
      where: { id: 'cmpku3sfj0003ytjljoo58n5f' }
    })
    console.log('Org:', JSON.stringify(org, null, 2))
  } catch (err) {
    console.error('Error:', err)
  }
}

main()
