import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Project } from '../types'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function useProjects() {
  const { supabaseUser } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    if (!supabaseUser) return
    setLoading(true)
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        project:projects(
          id, name, description, color, owner_id, created_at, updated_at,
          members:project_members(
            project_id, user_id, role, joined_at,
            user:profiles(id, email, full_name, avatar_url, created_at)
          )
        )
      `)
      .eq('user_id', supabaseUser.id)
      .order('joined_at', { ascending: false })

    if (error) {
      toast.error('Projekte konnten nicht geladen werden')
    } else {
      const flat = ((data ?? []) as unknown as { project: Project }[])
        .map(d => d.project)
        .filter(Boolean)
      setProjects(flat)
    }
    setLoading(false)
  }, [supabaseUser])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  async function createProject(name: string, description: string, color: string) {
    if (!supabaseUser) return null
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, description, color, owner_id: supabaseUser.id })
      .select()
      .single()
    if (error) { toast.error('Projekt konnte nicht erstellt werden'); return null }
    await supabase.from('project_members').insert({
      project_id: data.id,
      user_id: supabaseUser.id,
      role: 'owner',
    })
    await fetchProjects()
    toast.success('Projekt erstellt!')
    return data as Project
  }

  async function updateProject(id: string, updates: Partial<Project>) {
    const { error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast.error('Projekt konnte nicht aktualisiert werden'); return }
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    toast.success('Projekt aktualisiert!')
  }

  async function deleteProject(id: string) {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) { toast.error('Projekt konnte nicht gelöscht werden'); return }
    setProjects(prev => prev.filter(p => p.id !== id))
    toast.success('Projekt gelöscht')
  }

  async function inviteMember(projectId: string, email: string) {
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()
    if (!user) { toast.error('Benutzer nicht gefunden'); return }

    const { error } = await supabase.from('project_members').insert({
      project_id: projectId,
      user_id: user.id,
      role: 'member',
    })
    if (error) { toast.error('Mitglied konnte nicht hinzugefügt werden'); return }
    await fetchProjects()
    toast.success('Mitglied eingeladen!')
  }

  return { projects, loading, createProject, updateProject, deleteProject, inviteMember, refetch: fetchProjects }
}
