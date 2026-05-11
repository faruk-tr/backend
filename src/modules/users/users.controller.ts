import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { getPaginationParams } from '../../utils/pagination';
import {
  GetUsersQuerySchema,
  CreateUserSchema,
  UpdateUserSchema,
  UpdatePermissionsSchema,
  UpdateMenuPermissionsSchema,
  ResetPasswordSchema,
} from './users.schemas';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserPermissions,
  updateUserPermissions,
  getUserMenuPermissions,
  updateUserMenuPermissions,
  resetUserPassword,
} from './users.service';

export async function getUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const pagination = getPaginationParams(req.query);
    const parsed = GetUsersQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }

    const user = {
      id: req.user!.id,
      role: req.user!.role,
      municipalityId: req.user!.municipalityId,
    };

    const result = await listUsers(parsed.data, user, pagination);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserByIdHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await getUserById(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = CreateUserSchema.parse(req.body);
    const result = await createUser(data, req.user!.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = UpdateUserSchema.parse(req.body);
    const result = await updateUser(req.params.id as string, data, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteUserHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await deleteUser(req.params.id as string, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserPermissionsHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await getUserPermissions(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateUserPermissionsHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = UpdatePermissionsSchema.parse(req.body);
    const result = await updateUserPermissions(req.params.id as string, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserMenuPermissionsHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await getUserMenuPermissions(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateUserMenuPermissionsHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = UpdateMenuPermissionsSchema.parse(req.body);
    const result = await updateUserMenuPermissions(req.params.id as string, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function resetUserPasswordHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = ResetPasswordSchema.parse(req.body);
    const result = await resetUserPassword(req.params.id as string, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
