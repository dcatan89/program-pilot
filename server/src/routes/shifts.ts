import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { logger } from '../lib/logger'
import { validateBody, validateQuery, z_cuid, z_isoDate, z_hhmm, z_sessionType } from '../lib/validate'

const router = Router()
router.use(requireAuth)

const querySchema = z.object({
  start: z_isoDate,
  end: z_isoDate,
}).refine(
  d => {
    const diff = new Date(d.end).getTime() - new Date(d.start).getTime()
    return diff >= 0 && diff <= 90 * 24 * 60 * 60 * 1000
  },
  { message: 'Date range must be between 0 and 90 days' }
)

const createSchema = z.object({
  staffId:     z_cuid,
  cityId:      z_cuid,
  date:        z_isoDate,
  startTime:   z_hhmm,
  endTime:     z_hhmm,
  location:    z.string().min(1, 'Location is required'),
  sessionType: z_sessionType.default('AM'),
  notes:       z.string().optional(),
})

const updateSchema = z.object({
  staffId:     z_cuid.optional(),
  cityId:      z_cuid.optional(),
  date:        z_isoDate.optional(),
  startTime:   z_hhmm.optional(),
  endTime:     z_hhmm.optional(),
  location:    z.string().min(1).optional(),
  sessionType: z_sessionType.optional(),
  notes:       z.string().optional(),
})

// GET /shifts?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', validateQuery(querySchema), async (req, res) => {
  try {
    const { start, end } = req.query as { start: string; end: string }
    const shifts = await prisma.shift.findMany({
      where: { date: { gte: new Date(start), lte: new Date(end) } },
      include: { staff: true, city: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })
    res.json(shifts)
  } catch (err) {
    logger.error(err, 'GET /shifts failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /shifts
router.post('/', validateBody(createSchema), async (req, res) => {
  try {
    const { staffId, cityId, date, startTime, endTime, location, sessionType, notes } = req.body
    const shift = await prisma.shift.create({
      data: { staffId, cityId, date: new Date(date), startTime, endTime, location, sessionType, notes: notes || null },
      include: { staff: true, city: true },
    })
    res.status(201).json(shift)
  } catch (err) {
    logger.error(err, 'POST /shifts failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /shifts/:id
router.put('/:id', validateBody(updateSchema), async (req, res) => {
  try {
    const { staffId, cityId, date, startTime, endTime, location, sessionType, notes } = req.body
    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: {
        ...(staffId !== undefined && { staffId }),
        ...(cityId !== undefined && { cityId }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(location !== undefined && { location }),
        ...(sessionType !== undefined && { sessionType }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: { staff: true, city: true },
    })
    res.json(shift)
  } catch (err) {
    logger.error(err, 'PUT /shifts/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /shifts/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.shift.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'DELETE /shifts/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
