'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface Section {
  id?: string
  title: string
  questionCount: string
  weightage: string
}

interface SectionBuilderProps {
  sections: Section[]
  onChange: (sections: Section[]) => void
}

export function SectionBuilder({ sections, onChange }: SectionBuilderProps) {
  const updateSection = (index: number, field: keyof Section, value: string) => {
    const newSections = [...sections]
    newSections[index] = { ...newSections[index], [field]: value }
    onChange(newSections)
  }

  const totalWeightage = sections.reduce((sum, s) => sum + (parseInt(s.weightage) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Sections</h3>
        <div className={`text-sm font-medium ${totalWeightage > 100 ? 'text-red-500' : 'text-muted-foreground'}`}>
          Total Weightage: {totalWeightage}% / 100%
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 border rounded-lg bg-muted/20">
          No sections mapped to this department. Please select a different department.
        </div>
      ) : (
        sections.map((section, index) => (
          <div key={index} className="flex gap-4 items-center border p-4 rounded-lg bg-card">
            <div className="flex-1">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Section Title</Label>
              <div className="font-semibold text-lg mt-1">{section.title}</div>
            </div>
            <div className="w-32 space-y-2">
              <Label>Questions</Label>
              <Input 
                type="number" 
                min="1" 
                value={section.questionCount} 
                onChange={(e) => updateSection(index, 'questionCount', e.target.value)} 
              />
            </div>
            <div className="w-32 space-y-2">
              <Label>Weightage (%)</Label>
              <Input 
                type="number" 
                min="0" 
                max="100" 
                value={section.weightage} 
                onChange={(e) => updateSection(index, 'weightage', e.target.value)} 
              />
            </div>
          </div>
        ))
      )}
    </div>
  )
}
