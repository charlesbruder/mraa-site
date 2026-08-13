// Forwards every Netlify form submission into GoHighLevel.
// Netlify invokes this automatically for each verified submission (the
// filename "submission-created" is the trigger). Spam caught by the
// honeypot never reaches this function.
//
// Per form type: upsert the contact, add a tag, fill custom fields, and
// leave the full submission as a ready-to-paste Note. History submissions
// and sponsor inquiries also become pipeline cards. Photos ride along as
// links in the note; Netlify keeps the original files.

const GHL = 'https://services.leadconnectorhq.com'
const LOCATION = 'oxIujJmc19j8tjF3ztoi'

const FIELD = {
  season: 'j2iatsZYUKGbTRmciV1V',
  yearsPlayed: 'HC7lE9roPpyEC5cCiqh9',
  positions: 'OAKYvOkki8C3SIBBhKlI',
  classYear: '66W6Cmq1u0L1J0bdWxwt',
  submissionType: 'P25Xt9Cq8Jd1fGK6pG1f',
  gradYear: 'aLK8bPqr4aeiLnDdNQGY',
}

const PIPELINE = {
  alumniContent: { id: 'OhdQ0pCKmeW0jPBYRLRi', newStage: 'ca55a105-617c-416a-b83f-5c46166c4a2e' },
  sponsors: { id: 'fqDDerVTalgf2OIkJbSB', newStage: 'c3cfc487-dc34-4bb0-bc6c-c0d581d6a282' },
}

async function ghl(method, path, body) {
  const res = await fetch(`${GHL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GHL_API_TOKEN}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`GHL ${res.status} on ${path}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : {}
}

const splitName = (full) => {
  const parts = String(full || '').trim().split(/\s+/)
  return { firstName: parts.shift() || '', lastName: parts.join(' ') }
}

// File fields arrive as {filename, url, ...}; everything else as strings.
const fileLinks = (data, keys) =>
  keys
    .map((k) => data[k])
    .filter((f) => f && typeof f === 'object' && f.url)
    .map((f) => `${f.filename || 'photo'}: ${f.url}`)

async function upsertContact({ name, firstName, lastName, email, phone, companyName, customFields }) {
  const body = {
    locationId: LOCATION,
    ...(name ? splitName(name) : { firstName, lastName }),
    email: String(email || '').trim() || undefined,
    phone: String(phone || '').trim() || undefined,
    companyName: companyName || undefined,
    customFields: customFields?.length ? customFields : undefined,
  }
  const res = await ghl('POST', '/contacts/upsert', body)
  return res.contact?.id
}

const addTag = (contactId, tag) => ghl('POST', `/contacts/${contactId}/tags`, { tags: [tag] })
const addNote = (contactId, noteBody) => ghl('POST', `/contacts/${contactId}/notes`, { body: noteBody })
const addCard = (pipeline, name, contactId) =>
  ghl('POST', '/opportunities/', {
    locationId: LOCATION,
    pipelineId: pipeline.id,
    pipelineStageId: pipeline.newStage,
    name,
    status: 'open',
    contactId,
  })

const HANDLERS = {
  'history-submission': async (d) => {
    const id = await upsertContact({
      name: d['h-name'], email: d['h-email'],
      customFields: [
        { id: FIELD.season, field_value: d.season || '' },
        { id: FIELD.yearsPlayed, field_value: d['h-played'] || '' },
        { id: FIELD.positions, field_value: d['h-position'] || '' },
        { id: FIELD.classYear, field_value: d['h-class'] || '' },
        { id: FIELD.submissionType, field_value: d['h-type'] || '' },
      ].filter((f) => f.field_value),
    })
    await addTag(id, 'History Submission')
    const photos = fileLinks(d, ['photo-1', 'photo-2'])
    await addNote(id, [
      'WEBSITE HISTORY SUBMISSION',
      `Season: ${d.season || '?'} | Years played: ${d['h-played'] || '-'} | Position: ${d['h-position'] || '-'} | Class of ${d['h-class'] || '-'}`,
      '',
      'STORY (use exactly as written):',
      d['h-details'] || '(no text)',
      ...(photos.length ? ['', 'PHOTOS:', ...photos] : []),
      '',
      `SUGGESTED SITE MANAGER REQUEST: Add this to the ${d.season || '____'} page from ${d['h-name'] || 'the submitter'}${d['h-class'] ? `, class of ${d['h-class']}` : ''} — use the text exactly as written.`,
    ].join('\n'))
    await addCard(PIPELINE.alumniContent, `${d.season || '?'} — ${d['h-type'] || 'Submission'} — ${d['h-name'] || 'Unknown'}`, id)
  },

  'sponsor-inquiry': async (d) => {
    const id = await upsertContact({
      firstName: d['sp-first'], lastName: d['sp-last'], email: d['sp-email'],
      phone: d['sp-phone'], companyName: d['sp-company'],
    })
    await addTag(id, 'Sponsor Lead')
    await addNote(id, [
      'WEBSITE SPONSOR INQUIRY',
      `Company: ${d['sp-company'] || '-'} | Tier interest: ${d['sp-tier'] || '-'}`,
      '',
      `MESSAGE: ${d['sp-msg'] || '(none)'}`,
    ].join('\n'))
    await addCard(PIPELINE.sponsors, `${d['sp-company'] || 'Unknown company'} — ${d['sp-tier'] || 'inquiry'}`, id)
  },

  'alumni-registration': async (d) => {
    const id = await upsertContact({
      firstName: d['a-first'], lastName: d['a-last'], email: d['a-email'], phone: d['a-phone'],
      customFields: [
        { id: FIELD.gradYear, field_value: d['a-gradyear'] || '' },
        { id: FIELD.positions, field_value: d['a-position'] || '' },
        { id: FIELD.yearsPlayed, field_value: [d['a-start'], d['a-end']].filter(Boolean).join('-') },
      ].filter((f) => f.field_value),
    })
    await addTag(id, 'Alumni Network')
    await addNote(id, [
      'WEBSITE ALUMNI REGISTRATION',
      `${d['a-city'] || '-'}, ${d['a-state'] || '-'} | Grad year: ${d['a-gradyear'] || '-'} | Played: ${d['a-start'] || '?'}-${d['a-end'] || '?'} | Position: ${d['a-position'] || '-'}`,
      `How they heard about MRAA: ${d['a-hear'] || '-'}`,
    ].join('\n'))
  },

  'play-interest': async (d) => {
    const id = await upsertContact({ firstName: d['t-first'], lastName: d['t-last'], email: d['t-email'], phone: d['t-phone'] })
    await addTag(id, 'Prospective Player')
    await addNote(id, [
      'WEBSITE PLAY-INTEREST (RECRUIT) FORM — forward to the current team',
      `Location: ${d['t-addr'] || ''} ${d['t-city'] || ''}, ${d['t-state'] || ''} ${d['t-zip'] || ''}`,
      `High school: ${d['t-hs'] || '-'} | Height: ${d['t-ht'] || '-'} | Weight: ${d['t-wt'] || '-'}`,
      `Positions: ${d['t-pos'] || '-'} | Rugby experience: ${d['t-exp'] || '-'}`,
      `Other sports: ${d['t-sports'] || '-'} | Previous clubs: ${d['t-clubs'] || '-'}`,
      `References: ${d['t-refs'] || '-'}`,
    ].join('\n'))
  },

  rsvp: async (d) => {
    const id = await upsertContact({ firstName: d['r-first'], lastName: d['r-last'], email: d['r-email'], phone: d['r-phone'] })
    await addTag(id, 'Alumni Weekend RSVP')
    await addNote(id, `WEBSITE RSVP — Alumni Weekend\nContact consent given: ${d['r-consent'] ? 'yes' : 'no'}`)
  },

  contact: async (d) => {
    const id = await upsertContact({ firstName: d['ab-first'], lastName: d['ab-last'], email: d['ab-email'], phone: d['ab-phone'] })
    await addTag(id, 'Contact Form')
    await addNote(id, `WEBSITE CONTACT FORM\nMESSAGE: ${d['ab-msg'] || '(none)'}`)
  },

  volunteer: async (d) => {
    const id = await upsertContact({ firstName: d['v-first'], lastName: d['v-last'], email: d['v-email'], phone: d['v-phone'] })
    await addTag(id, 'Volunteer')
    await addNote(id, `WEBSITE VOLUNTEER FORM\nABOUT: ${d['v-about'] || '(none)'}`)
  },

  newsletter: async (d) => {
    const id = await upsertContact({ email: d.email, firstName: '', lastName: '' })
    await addTag(id, 'Newsletter')
  },
}

export default async (req) => {
  let formName = '(unknown)'
  try {
    const { payload } = await req.json()
    formName = payload?.form_name || '(unknown)'
    const data = payload?.data || {}
    const handler = HANDLERS[formName]
    if (!handler) {
      console.log(`submission-created: no handler for form "${formName}" — skipped`)
      return new Response('skipped', { status: 200 })
    }
    if (!process.env.GHL_API_TOKEN) throw new Error('GHL_API_TOKEN is not set')
    await handler(data)
    console.log(`submission-created: forwarded "${formName}" to GHL`)
    return new Response('ok', { status: 200 })
  } catch (err) {
    // Never fail hard: Netlify keeps the submission either way.
    console.error(`submission-created: error forwarding "${formName}": ${err.message}`)
    return new Response('error logged', { status: 200 })
  }
}
