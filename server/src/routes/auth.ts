import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, email: true, name: true, role: true } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
