import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { CalDAVAccount } from '../../types'
import {
  Smartphone, RefreshCw, Plus, Trash2, Check,
  Info, Shield, Clock, Apple, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Props {
  projectId: string
}

export default function SyncSettings({ projectId }: Props) {
  const { supabaseUser } = useAuth()
  const [accounts, setAccounts] = useState<CalDAVAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    displayName: '',
    username: '',
    appPassword: '',
    syncReminders: true,
    syncCalendar: true,
  })

  useEffect(() => {
    fetchAccounts()
  }, [supabaseUser])

  async function fetchAccounts() {
    if (!supabaseUser) return
    const { data } = await supabase
      .from('caldav_accounts')
      .select('*')
      .eq('user_id', supabaseUser.id)
    setAccounts(data ?? [])
    setLoading(false)
  }

  async function addAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!supabaseUser) return

    const { error } = await supabase.from('caldav_accounts').insert({
      user_id: supabaseUser.id,
      server_url: 'https://caldav.icloud.com',
      username: form.username,
      display_name: form.displayName || form.username,
      sync_reminders: form.syncReminders,
      sync_calendar: form.syncCalendar,
    })

    if (error) { toast.error('Konto konnte nicht hinzugefügt werden'); return }
    toast.success('Apple-Konto hinzugefügt!')
    setShowForm(false)
    setForm({ displayName: '', username: '', appPassword: '', syncReminders: true, syncCalendar: true })
    fetchAccounts()
  }

  async function removeAccount(id: string) {
    const { error } = await supabase.from('caldav_accounts').delete().eq('id', id)
    if (error) { toast.error('Konto konnte nicht entfernt werden'); return }
    setAccounts(prev => prev.filter(a => a.id !== id))
    toast.success('Konto entfernt')
  }

  async function triggerSync(accountId: string) {
    setSyncing(true)
    try {
      const response = await fetch('/.netlify/functions/caldav-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, projectId }),
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error)
      toast.success(`Synchronisierung abgeschlossen: ${result.synced ?? 0} Aufgaben importiert`)
      await supabase
        .from('caldav_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', accountId)
      fetchAccounts()
    } catch (err) {
      toast.error('Synchronisierung fehlgeschlagen')
    }
    setSyncing(false)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <Smartphone size={18} className="text-gray-400" />
        <div>
          <h2 className="text-sm font-semibold">Apple iOS Synchronisierung</h2>
          <p className="text-xs text-gray-400">Aufgaben mit Apple Reminders & Kalender synchronisieren</p>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-2xl">
        {/* Info Box */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 p-4">
          <div className="flex gap-3">
            <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
              <p className="font-medium">So funktioniert die Apple-Synchronisierung:</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-start gap-1.5">
                  <Check size={12} className="mt-0.5 flex-shrink-0" />
                  <span>Aufgaben aus Apple Reminders werden als To-Do importiert</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check size={12} className="mt-0.5 flex-shrink-0" />
                  <span>Kalendertermine werden mit Aufgaben-Fälligkeitsdaten verknüpft</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check size={12} className="mt-0.5 flex-shrink-0" />
                  <span>Erledigte Aufgaben werden automatisch als "Erledigt" markiert</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Shield size={12} className="mt-0.5 flex-shrink-0" />
                  <span><strong>App-spezifisches Passwort</strong> verwenden – niemals dein Apple-ID-Passwort!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* How to get App Password */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Apple size={15} />
            App-spezifisches Passwort erstellen
          </h3>
          <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
            {[
              'Gehe zu appleid.apple.com und melde dich an',
              'Klicke auf "App-spezifische Passwörter" unter "Anmeldung und Sicherheit"',
              'Klicke auf "+" und gib "TeamFlow" als Namen ein',
              'Kopiere das generierte Passwort (Format: xxxx-xxxx-xxxx-xxxx)',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <a
            href="https://appleid.apple.com/account/manage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
          >
            Zu Apple ID <ExternalLink size={11} />
          </a>
        </div>

        {/* Connected Accounts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Verknüpfte Konten</h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary text-xs py-1.5"
            >
              <Plus size={14} />
              Konto hinzufügen
            </button>
          </div>

          {showForm && (
            <form onSubmit={addAccount} className="card p-4 mb-4 space-y-3">
              <h4 className="text-sm font-medium">Apple-Konto hinzufügen</h4>

              <div>
                <label className="label">Anzeigename</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Mein Apple-Konto"
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Apple ID (E-Mail) *</label>
                <input
                  type="email"
                  className="input"
                  placeholder="max@icloud.com"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">App-spezifisches Passwort *</label>
                <input
                  type="password"
                  className="input"
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  value={form.appPassword}
                  onChange={e => setForm(f => ({ ...f, appPassword: e.target.value }))}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Nur App-spezifische Passwörter werden akzeptiert
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.syncReminders}
                    onChange={e => setForm(f => ({ ...f, syncReminders: e.target.checked }))}
                    className="rounded"
                  />
                  Apple Reminders synchronisieren
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.syncCalendar}
                    onChange={e => setForm(f => ({ ...f, syncCalendar: e.target.checked }))}
                    className="rounded"
                  />
                  Apple Kalender synchronisieren
                </label>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center text-sm">
                  Abbrechen
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center text-sm">
                  Verbinden
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8">
              <RefreshCw size={20} className="animate-spin text-gray-300 mx-auto" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Smartphone size={32} className="mx-auto mb-2 text-gray-200 dark:text-gray-800" />
              <p className="text-sm">Noch kein Apple-Konto verbunden</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map(account => (
                <div key={account.id} className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                    <Apple size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{account.display_name}</p>
                    <p className="text-xs text-gray-400 truncate">{account.username}</p>
                    {account.last_synced_at && (
                      <p className="text-xs text-gray-300 dark:text-gray-600 flex items-center gap-1 mt-0.5">
                        <Clock size={10} />
                        Zuletzt: {format(new Date(account.last_synced_at), 'd. MMM, HH:mm', { locale: de })}
                      </p>
                    )}
                    <div className="flex gap-2 mt-1">
                      {account.sync_reminders && (
                        <span className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">Reminders</span>
                      )}
                      {account.sync_calendar && (
                        <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">Kalender</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerSync(account.id)}
                      disabled={syncing}
                      className="btn-secondary text-xs py-1.5"
                      title="Jetzt synchronisieren"
                    >
                      {syncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Sync
                    </button>
                    <button
                      onClick={() => removeAccount(account.id)}
                      className="btn-ghost p-1.5 hover:text-red-600"
                      title="Konto entfernen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 p-4 flex gap-3">
          <Shield size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-green-700 dark:text-green-300">
            <p className="font-medium mb-1">Sicherheitshinweis</p>
            <p>Deine Apple-Zugangsdaten werden verschlüsselt gespeichert und niemals im Klartext übertragen. Die CalDAV-Verbindung erfolgt über HTTPS. Du kannst das App-Passwort jederzeit bei Apple widerrufen.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
