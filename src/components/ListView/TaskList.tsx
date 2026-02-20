import { useState } from 'react'
import { Task, TaskStatus, User } from '../../types'
import { Calendar, Flag, Check, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { de } from 'date-fns/locale'

const STATUS_GROUPS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo',        label: 'Offen',         color: 'text-gray-500' },
  { id: 'in_progress', label: 'In Bearbeitung', color: 'text-blue-500' },
  { id: 'review',      label: 'Überprüfung',    color: 'text-purple-500' },
  { id: 'done',        label: 'Erledigt',       color: 'text-green-500' },
]

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400', medium: 'text-blue-500', high: 'text-orange-500', urgent: 'text-red-500'
}

interface Props {
  tasks: Task[]
  members: User[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}

export default function ListView({ tasks, members, onEdit, onDelete, onStatusChange }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['done']))

  function toggleGroup(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-4">
      {STATUS_GROUPS.map(group => {
        const groupTasks = tasks.filter(t => t.status === group.id)
        const isCollapsed = collapsed.has(group.id)

        return (
          <div key={group.id}>
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center gap-2 mb-2 hover:opacity-80"
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              <span className={`text-sm font-semibold ${group.color}`}>{group.label}</span>
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {groupTasks.length}
              </span>
            </button>

            {!isCollapsed && (
              <div className="space-y-1 ml-5">
                {groupTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    members={members}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                  />
                ))}
                {groupTasks.length === 0 && (
                  <p className="text-xs text-gray-400 py-2">Keine Aufgaben</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TaskRow({ task, onEdit, onDelete, onStatusChange }: {
  task: Task
  members: User[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}) {
  const isDone = task.status === 'done'
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isDone

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
      {/* Checkbox */}
      <button
        onClick={() => onStatusChange(task.id, isDone ? 'todo' : 'done')}
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isDone
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
        }`}
      >
        {isDone && <Check size={10} className="text-white" />}
      </button>

      {/* Priority dot */}
      <Flag size={13} className={`flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`} />

      {/* Title */}
      <span className={`flex-1 text-sm ${
        isDone ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'
      }`}>
        {task.title}
      </span>

      {/* Assignee */}
      {task.assignee && (
        <div
          className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
          title={task.assignee.full_name ?? task.assignee.email}
        >
          {(task.assignee.full_name?.[0] ?? task.assignee.email[0]).toUpperCase()}
        </div>
      )}

      {/* Due date */}
      {task.due_date && (
        <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${
          isOverdue ? 'text-red-500' : 'text-gray-400'
        }`}>
          <Calendar size={11} />
          {format(new Date(task.due_date), 'd. MMM', { locale: de })}
        </span>
      )}

      {/* Apple sync */}
      {task.apple_reminder_id && <span className="text-xs flex-shrink-0">🍎</span>}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(task)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-gray-400 hover:text-red-600"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}
