import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { mkdir } from 'fs/promises'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const folder = formData.get('folder') as string || 'questions'
    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), `public/uploads/${folder}`)
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (e) {
      // directory already exists
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const filename = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const savedFilename = `${uniqueSuffix}-${filename}`
    const filepath = path.join(uploadDir, savedFilename)

    await writeFile(filepath, buffer)

    return NextResponse.json({ url: `/uploads/${folder}/${savedFilename}` })
  } catch (error) {
    console.error('Error saving uploaded file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
