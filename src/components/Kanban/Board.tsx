import { useState } from 'react'
import {
  DndContext, DragEndEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Task, TaskStatus, KanbanColumn, Project } from '../../types'
import TaskCard from './TaskCard'
import TaskForm from './TaskForm'
import { Plus, LayoutList, LayoutGrid, RefreshCw } from 'lucide-react'
import { useTasks } from '../../hooks/useTasks'
import ListView from '../ListView/TaskList'

interface Props {
  project: Project
}

export default function Board({ project }: Props) {
  const { kanbanColumns, tasks, loading, createTask, updateTask, deleteTask, moveTask } = useTasks(project.id)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskFormStatus, setTaskFormStatus] = useState<TaskStatus>('todo')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  const members = (project.members ?? []).map(m => m.user).filter((u): u is NonNullable<typeof u> => u != null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragStart(e: DragStartEvent) {
    const task = tasks.find(t => t.id === e.active.id)
    if (task) setActiveTask(task)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = e
    if (!over || active.id === over.id) return

    const activeTask = tasks.find(t => t.id === active.id)
    if (!activeTask) return

    // Check if dropped over a column or another task
    const overTask = tasks.find(t => t.id === over.id)
    const newStatus: TaskStatus = overTask ? overTask.status : over.id as TaskStatus

    const tasksInColumn = tasks.filter(t => t.status === newStatus)
    const overIndex = overTask ? tasksInColumn.findIndex(t => t.id === over.id) : tasksInColumn.length

    moveTask(activeTask.id, newStatus, overIndex)
  }

  function openNewTask(status: TaskStatus) {
    setTaskFormStatus(status)
    setEditingTask(null)
    setShowTaskForm(true)
  }

  async function handleTaskSubmit(data: Parameters<typeof createTask>[0]) {
    if (editingTask) {
      await updateTask(editingTask.id, data)
    } else {
      await createTask(data)
    }
  }

  const COLUMN_COLORS: Record<string, string> = {
    todo: 'bg-gray-400',
    in_progress: 'bg-blue-500',
    review: 'bg-purple-500',
    done: 'bg-green-500',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
          <h1 className="text-lg font-semibold">{project.name}</h1>
          {loading && <RefreshCw size={14} className="animate-spin text-gray-400" />}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Kanban-Ansicht"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Listen-Ansicht"
            >
              <LayoutList size={16} />
            </button>
          </div>
          <button
            onClick={() => openNewTask('todo')}
            className="btn-primary"
          >
            <Plus size={16} />
            Aufgabe
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <ListView
            tasks={tasks}
            members={members}
            onEdit={task => { setEditingTask(task); setShowTaskForm(true) }}
            onDelete={deleteTask}
            onStatusChange={(id, status) => moveTask(id, status, 0)}
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 p-6 h-full overflow-x-auto">
              {kanbanColumns.map(column => (
                <KanbanColumnComponent
                  key={column.id}
                  column={column}
                  colorClass={COLUMN_COLORS[column.id]}
                  onAddTask={() => openNewTask(column.id)}
                  onEdit={task => { setEditingTask(task); setShowTaskForm(true) }}
                  onDelete={deleteTask}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask && (
                <TaskCard
                  task={activeTask}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  isDragging
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          projectId={project.id}
          status={taskFormStatus}
          members={members}
          task={editingTask ?? undefined}
          onClose={() => { setShowTaskForm(false); setEditingTask(null) }}
          onSubmit={handleTaskSubmit}
        />
      )}
    </div>
  )
}

function KanbanColumnComponent({
  column, colorClass, onAddTask, onEdit, onDelete
}: {
  column: KanbanColumn
  colorClass: string
  onAddTask: () => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{column.label}</span>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
            {column.tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="btn-ghost p-1 rounded-lg"
          title="Aufgabe hinzufügen"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Tasks Drop Zone */}
      <SortableContext
        items={column.tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2 flex-1 min-h-[60px] p-2 rounded-xl bg-gray-100 dark:bg-gray-800/50">
          {column.tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {column.tasks.length === 0 && (
            <div className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400">Hierher ziehen</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
