import { NextResponse } from 'next/server';
import { verifyToken } from './jwt';

export async function requireAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.split(' ')[1];
  const decoded = await verifyToken(token);

  if (!decoded) {
    throw new Error('Unauthorized');
  }

  return decoded; // Returns the user payload stored in the token
}

export function handleAuthError(error: unknown) {
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
