import { z } from 'zod';
import { config } from '../../config';

export const LoginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Şifre gerekli.'),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

export const OtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'OTP kodu 6 haneli olmalı.'),
});

export type OtpRequest = z.infer<typeof OtpSchema>;

/** Password complexity: min 8 chars, at least one upper, one lower, one digit, one special char */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])/;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(config.password.minLength, `Şifre en az ${config.password.minLength} karakter olmalı.`)
    .regex(
      passwordRegex,
      'Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir.',
    ),
});

export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>;
