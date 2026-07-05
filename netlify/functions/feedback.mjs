import { checkToken, unauthorized, badRequest, ghJson, REPO } from '../lib/util.mjs'

export default async (req) => {
  if (req.method !== 'POST') return badRequest('POST only')
  if (!checkToken(req)) return unauthorized()
  const { pr, message } = await req.json().catch(() => ({}))
  const text = String(message || '').trim()
  if (!pr) return badRequest('Missing pr number')
  if (!text) return badRequest('Please describe what to adjust')
  if (text.length > 5000) return badRequest('Feedback is too long')

  // A PR comment is an issue comment in GitHub's API. @claude re-triggers the action.
  await ghJson(`/repos/${REPO}/issues/${pr}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      body: `@claude ${text}

---
*Revision requested via the MRAA admin page. Update this same pull request.*`,
    }),
  })
  return Response.json({ ok: true })
}
