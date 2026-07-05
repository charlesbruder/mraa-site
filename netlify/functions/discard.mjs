import { checkToken, unauthorized, badRequest, gh, REPO } from '../lib/util.mjs'

export default async (req) => {
  if (req.method !== 'POST') return badRequest('POST only')
  if (!checkToken(req)) return unauthorized()
  const { pr, issue } = await req.json().catch(() => ({}))
  if (!pr && !issue) return badRequest('Missing pr or issue number')

  if (pr) {
    const prRes = await gh(`/repos/${REPO}/pulls/${pr}`)
    if (prRes.ok) {
      const prData = await prRes.json()
      if (prData.state === 'open') {
        await gh(`/repos/${REPO}/pulls/${pr}`, {
          method: 'PATCH',
          body: JSON.stringify({ state: 'closed' }),
        })
      }
      await gh(`/repos/${REPO}/git/refs/heads/${encodeURIComponent(prData.head.ref)}`, { method: 'DELETE' })
    }
  }
  if (issue) {
    await gh(`/repos/${REPO}/issues/${issue}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed', state_reason: 'not_planned' }),
    })
  }
  return Response.json({ ok: true })
}
