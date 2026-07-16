/* MRAA Site Manager — board-facing admin client */
(function () {
  const API = '/.netlify/functions'
  const TOKEN_KEY = 'mraa_admin_token'
  let pollTimer = null

  const $ = (id) => document.getElementById(id)
  const loginView = $('login-view')
  const appView = $('app-view')
  const logoutBtn = $('logout')
  const listEl = $('list')

  // ---------- helpers ----------

  const token = () => localStorage.getItem(TOKEN_KEY)

  async function api(path, body) {
    const res = await fetch(`${API}/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${token()}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) {
      signOut()
      throw new Error('Session expired — please sign in again')
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status})`)
    return data
  }

  function show(view) {
    loginView.classList.toggle('hidden', view !== 'login')
    appView.classList.toggle('hidden', view !== 'app')
    logoutBtn.classList.toggle('hidden', view !== 'app')
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY)
    clearInterval(pollTimer)
    show('login')
  }

  function enterApp() {
    show('app')
    refresh()
    clearInterval(pollTimer)
    pollTimer = setInterval(refresh, 20000)
  }

  // ---------- login ----------

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const err = $('login-error')
    err.classList.add('hidden')
    try {
      const res = await fetch(`${API}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: $('password').value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not sign in')
      localStorage.setItem(TOKEN_KEY, data.token)
      $('password').value = ''
      enterApp()
    } catch (ex) {
      err.textContent = ex.message
      err.classList.remove('hidden')
    }
  })

  logoutBtn.addEventListener('click', signOut)

  // ---------- tabs ----------

  $('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab')
    if (!btn) return
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === btn))
    document.querySelectorAll('.tabpane').forEach((p) =>
      p.classList.toggle('hidden', p.dataset.pane !== btn.dataset.tab)
    )
  })

  // ---------- request forms ----------

  function prettyDate(value) {
    if (!value) return ''
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  function prettyRange(start, end) {
    const s = prettyDate(start)
    if (!end || end === start) return s
    const e = prettyDate(end)
    const [sm, sd, sy] = [s.split(' ')[0], s.split(' ')[1].replace(',', ''), s.split(' ')[2]]
    const [em, ed, ey] = [e.split(' ')[0], e.split(' ')[1].replace(',', ''), e.split(' ')[2]]
    if (sm === em && sy === ey) return `${sm} ${sd}–${ed}, ${sy}` // October 3–4, 2026
    return `${s} – ${e}`
  }

  const today = new Date()
  $('news-date').value = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  const VERBATIM =
    'The author wrote this text themselves — use it EXACTLY as written. Do not rewrite, shorten, expand, or correct it; only wrap it in the site\'s existing HTML structure (paragraphs where the author left blank lines).'

  function buildNewsPrompt(photos) {
    const title = $('news-title').value.trim()
    const lines = [
      `Add this news post: ${title}`,
      '',
      `Date: ${prettyDate($('news-date').value) || 'today'}`,
      `Category tag: ${$('news-tag').value}`,
      '',
      `Post text — ${VERBATIM}`,
      '"""',
      $('news-body').value.trim(),
      '"""',
      '',
      'Add a card to the top of the news.html grid (use the first sentence of the post as the card excerpt) and create the full article page following the site conventions.',
    ]
    if (photos.length) lines.push('', `Use ${photos.map((p) => `\`${p}\``).join(' and ')} as the article and card image.`)
    return lines.join('\n')
  }

  function buildEventPrompt(photos) {
    const name = $('event-name').value.trim()
    const lines = [
      `Add this event to the calendar: ${name}`,
      '',
      `Date: ${prettyRange($('event-date').value, $('event-end').value)}`,
    ]
    if ($('event-time').value.trim()) lines.push(`Time: ${$('event-time').value.trim()}`)
    lines.push(`Location: ${$('event-location').value.trim()}`)
    lines.push('', `Description — ${VERBATIM}`, '"""', $('event-desc').value.trim(), '"""')
    lines.push('', 'Add it as an event card in the Upcoming Events section of events.html, keeping events in date order.')
    if ($('event-link').value.trim())
      lines.push(`Point the RSVP button at ${$('event-link').value.trim()} (open in a new tab).`)
    if (photos.length) lines.push('', `Use ${photos.map((p) => `\`${p}\``).join(' and ')} as the event image.`)
    return lines.join('\n')
  }

  function buildOtherPrompt(photos) {
    let text = $('other-prompt').value.trim()
    if (photos.length) text += `\n\nUse the uploaded photo(s): ${photos.map((p) => `\`${p}\``).join(', ')}`
    return text
  }

  const FORMS = [
    { id: 'news-form', files: 'news-photos', build: buildNewsPrompt },
    { id: 'event-form', files: 'event-photos', build: buildEventPrompt },
    { id: 'other-form', files: 'other-photos', build: buildOtherPrompt },
  ]

  FORMS.forEach(({ id, files, build }) => {
    const form = $(id)
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const btn = form.querySelector('button[type="submit"]')
      const status = form.querySelector('.submit-status')
      const err = form.querySelector('.submit-error')
      err.classList.add('hidden')
      btn.disabled = true
      try {
        const fileList = Array.from($(files).files || [])
        const photos = []
        for (let i = 0; i < fileList.length; i++) {
          status.textContent = `Uploading photo ${i + 1} of ${fileList.length}…`
          photos.push((await api('upload-photo', {
            name: fileList[i].name,
            dataBase64: await fileToBase64(fileList[i]),
          })).path)
        }
        status.textContent = 'Sending request…'
        await api('create-request', { prompt: build(photos) })
        form.reset()
        if (id === 'news-form') $('news-date').value = new Date().toISOString().slice(0, 10)
        status.textContent = 'Request sent! It will appear below.'
        setTimeout(() => (status.textContent = ''), 6000)
        refresh()
      } catch (ex) {
        err.textContent = ex.message
        err.classList.remove('hidden')
        status.textContent = ''
      } finally {
        btn.disabled = false
      }
    })
  })

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result).split(',')[1])
      r.onerror = () => reject(new Error(`Could not read ${file.name}`))
      r.readAsDataURL(file)
    })
  }

  // ---------- request list ----------

  const CHIPS = {
    working: ['chip--working', 'Working on it'],
    updating: ['chip--working', 'Updating preview'],
    ready: ['chip--ready', 'Ready to preview'],
    published: ['chip--published', 'Published'],
    discarded: ['chip--discarded', 'Discarded'],
  }

  async function refresh() {
    try {
      const { items } = await api('list-requests')
      render(items)
    } catch (ex) {
      listEl.innerHTML = ''
      const p = document.createElement('p')
      p.className = 'error'
      p.textContent = ex.message
      listEl.appendChild(p)
    }
  }

  function render(items) {
    listEl.innerHTML = ''
    if (!items.length) {
      const p = document.createElement('p')
      p.className = 'help'
      p.textContent = 'No change requests yet — send your first one above.'
      listEl.appendChild(p)
      return
    }
    items.forEach((item) => listEl.appendChild(renderItem(item)))
  }

  function renderItem(item) {
    const wrap = document.createElement('div')
    wrap.className = 'req'

    const [chipClass, chipLabel] = CHIPS[item.status] || CHIPS.working
    const chip = document.createElement('span')
    chip.className = `chip ${chipClass}`
    chip.textContent = chipLabel
    wrap.appendChild(chip)

    if (item.status === 'working' || item.status === 'updating') {
      chip.insertAdjacentHTML('beforebegin', '<span class="spin" style="margin-right:0.5rem"></span>')
    }

    const h = document.createElement('h3')
    h.textContent = item.title
    wrap.appendChild(h)

    const meta = document.createElement('div')
    meta.className = 'meta'
    meta.textContent = `Requested ${new Date(item.created).toLocaleString()}`
    wrap.appendChild(meta)

    if (item.status === 'ready') {
      const row = document.createElement('div')
      row.className = 'row'

      const view = document.createElement('a')
      view.className = 'btn btn--sm'
      view.href = item.preview
      view.target = '_blank'
      view.rel = 'noopener'
      view.textContent = 'View preview'
      row.appendChild(view)

      const publish = document.createElement('button')
      publish.className = 'btn btn--ghost btn--sm'
      publish.textContent = 'Publish to live site'
      publish.onclick = () => act(publish, 'Publish this change to the live website?', 'publish', item)
      row.appendChild(publish)

      const adjust = document.createElement('button')
      adjust.className = 'btn btn--ghost btn--sm'
      adjust.textContent = 'Ask for changes'
      row.appendChild(adjust)

      const discard = document.createElement('button')
      discard.className = 'btn btn--danger btn--sm'
      discard.textContent = 'Discard'
      discard.onclick = () => act(discard, 'Throw this change away? The live site will not be affected.', 'discard', item)
      row.appendChild(discard)

      wrap.appendChild(row)

      const fb = document.createElement('div')
      fb.className = 'feedback-box hidden'
      const ta = document.createElement('textarea')
      ta.placeholder = 'What should be different? e.g. "Make the headline shorter" or "Use the other photo"'
      ta.style.minHeight = '70px'
      const fbRow = document.createElement('div')
      fbRow.className = 'row'
      const send = document.createElement('button')
      send.className = 'btn btn--sm'
      send.textContent = 'Send feedback'
      send.onclick = async () => {
        if (!ta.value.trim()) return
        send.disabled = true
        try {
          await api('feedback', { pr: item.pr, message: ta.value })
          fb.innerHTML = '<p class="help">Feedback sent — this request will show “Updating preview” until the new version is ready.</p>'
          setTimeout(refresh, 3000)
        } catch (ex) {
          alert(ex.message)
          send.disabled = false
        }
      }
      fbRow.appendChild(send)
      fb.appendChild(ta)
      fb.appendChild(fbRow)
      wrap.appendChild(fb)
      adjust.onclick = () => fb.classList.toggle('hidden')
    }

    if (item.status === 'working' || item.status === 'updating') {
      const p = document.createElement('p')
      p.className = 'meta'
      p.style.marginTop = '0.5rem'
      p.textContent = item.status === 'updating'
        ? 'Making your requested changes — the preview button will come back when the update is done.'
        : 'Usually takes 2–5 minutes. This list refreshes automatically.'
      wrap.appendChild(p)
    }

    return wrap
  }

  async function act(btn, confirmMsg, endpoint, item) {
    if (!confirm(confirmMsg)) return
    btn.disabled = true
    try {
      await api(endpoint, { pr: item.pr, issue: item.issue })
      refresh()
    } catch (ex) {
      alert(ex.message)
      btn.disabled = false
    }
  }

  // ---------- boot ----------

  if (token()) enterApp()
  else show('login')
})()
