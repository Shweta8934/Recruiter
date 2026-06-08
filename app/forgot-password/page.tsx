'use client'

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { auth, googleProvider } from '@/lib/firebase'
import { sendPasswordResetEmail } from 'firebase/auth'
import Link from 'next/link'
import { APP_NAME } from '@/lib/constants'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Mail, CheckCircle2 } from 'lucide-react'
import { BackButton } from '@/components/common'
import { toast } from 'sonner'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setAuthError(null)
    try {
      await sendPasswordResetEmail(auth, data.email)
      setIsSubmitted(true)
    } catch (error: any) {
      console.error('Firebase password reset error:', error)
      setAuthError(error.message || 'Failed to send reset link')
      toast.error(error.message || 'Failed to send reset link')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              {APP_NAME.charAt(0)}
            </div>
            <span className="text-xl font-bold">{APP_NAME}</span>
          </Link>
        </div>

        {/* Forgot Password Card */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Reset your password</CardTitle>
            <CardDescription className="text-center">
              Type in your email and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSubmitted ? (
              <Alert className="bg-primary/10 border-primary/20 text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  If an account exists with that email, a password reset link has been sent. Please check your inbox.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {authError && (
                  <Alert variant="destructive">
                    <AlertDescription>{authError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Reset Link
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter>
            <BackButton href="/login" label="Back to Login" className="w-full" />
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
