import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// Upsert a User row after Supabase Auth login (Google or email)
router.post('/sync', requireAuth, async (req: AuthRequest, res) => {
  const { id: supabaseId, email } = req.user!
  const name = (req.body.name as string) || email.split('@')[0]
  try {
    const user = await prisma.user.upsert({
      where: { supabaseId },
      update: { email },
      create: { supabaseId, email, name, role: 'ADMIN' },
      select: { id: true, email: true, name: true, role: true },
    })
    res.json(user)
  } catch (err: any) {
    // Unique constraint violation — user already exists, just fetch them
    if (err?.code === 'P2002') {
      const user = await prisma.user.findUnique({
        where: { supabaseId },
        select: { id: true, email: true, name: true, role: true },
      })
      if (user) return res.json(user)
    }
    console.error('SYNC ERROR:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get current user profile
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.user!.id },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
