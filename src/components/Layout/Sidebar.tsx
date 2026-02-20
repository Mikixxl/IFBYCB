import { useState } from 'react'
import { Project } from '../../types'
import {
  FolderKanban, Plus, ChevronDown, ChevronRight,
  LogOut, Sun, Moon, Smartphone
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import ProjectForm from '../Projects/ProjectForm'

interface SidebarProps {
  projects: Project[]
  selectedProjectId: string | null
  onSelectProject: (id: string) => void
  onProjectCreated: () => void
  darkMode: boolean
  onToggleDark: () => void
  activeTab: 'board' | 'chat' | 'sync'
  onTabChange: (tab: 'board' | 'chat' | 'sync') => void
}

export default function Sidebar({
  projects, selectedProjectId, onSelectProject, onProjectCreated,
  darkMode, onToggleDark, activeTab, onTabChange,
}: SidebarProps) {
  const { profile, signOut } = useAuth()
  const [expanded, setExpanded] = useState(true)
  const [showProjectForm, setShowProjectForm] = useState(false)

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <>
      <aside className="w-64 flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">TF</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">TeamFlow</span>
          </div>
          <button onClick={onToggleDark} className="btn-ghost p-1.5 rounded-lg">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* Projects Section */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 mb-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span>Projekte</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={e => { e.stopPropagation(); setShowProjectForm(true) }}
                  className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <Plus size={14} />
                </button>
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>
          </div>

          {expanded && (
            <div className="space-y-0.5 px-2">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedProjectId === project.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate">{project.name}</span>
                  {project.members && (
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-600">
                      {project.members.length}
                    </span>
                  )}
                </button>
              ))}

              {projects.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-600 px-3 py-2">
                  Noch keine Projekte
                </p>
              )}
            </div>
          )}

          {/* Navigation Tabs for selected project */}
          {selectedProject && (
            <div className="mt-4 px-2">
              <div className="px-2 mb-1">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Ansichten
                </span>
              </div>
              {[
                { id: 'board' as const, label: 'Aufgaben', icon: FolderKanban },
                { id: 'chat' as const, label: 'Team-Chat', icon: FolderKanban },
                { id: 'sync' as const, label: 'Apple Sync', icon: Smartphone },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all mb-0.5 ${
                    activeTab === tab.id
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                      : 'text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon size={15} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Footer */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-3">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group">
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                {profile?.full_name ?? profile?.email}
              </p>
              {profile?.full_name && (
                <p className="text-xs text-gray-400 truncate">{profile.email}</p>
              )}
            </div>
            <button
              onClick={signOut}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded transition-all"
              title="Abmelden"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {showProjectForm && (
        <ProjectForm
          onClose={() => setShowProjectForm(false)}
          onCreated={() => { setShowProjectForm(false); onProjectCreated() }}
        />
      )}
    </>
  )
}
