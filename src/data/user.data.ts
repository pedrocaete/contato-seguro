import { z } from 'zod';

export const UserIdParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const CreateUserSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255)
});

export const UpdateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    email: z.string().trim().email().max(255).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided'
  });

export type CreateUserData = z.infer<typeof CreateUserSchema>;
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;
export type UserIdParams = z.infer<typeof UserIdParamsSchema>;
