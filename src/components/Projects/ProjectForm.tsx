import { useState } from 'react'
import { X } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#10b981', '#14b8a6', '#f59e0b', '#ef4444',
  '#6366f1', '#84cc16',
]

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function ProjectForm({ onClose, onCreated }: Props) {
  const { createProject } = useProjects()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const project = await createProject(name.trim(), description.trim(), color)
    setLoading(false)
    if (project) onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Neues Projekt</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Projektname *</label>
            <input
              type="text"
              className="input"
              placeholder="Mein Projekt"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Beschreibung</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Worum geht es in diesem Projekt?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Farbe</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Abbrechen
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="btn-primary flex-1 justify-center">
              {loading ? 'Erstellen...' : 'Projekt erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
