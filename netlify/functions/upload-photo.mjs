import { checkToken, unauthorized, badRequest, ghJson, REPO } from '../lib/util.mjs'

const MAX_BASE64_CHARS = 5_500_000 // ~4 MB binary

export default async (req) => {
  if (req.method !== 'POST') return badRequest('POST only')
  if (!checkToken(req)) return unauthorized()
  const { name, dataBase64 } = await req.json().catch(() => ({}))
  if (!name || !dataBase64) return badRequest('Missing file')
  if (dataBase64.length > MAX_BASE64_CHARS) return badRequest('Photo is too large (4 MB max)')

  const ext = (name.match(/\.(jpe?g|png|gif|webp)$/i) || [])[0]
  if (!ext) return badRequest('Only jpg, png, gif, or webp photos')
  const safeBase = name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'photo'
  const path = `assets/uploads/${Date.now()}-${safeBase}${ext.toLowerCase()}`

  await ghJson(`/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `content: upload photo ${path} via admin page`,
      content: dataBase64,
    }),
  })
  return Response.json({ path })
}
