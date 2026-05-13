import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import {
  countDocumentsForUser,
  findUserByEmail,
  findUserById,
  insertUser,
  toPublicUser,
  updateUserName,
  updateUserPassword,
  type UserRow,
} from '../db'
import { getAuthUser, requireAuth, type AuthRequest } from './middleware'
import {
  revokeRefreshToken,
  revokeUserRefreshTokens,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './tokens'

const registerSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  email: z.string().trim().email('invalid email').toLowerCase(),
  password: z.string().min(8, 'password must be at least 8 characters'),
})

const loginSchema = z.object({
  email: z.string().trim().email('invalid email').toLowerCase(),
  password: z.string().min(1, 'password is required'),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const updateMeSchema = z.object({
  name: z.string().trim().min(1).optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export const authRouter = Router()
export const usersRouter = Router()

function authResponse(user: UserRow) {
  const tokenUser = { userId: user.id, email: user.email }
  return {
    accessToken: signAccessToken(tokenUser),
    refreshToken: signRefreshToken(tokenUser),
    user: toPublicUser(user),
  }
}

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Невалидные поля', issues: parsed.error.flatten() })
    return
  }

  const existing = findUserByEmail(parsed.data.email)
  if (existing) {
    res.status(409).json({ message: 'Email уже занят' })
    return
  }

  const now = new Date().toISOString()
  const user: UserRow = {
    id: randomUUID(),
    name: parsed.data.name,
    email: parsed.data.email,
    password: await bcrypt.hash(parsed.data.password, 10),
    created_at: now,
  }

  insertUser(user)
  res.status(201).json(authResponse(user))
})

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Невалидные поля', issues: parsed.error.flatten() })
    return
  }

  const user = findUserByEmail(parsed.data.email)
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) {
    res.status(401).json({ message: 'Неверный email или пароль' })
    return
  }

  res.json(authResponse(user))
})

authRouter.post('/refresh', (req, res) => {
  const parsed = refreshSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Невалидные поля', issues: parsed.error.flatten() })
    return
  }

  const user = verifyRefreshToken(parsed.data.refreshToken)
  if (!user) {
    res.status(401).json({ message: 'Refresh token невалиден или истёк' })
    return
  }

  res.json({ accessToken: signAccessToken(user) })
})

authRouter.post('/logout', requireAuth, (req: AuthRequest, res) => {
  const parsed = refreshSchema.partial().safeParse(req.body)
  if (parsed.success && parsed.data.refreshToken) {
    revokeRefreshToken(parsed.data.refreshToken)
  } else {
    revokeUserRefreshTokens(getAuthUser(req).userId)
  }
  res.status(204).send()
})

usersRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  const authUser = getAuthUser(req)
  const user = findUserById(authUser.userId)
  if (!user) {
    res.status(404).json({ message: 'Пользователь не найден' })
    return
  }

  res.json({
    ...toPublicUser(user),
    documentsCount: countDocumentsForUser(user.id),
  })
})

usersRouter.patch('/me', requireAuth, (req: AuthRequest, res) => {
  const parsed = updateMeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Невалидные поля', issues: parsed.error.flatten() })
    return
  }

  const authUser = getAuthUser(req)
  const current = findUserById(authUser.userId)
  if (!current) {
    res.status(404).json({ message: 'Пользователь не найден' })
    return
  }

  const updated = parsed.data.name ? updateUserName(current.id, parsed.data.name) : current
  if (!updated) {
    res.status(404).json({ message: 'Пользователь не найден' })
    return
  }

  res.json({
    ...toPublicUser(updated),
    documentsCount: countDocumentsForUser(updated.id),
  })
})

usersRouter.post('/me/change-password', requireAuth, async (req: AuthRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Невалидные поля', issues: parsed.error.flatten() })
    return
  }

  const authUser = getAuthUser(req)
  const user = findUserById(authUser.userId)
  if (!user) {
    res.status(404).json({ message: 'Пользователь не найден' })
    return
  }

  const isCurrentPasswordValid = await bcrypt.compare(parsed.data.currentPassword, user.password)
  if (!isCurrentPasswordValid) {
    res.status(401).json({ message: 'Неверный текущий пароль' })
    return
  }

  updateUserPassword(user.id, await bcrypt.hash(parsed.data.newPassword, 10))
  revokeUserRefreshTokens(user.id)
  res.status(204).send()
})
