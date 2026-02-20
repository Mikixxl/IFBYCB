import { useState } from 'react'
import { X, Calendar, User, Flag } from 'lucide-react'
import { Task, TaskStatus, TaskPriority, User as UserType } from '../../types'
import { format } from 'date-fns'

interface Props {
  projectId: string
  status?: TaskStatus
  members?: UserType[]
  task?: Task
  onClose: () => void
  onSubmit: (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'position'>) => Promise<void>
}

const PRIORITIES: { value: TaskPriority; label: string; className: string }[] = [
  { value: 'low',    label: 'Niedrig',  className: 'priority-low' },
  { value: 'medium', label: 'Mittel',   className: 'priority-medium' },
  { value: 'high',   label: 'Hoch',     className: 'priority-high' },
  { value: 'urgent', label: 'Dringend', className: 'priority-urgent' },
]

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo',        label: 'Offen' },
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'review',      label: 'Überprüfung' },
  { value: 'done',        label: 'Erledigt' },
]

export default function TaskForm({ projectId, status = 'todo', members = [], task, onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? status,
    priority: task?.priority ?? 'medium' as TaskPriority,
    assignee_id: task?.assignee_id ?? null as string | null,
    due_date: task?.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    await onSubmit({
      project_id: projectId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      assignee_id: form.assignee_id,
      due_date: form.due_date || null,
      apple_reminder_id: task?.apple_reminder_id ?? null,
      apple_calendar_event_id: task?.apple_calendar_event_id ?? null,
      created_by: task?.created_by ?? '',
    })
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Titel *</label>
            <input
              type="text"
              className="input"
              placeholder="Was muss erledigt werden?"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Beschreibung</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Details zur Aufgabe..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1"><Flag size={13} /> Priorität</label>
              <select
                className="input"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1"><User size={13} /> Zugewiesen an</label>
              <select
                className="input"
                value={form.assignee_id ?? ''}
                onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value || null }))}
              >
                <option value="">Niemand</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label flex items-center gap-1"><Calendar size={13} /> Fälligkeitsdatum</label>
              <input
                type="date"
                className="input"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Abbrechen
            </button>
            <button type="submit" disabled={loading || !form.title.trim()} className="btn-primary flex-1 justify-center">
              {loading ? 'Speichern...' : task ? 'Aktualisieren' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
