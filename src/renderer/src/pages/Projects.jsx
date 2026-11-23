/* eslint-disable react/prop-types */
import { useState } from 'react'
import { Card, Button, Tag, Empty, Tooltip, Typography, Popconfirm, Alert } from 'antd'
import {
  PlusOutlined,
  FolderOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined
} from '@ant-design/icons'
import { summary, dateValue } from '../storage'
import ProgressMeter from '../components/ProgressMeter'

export default function Projects({
  projectList = [],
  onCreate,
  onTasks,
  onEdit,
  onDelete,
  disabled
}) {
  const [folderError, setFolderError] = useState('')
  const openFolder = async (path) => {
    setFolderError('')
    try {
      const result = await window.api.openFolder(path)
      if (!result.success) setFolderError(result.message)
    } catch {
      setFolderError('打开文件夹失败，请检查目录后重试。')
    }
  }
  return (
    <div className="xiangmuguanli">
      <div className="task-toolbar">
        <div>
          <Typography.Title level={1}>我的教学项目</Typography.Title>
          <p>共 {projectList.length} 个项目</p>
        </div>
        <Button disabled={disabled} onClick={onCreate} type="primary" icon={<PlusOutlined />}>
          新建项目
        </Button>
      </div>
      {folderError && (
        <Alert
          type="warning"
          showIcon
          title={folderError}
          closable
          onClose={() => setFolderError('')}
        />
      )}
      {!projectList.length && <Empty description="暂无项目，请先创建教学项目" />}
      <div className="project-grid">
        {projectList.map((item) => {
          const stats = summary([item])
          return (
            <Card className="project-card" key={item.id}>
              <div className="project-card-heading">
                <h2>{item.name}</h2>
                <Tag>{item.course}</Tag>
              </div>
              <p className="project-description">{item.description}</p>
              <div className="project-meta">
                <CalendarOutlined />
                <span>
                  {dateValue(item.createdAt) ? `创建于 ${item.createdAt}` : '创建日期未记录'}
                </span>
              </div>
              <div className="project-meta">
                <FolderOutlined />
                <Tooltip title={item.folderPath}>
                  <span className="folder-path" tabIndex={0}>
                    {item.folderPath}
                  </span>
                </Tooltip>
              </div>
              <div className="project-card-progress">
                <span>
                  {stats.total
                    ? `已完成 ${stats.completed} / ${stats.total} 项任务`
                    : '尚未添加任务'}
                </span>
                <ProgressMeter percent={stats.percent} label={`${item.name}完成率`} />
              </div>
              <div className="project-card-actions">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  disabled={disabled}
                  onClick={() => onEdit(item)}
                >
                  编辑
                </Button>
                <Popconfirm
                  title={`删除「${item.name}」？`}
                  description={`将删除此项目及 ${item.tasks.length} 项任务的应用记录，不会删除磁盘文件夹。`}
                  okText="删除项目"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete(item.id)}
                >
                  <Button size="small" danger disabled={disabled} icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
                <Button
                  size="small"
                  icon={<FolderOpenOutlined />}
                  disabled={
                    disabled ||
                    !window.api?.openFolder ||
                    !item.folderPath ||
                    item.folderPath === '待关联本地文件夹'
                  }
                  onClick={() => openFolder(item.folderPath)}
                >
                  打开目录
                </Button>
              </div>
              <Button
                block
                onClick={() => onTasks(item.id)}
                icon={<ArrowRightOutlined />}
                iconPlacement="end"
              >
                查看任务
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
