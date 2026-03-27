import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// List all seasons
router.get('/seasons', async (_req, res) => {
  const seasons = await prisma.season.findMany({ orderBy: { year: 'desc' } })
  res.json(seasons)
})

// Get programs for a season (with sessions)
router.get('/programs/:seasonId', async (req, res) => {
  const programs = await prisma.program.findMany({
    where: { seasonId: req.params.seasonId },
    include: {
      sessions: {
        include: {
          city: true,
          assignments: { include: { staff: true } }
        },
        orderBy: { startDate: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  })
  res.json(programs)
})

// Create a program
router.post('/programs', async (req, res) => {
  const { name, seasonId } = req.body
  const program = await prisma.program.create({ data: { name, seasonId } })
  res.status(201).json(program)
})

// Get full schedule for a season — the main grid view
router.get('/season/:seasonId', async (req, res) => {
  const { seasonId } = req.params

  const [sessions, externalPrograms, staff] = await Promise.all([
    prisma.session.findMany({
      where: { program: { seasonId } },
      include: {
        city: true,
        program: true,
        assignments: { include: { staff: true } }
      },
      orderBy: [{ startDate: 'asc' }, { sessionType: 'asc' }]
    }),
    prisma.externalProgram.findMany({ orderBy: { startDate: 'asc' } }),
    prisma.staff.findMany({
      where: { isActive: true },
      include: { clearedCities: { include: { city: true } } },
      orderBy: { name: 'asc' }
    })
  ])

  // Build week groups
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
    const overlapping = externalPrograms.filter(
      ep => startDate <= ep.endDate && endDate >= ep.startDate
    )
    return { startDate: start, endDate: end, sessions, externalOverlaps: overlapping }
  })

  res.json({ weeks, staff, externalPrograms })
})

// Detect conflicts: staff assigned to overlapping sessions
router.get('/conflicts/:seasonId', async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { program: { seasonId: req.params.seasonId } },
    include: { assignments: { include: { staff: true } }, city: true }
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
            session2: `${b.city.name} ${b.startDate.toLocaleDateString()} ${b.sessionType}`
          })
        }
      }
    }
  }
  res.json(conflicts)
})

// Assign staff to session
router.post('/assign', async (req, res) => {
  const { staffId, sessionId, isPrimary } = req.body
  const assignment = await prisma.staffAssignment.upsert({
    where: { staffId_sessionId: { staffId, sessionId } },
    update: { isPrimary },
    create: { staffId, sessionId, isPrimary: isPrimary ?? true }
  })
  res.json(assignment)
})

// Remove staff from session
router.delete('/assign/:staffId/:sessionId', async (req, res) => {
  await prisma.staffAssignment.delete({
    where: { staffId_sessionId: { staffId: req.params.staffId, sessionId: req.params.sessionId } }
  })
  res.json({ success: true })
})

// Sessions CRUD
router.post('/sessions', async (req, res) => {
  const { programId, cityId, location, startDate, endDate, startTime, endTime, sessionType, className } = req.body
  const session = await prisma.session.create({
    data: {
      programId, cityId, location,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime, endTime, sessionType,
      className: className || null,
      noClassDates: []
    },
    include: { city: true, program: true, assignments: { include: { staff: true } } }
  })
  res.status(201).json(session)
})

router.put('/sessions/:id', async (req, res) => {
  const session = await prisma.session.update({
    where: { id: req.params.id },
    data: req.body,
    include: { city: true, program: true, assignments: { include: { staff: true } } }
  })
  res.json(session)
})

router.delete('/sessions/:id', async (req, res) => {
  await prisma.session.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

export default router
