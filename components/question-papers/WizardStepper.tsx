import { Check } from 'lucide-react'

interface WizardStepperProps {
  steps: string[]
  currentStep: number
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <div className="flex items-center w-full mb-12">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative z-10">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors
                  ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                    isCurrent ? 'border-primary text-primary' : 
                    'border-muted text-muted-foreground bg-background'}`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : (index + 1)}
              </div>
              <span className={`absolute top-10 text-xs font-medium w-max text-center
                ${isCurrent || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-[2px] mx-4 bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: isCompleted ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
