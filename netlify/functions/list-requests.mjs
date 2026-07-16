import { checkToken, unauthorized, ghJson, REPO, PREVIEW_SLUG } from '../lib/util.mjs'

const FEEDBACK_MARKER = 'Revision requested via the MRAA admin page'
const REVISION_STUCK_MS = 15 * 60 * 1000 // fall back to ready if no commit follows feedback

// A PR being open doesn't mean its preview is current: the preview build may
// still be running (first build or after a revision), or Claude may still be
// working on requested changes. Statuses:
//   working  — first edit or first preview build in progress
//   updating — revision requested; Claude editing or preview rebuilding
//   ready    — preview URL serves the latest commit's build
async function previewIsLive(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(4000) })
    return res.ok
  } catch {
    return false
  }
}

async function openPrState(pr) {
  const url = `https://deploy-preview-${pr.number}--${PREVIEW_SLUG}.netlify.app`
  const [comments, commits, combined] = await Promise.all([
    ghJson(`/repos/${REPO}/issues/${pr.number}/comments?per_page=100`),
    ghJson(`/repos/${REPO}/pulls/${pr.number}/commits?per_page=100`),
    ghJson(`/repos/${REPO}/commits/${pr.head.sha}/status`),
  ])

  const lastFeedback = comments
    .filter((c) => (c.body || '').includes(FEEDBACK_MARKER))
    .map((c) => new Date(c.created_at).getTime())
    .sort((a, b) => b - a)[0]
  const lastCommit = commits.length
    ? new Date(commits[commits.length - 1].commit.committer.date).getTime()
    : 0
  const hadRevision = Boolean(lastFeedback)

  // Feedback newer than the latest commit: Claude is still writing the revision.
  if (lastFeedback && lastFeedback > lastCommit) {
    if (Date.now() - lastFeedback < REVISION_STUCK_MS) return { status: 'updating', preview: null }
    // revision seems stuck — surface the existing preview rather than blocking forever
  }

  // Latest commit's preview build not green yet.
  if (combined.state !== 'success') {
    return { status: hadRevision ? 'updating' : 'working', preview: null }
  }

  if (await previewIsLive(url)) return { status: 'ready', preview: url }
  return { status: hadRevision ? 'updating' : 'working', preview: null }
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
      else if (pr && pr.state === 'open') ({ status, preview } = await openPrState(pr))
      else if ((pr && pr.state === 'closed') || issue.state === 'closed') status = 'discarded'

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
