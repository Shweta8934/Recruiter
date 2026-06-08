import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (!type || !['general', 'coding', 'db', 'upload', 'candidate'].includes(type)) {
      return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
    }

    const workbook = XLSX.utils.book_new()

    // 1. Instructions Sheet
    const instructionsData = [
      ['Instructions'],
      ['1. Do not change the column headers.'],
      ['2. Fill in all required fields.'],
      ['3. Save as .xlsx and upload.']
    ]
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

    // 2. Data Sheet based on type
    let headers: string[] = []
    let sheetName = 'Data'

    if (type === 'general') {
      headers = ['QuestionText', 'Topic', 'Difficulty', 'OptionA', 'OptionB', 'OptionC', 'OptionD', 'CorrectAnswer', 'Marks']
    } else if (type === 'coding') {
      headers = ['Title', 'ProblemStatement', 'Topic', 'Difficulty', 'SupportedLanguages', 'Constraints', 'SampleInput', 'SampleOutput', 'HiddenTestCases', 'ScoringLogic']
    } else if (type === 'db') {
      headers = ['QuestionText', 'Topic', 'Difficulty', 'DBType', 'SchemaReference', 'TestInput', 'ExpectedOutput', 'Marks']
    } else if (type === 'upload') {
      headers = ['QuestionText', 'Topic', 'Difficulty', 'AllowedFileTypes', 'MaxFileSize', 'SubmissionInstructions']
    } else if (type === 'candidate') {
      headers = ['FullName', 'Email', 'Phone', 'Gender', 'City', 'Company']
      sheetName = 'Candidates'
    }

    const dataSheet = XLSX.utils.aoa_to_sheet([headers])
    XLSX.utils.book_append_sheet(workbook, dataSheet, sheetName)

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${type}_template.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    })
  } catch (error) {
    console.error('Failed to generate template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
