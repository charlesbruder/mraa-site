// Shared helpers for the MRAA admin functions.
import crypto from 'node:crypto'

export const REPO = process.env.GITHUB_REPO || 'skreenpeeker/mraa-site'
export const PREVIEW_SLUG = process.env.PREVIEW_SLUG || 'mraa-rugby'
const GH = 'https://api.github.com'

// --- auth tokens: "<expiryMs>.<hmac>" signed with ADMIN_SECRET ---

export function makeToken(hours = 12) {
  const exp = String(Date.now() + hours * 3600_000)
  const sig = crypto.createHmac('sha256', process.env.ADMIN_SECRET).update(exp).digest('base64url')
  return `${exp}.${sig}`
}

export function checkToken(req) {
  if (!process.env.ADMIN_SECRET) return false
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const [exp, sig] = token.split('.')
  if (!exp || !sig) return false
  const expected = crypto.createHmac('sha256', process.env.ADMIN_SECRET).update(exp).digest('base64url')
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false
  } catch {
    return false
  }
  return Number(exp) > Date.now()
}

export const unauthorized = () => Response.json({ error: 'Not signed in' }, { status: 401 })
export const badRequest = (msg) => Response.json({ error: msg }, { status: 400 })

// --- GitHub REST ---

export async function gh(path, opts = {}) {
  const res = await fetch(`${GH}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
  })
  return res
}

export async function ghJson(path, opts = {}) {
  const res = await gh(path, opts)
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}
