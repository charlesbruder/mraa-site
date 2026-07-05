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
      const { token: t } = await apiLogin($('password').value)
      localStorage.setItem(TOKEN_KEY, t)
      $('password').value = ''
      enterApp()
    } catch (ex) {
      err.textContent = ex.message
      err.classList.remove('hidden')
    }
  })

  async function apiLogin(password) {
    const res = await fetch(`${API}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Could not sign in')
    return data
  }

  logoutBtn.addEventListener('click', signOut)

  // ---------- submit a request ----------

  $('request-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = $('submit-btn')
    const status = $('submit-status')
    const err = $('request-error')
    err.classList.add('hidden')
    btn.disabled = true
    try {
      const files = Array.from($('photos').files || [])
      const photos = []
      for (let i = 0; i < files.length; i++) {
        status.textContent = `Uploading photo ${i + 1} of ${files.length}…`
        photos.push((await api('upload-photo', {
          name: files[i].name,
          dataBase64: await fileToBase64(files[i]),
        })).path)
      }
      status.textContent = 'Sending request…'
      await api('create-request', { prompt: $('prompt').value, photos })
      $('prompt').value = ''
      $('photos').value = ''
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

    if (item.status === 'working') {
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
          fb.innerHTML = '<p class="help">Feedback sent — the preview will update in a few minutes.</p>'
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

    if (item.status === 'working') {
      const p = document.createElement('p')
      p.className = 'meta'
      p.style.marginTop = '0.5rem'
      p.textContent = 'Usually takes 2–5 minutes. This list refreshes automatically.'
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
