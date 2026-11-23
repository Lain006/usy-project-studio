import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  DesktopOutlined
} from '@ant-design/icons'
import logoPic from '../assets/logo.png'

const { Sider } = Layout
const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '工作台首页' },
  { key: 'projects', icon: <ProjectOutlined />, label: '项目管理' },
  { key: 'tasks', icon: <CheckSquareOutlined />, label: '任务管理' }
]

// 菜单选中状态由 App 统一管理，保证高亮与右侧页面一致。
/* eslint-disable react/prop-types */
export default function Sidebar({ current, onMenuChange }) {
  return (
    <Sider className="zuocecaidan" width={224} theme="light">
      <div className="caidanlogo">
        <img className="logotupian" src={logoPic} alt="三亚学院校徽" width={34} height={40} />
        <div>
          <span>USY Studio</span>
          <small>项目与任务工作台</small>
        </div>
      </div>
      <div className="nav-group-label">工作空间</div>
      <Menu
        theme="light"
        mode="inline"
        items={menuItems}
        selectedKeys={[current]}
        onClick={({ key }) => onMenuChange(key)}
      />
      <div className="sidebar-footer">
        <DesktopOutlined />
        <div>
          本地工作空间<small>项目制教学 · 专注每一步</small>
        </div>
      </div>
    </Sider>
  )
}
