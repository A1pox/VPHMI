import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { findUserById } from '../db'
import { isTokenUserPayload, type TokenUser } from './tokens'

export interface AuthRequest extends Request {
  user?: TokenUser
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.header('Authorization')
  const [scheme, token] = header?.split(' ') ?? []

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ message: 'Требуется авторизация' })
    return
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    if (!isTokenUserPayload(decoded)) {
      res.status(401).json({ message: 'Невалидный токен' })
      return
    }

    const user = findUserById(decoded.userId)
    if (!user) {
      res.status(401).json({ message: 'Пользователь не найден' })
      return
    }

    req.user = { userId: decoded.userId, email: decoded.email }
    next()
  } catch {
    res.status(401).json({ message: 'Невалидный или истёкший токен' })
  }
}

export function getAuthUser(req: AuthRequest): TokenUser {
  if (!req.user) throw new Error('Auth user is missing')
  return req.user
}
