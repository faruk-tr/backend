import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

interface TokenPayload {
  userId: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  const options: SignOptions = {
    algorithm: config.jwt.algorithm,
    expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt.secret, options);
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
    }) as TokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'Oturum süresi doldu. Lütfen tekrar giriş yapın.', 'TOKEN_EXPIRED');
    }
    throw new AppError(401, 'Geçersiz token.', 'INVALID_TOKEN');
  }
}
