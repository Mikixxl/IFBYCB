import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'

function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function signInWithApple() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0f0f13', flexDirection: 'column', gap: 0
    }}>
      <div style={{
        background: '#17171f', border: '1px solid #2a2a38', borderRadius: 20,
        padding: '48px 40px', textAlign: 'center', maxWidth: 360, width: '100%'
      }}>
        <div style={{ fontSize: 40, color: '#c9a84c', marginBottom: 16 }}>◆</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: '#e8e8f0', marginBottom: 6 }}>IFC TeamFlow</h1>
        <p style={{ color: '#7a7a9a', fontSize: 13, marginBottom: 36 }}>International Finance Corporation</p>

        <button
          onClick={signInWithApple}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '13px 20px', borderRadius: 10,
            background: '#ffffff', color: '#000000',
            border: 'none', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 814 1000" fill="#000">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.8 0 663.6 0 541.8c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
          </svg>
          {loading ? 'Anmelden...' : 'Mit Apple anmelden'}
        </button>

        {error && (
          <div style={{ marginTop: 16, color: '#e05c5c', fontSize: 12 }}>{error}</div>
        )}
      </div>
    </div>
  )
}

const COLORS = ['#c9a84c','#5c9ee0','#4caf82','#e05c5c','#e08c5c','#9c5ce0','#5ce0d8','#e05ca8']

const STATUS_CONFIG = {
  todo: { label: 'To Do', color: '#7a7a9a' },
  in_progress: { label: 'In Progress', color: '#c9a84c' },
  done: { label: 'Done', color: '#4caf82' }
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#5c9ee0' },
  medium: { label: 'Medium', color: '#c9a84c' },
  high: { label: 'High', color: '#e05c5c' }
}

function Badge({ color, children }) {
  return (
    <span style={{
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.5px',
      textTransform: 'uppercase'
    }}>{children}</span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#1f1f2a', border: '1px solid #2a2a38',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#e8e8f0' }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#7a7a9a',
            fontSize: 20, lineHeight: 1, padding: 4
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', color: '#7a7a9a', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>}
      {props.type === 'textarea'
        ? <textarea {...props} type={undefined} style={{ width: '100%', background: '#17171f', border: '1px solid #2a2a38', borderRadius: 8, padding: '10px 12px', color: '#e8e8f0', resize: 'vertical', minHeight: 80, outline: 'none', ...props.style }} />
        : <input {...props} style={{ width: '100%', background: '#17171f', border: '1px solid #2a2a38', borderRadius: 8, padding: '10px 12px', color: '#e8e8f0', outline: 'none', ...props.style }} />
      }
    </div>
  )
}

function Select({ label, options, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', color: '#7a7a9a', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>}
      <select {...props} style={{ width: '100%', background: '#17171f', border: '1px solid #2a2a38', borderRadius: 8, padding: '10px 12px', color: '#e8e8f0', outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Btn({ children, variant = 'primary', style, ...props }) {
  const styles = {
    primary: { background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', color: '#0f0f13', fontWeight: 600 },
    secondary: { background: '#2a2a38', color: '#e8e8f0', border: '1px solid #3a3a4a' },
    danger: { background: '#e05c5c22', color: '#e05c5c', border: '1px solid #e05c5c44' },
    ghost: { background: 'none', color: '#7a7a9a', border: '1px solid #2a2a38' }
  }
  return (
    <button {...props} style={{
      padding: '9px 18px', borderRadius: 8, border: 'none',
      fontSize: 13, cursor: 'pointer', transition: 'opacity 0.15s',
      ...styles[variant], ...style
    }}>{children}</button>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading, null = not logged in
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [projectForm, setProjectForm] = useState({ name: '', description: '', color: COLORS[0] })
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '', due_date: '' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (user) loadProjects() }, [user])
  useEffect(() => { if (activeProject) loadTasks(activeProject.id) }, [activeProject])

  async function loadProjects() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setProjects(data || [])
      if (data?.length > 0 && !activeProject) setActiveProject(data[0])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadTasks(projectId) {
    const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    if (!error) setTasks(data || [])
  }

  async function createProject() {
    if (!projectForm.name.trim()) return
    const { data, error } = await supabase.from('projects').insert([projectForm]).select().single()
    if (error) { alert('Fehler: ' + error.message); return }
    setProjects(p => [data, ...p])
    setActiveProject(data)
    setShowNewProject(false)
    setProjectForm({ name: '', description: '', color: COLORS[0] })
  }

  async function deleteProject(id) {
    if (!confirm('Projekt wirklich löschen?')) return
    await supabase.from('projects').delete().eq('id', id)
    const remaining = projects.filter(p => p.id !== id)
    setProjects(remaining)
    setActiveProject(remaining[0] || null)
    setTasks([])
  }

  async function createTask() {
    if (!taskForm.title.trim() || !activeProject) return
    const { data, error } = await supabase.from('tasks').insert([{ ...taskForm, project_id: activeProject.id }]).select().single()
    if (error) { alert('Fehler: ' + error.message); return }
    setTasks(t => [data, ...t])
    setShowNewTask(false)
    setTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '', due_date: '' })
  }

  async function updateTask(id, updates) {
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single()
    if (!error) setTasks(t => t.map(task => task.id === id ? data : task))
  }

  async function saveEditTask() {
    if (!editTask.title.trim()) return
    const { data, error } = await supabase.from('tasks').update(editTask).eq('id', editTask.id).select().single()
    if (error) { alert('Fehler: ' + error.message); return }
    setTasks(t => t.map(task => task.id === editTask.id ? data : task))
    setEditTask(null)
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(t => t.filter(task => task.id !== id))
  }

  const grouped = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done')
  }

  if (user === undefined) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#7a7a9a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12, color: '#c9a84c' }}>◆</div>
        <div>Laden...</div>
      </div>
    </div>
  )

  if (user === null) return <LoginScreen />

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#7a7a9a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12, color: '#c9a84c' }}>◆</div>
        <div>Laden...</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#e05c5c', padding: 20, textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Verbindungsfehler</div>
        <div style={{ color: '#7a7a9a', fontSize: 13 }}>{error}</div>
        <div style={{ color: '#7a7a9a', fontSize: 12, marginTop: 8 }}>Supabase-Umgebungsvariablen prüfen</div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: 260, background: '#17171f', borderRight: '1px solid #2a2a38', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #2a2a38' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#c9a84c', letterSpacing: '1px' }}>IFC TeamFlow</div>
          <div style={{ fontSize: 11, color: '#7a7a9a', marginTop: 2 }}>International Finance Corporation</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <span style={{ fontSize: 11, color: '#5a5a7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {user.email || user.user_metadata?.full_name || 'Angemeldet'}
            </span>
            <button
              onClick={() => supabase.auth.signOut()}
              title="Abmelden"
              style={{ background: 'none', border: 'none', color: '#5a5a7a', fontSize: 13, cursor: 'pointer', marginLeft: 6, flexShrink: 0 }}
            >⏻</button>
          </div>
        </div>

        {/* Projects */}
        <div style={{ padding: '16px 12px 8px', flex: 1, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#7a7a9a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projekte</span>
            <button onClick={() => setShowNewProject(true)} style={{ background: 'none', border: 'none', color: '#c9a84c', fontSize: 18, lineHeight: 1, cursor: 'pointer' }}>+</button>
          </div>

          {projects.map(project => (
            <div key={project.id}
              onClick={() => setActiveProject(project)}
              style={{
                padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                background: activeProject?.id === project.id ? '#2a2a38' : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                border: activeProject?.id === project.id ? '1px solid #3a3a4a' : '1px solid transparent'
              }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: activeProject?.id === project.id ? '#e8e8f0' : '#9a9ab0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
              <button onClick={e => { e.stopPropagation(); deleteProject(project.id) }}
                style={{ background: 'none', border: 'none', color: '#3a3a4a', fontSize: 14, cursor: 'pointer', opacity: 0 }}
                onMouseEnter={e => e.target.style.opacity = 1}
                onMouseLeave={e => e.target.style.opacity = 0}>×</button>
            </div>
          ))}

          {projects.length === 0 && (
            <div style={{ padding: '20px 8px', color: '#7a7a9a', fontSize: 12, textAlign: 'center' }}>
              Noch keine Projekte.<br />
              <span onClick={() => setShowNewProject(true)} style={{ color: '#c9a84c', cursor: 'pointer' }}>Projekt erstellen →</span>
            </div>
          )}
        </div>

        {/* Stats */}
        {activeProject && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #2a2a38' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {Object.entries(grouped).map(([status, items]) => (
                <div key={status} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: STATUS_CONFIG[status].color }}>{items.length}</div>
                  <div style={{ fontSize: 10, color: '#7a7a9a', textTransform: 'uppercase' }}>{STATUS_CONFIG[status].label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeProject ? (
          <>
            {/* Header */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid #2a2a38', display: 'flex', alignItems: 'center', gap: 16, background: '#0f0f13' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: activeProject.color }} />
              <div style={{ flex: 1 }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: '#e8e8f0' }}>{activeProject.name}</h1>
                {activeProject.description && <p style={{ color: '#7a7a9a', fontSize: 13, marginTop: 2 }}>{activeProject.description}</p>}
              </div>
              <Btn onClick={() => setShowNewTask(true)}>+ Aufgabe</Btn>
            </div>

            {/* Kanban board */}
            <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {Object.entries(grouped).map(([status, items]) => (
                <div key={status} style={{ flex: 1, minWidth: 260 }}>
                  {/* Column header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '0 4px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_CONFIG[status].color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#9a9ab0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{STATUS_CONFIG[status].label}</span>
                    <span style={{ background: '#2a2a38', color: '#7a7a9a', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{items.length}</span>
                  </div>

                  {/* Tasks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map(task => (
                      <div key={task.id} style={{
                        background: '#17171f', border: '1px solid #2a2a38',
                        borderRadius: 10, padding: 14,
                        borderLeft: `3px solid ${PRIORITY_CONFIG[task.priority]?.color || '#7a7a9a'}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#e8e8f0', lineHeight: 1.4 }}>{task.title}</span>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => setEditTask({ ...task })} style={{ background: 'none', border: 'none', color: '#7a7a9a', cursor: 'pointer', fontSize: 13 }}>✏</button>
                            <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: '#7a7a9a', cursor: 'pointer', fontSize: 13 }}>×</button>
                          </div>
                        </div>

                        {task.description && <p style={{ color: '#7a7a9a', fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>{task.description}</p>}

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Badge color={PRIORITY_CONFIG[task.priority]?.color}>{PRIORITY_CONFIG[task.priority]?.label}</Badge>
                          {task.assigned_to && <Badge color="#5c9ee0">{task.assigned_to}</Badge>}
                          {task.due_date && <Badge color="#7a7a9a">{new Date(task.due_date).toLocaleDateString('de-DE')}</Badge>}
                        </div>

                        {/* Status buttons */}
                        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                          {Object.entries(STATUS_CONFIG).filter(([s]) => s !== status).map(([s, cfg]) => (
                            <button key={s} onClick={() => updateTask(task.id, { status: s })}
                              style={{ background: 'none', border: `1px solid ${cfg.color}44`, color: cfg.color, borderRadius: 5, padding: '2px 7px', fontSize: 10, cursor: 'pointer' }}>
                              → {cfg.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {items.length === 0 && (
                      <div style={{ padding: 20, textAlign: 'center', color: '#3a3a4a', fontSize: 12, border: '1px dashed #2a2a38', borderRadius: 10 }}>
                        Keine Aufgaben
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 48, color: '#c9a84c' }}>◆</div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: '#e8e8f0' }}>Willkommen bei IFC TeamFlow</h2>
            <p style={{ color: '#7a7a9a' }}>Erstellen Sie Ihr erstes Projekt</p>
            <Btn onClick={() => setShowNewProject(true)}>+ Neues Projekt</Btn>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <Modal title="Neues Projekt" onClose={() => setShowNewProject(false)}>
          <Input label="Projektname *" value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Hügelkultur" />
          <Input label="Beschreibung" type="textarea" value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))} placeholder="Kurze Beschreibung..." />
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#7a7a9a', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Farbe</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setProjectForm(f => ({ ...f, color: c }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: projectForm.color === c ? '3px solid white' : '3px solid transparent', transition: 'border 0.15s' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowNewProject(false)}>Abbrechen</Btn>
            <Btn onClick={createProject}>Projekt erstellen</Btn>
          </div>
        </Modal>
      )}

      {/* New Task Modal */}
      {showNewTask && (
        <Modal title="Neue Aufgabe" onClose={() => setShowNewTask(false)}>
          <Input label="Titel *" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Aufgabe beschreiben..." />
          <Input label="Beschreibung" type="textarea" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Status" value={taskForm.status} onChange={e => setTaskForm(f => ({ ...f, status: e.target.value }))}
              options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))} />
            <Select label="Priorität" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
              options={Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))} />
          </div>
          <Input label="Zugewiesen an" value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="Name..." />
          <Input label="Fälligkeitsdatum" type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setShowNewTask(false)}>Abbrechen</Btn>
            <Btn onClick={createTask}>Aufgabe erstellen</Btn>
          </div>
        </Modal>
      )}

      {/* Edit Task Modal */}
      {editTask && (
        <Modal title="Aufgabe bearbeiten" onClose={() => setEditTask(null)}>
          <Input label="Titel *" value={editTask.title} onChange={e => setEditTask(t => ({ ...t, title: e.target.value }))} />
          <Input label="Beschreibung" type="textarea" value={editTask.description || ''} onChange={e => setEditTask(t => ({ ...t, description: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Status" value={editTask.status} onChange={e => setEditTask(t => ({ ...t, status: e.target.value }))}
              options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))} />
            <Select label="Priorität" value={editTask.priority} onChange={e => setEditTask(t => ({ ...t, priority: e.target.value }))}
              options={Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))} />
          </div>
          <Input label="Zugewiesen an" value={editTask.assigned_to || ''} onChange={e => setEditTask(t => ({ ...t, assigned_to: e.target.value }))} />
          <Input label="Fälligkeitsdatum" type="date" value={editTask.due_date || ''} onChange={e => setEditTask(t => ({ ...t, due_date: e.target.value }))} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="danger" onClick={() => { deleteTask(editTask.id); setEditTask(null) }}>Löschen</Btn>
            <Btn variant="ghost" onClick={() => setEditTask(null)}>Abbrechen</Btn>
            <Btn onClick={saveEditTask}>Speichern</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
