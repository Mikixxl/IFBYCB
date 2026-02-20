export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  color: string
  owner_id: string
  created_at: string
  updated_at: string
  members?: ProjectMember[]
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  user?: User
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  due_date: string | null
  position: number
  apple_reminder_id: string | null
  apple_calendar_event_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  assignee?: User
  tags?: TaskTag[]
}

export interface TaskTag {
  task_id: string
  tag: string
}

export interface ChatMessage {
  id: string
  project_id: string
  user_id: string
  content: string
  message_type: 'text' | 'task_ref' | 'system'
  task_ref_id: string | null
  created_at: string
  user?: User
}

export interface CalDAVAccount {
  id: string
  user_id: string
  server_url: string
  username: string
  display_name: string
  sync_reminders: boolean
  sync_calendar: boolean
  last_synced_at: string | null
  created_at: string
}

export interface KanbanColumn {
  id: TaskStatus
  label: string
  color: string
  tasks: Task[]
}

export type ViewMode = 'kanban' | 'list'
