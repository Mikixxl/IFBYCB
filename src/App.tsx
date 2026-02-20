import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthPage from './components/Auth/AuthPage'
import Sidebar from './components/Layout/Sidebar'
import Board from './components/Kanban/Board'
import ChatPanel from './components/Chat/ChatPanel'
import SyncSettings from './components/Sync/SyncSettings'
import { useProjects } from './hooks/useProjects'
import { Loader2, FolderKanban } from 'lucide-react'

function AppContent() {
  const { session, loading: authLoading } = useAuth()
  const { projects, loading: projectsLoading, refetch } = useProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'board' | 'chat' | 'sync'>('board')
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold">TF</span>
          </div>
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      </div>
    )
  }

  if (!session) return <AuthPage />

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={id => { setSelectedProjectId(id); setActiveTab('board') }}
        onProjectCreated={refetch}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {projectsLoading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : !selectedProject ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
            <FolderKanban size={48} className="text-gray-200 dark:text-gray-800 mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 dark:text-gray-600 mb-2">
              Kein Projekt ausgewählt
            </h2>
            <p className="text-gray-300 dark:text-gray-700 text-sm max-w-sm">
              Erstelle dein erstes Projekt über die Seitenleiste oder wähle ein bestehendes aus.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'board' && <Board project={selectedProject} />}
            {activeTab === 'chat' && (
              <ChatPanel projectId={selectedProject.id} projectName={selectedProject.name} />
            )}
            {activeTab === 'sync' && <SyncSettings projectId={selectedProject.id} />}
          </>
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
