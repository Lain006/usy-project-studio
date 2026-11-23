/* eslint-disable react/prop-types */
import { useRef, useState } from 'react'
import { Modal, Form, Input, Button, Space, Alert } from 'antd'
import { FolderOpenOutlined } from '@ant-design/icons'
export default function ProjectModal({ open, onClose, onAddProject, project }) {
  const [form] = Form.useForm()
  const [selecting, setSelecting] = useState(false)
  const [folderError, setFolderError] = useState('')
  const closed = useRef(false)
  const handleCloseModal = () => {
    closed.current = true
    onClose()
    form.resetFields()
  }
  const selectFolder = async () => {
    setSelecting(true)
    setFolderError('')
    try {
      const result = await window.api.selectFolder()
      if (closed.current) return
      if (!result.success) setFolderError(result.message)
      else if (result.path) form.setFieldsValue({ folderPath: result.path })
    } catch {
      if (!closed.current) setFolderError('选择文件夹失败，请重试。')
    } finally {
      if (!closed.current) setSelecting(false)
    }
  }
  const handleFormFinish = (values) => {
    const newProject = {
      ...project,
      id: project?.id || `p_${crypto.randomUUID()}`,
      name: values.name.trim(),
      course: values.course.trim(),
      description: values.description.trim(),
      createdAt: project?.createdAt || new Date().toISOString().split('T')[0],
      folderPath: values.folderPath?.trim() || '待关联本地文件夹',
      tasks: project?.tasks || []
    }
    if (onAddProject) {
      onAddProject(newProject)
    }
    onClose()
    form.resetFields()
  }
  return (
    <>
      {/* 新建项目 modal 对话框 */}
      <Modal
        title={project ? '编辑教学实训项目' : '新建教学实训项目'}
        open={open}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        okText={project ? '保存修改' : '创建项目'}
        okButtonProps={{ disabled: selecting }}
        cancelText="取消"
      >
        <Form
          form={form}
          initialValues={project}
          onFinish={handleFormFinish}
          layout="vertical"
          scrollToFirstError={{ focus: true }}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              { required: true, whitespace: true, max: 80, message: '请输入非空内容，最多 80 字符' }
            ]}
          >
            <Input maxLength={80} showCount placeholder="例如：金融数据上链存证系统" />
          </Form.Item>
          <Form.Item
            name="course"
            label="课程名称"
            rules={[
              { required: true, whitespace: true, max: 80, message: '请输入非空内容，最多 80 字符' }
            ]}
          >
            <Input maxLength={80} showCount placeholder="例如：区块链技术原理及应用" />
          </Form.Item>
          <Form.Item label="本地项目目录（选填）">
            <Space.Compact className="project-folder-input">
              <Form.Item name="folderPath" noStyle>
                <Input
                  aria-label="本地项目目录（选填）"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="选择或输入本地文件夹路径"
                  maxLength={1024}
                />
              </Form.Item>
              <Button
                icon={<FolderOpenOutlined />}
                loading={selecting}
                disabled={!window.api?.selectFolder}
                onClick={selectFolder}
              >
                选择文件夹
              </Button>
            </Space.Compact>
            {!window.api?.selectFolder && (
              <p className="folder-help">桌面版支持原生文件夹选择和打开。</p>
            )}
            {folderError && <Alert type="warning" title={folderError} showIcon />}
          </Form.Item>
          <Form.Item
            name="description"
            label="项目简介"
            rules={[
              {
                required: true,
                whitespace: true,
                max: 500,
                message: '请输入非空内容，最多 500 字符'
              }
            ]}
          >
            <Input.TextArea
              maxLength={500}
              showCount
              rows={3}
              placeholder="简要描述项目的核心目标、技术栈或者成果要求"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
