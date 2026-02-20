import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from '../../types'
import { Calendar, Pencil, Trash2, GripVertical } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { de } from 'date-fns/locale'

const PRIORITY_CLASSES: Record<string, string> = {
  low:    'priority-low',
  medium: 'priority-medium',
  high:   'priority-high',
  urgent: 'priority-urgent',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Niedrig', medium: 'Mittel', high: 'Hoch', urgent: 'Dringend',
}

interface Props {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  isDragging?: boolean
}

export default function TaskCard({ task, onEdit, onDelete, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortableDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done'
  const isDueToday = task.due_date && isToday(new Date(task.due_date))

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card p-3 group cursor-default transition-all ${
        sortableDragging || isDragging ? 'opacity-50 shadow-xl rotate-1' : 'hover:shadow-md'
      }`}
    >
      {/* Drag handle + Priority */}
      <div className="flex items-start gap-2 mb-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-gray-300 dark:text-gray-700 hover:text-gray-400 cursor-grab active:cursor-grabbing p-0.5 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight line-clamp-2">
            {task.title}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
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

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={PRIORITY_CLASSES[task.priority]}>
          {PRIORITY_LABELS[task.priority]}
        </span>

        {task.due_date && (
          <span className={`flex items-center gap-1 text-xs ${
            isOverdue
              ? 'text-red-600 dark:text-red-400'
              : isDueToday
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}>
            <Calendar size={11} />
            {format(new Date(task.due_date), 'd. MMM', { locale: de })}
          </span>
        )}

        {/* Apple sync indicator */}
        {task.apple_reminder_id && (
          <span className="text-xs text-gray-400" title="Mit Apple Reminders synchronisiert">
            🍎
          </span>
        )}

        {task.assignee && (
          <div className="ml-auto flex-shrink-0">
            <div
              className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-medium"
              title={task.assignee.full_name ?? task.assignee.email}
            >
              {(task.assignee.full_name?.[0] ?? task.assignee.email[0]).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
