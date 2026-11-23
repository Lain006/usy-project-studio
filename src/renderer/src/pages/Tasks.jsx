/* eslint-disable react/prop-types */
import { useRef, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  ProjectOutlined
} from '@ant-design/icons'
import ProgressMeter from '../components/ProgressMeter'

export default function Tasks({
  projectList = [],
  onAddTask,
  onToggleTask,
  onDeleteTask,
  selectedProjectId,
  onProjectChange,
  disabled,
  onCreate
}) {
  const composing = useRef(false)
  const inputRef = useRef(null)
  const [taskInput, setTaskInput] = useState('')
  const [inputError, setInputError] = useState('')
  // 新建项目或列表变化后，始终回退到一个存在的项目。
  const currentProject =
    projectList.find((project) => project.id === selectedProjectId) || projectList[0]
  const tasks = currentProject?.tasks || []
  const totalCount = tasks.length
  const completedCount = tasks.filter((task) => task.completed).length
  const percent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0

  const handleProjectChange = (projectId) => {
    onProjectChange(projectId)
    setTaskInput('')
    setInputError('')
  }
  const handleCreateTask = () => {
    const title = taskInput.trim()
    if (!title || title.length > 300) {
      setInputError('请输入 1–300 字符的任务内容')
      return
    }
    onAddTask(currentProject.id, title)
    setTaskInput('')
    setInputError('')
    inputRef.current?.focus()
  }

  if (!currentProject) {
    return (
      <div className="renwuguanli">
        <Typography.Title level={1}>任务管理</Typography.Title>
        <Empty style={{ marginTop: 60 }} description="还没有项目，创建项目后即可添加任务">
          <Button type="primary" disabled={disabled} onClick={onCreate}>
            新建项目
          </Button>
        </Empty>
      </div>
    )
  }

  return (
    <div className="renwuguanli">
      <div className="task-toolbar">
        <div>
          <Typography.Title level={1}>任务管理</Typography.Title>
        </div>
        <div className="task-project-switch">
          <label htmlFor="task-project">
            <ProjectOutlined /> 当前项目
          </label>
          <Select
            id="task-project"
            value={currentProject.id}
            onChange={handleProjectChange}
            options={projectList.map((project) => ({ label: project.name, value: project.id }))}
          />
        </div>
      </div>

      <Card className="task-summary">
        <div className="task-summary-heading">
          <div className="task-project-heading">
            <Tag>{currentProject.course}</Tag>
          </div>
          <div className="task-counts" aria-live="polite">
            <span>
              总任务：<b>{totalCount}</b> 项
            </span>
            <span className="task-count-completed">
              已完成：<b>{completedCount}</b> 项
            </span>
            <span className="task-count-pending">
              未完成：<b>{totalCount - completedCount}</b> 项
            </span>
          </div>
        </div>
        <ProgressMeter percent={percent} />
      </Card>

      <div className="task-entry">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            ref={inputRef}
            disabled={disabled}
            maxLength={300}
            onCompositionStart={() => {
              composing.current = true
            }}
            onCompositionEnd={() => {
              composing.current = false
            }}
            size="large"
            aria-label="实训待办任务"
            aria-describedby={inputError ? 'task-input-error' : undefined}
            status={inputError ? 'error' : undefined}
            placeholder="输入待办任务，按 Enter 添加"
            value={taskInput}
            onChange={(event) => {
              setTaskInput(event.target.value)
              setInputError('')
            }}
            onPressEnter={(event) => {
              if (!composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229)
                handleCreateTask()
            }}
          />
          <Button
            disabled={disabled}
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleCreateTask}
          >
            添加任务
          </Button>
        </Space.Compact>
        {inputError && (
          <div id="task-input-error" className="task-input-error" role="alert">
            {inputError}
          </div>
        )}
      </div>

      <Card
        title={
          <h2 className="panel-heading">
            任务列表
            <Badge count={totalCount} showZero color="#626970" />
          </h2>
        }
        className="task-list-card"
      >
        {tasks.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="在上方输入第一项任务" />
        ) : (
          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task.id} className={`task-row${task.completed ? ' is-completed' : ''}`}>
                <div className="task-row-content">
                  <Checkbox
                    disabled={disabled}
                    checked={task.completed}
                    aria-label={task.title}
                    onChange={(event) =>
                      onToggleTask(currentProject.id, task.id, event.target.checked)
                    }
                  >
                    <span className={`task-title${task.completed ? ' is-completed' : ''}`}>
                      {task.title}
                    </span>
                  </Checkbox>
                  {task.completed ? (
                    <Tag className="task-status done" icon={<CheckCircleOutlined />}>
                      已完成
                    </Tag>
                  ) : (
                    <Tag className="task-status" icon={<ClockCircleOutlined />}>
                      未完成
                    </Tag>
                  )}
                </div>
                <Popconfirm
                  title="删除此任务？"
                  description="删除后无法撤销"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => onDeleteTask(currentProject.id, task.id)}
                >
                  <Button
                    disabled={disabled}
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={`删除任务：${task.title}`}
                  >
                    删除
                  </Button>
                </Popconfirm>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
