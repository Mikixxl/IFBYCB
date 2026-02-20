import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Task, TaskStatus, KanbanColumn } from '../types'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo',        label: 'Offen',         color: 'bg-gray-400' },
  { id: 'in_progress', label: 'In Bearbeitung', color: 'bg-blue-500' },
  { id: 'review',      label: 'Überprüfung',    color: 'bg-purple-500' },
  { id: 'done',        label: 'Erledigt',       color: 'bg-green-500' },
]

export function useTasks(projectId: string | null) {
  const { supabaseUser } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!projectId) { setTasks([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(id, email, full_name, avatar_url, created_at)
      `)
      .eq('project_id', projectId)
      .order('position', { ascending: true })

    if (error) toast.error('Aufgaben konnten nicht geladen werden')
    else setTasks(data ?? [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    fetchTasks()
    if (!projectId) return

    // Real-time subscription
    const channel = supabase
      .channel(`tasks:${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`,
      }, () => { fetchTasks() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchTasks, projectId])

  const kanbanColumns: KanbanColumn[] = COLUMNS.map(col => ({
    ...col,
    tasks: tasks.filter(t => t.status === col.id),
  }))

  async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'position'>) {
    const maxPos = tasks.filter(t => t.status === task.status).length
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, created_by: supabaseUser!.id, position: maxPos })
      .select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(id, email, full_name, avatar_url, created_at)
      `)
      .single()
    if (error) { toast.error('Aufgabe konnte nicht erstellt werden'); return null }
    setTasks(prev => [...prev, data])
    toast.success('Aufgabe erstellt!')
    return data as Task
  }

  async function updateTask(id: string, updates: Partial<Task>) {
    const { error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast.error('Aufgabe konnte nicht aktualisiert werden'); return }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) { toast.error('Aufgabe konnte nicht gelöscht werden'); return }
    setTasks(prev => prev.filter(t => t.id !== id))
    toast.success('Aufgabe gelöscht')
  }

  async function moveTask(taskId: string, newStatus: TaskStatus, newPosition: number) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus, position: newPosition } : t
    ))

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, position: newPosition, updated_at: new Date().toISOString() })
      .eq('id', taskId)

    if (error) {
      toast.error('Aufgabe konnte nicht verschoben werden')
      fetchTasks() // revert on error
    }
  }

  return { tasks, kanbanColumns, loading, createTask, updateTask, deleteTask, moveTask, refetch: fetchTasks, COLUMNS }
}
