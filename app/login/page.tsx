'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { APP_NAME } from '@/lib/constants'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getDashboardRoute } from '@/lib/rbac'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginPageContent() {
  const router = useRouter()
  const { login, isLoading, error, user } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const searchParams = useSearchParams()

  // Redirect automatically when user becomes authenticated
  useEffect(() => {
    if (user) {
      const redirectUrl = searchParams.get('redirect')

      if (redirectUrl && redirectUrl.startsWith('/')) {

        router.push(redirectUrl)
        return
      }

      const dashboardUrl = getDashboardRoute(user)

      // If we are dealing with an organization-scoped role and we have memberships, navigate to the tenant path
      const activeMembership = user.memberships?.find((m: any) => m.organizationId === user.organizationId) || user.memberships?.[0]

      if (activeMembership?.organizationSlug && !dashboardUrl.startsWith('/super-admin')) {

        router.push(`/organization/${activeMembership.organizationSlug}${dashboardUrl}`)
      } else {

        router.push(dashboardUrl)
      }
    }
  }, [user, router, searchParams])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginFormData) => {
    login(data)
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

        {/* Login Card */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full mt-3" disabled={isLoading}>
                {isLoading ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Sign In
              </Button>
              {/* <p className="text-sm text-muted-foreground text-center">
                {"Don't have an account? "}
                <Link href="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p> */}
            </CardFooter>
          </form>
        </Card>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
