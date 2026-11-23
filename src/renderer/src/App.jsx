import { useEffect, useRef, useState } from 'react'
import { Alert, Button, ConfigProvider, Layout, Popconfirm } from 'antd'
import { CheckCircleOutlined, DatabaseOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Tasks from './pages/Tasks'
import './App.css'
import { loadWorkspace, saveWorkspace, STORAGE_KEY, summary } from './storage'
import ProjectModal from './components/ProjectModal'
const { Content, Footer } = Layout
export default function App() {
  const [current, setCurrent] = useState('dashboard')
  const [loaded, setLoaded] = useState({ projects: [], raw: null, error: '' })
  const [projects, updateProjects] = useState([])
  const projectsRef = useRef([])
  const saveRevision = useRef(0)
  const [loading, setLoading] = useState(true)
  const [storageError, setStorageError] = useState('')
  const [blocked, setBlocked] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const stats = summary(projects)
  const saveLabel = loading
    ? '正在读取本机数据'
    : blocked
      ? '读取受阻 · 编辑已暂停'
      : storageError
        ? '尚未保存 · 请重试'
        : saving
          ? '正在保存至本机'
          : saved
            ? '已保存至本机'
            : loaded.raw !== null
              ? '已读取本机数据'
              : '本机工作空间 · 暂无项目'
  useEffect(() => {
    let active = true
    loadWorkspace().then((result) => {
      if (!active) return
      setLoaded(result)
      projectsRef.current = result.projects
      updateProjects(result.projects)
      setStorageError(result.error)
      setBlocked(Boolean(result.error))
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    const keyboard = () => {
      document.documentElement.dataset.inputMode = 'keyboard'
    }
    const pointer = () => {
      document.documentElement.dataset.inputMode = 'pointer'
    }
    document.addEventListener('keydown', keyboard, true)
    document.addEventListener('pointerdown', pointer, true)
    return () => {
      document.removeEventListener('keydown', keyboard, true)
      document.removeEventListener('pointerdown', pointer, true)
    }
  }, [])
  const persist = async (next) => {
    const revision = ++saveRevision.current
    setSaving(true)
    setSaved(false)
    const error = await saveWorkspace(next)
    if (revision !== saveRevision.current) return
    setStorageError(error)
    setSaved(!error)
    setSaving(false)
  }
  const setProjects = (updater) => {
    if (blocked) return
    const next = updater(projectsRef.current)
    projectsRef.current = next
    updateProjects(next)
    persist(next)
  }
  const openTasks = (id) => {
    setSelectedProjectId(id || selectedProjectId || projects[0]?.id)
    setCurrent('tasks')
  }
  const downloadRaw = () => {
    const url = URL.createObjectURL(new Blob([loaded.raw || ''], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'usy-original-data.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const recover = async () => {
    try {
      if (window.api?.recoverData) {
        // 原生坏文件由主进程先备份；旧 localStorage 坏记录则先保留恢复副本。
        const native = await window.api.loadData()
        if (!native.missing) {
          const result = await window.api.recoverData()
          if (!result.success) throw new Error('backup')
        } else {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw !== null)
            localStorage.setItem(STORAGE_KEY + ':recovery:' + crypto.randomUUID(), raw)
          if (await saveWorkspace([])) throw new Error('save')
        }
        projectsRef.current = []
        updateProjects([])
        setBlocked(false)
        setStorageError('')
        setSaved(true)
        return
      }
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw !== null) {
        const key = STORAGE_KEY + ':recovery:' + crypto.randomUUID()
        localStorage.setItem(key, raw)
        if (localStorage.getItem(key) !== raw) throw new Error('backup')
      }
      const error = await saveWorkspace([])
      if (error) throw new Error(error)
      updateProjects([])
      projectsRef.current = []
      setBlocked(false)
      setStorageError('')
      setSaved(true)
    } catch {
      setStorageError('备份或保存失败，原始记录未主动清除，请先下载原始记录。')
    }
  }
  const handleAddProject = (newProject) => {
    setProjects((prevProjects) => [
      { ...newProject, tasks: newProject.tasks || [] },
      ...prevProjects
    ])
  }
  const openCreate = () => {
    setEditingProject(null)
    setModalOpen(true)
  }
  const handleSaveProject = (project) => {
    if (editingProject) {
      setProjects((items) => items.map((item) => (item.id === project.id ? project : item)))
    } else handleAddProject(project)
  }
  const handleDeleteProject = (id) => {
    setProjects((items) => items.filter((item) => item.id !== id))
    if (selectedProjectId === id) setSelectedProjectId(null)
  }
  // 项目与任务统一维护，编辑后通过现有持久化入口保存。
  const handleAddTask = (projectId, taskTitle) => {
    const title = taskTitle.trim()
    if (!title || title.length > 300) return
    const newTask = { id: `t_${crypto.randomUUID()}`, title, completed: false }
    setProjects((prevProjects) =>
      prevProjects.map((project) =>
        project.id === projectId
          ? { ...project, tasks: [...(project.tasks || []), newTask] }
          : project
      )
    )
  }
  const handleToggleTask = (projectId, taskId, completed) => {
    setProjects((prevProjects) =>
      prevProjects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: (project.tasks || []).map((task) =>
                task.id === taskId ? { ...task, completed } : task
              )
            }
          : project
      )
    )
  }
  const handleDeleteTask = (projectId, taskId) => {
    setProjects((prevProjects) =>
      prevProjects.map((project) =>
        project.id === projectId
          ? { ...project, tasks: (project.tasks || []).filter((task) => task.id !== taskId) }
          : project
      )
    )
  }
  const handleMenuChange = (key) => {
    setCurrent(key)
  }
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#202326',
          colorLink: '#343b43',
          colorSuccess: '#24704d',
          colorWarning: '#925a19',
          colorError: '#b63b3b',
          colorText: '#202326',
          colorTextSecondary: '#626970',
          colorTextPlaceholder: '#70757b',
          colorBorder: '#d4d8dc',
          colorBorderSecondary: '#e6e8eb',
          borderRadius: 6,
          controlHeight: 36,
          fontSize: 14,
          fontFamily: '"Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", sans-serif',
          motionDurationFast: '0.12s',
          motionDurationMid: '0.18s',
          motionDurationSlow: '0.24s',
          motionEaseOut: 'cubic-bezier(0.23, 1, 0.32, 1)'
        },
        components: {
          Button: { primaryShadow: 'none', defaultShadow: 'none', dangerShadow: 'none' },
          Menu: { itemSelectedBg: '#e9ebee', itemSelectedColor: '#202326', itemHoverBg: '#eff0f2' }
        }
      }}
    >
      <Layout className="zhuomianbuju">
        <a className="skip-link" href="#main-content">
          跳至主要内容
        </a>
        <Sidebar current={current} onMenuChange={handleMenuChange}></Sidebar>
        <Layout>
          <Content className="neirongquyu" id="main-content" tabIndex={-1}>
            {storageError && (
              <Alert
                type="warning"
                showIcon
                title={storageError}
                description={
                  <div className="dashboard-actions">
                    {blocked ? (
                      <>
                        <Button onClick={() => window.location.reload()}>重新读取</Button>
                        {loaded.raw !== null && (
                          <>
                            <Button onClick={downloadRaw}>下载原始记录</Button>
                            <Popconfirm
                              title="备份原始记录后从空项目开始？"
                              onConfirm={recover}
                              okText="备份并重新开始"
                              cancelText="取消"
                            >
                              <Button danger>备份原始记录并重新开始</Button>
                            </Popconfirm>
                          </>
                        )}
                      </>
                    ) : (
                      <Button onClick={() => persist(projects)}>重试保存</Button>
                    )}
                  </div>
                }
              />
            )}
            <ProjectModal
              key={modalOpen ? editingProject?.id || 'create' : 'closed'}
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              project={editingProject}
              onAddProject={handleSaveProject}
            />
            {current === 'dashboard' && (
              <Dashboard
                projectList={projects}
                onCreate={openCreate}
                onProjects={() => setCurrent('projects')}
                onTasks={openTasks}
                onToggleTask={handleToggleTask}
                disabled={blocked}
              />
            )}
            {current === 'projects' && (
              <Projects
                projectList={projects}
                onCreate={openCreate}
                onEdit={(project) => {
                  setEditingProject(project)
                  setModalOpen(true)
                }}
                onDelete={handleDeleteProject}
                onTasks={openTasks}
                disabled={blocked}
              />
            )}
            {current === 'tasks' && (
              <Tasks
                projectList={projects}
                selectedProjectId={selectedProjectId}
                onProjectChange={setSelectedProjectId}
                disabled={blocked}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onCreate={openCreate}
              />
            )}
          </Content>
          <Footer className="workspace-statusbar" aria-label="工作空间状态栏">
            <span className={`save-state${storageError ? ' has-error' : ''}`} role="status">
              {storageError ? (
                <ExclamationCircleOutlined />
              ) : saved || loaded.raw !== null ? (
                <CheckCircleOutlined />
              ) : (
                <DatabaseOutlined />
              )}
              {saveLabel}
            </span>
            <span className="status-counts">
              {projects.length} 个项目<span>·</span>
              {stats.pending} 项待办
            </span>
          </Footer>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
