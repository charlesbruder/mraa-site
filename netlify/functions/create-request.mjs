import { checkToken, unauthorized, badRequest, ghJson, REPO } from '../lib/util.mjs'

export default async (req) => {
  if (req.method !== 'POST') return badRequest('POST only')
  if (!checkToken(req)) return unauthorized()
  const { prompt, photos = [] } = await req.json().catch(() => ({}))
  const text = String(prompt || '').trim()
  if (!text) return badRequest('Please describe the change you want')
  if (text.length > 5000) return badRequest('Request is too long')

  const title = text.split('\n')[0].slice(0, 70)
  const photoNote = photos.length
    ? `\n\nUploaded photo(s) for this change (already in the repo on main): ${photos
        .map((p) => `\`${p}\``)
        .join(', ')} — use them with relative paths.`
    : ''
  const body = `@claude ${text}${photoNote}

---
*Requested via the MRAA admin page. Follow the conventions in CLAUDE.md and open a pull request when finished.*`

  const issue = await ghJson(`/repos/${REPO}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels: ['change-request'] }),
  })
  return Response.json({ issue: issue.number })
}
