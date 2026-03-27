import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import pinoHttp from 'pino-http'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import staffRoutes from './routes/staff'
import scheduleRoutes from './routes/schedule'
import cityRoutes from './routes/cities'
import shiftRoutes from './routes/shifts'
import { logger } from './lib/logger'
import { prisma } from './lib/prisma'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Security headers
app.use(helmet())

// CORS
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))

// Rate limiting — 200 requests per 15 min per IP
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  })
)

// Request logging
app.use(pinoHttp({ logger }))

app.use(express.json())

// Routes
app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'ProgramPilot' }))
app.use('/api/auth', authRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/cities', cityRoutes)
app.use('/api/shifts', shiftRoutes)

const server = app.listen(PORT, () => logger.info(`ProgramPilot server running on port ${PORT}`))

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...')
  server.close(async () => {
    await prisma.$disconnect()
    logger.info('Server closed.')
    process.exit(0)
  })
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export default app
