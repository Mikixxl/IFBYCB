import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Apple, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react'

export default function AuthPage() {
  const { signIn, signUp, signInWithApple } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', fullName: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password)
      if (error) toast.error(error.message || 'Anmeldung fehlgeschlagen')
    } else {
      if (!form.fullName.trim()) { toast.error('Bitte gib deinen Namen ein'); setLoading(false); return }
      const { error } = await signUp(form.email, form.password, form.fullName)
      if (error) toast.error(error.message || 'Registrierung fehlgeschlagen')
      else toast.success('Bitte bestätige deine E-Mail-Adresse!')
    }
    setLoading(false)
  }

  async function handleApple() {
    const { error } = await signInWithApple()
    if (error) toast.error('Apple Sign In fehlgeschlagen')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/30 mb-4">
            <span className="text-white text-2xl font-bold">TF</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">IFC TeamFlow</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Projektmanagement mit Apple iOS Sync
          </p>
        </div>

        <div className="card p-8">
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-6">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {m === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          {/* Apple Sign In */}
          <button
            onClick={handleApple}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium text-sm hover:bg-gray-900 dark:hover:bg-gray-100 transition-all mb-4"
          >
            <Apple size={18} />
            Mit Apple anmelden
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400">oder</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Vollständiger Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="input pl-9"
                    placeholder="Max Mustermann"
                    value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">E-Mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="max@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Passwort</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="input pl-9"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Sicher, verschlüsselt, DSGVO-konform
        </p>
      </div>
    </div>
  )
}
