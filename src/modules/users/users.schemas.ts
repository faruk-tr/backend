import { z } from 'zod';
import { config } from '../../config';

/** Password complexity: min 8 chars, at least one upper, one lower, one digit, one special char */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])/;

export const StrongPasswordSchema = z
  .string()
  .min(config.password.minLength, `Şifre en az ${config.password.minLength} karakter olmalı.`)
  .regex(
    passwordRegex,
    'Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir.',
  );

export const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: StrongPasswordSchema,
  role: z.enum(['admin', 'municipality', 'operator', 'technician', 'viewer']),
  phone: z.string().optional(),
  municipalityId: z.string().optional(),
  operatorId: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(['admin', 'municipality', 'operator', 'technician', 'viewer']).optional(),
  active: z.boolean().optional(),
  municipalityId: z.string().optional().nullable(),
  operatorId: z.string().optional().nullable(),
});

export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;

export const GetUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['admin', 'municipality', 'operator', 'technician', 'viewer']).optional(),
  active: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;

export const UpdatePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export type UpdatePermissionsRequest = z.infer<typeof UpdatePermissionsSchema>;

export const UpdateMenuPermissionsSchema = z.object({
  menuPermissions: z.array(
    z.object({ menuKey: z.string(), enabled: z.boolean() }),
  ),
});

export type UpdateMenuPermissionsRequest = z.infer<typeof UpdateMenuPermissionsSchema>;

export const ResetPasswordSchema = z.object({
  newPassword: StrongPasswordSchema,
});

export type ResetPasswordRequest = z.infer<typeof ResetPasswordSchema>;
