import { NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
// @ts-ignore
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
// @ts-ignore
const mammoth = require('mammoth');
// @ts-ignore
import { fromBuffer } from 'pdf2pic';
import os from 'os';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 2MB limit' }, { status: 400 })
    }

    let textContent = ''
    let isScannedPdf = false;
    let base64Image = '';

    if (file.type === 'application/pdf') {
      const buffer = Buffer.from(await file.arrayBuffer())
      const data = await pdfParse(buffer)
      textContent = data.text

      // Check if text extraction failed or returned very little text (likely a scanned PDF)
      if (!textContent || textContent.trim().length < 50) {
        isScannedPdf = true;

        try {
          const options = {
            density: 150,
            saveFilename: "scanned_resume",
            savePath: os.tmpdir(),
            format: "jpeg",
            width: 1024,
            height: 1448
          };
          const convert = fromBuffer(buffer, options);
          // Convert the first page
          const result = await convert(1, { responseType: "base64" });
          base64Image = result.base64 as string;
          if (!base64Image || base64Image.length === 0) {
            throw new Error("pdf2pic returned empty base64 string. Is Ghostscript/GraphicsMagick installed?");
          }
        } catch (convErr) {
          console.error("PDF to Image conversion failed:", convErr);
          return NextResponse.json({ error: 'Could not parse scanned PDF. Conversion failed. Please ensure Ghostscript and GraphicsMagick are installed on the server.' }, { status: 400 })
        }
      }

    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await mammoth.extractRawText({ buffer: buffer })
      textContent = result.value
    } else if (
      file.type.startsWith('image/') ||
      file.name.endsWith('.jpg') ||
      file.name.endsWith('.jpeg') ||
      file.name.endsWith('.png')
    ) {
      // User uploaded an image directly. We can bypass pdf2pic and use Vision immediately!
      isScannedPdf = true;
      base64Image = Buffer.from(await file.arrayBuffer()).toString('base64');
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Please upload a PDF, DOCX, JPG, or PNG file.' }, { status: 400 })
    }


    if (!isScannedPdf && (!textContent || textContent.trim().length === 0)) {
      return NextResponse.json({ error: 'Could not extract text from the file.' }, { status: 400 })
    }

    const basePrompt = `You are an expert HR resume parser. Parse the following resume and extract the information into a structured JSON object.
Do NOT return anything other than the JSON object. Do NOT wrap the JSON in markdown code blocks like \`\`\`json. 

The JSON MUST follow this exact structure:
{
  "personalInfo": {
    "fullName": "Full Name",
    "email": "Email Address",
    "phone": "Phone Number",
    "location": "Location (City, State/Country)"
  },
  "professionalDetails": {
    "totalYearsExperience": "Total years of experience (e.g., '3', '5+', '0')",
    "currentCompany": "Current or most recent company name"
  },
  "summary": "Professional summary, objective, or about me section",
  "skills": ["Skill 1", "Skill 2"],
  "education": [
    { "degree": "Degree Name", "institution": "Institution Name", "year": "YYYY" }
  ],
  "workHistory": [
    { "role": "Job Title", "company": "Company Name", "duration": "Duration (e.g. 2020-2022)", "description": "Brief description" }
  ],
  "projects": [
    { "name": "Project Name", "description": "Brief description", "url": "Link if any" }
  ],
  "certificates": ["Certificate 1", "Certificate 2"],
  "achievements": ["Achievement 1", "Achievement 2"],
  "socialLinks": [
    { "platform": "Platform Name (e.g. LinkedIn, GitHub)", "url": "Profile URL" }
  ]
}

Extraction rules (important):
1) Never return empty arrays unless the information is truly absent in the resume.
2) For personalInfo, professionalDetails, and summary, if a field is not found, return an empty string "".
3) For sections like projects, certificates, achievements, and summary, candidates might use different headings (e.g. "Key Projects", "Licenses", "Awards", "About Me", "Profile"). Parse them properly regardless of the specific heading name.
4) For projects, if names are present without full details, still return entries with best-effort name and short description.
5) For socialLinks, always return full URLs when available (e.g. https://linkedin.com/in/..., https://github.com/...).
   Never return placeholders like "LinkedIn" or "GitHub" as URL values.
6) Keep output factual; do not invent data not supported by the resume.`;

    let messages: any = [];

    if (isScannedPdf) {
      // Clean up base64 string to prevent OpenAI Invalid Base64 error
      const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '').replace(/[\r\n\s]/g, '');
      const imageBuffer = Buffer.from(cleanBase64, 'base64');

      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: basePrompt },
            { type: 'image', image: imageBuffer }
          ]
        }
      ];
    } else {
      messages = [
        {
          role: 'user',
          content: `${basePrompt}\n\nResume Text:\n"""\n${textContent.substring(0, 8000)}\n"""`
        }
      ];
    }

    const { text } = await generateText({
      model: openrouter('openai/gpt-4o-mini'),
      messages: messages,
    })


    let parsedData: any = {
      personalInfo: { fullName: "", email: "", phone: "", location: "" },
      professionalDetails: { totalYearsExperience: "", currentCompany: "" },
      summary: "",
      skills: [],
      education: [],
      workHistory: [],
      projects: [],
      certificates: [],
      achievements: [],
      socialLinks: [],
    }

    try {
      // Clean potential markdown blocks just in case
      let cleanText = text.trim()
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7)
      }
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3)
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3)
      }
      parsedData = JSON.parse(cleanText.trim())
    } catch (e: any) {
      console.error("Failed to parse LLM response as JSON", text, e);
    }

    if (!isScannedPdf) {
      // Fallback URL extraction when model returns placeholder labels instead of links
      const urlMatches = Array.from(new Set((textContent.match(/https?:\/\/[^\s)>"']+/gi) || [])))
      const linkedinUrl = urlMatches.find((u) => /linkedin\.com/i.test(u)) || null
      const githubUrl = urlMatches.find((u) => /github\.com/i.test(u)) || null

      const socialLinks = Array.isArray(parsedData.socialLinks) ? parsedData.socialLinks : []
      const hasValidLinkedin = socialLinks.some((s: any) => /linkedin/i.test(String(s?.platform || '')) && /^https?:\/\//i.test(String(s?.url || '')))
      const hasValidGithub = socialLinks.some((s: any) => /github/i.test(String(s?.platform || '')) && /^https?:\/\//i.test(String(s?.url || '')))

      if (linkedinUrl && !hasValidLinkedin) socialLinks.push({ platform: 'LinkedIn', url: linkedinUrl })
      if (githubUrl && !hasValidGithub) socialLinks.push({ platform: 'GitHub', url: githubUrl })
      parsedData.socialLinks = socialLinks

      // Fallback project extraction by section slicing if model misses projects
      if (!Array.isArray(parsedData.projects) || parsedData.projects.length === 0) {
        const lower = textContent.toLowerCase()
        const projectStart = lower.search(/\b(projects?|academic projects?|personal projects?)\b/)
        if (projectStart >= 0) {
          const slice = textContent.slice(projectStart, Math.min(textContent.length, projectStart + 2200))
          const lines = slice.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
          const projectCandidates: any[] = []
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i]
            if (/^(education|experience|work history|skills|certifications?)$/i.test(line)) break
            if (line.length > 5 && line.length < 120 && !/^[-•]/.test(line)) {
              projectCandidates.push({ name: line, description: "", url: "" })
            }
            if (projectCandidates.length >= 5) break
          }
          if (projectCandidates.length > 0) {
            parsedData.projects = projectCandidates
          }
        }
      }
    }

    return NextResponse.json(parsedData)
  } catch (error: any) {
    console.error('Resume Parse Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to parse resume' }, { status: 500 })
  }
}
