import { checkToken, unauthorized, ghJson, REPO, PREVIEW_SLUG } from '../lib/util.mjs'

export default async (req) => {
  if (!checkToken(req)) return unauthorized()

  const [rawIssues, pulls] = await Promise.all([
    ghJson(`/repos/${REPO}/issues?labels=change-request&state=all&per_page=30&sort=created&direction=desc`),
    ghJson(`/repos/${REPO}/pulls?state=all&per_page=100&sort=created&direction=desc`),
  ])
  const issues = rawIssues.filter((i) => !i.pull_request)

  const items = issues.map((issue) => {
    const pr = pulls.find((p) => p.head.ref.startsWith(`claude/issue-${issue.number}-`))
    let status = 'working'
    let preview = null
    if (pr?.merged_at) status = 'published'
    else if (pr && pr.state === 'open') {
      status = 'ready'
      preview = `https://deploy-preview-${pr.number}--${PREVIEW_SLUG}.netlify.app`
    } else if ((pr && pr.state === 'closed') || issue.state === 'closed') status = 'discarded'

    return {
      issue: issue.number,
      pr: pr?.number ?? null,
      title: issue.title,
      created: issue.created_at,
      status,
      preview,
    }
  })
  return Response.json({ items })
}
