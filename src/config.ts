import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Fail fast in production if JWT_SECRET is missing or still the default placeholder
const DEFAULT_DEV_SECRET = 'dev-secret-change-in-production-32chars';
const jwtSecret = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_DEV_SECRET)) {
  throw new Error(
    'FATAL: JWT_SECRET must be set to a strong, unique value in production. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
  );
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: !isProduction,

  jwt: {
    secret: jwtSecret,
    algorithm: 'HS256' as const,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  password: {
    expiryDays: parseInt(process.env.PASSWORD_EXPIRY_DAYS || '30', 10),
    warningDays: parseInt(process.env.PASSWORD_WARNING_DAYS || '5', 10),
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    requireSpecialChar: true,
  },

  auth: {
    maxFailedLoginAttempts: 5,
    lockoutMinutes: 15,
    maxOtpAttempts: 5,
  },

  otp: {
    expiresMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES || '5', 10),
    demoEnabled: !isProduction && process.env.DEMO_OTP_ENABLED === 'true',
  },
};
