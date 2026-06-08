import { SignJWT, jwtVerify } from 'jose';

// In a real app, use a secure random string stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-jwt-do-not-use-in-production';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);
const JWT_EXPIRES_IN = '7d';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';
const MFA_EXPIRES_IN = '10m';

export async function signToken(payload: any): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(encodedSecret);
}

export async function signAccessToken(payload: any): Promise<string> {
  return await new SignJWT({ ...payload, tokenType: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRES_IN)
    .sign(encodedSecret);
}

export async function signRefreshToken(payload: any): Promise<string> {
  return await new SignJWT({ ...payload, tokenType: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRES_IN)
    .sign(encodedSecret);
}

export async function signMfaToken(payload: any): Promise<string> {
  return await new SignJWT({ ...payload, tokenType: 'mfa_challenge' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(MFA_EXPIRES_IN)
    .sign(encodedSecret);
}

export async function verifyToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload;
  } catch (error) {
    return null;
  }
}
