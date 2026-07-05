import { checkToken, unauthorized, badRequest, gh, ghJson, REPO } from '../lib/util.mjs'

export default async (req) => {
  if (req.method !== 'POST') return badRequest('POST only')
  if (!checkToken(req)) return unauthorized()
  const { pr, issue } = await req.json().catch(() => ({}))
  if (!pr) return badRequest('Missing pr number')

  const prData = await ghJson(`/repos/${REPO}/pulls/${pr}`)
  if (prData.state !== 'open') return badRequest('This change is no longer open')

  const merge = await gh(`/repos/${REPO}/pulls/${pr}/merge`, {
    method: 'PUT',
    body: JSON.stringify({ merge_method: 'squash' }),
  })
  if (!merge.ok) {
    return Response.json({ error: `Could not publish (${merge.status})` }, { status: 502 })
  }

  // best-effort cleanup: delete the branch, close the originating issue
  await gh(`/repos/${REPO}/git/refs/heads/${encodeURIComponent(prData.head.ref)}`, { method: 'DELETE' })
  if (issue) {
    await gh(`/repos/${REPO}/issues/${issue}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed' }),
    })
  }
  return Response.json({ ok: true })
}
