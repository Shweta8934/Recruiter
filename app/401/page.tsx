import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">401 Unauthorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need to sign in to access this page.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

