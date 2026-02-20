import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { accountId, projectId } = JSON.parse(event.body ?? '{}')
    if (!accountId || !projectId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'accountId and projectId required' }) }
    }

    // Fetch the CalDAV account
    const { data: account, error: accErr } = await supabase
      .from('caldav_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (accErr || !account) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Account not found' }) }
    }

    // NOTE: In production, retrieve the encrypted app password from a secrets store.
    // This example demonstrates the CalDAV fetch flow.
    // The actual password should be stored encrypted and decrypted server-side.

    let syncedCount = 0

    if (account.sync_reminders) {
      syncedCount += await syncReminders(supabase, account, projectId)
    }

    if (account.sync_calendar) {
      syncedCount += await syncCalendar(supabase, account, projectId)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, synced: syncedCount }),
    }
  } catch (err) {
    console.error('CalDAV sync error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}

/**
 * Fetch Apple Reminders via CalDAV VTODO
 * Apple iCloud CalDAV endpoint: https://caldav.icloud.com
 */
async function syncReminders(
  supabase: ReturnType<typeof createClient>,
  account: { server_url: string; username: string; user_id: string },
  projectId: string
): Promise<number> {
  const baseUrl = account.server_url

  // 1. Discover the principal URL
  const discoverResponse = await fetchCalDAV(
    `${baseUrl}/`,
    'PROPFIND',
    account.username,
    '', // password retrieved from secure store in production
    `<?xml version="1.0" encoding="UTF-8"?>
    <A:propfind xmlns:A="DAV:">
      <A:prop>
        <A:current-user-principal/>
      </A:prop>
    </A:propfind>`,
    { Depth: '0' }
  )

  if (!discoverResponse.ok) {
    console.error('CalDAV discovery failed:', discoverResponse.status)
    return 0
  }

  // 2. Query for VTODO items (Reminders)
  const calendarData = await fetchCalDAV(
    `${baseUrl}/`,
    'REPORT',
    account.username,
    '',
    `<?xml version="1.0" encoding="UTF-8"?>
    <C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
      <D:prop>
        <D:getetag/>
        <C:calendar-data/>
      </D:prop>
      <C:filter>
        <C:comp-filter name="VCALENDAR">
          <C:comp-filter name="VTODO"/>
        </C:comp-filter>
      </C:filter>
    </C:calendar-query>`,
    { Depth: '1' }
  )

  if (!calendarData.ok) return 0

  const xmlText = await calendarData.text()
  const todos = parseVTODO(xmlText)

  let count = 0
  for (const todo of todos) {
    // Check if already synced
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('apple_reminder_id', todo.uid)
      .eq('project_id', projectId)
      .single()

    if (!existing) {
      await supabase.from('tasks').insert({
        project_id: projectId,
        title: todo.summary || 'Unbenannte Erinnerung',
        description: todo.description ?? null,
        status: todo.completed ? 'done' : 'todo',
        priority: mapPriority(todo.priority),
        due_date: todo.due ?? null,
        apple_reminder_id: todo.uid,
        created_by: account.user_id,
        position: 0,
      })
      count++
    } else if (todo.completed) {
      await supabase
        .from('tasks')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('apple_reminder_id', todo.uid)
        .eq('project_id', projectId)
    }
  }

  return count
}

async function syncCalendar(
  supabase: ReturnType<typeof createClient>,
  account: { server_url: string; username: string; user_id: string },
  projectId: string
): Promise<number> {
  const baseUrl = account.server_url

  const calendarData = await fetchCalDAV(
    `${baseUrl}/`,
    'REPORT',
    account.username,
    '',
    `<?xml version="1.0" encoding="UTF-8"?>
    <C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
      <D:prop>
        <D:getetag/>
        <C:calendar-data/>
      </D:prop>
      <C:filter>
        <C:comp-filter name="VCALENDAR">
          <C:comp-filter name="VEVENT">
            <C:time-range start="${getISO8601UtcNow()}"/>
          </C:comp-filter>
        </C:comp-filter>
      </C:filter>
    </C:calendar-query>`,
    { Depth: '1' }
  )

  if (!calendarData.ok) return 0

  const xmlText = await calendarData.text()
  const events = parseVEVENT(xmlText)

  let count = 0
  for (const event of events) {
    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('apple_calendar_event_id', event.uid)
      .eq('project_id', projectId)
      .single()

    if (!existing) {
      await supabase.from('tasks').insert({
        project_id: projectId,
        title: `[Termin] ${event.summary || 'Unbenannter Termin'}`,
        description: event.description ?? null,
        status: 'todo',
        priority: 'medium',
        due_date: event.dtstart ?? null,
        apple_calendar_event_id: event.uid,
        created_by: account.user_id,
        position: 0,
      })
      count++
    }
  }

  return count
}

async function fetchCalDAV(
  url: string,
  method: string,
  username: string,
  password: string,
  body: string,
  extraHeaders: Record<string, string> = {}
) {
  const auth = Buffer.from(`${username}:${password}`).toString('base64')
  return fetch(url, {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/xml; charset=utf-8',
      'Accept': 'application/xml',
      ...extraHeaders,
    },
    body,
  })
}

interface VTodo {
  uid: string
  summary: string
  description?: string
  due?: string
  completed: boolean
  priority?: number
}

interface VEvent {
  uid: string
  summary: string
  description?: string
  dtstart?: string
}

function parseVTODO(xml: string): VTodo[] {
  const todos: VTodo[] = []
  const calDataMatches = xml.matchAll(/<calendar-data[^>]*>([\s\S]*?)<\/calendar-data>/gi)
  for (const match of calDataMatches) {
    const ical = decodeXML(match[1])
    const todoBlocks = ical.matchAll(/BEGIN:VTODO([\s\S]*?)END:VTODO/g)
    for (const block of todoBlocks) {
      const data = block[1]
      const uid = extractField(data, 'UID')
      const summary = extractField(data, 'SUMMARY')
      if (!uid) continue
      todos.push({
        uid,
        summary,
        description: extractField(data, 'DESCRIPTION') || undefined,
        due: parseICalDate(extractField(data, 'DUE')),
        completed: /STATUS:COMPLETED/.test(data),
        priority: parseInt(extractField(data, 'PRIORITY') ?? '0') || undefined,
      })
    }
  }
  return todos
}

function parseVEVENT(xml: string): VEvent[] {
  const events: VEvent[] = []
  const calDataMatches = xml.matchAll(/<calendar-data[^>]*>([\s\S]*?)<\/calendar-data>/gi)
  for (const match of calDataMatches) {
    const ical = decodeXML(match[1])
    const eventBlocks = ical.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)
    for (const block of eventBlocks) {
      const data = block[1]
      const uid = extractField(data, 'UID')
      const summary = extractField(data, 'SUMMARY')
      if (!uid) continue
      events.push({
        uid,
        summary,
        description: extractField(data, 'DESCRIPTION') || undefined,
        dtstart: parseICalDate(extractField(data, 'DTSTART')),
      })
    }
  }
  return events
}

function extractField(ical: string, field: string): string {
  const match = ical.match(new RegExp(`${field}[^:]*:([^\r\n]+)`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function parseICalDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined
  // Handle formats: 20240115T120000Z or 20240115
  const clean = dateStr.replace(/[TZ]/g, '')
  if (clean.length >= 8) {
    const y = clean.slice(0, 4)
    const m = clean.slice(4, 6)
    const d = clean.slice(6, 8)
    return `${y}-${m}-${d}`
  }
  return undefined
}

function decodeXML(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function mapPriority(p?: number): 'low' | 'medium' | 'high' | 'urgent' {
  if (!p) return 'medium'
  if (p <= 1) return 'urgent'
  if (p <= 3) return 'high'
  if (p <= 6) return 'medium'
  return 'low'
}

function getISO8601UtcNow(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
}
