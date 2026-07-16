import { checkToken, unauthorized, ghJson, REPO, PREVIEW_SLUG } from '../lib/util.mjs'

// A PR being open doesn't mean its Netlify deploy preview has finished
// building — report "ready" only once the preview URL actually responds,
// otherwise the View Preview button would 404 for the first ~minute.
async function previewIsLive(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(4000) })
    return res.ok
  } catch {
    return false
  }
}

export default async (req) => {
  if (!checkToken(req)) return unauthorized()

  const [rawIssues, pulls] = await Promise.all([
    ghJson(`/repos/${REPO}/issues?labels=change-request&state=all&per_page=30&sort=created&direction=desc`),
    ghJson(`/repos/${REPO}/pulls?state=all&per_page=100&sort=created&direction=desc`),
  ])
  const issues = rawIssues.filter((i) => !i.pull_request)

  const items = await Promise.all(
    issues.map(async (issue) => {
      const pr = pulls.find((p) => p.head.ref.startsWith(`claude/issue-${issue.number}-`))
      let status = 'working'
      let preview = null
      if (pr?.merged_at) status = 'published'
      else if (pr && pr.state === 'open') {
        const url = `https://deploy-preview-${pr.number}--${PREVIEW_SLUG}.netlify.app`
        if (await previewIsLive(url)) {
          status = 'ready'
          preview = url
        } // else: keep "working" — preview still building
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
  )
  return Response.json({ items })
}
