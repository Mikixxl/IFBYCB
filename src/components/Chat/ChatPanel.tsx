import { useState, useRef, useEffect } from 'react'
import { useChat } from '../../hooks/useChat'
import { useAuth } from '../../contexts/AuthContext'
import { ChatMessage } from '../../types'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { de } from 'date-fns/locale'

interface Props {
  projectId: string
  projectName: string
}

export default function ChatPanel({ projectId, projectName }: Props) {
  const { messages, loading, sending, sendMessage } = useChat(projectId)
  const { supabaseUser } = useAuth()
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    await sendMessage(text)
    setText('')
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    if (isToday(date)) return format(date, 'HH:mm')
    if (isYesterday(date)) return `Gestern ${format(date, 'HH:mm')}`
    return format(date, 'dd. MMM, HH:mm', { locale: de })
  }

  // Group messages by date
  const grouped = messages.reduce<{ date: string; msgs: ChatMessage[] }[]>((acc, msg) => {
    const date = format(new Date(msg.created_at), 'yyyy-MM-dd')
    const last = acc[acc.length - 1]
    if (last?.date === date) last.msgs.push(msg)
    else acc.push({ date, msgs: [msg] })
    return acc
  }, [])

  function formatDateHeader(dateStr: string) {
    const date = new Date(dateStr)
    if (isToday(date)) return 'Heute'
    if (isYesterday(date)) return 'Gestern'
    return format(date, 'EEEE, d. MMMM', { locale: de })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <MessageSquare size={18} className="text-gray-400" />
        <div>
          <h2 className="text-sm font-semibold">{projectName}</h2>
          <p className="text-xs text-gray-400">Team-Chat</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare size={40} className="text-gray-200 dark:text-gray-800 mb-3" />
            <p className="text-gray-400 text-sm">Noch keine Nachrichten</p>
            <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">
              Schreib die erste Nachricht an dein Team!
            </p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 font-medium">
                  {formatDateHeader(group.date)}
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>

              <div className="space-y-4">
                {group.msgs.map((msg, idx) => {
                  const isOwn = msg.user_id === supabaseUser?.id
                  const prevMsg = group.msgs[idx - 1]
                  const showAvatar = !prevMsg || prevMsg.user_id !== msg.user_id

                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar */}
                      <div className={`w-7 h-7 flex-shrink-0 ${showAvatar ? 'visible' : 'invisible'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                          isOwn ? 'bg-primary-600' : 'bg-gray-400 dark:bg-gray-600'
                        }`}>
                          {(msg.user?.full_name?.[0] ?? msg.user?.email?.[0] ?? '?').toUpperCase()}
                        </div>
                      </div>

                      {/* Bubble */}
                      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        {showAvatar && !isOwn && (
                          <span className="text-xs text-gray-400 ml-1">
                            {msg.user?.full_name ?? msg.user?.email}
                          </span>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                          isOwn
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-xs text-gray-300 dark:text-gray-600 mx-1">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              className="input pr-12"
              placeholder="Nachricht schreiben..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="btn-primary p-2.5 rounded-xl"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
        <p className="text-xs text-gray-300 dark:text-gray-700 mt-1 text-center">
          Enter zum Senden · Echtzeit über Supabase Realtime
        </p>
      </div>
    </div>
  )
}
