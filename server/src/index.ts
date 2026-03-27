import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import staffRoutes from './routes/staff'
import scheduleRoutes from './routes/schedule'
import cityRoutes from './routes/cities'
import shiftRoutes from './routes/shifts'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'ProgramPilot' }))

app.use('/api/auth', authRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/cities', cityRoutes)
app.use('/api/shifts', shiftRoutes)

app.listen(PORT, () => console.log(`🚀 ProgramPilot server running on port ${PORT}`))

export default app
