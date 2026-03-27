import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { logger } from '../lib/logger'
import { validateBody, z_cuid, z_isoDate, z_hhmm, z_hexColor, z_sessionType } from '../lib/validate'

const router = Router()
router.use(requireAuth)

// List all seasons
router.get('/seasons', async (_req, res) => {
  try {
    const seasons = await prisma.season.findMany({ orderBy: { year: 'desc' } })
    res.json(seasons)
  } catch (err) {
    logger.error(err, 'GET /seasons failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Get programs for a season (with sessions)
router.get('/programs/:seasonId', async (req, res) => {
  try {
    const programs = await prisma.program.findMany({
      where: { seasonId: req.params.seasonId },
      include: {
        sessions: {
          include: { city: true, assignments: { include: { staff: true } } },
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })
    res.json(programs)
  } catch (err) {
    logger.error(err, 'GET /programs/:seasonId failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Create a program
router.post(
  '/programs',
  validateBody(z.object({ name: z.string().min(1, 'Name is required'), seasonId: z_cuid })),
  async (req, res) => {
    try {
      const { name, seasonId } = req.body
      const program = await prisma.program.create({ data: { name, seasonId } })
      res.status(201).json(program)
    } catch (err) {
      logger.error(err, 'POST /programs failed')
      res.status(500).json({ error: 'Server error' })
    }
  }
)

// Full schedule for a season
router.get('/season/:seasonId', async (req, res) => {
  try {
    const { seasonId } = req.params
    const [sessions, externalPrograms, staff] = await Promise.all([
      prisma.session.findMany({
        where: { program: { seasonId } },
        include: { city: true, program: true, assignments: { include: { staff: true } } },
        orderBy: [{ startDate: 'asc' }, { sessionType: 'asc' }],
      }),
      prisma.externalProgram.findMany({ orderBy: { startDate: 'asc' } }),
      prisma.staff.findMany({
        where: { isActive: true },
        include: { clearedCities: { include: { city: true } } },
        orderBy: { name: 'asc' },
      }),
    ])

    const weekMap = new Map<string, typeof sessions>()
    for (const session of sessions) {
      const key = `${session.startDate.toISOString().split('T')[0]}|${session.endDate.toISOString().split('T')[0]}`
      if (!weekMap.has(key)) weekMap.set(key, [])
      weekMap.get(key)!.push(session)
    }

    const weeks = Array.from(weekMap.entries()).map(([key, sessions]) => {
      const [start, end] = key.split('|')
      const startDate = new Date(start)
      const endDate = new Date(end)
      const overlapping = externalPrograms.filter(ep => startDate <= ep.endDate && endDate >= ep.startDate)
      return { startDate: start, endDate: end, sessions, externalOverlaps: overlapping }
    })

    res.json({ weeks, staff, externalPrograms })
  } catch (err) {
    logger.error(err, 'GET /season/:seasonId failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Detect scheduling conflicts
router.get('/conflicts/:seasonId', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { program: { seasonId: req.params.seasonId } },
      include: { assignments: { include: { staff: true } }, city: true },
    })

    const conflicts: Array<{ staffName: string; session1: string; session2: string }> = []
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const a = sessions[i], b = sessions[j]
        const overlap = a.startDate <= b.endDate && b.startDate <= a.endDate
        if (!overlap) continue
        const staffA = new Set(a.assignments.map(x => x.staffId))
        for (const assign of b.assignments) {
          if (staffA.has(assign.staffId)) {
            conflicts.push({
              staffName: assign.staff.name,
              session1: `${a.city.name} ${a.startDate.toLocaleDateString()} ${a.sessionType}`,
              session2: `${b.city.name} ${b.startDate.toLocaleDateString()} ${b.sessionType}`,
            })
          }
        }
      }
    }
    res.json(conflicts)
  } catch (err) {
    logger.error(err, 'GET /conflicts/:seasonId failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Assign staff to session
router.post(
  '/assign',
  validateBody(z.object({ staffId: z_cuid, sessionId: z_cuid, isPrimary: z.boolean().optional() })),
  async (req, res) => {
    try {
      const { staffId, sessionId, isPrimary } = req.body
      const assignment = await prisma.staffAssignment.upsert({
        where: { staffId_sessionId: { staffId, sessionId } },
        update: { isPrimary },
        create: { staffId, sessionId, isPrimary: isPrimary ?? true },
      })
      res.json(assignment)
    } catch (err) {
      logger.error(err, 'POST /assign failed')
      res.status(500).json({ error: 'Server error' })
    }
  }
)

// Remove staff from session
router.delete('/assign/:staffId/:sessionId', async (req, res) => {
  try {
    await prisma.staffAssignment.delete({
      where: { staffId_sessionId: { staffId: req.params.staffId, sessionId: req.params.sessionId } },
    })
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'DELETE /assign failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Season schemas
const seasonCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  year: z.number().int(),
  isActive: z.boolean().optional(),
})
const seasonUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  year: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

// Program schemas
const programUpdateSchema = z.object({ name: z.string().min(1, 'Name is required') })

// External program schemas
const externalCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z_isoDate,
  endDate: z_isoDate,
  color: z_hexColor.optional(),
  notes: z.string().optional(),
})
const externalUpdateSchema = externalCreateSchema.partial()

// Create season
router.post('/seasons', validateBody(seasonCreateSchema), async (req, res) => {
  try {
    const { name, year, isActive } = req.body
    const season = await prisma.season.create({ data: { name, year, isActive: isActive ?? true } })
    res.status(201).json(season)
  } catch (err) {
    logger.error(err, 'POST /seasons failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Update season
router.put('/seasons/:id', validateBody(seasonUpdateSchema), async (req, res) => {
  try {
    const { name, year, isActive } = req.body
    const season = await prisma.season.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(year !== undefined && { year }),
        ...(isActive !== undefined && { isActive }),
      },
    })
    res.json(season)
  } catch (err) {
    logger.error(err, 'PUT /seasons/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete season
router.delete('/seasons/:id', async (req, res) => {
  try {
    await prisma.season.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'DELETE /seasons/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Update program
router.put('/programs/:id', validateBody(programUpdateSchema), async (req, res) => {
  try {
    const program = await prisma.program.update({
      where: { id: req.params.id },
      data: { name: req.body.name },
    })
    res.json(program)
  } catch (err) {
    logger.error(err, 'PUT /programs/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete program
router.delete('/programs/:id', async (req, res) => {
  try {
    await prisma.program.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'DELETE /programs/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// List external programs
router.get('/external', async (_req, res) => {
  try {
    const externals = await prisma.externalProgram.findMany({ orderBy: { startDate: 'asc' } })
    res.json(externals)
  } catch (err) {
    logger.error(err, 'GET /external failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Create external program
router.post('/external', validateBody(externalCreateSchema), async (req, res) => {
  try {
    const { name, startDate, endDate, color, notes } = req.body
    const ext = await prisma.externalProgram.create({
      data: { name, startDate: new Date(startDate), endDate: new Date(endDate), color: color ?? '#F97316', notes: notes || null },
    })
    res.status(201).json(ext)
  } catch (err) {
    logger.error(err, 'POST /external failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Update external program
router.put('/external/:id', validateBody(externalUpdateSchema), async (req, res) => {
  try {
    const { name, startDate, endDate, color, notes } = req.body
    const ext = await prisma.externalProgram.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(color !== undefined && { color }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    })
    res.json(ext)
  } catch (err) {
    logger.error(err, 'PUT /external/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete external program
router.delete('/external/:id', async (req, res) => {
  try {
    await prisma.externalProgram.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'DELETE /external/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

// Session schemas
const sessionCreateSchema = z.object({
  programId:   z_cuid,
  cityId:      z_cuid,
  location:    z.string().min(1, 'Location is required'),
  startDate:   z_isoDate,
  endDate:     z_isoDate,
  startTime:   z_hhmm,
  endTime:     z_hhmm,
  sessionType: z_sessionType,
  className:   z.string().optional(),
})

const sessionUpdateSchema = z.object({
  cityId:      z_cuid.optional(),
  location:    z.string().min(1).optional(),
  startDate:   z_isoDate.optional(),
  endDate:     z_isoDate.optional(),
  startTime:   z_hhmm.optional(),
  endTime:     z_hhmm.optional(),
  sessionType: z_sessionType.optional(),
  className:   z.string().optional(),
  noClassDates: z.array(z_isoDate).optional(),
})

router.post('/sessions', validateBody(sessionCreateSchema), async (req, res) => {
  try {
    const { programId, cityId, location, startDate, endDate, startTime, endTime, sessionType, className } = req.body
    const session = await prisma.session.create({
      data: {
        programId, cityId, location,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime, endTime, sessionType,
        className: className || null,
        noClassDates: [],
      },
      include: { city: true, program: true, assignments: { include: { staff: true } } },
    })
    res.status(201).json(session)
  } catch (err) {
    logger.error(err, 'POST /sessions failed')
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/sessions/:id', validateBody(sessionUpdateSchema), async (req, res) => {
  try {
    const { cityId, location, startDate, endDate, startTime, endTime, sessionType, className, noClassDates } = req.body
    const session = await prisma.session.update({
      where: { id: req.params.id },
      data: {
        ...(cityId !== undefined && { cityId }),
        ...(location !== undefined && { location }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(sessionType !== undefined && { sessionType }),
        ...(className !== undefined && { className: className || null }),
        ...(noClassDates !== undefined && { noClassDates: noClassDates.map((d: string) => new Date(d)) }),
      },
      include: { city: true, program: true, assignments: { include: { staff: true } } },
    })
    res.json(session)
  } catch (err) {
    logger.error(err, 'PUT /sessions/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/sessions/:id', async (req, res) => {
  try {
    await prisma.session.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'DELETE /sessions/:id failed')
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
