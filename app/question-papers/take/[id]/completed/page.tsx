import { CheckCircle2 } from 'lucide-react'

export default function CompletedTestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="bg-card border rounded-xl p-8 max-w-md w-full text-center shadow-sm">
        <div className="flex justify-center mb-6">
          <CheckCircle2 className="w-16 h-16 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Assessment Submitted</h1>
        <p className="text-muted-foreground">
          Thank you for completing the assessment. Your responses have been recorded and will be evaluated shortly.
        </p>
      </div>
    </div>
  )
}
