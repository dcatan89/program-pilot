import { z, ZodSchema } from 'zod'
import { Request, Response, NextFunction } from 'express'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success)
      return res.status(400).json({ error: 'Validation error', details: result.error.flatten().fieldErrors })
    req.body = result.data
    next()
  }
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success)
      return res.status(400).json({ error: 'Validation error', details: result.error.flatten().fieldErrors })
    next()
  }
}

// Shared primitives
export const z_cuid = z.string().cuid()
export const z_isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
  .refine(d => !isNaN(new Date(d).getTime()), 'Invalid date')
export const z_hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM')
export const z_hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color like #3B82F6')
export const z_sessionType = z.enum(['AM', 'PM', 'FULL_DAY'])
