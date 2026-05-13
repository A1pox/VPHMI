import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { config } from './config'
import './db'
import { authRouter, usersRouter } from './auth/router'
import { documentsRouter } from './documents/router'

const app = express()

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`CORS origin is not allowed: ${origin}`))
    },
    credentials: true,
  }),
)

app.use(express.json({ limit: '5mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/auth', authRouter)
app.use('/users', usersRouter)
app.use('/documents', documentsRouter)

app.use((_req, res) => {
  res.status(404).json({ message: 'Маршрут не найден' })
})

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Внутренняя ошибка сервера'
  console.error(err)
  res.status(500).json({ message })
})

app.listen(config.port, () => {
  console.log(`Backend API listening on http://localhost:${config.port}`)
})
