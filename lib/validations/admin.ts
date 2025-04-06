import { z } from 'zod'

export const adminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  created_at: z.string().datetime(),
  created_by: z.string().uuid().optional(),
})

export const pendingAdminUserSchema = z.object({
  email: z.string().email(),
  created_by: z.string().uuid(),
  created_by_email: z.string().email().optional(),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  confirmation_token: z.string(),
})

export const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const confirmAdminSchema = z.object({
  email: z.string().email(),
  token: z.string(),
}) 