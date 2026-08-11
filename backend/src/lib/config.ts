import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') dotenv.config();

export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '7d') as any;

const secret = process.env.JWT_SECRET;
if (!secret || secret === 'change-me') {
  throw new Error('JWT_SECRET must be set to a secure value in the environment');
}
export const JWT_SECRET: string = secret;
