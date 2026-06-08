import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'
import { requirePermission } from '@/lib/server/rbacGuard'

const SKILL_ALIASES: Record<string, string> = {
  'reactjs': 'react',
  'node js': 'nodejs',
  'node.js': 'nodejs',
  'vuejs': 'vue',
  'angularjs': 'angular',
  // Expand as needed
}

function getPrettySkillName(name: string): string {
  const prettyMap: Record<string, string> = {
    'react': 'React',
    'nodejs': 'Node.js',
    'vue': 'Vue.js',
    'angular': 'Angular',
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'python': 'Python',
    'java': 'Java',
    'csharp': 'C#',
    'cpp': 'C++',
    'c++': 'C++',
    'go': 'Go',
    'rust': 'Rust',
    'php': 'PHP',
    'ruby': 'Ruby',
    'swift': 'Swift',
    'kotlin': 'Kotlin',
    'html': 'HTML',
    'css': 'CSS',
    'sql': 'SQL',
    'mysql': 'MySQL',
    'postgresql': 'PostgreSQL',
    'mongodb': 'MongoDB',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'aws': 'AWS',
    'azure': 'Azure',
    'gcp': 'GCP',
  }
  return prettyMap[name] || name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const skills = await prisma.skill.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' }
    })

    const formattedSkills = skills.map(skill => ({
      ...skill,
      prettyName: getPrettySkillName(skill.name)
    }))

    return NextResponse.json({ skills: formattedSkills })
  } catch (error) {
    console.error('Failed to fetch skills:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { organizationId, name } = body

    if (!organizationId || !name) {
      return NextResponse.json({ error: 'Organization ID and name are required' }, { status: 400 })
    }
    const perm = await requirePermission({ organizationId, module: 'skills' as any, action: 'create' })
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // Sanitize and resolve alias
    let processedName = name.trim().toLowerCase()
    processedName = SKILL_ALIASES[processedName] || processedName

    // Check for duplicate
    const existing = await prisma.skill.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: processedName
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'This skill already exists. Please use the existing one.' }, { status: 400 })
    }

    const newSkill = await prisma.skill.create({
      data: {
        organizationId,
        name: processedName
      }
    })

    return NextResponse.json({ 
      skill: {
        ...newSkill,
        prettyName: getPrettySkillName(newSkill.name)
      }
    })
  } catch (error) {
    console.error('Failed to create skill:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
