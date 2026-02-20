import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { ChatMessage } from '../types'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export function useChat(projectId: string | null) {
  const { supabaseUser } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!projectId) { setMessages([]); setLoading(false); return }
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        user:profiles!chat_messages_user_id_fkey(id, email, full_name, avatar_url, created_at)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) toast.error('Nachrichten konnten nicht geladen werden')
    else setMessages(data ?? [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    fetchMessages()
    if (!projectId) return

    // Cleanup previous channel
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    // Subscribe to new messages
    channelRef.current = supabase
      .channel(`chat:${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `project_id=eq.${projectId}`,
      }, async (payload) => {
        // Fetch the full message with user info
        const { data } = await supabase
          .from('chat_messages')
          .select(`
            *,
            user:profiles!chat_messages_user_id_fkey(id, email, full_name, avatar_url, created_at)
          `)
          .eq('id', payload.new.id)
          .single()
        if (data) setMessages(prev => [...prev, data])
      })
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [fetchMessages, projectId])

  async function sendMessage(content: string, taskRefId?: string) {
    if (!projectId || !supabaseUser || !content.trim()) return
    setSending(true)
    const { error } = await supabase.from('chat_messages').insert({
      project_id: projectId,
      user_id: supabaseUser.id,
      content: content.trim(),
      message_type: taskRefId ? 'task_ref' : 'text',
      task_ref_id: taskRefId ?? null,
    })
    if (error) toast.error('Nachricht konnte nicht gesendet werden')
    setSending(false)
  }

  return { messages, loading, sending, sendMessage }
}
