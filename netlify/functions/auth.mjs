import crypto from 'node:crypto'
import { makeToken, badRequest } from '../lib/util.mjs'

export default async (req) => {
  if (req.method !== 'POST') return badRequest('POST only')
  const { password } = await req.json().catch(() => ({}))
  const expected = process.env.ADMIN_PASSWORD || ''
  const a = Buffer.from(String(password || ''))
  const b = Buffer.from(expected)
  const ok = expected && a.length === b.length && crypto.timingSafeEqual(a, b)
  if (!ok) return Response.json({ error: 'Wrong password' }, { status: 401 })
  return Response.json({ token: makeToken() })
}
