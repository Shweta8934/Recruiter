import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const organizationId = formData.get('organizationId') as string
    const createdById = formData.get('createdById') as string

    if (!file || !type || !organizationId || !createdById) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    
    // Find the data sheet (either 'Candidates' or 'Data')
    const sheetName = type === 'candidate' ? 'Candidates' : 'Data'
    const sheet = workbook.Sheets[sheetName]

    if (!sheet) {
      return NextResponse.json({ error: `Sheet named '${sheetName}' not found` }, { status: 400 })
    }

    const rows = XLSX.utils.sheet_to_json(sheet) as any[]

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data found in the spreadsheet' }, { status: 400 })
    }

    // Validation & Error Handling Logic
    const errors: { row: number, reason: string }[] = []
    
    // Process Candidate Upload
    if (type === 'candidate') {
      const validCandidates = []
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row.FullName || !row.Email) {
          errors.push({ row: i + 2, reason: 'Missing FullName or Email' })
        } else {
          validCandidates.push({
            organizationId,
            fullName: row.FullName,
            email: row.Email,
            phone: row.Phone?.toString(),
            gender: row.Gender,
            city: row.City,
            company: row.Company,
            source: 'bulk_upload'
          })
        }
      }

      if (errors.length > 0) {
        return generateErrorReport(workbook, sheetName, errors)
      }

      // Upsert candidates
      await prisma.$transaction(
        validCandidates.map(candidate => 
          prisma.candidatePool.upsert({
            where: {
              organizationId_email: {
                organizationId: candidate.organizationId,
                email: candidate.email
              }
            },
            update: {
              fullName: candidate.fullName,
              phone: candidate.phone,
              gender: candidate.gender,
              city: candidate.city,
              company: candidate.company
            },
            create: candidate
          })
        )
      )

      return NextResponse.json({ message: `Successfully imported ${validCandidates.length} candidates` }, { status: 201 })
    } 
    
    // Process Question Upload
    else {
      const validQuestions = []
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        
        if (type === 'general') {
          if (!row.QuestionText || !row.OptionA || !row.OptionB || !row.CorrectAnswer) {
            errors.push({ row: i + 2, reason: 'Missing QuestionText, minimum 2 options, or CorrectAnswer' })
          } else {
            validQuestions.push({
              text: row.QuestionText,
              questionType: 'MCQ',
              options: JSON.stringify([row.OptionA, row.OptionB, row.OptionC, row.OptionD].filter(Boolean)),
              answer: row.CorrectAnswer,
              order: i
            })
          }
        } else if (type === 'coding') {
          if (!row.Title || !row.ProblemStatement) {
            errors.push({ row: i + 2, reason: 'Missing Title or ProblemStatement' })
          } else {
            validQuestions.push({
              text: row.Title + '\n\n' + row.ProblemStatement,
              questionType: 'CODE',
              answer: row.SampleOutput || '',
              options: JSON.stringify({
                supportedLanguages: row.SupportedLanguages,
                constraints: row.Constraints,
                sampleInput: row.SampleInput,
                hiddenTestCases: row.HiddenTestCases
              }),
              order: i
            })
          }
        } else if (type === 'upload') {
          if (!row.QuestionText) {
            errors.push({ row: i + 2, reason: 'Missing QuestionText' })
          } else {
            validQuestions.push({
              text: row.QuestionText,
              questionType: 'FILE',
              answer: '',
              options: JSON.stringify({
                allowedFileTypes: row.AllowedFileTypes,
                maxFileSize: row.MaxFileSize
              }),
              order: i
            })
          }
        }
      }

      if (errors.length > 0) {
        return generateErrorReport(workbook, sheetName, errors)
      }

      // Create Question Paper
      const paperTitle = `Bulk Uploaded ${type.charAt(0).toUpperCase() + type.slice(1)} Test - ${new Date().toLocaleDateString()}`
      
      const result = await prisma.$transaction(async (tx) => {
        const paper = await tx.questionPaper.create({
          data: {
            organizationId,
            createdById,
            title: paperTitle,
            jobTitle: 'Generic Role',
            departmentName: 'Unassigned',
            minExp: 0,
            maxExp: 0,
            duration: 60,
            totalQuestions: validQuestions.length,
            isActive: true,
            isPublicActive: false,
            isTemplate: false,
            skillsList: ''
          }
        })

        const section = await tx.paperSection.create({
          data: {
            questionPaperId: paper.id,
            title: 'Bulk Uploaded Questions',
            order: 0,
            weightage: 100
          }
        })

        await tx.question.createMany({
          data: validQuestions.map(q => ({
            ...q,
            sectionId: section.id
          }))
        })

        return paper
      })

      return NextResponse.json({ message: 'Successfully generated Question Paper', questionPaper: result }, { status: 201 })
    }
    
  } catch (error) {
    console.error('Failed to process upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateErrorReport(workbook: XLSX.WorkBook, sheetName: string, errors: {row: number, reason: string}[]) {
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet) as any[]
  
  // Append error reason to rows
  rows.forEach((row, index) => {
    const error = errors.find(e => e.row === index + 2) // Excel rows are 1-indexed, header is row 1
    if (error) {
      row['ErrorReason'] = error.reason
    }
  })

  const newSheet = XLSX.utils.json_to_sheet(rows)
  workbook.Sheets[sheetName] = newSheet

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  
  return new NextResponse(buffer, {
    status: 400,
    headers: {
      'Content-Disposition': `attachment; filename="error_report.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  })
}
