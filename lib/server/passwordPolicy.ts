export function validateStrongPassword(password: string): string | null {
  const value = (password || '').trim()
  if (value.length < 12) return 'Password must be at least 12 characters long'
  if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(value)) return 'Password must contain at least one number'
  if (!/[^A-Za-z0-9]/.test(value)) return 'Password must contain at least one special character'
  return null
}

