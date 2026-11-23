/* eslint-disable react/prop-types */
import { Badge, Button, Card, Checkbox, Empty, Statistic, Typography } from 'antd'
import {
  PlusOutlined,
  ArrowRightOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  ProjectOutlined
} from '@ant-design/icons'
import { summary, dateValue } from '../storage'
import ProgressMeter from '../components/ProgressMeter'
export default function Dashboard({
  projectList,
  onCreate,
  onProjects,
  onTasks,
  onToggleTask,
  disabled
}) {
  const stats = summary(projectList)
  const recent = [...projectList]
    .sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt))
    .slice(0, 4)
  const pending = projectList.flatMap((project) =>
    project.tasks.filter((t) => !t.completed).map((task) => ({ project, task }))
  )
  return (
    <div className="dashboard">
      <div className="task-toolbar">
        <div>
          <Typography.Title level={1}>工作台首页</Typography.Title>
          <p>查看教学项目与实训任务的完成情况</p>
        </div>
        <div className="dashboard-actions">
          <Button type="primary" icon={<PlusOutlined />} disabled={disabled} onClick={onCreate}>
            新建项目
          </Button>
          <Button icon={<CheckSquareOutlined />} onClick={() => onTasks()}>
            管理任务
          </Button>
        </div>
      </div>
      <div className="dashboard-stats">
        {[
          ['项目总数', projectList.length],
          ['任务总数', stats.total],
          ['已完成任务', stats.completed],
          ['未完成任务', stats.pending]
        ].map(([title, value]) => (
          <Statistic
            key={title}
            title={title}
            value={value}
            suffix={title === '项目总数' ? '个' : '项'}
          />
        ))}
        <section className="dashboard-progress" aria-label="总体任务完成率">
          <div>
            <h2>总体任务完成率</h2>
            <span>
              已完成 {stats.completed} / {stats.total} 项任务
            </span>
          </div>
          <ProgressMeter percent={stats.percent} label="总体任务完成率" />
        </section>
      </div>
      <div className="dashboard-columns">
        <Card
          className="overview-panel"
          title={
            <h2 className="panel-heading">
              <ClockCircleOutlined />
              待办任务
              <Badge count={pending.length} showZero color="#626970" />
            </h2>
          }
        >
          {!pending.length ? (
            <Empty
              description={
                !projectList.length
                  ? '创建项目后即可安排实训任务'
                  : !stats.total
                    ? '项目尚未添加任务'
                    : '全部任务已完成'
              }
            >
              <Button
                disabled={!projectList.length && disabled}
                onClick={projectList.length ? () => onTasks() : onCreate}
              >
                {projectList.length ? '管理任务' : '新建项目'}
              </Button>
            </Empty>
          ) : (
            <ul className="task-list">
              {pending.slice(0, 6).map(({ project, task }) => (
                <li className="dashboard-pending" key={`${project.id}:${task.id}`}>
                  <Checkbox
                    disabled={disabled}
                    checked={false}
                    onChange={(event) => onToggleTask(project.id, task.id, event.target.checked)}
                  >
                    {task.title}
                  </Checkbox>
                  <Button
                    className="pending-project-link"
                    type="text"
                    icon={<ArrowRightOutlined />}
                    iconPlacement="end"
                    onClick={() => onTasks(project.id)}
                  >
                    {project.name}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {pending.length > 6 && <p>首页显示前 6 项，请进入所属项目管理更多任务。</p>}
        </Card>
        <Card
          title={
            <h2 className="panel-heading">
              <ProjectOutlined />
              最近创建的项目
            </h2>
          }
          className="overview-panel"
          extra={
            <Button
              type="text"
              onClick={onProjects}
              icon={<ArrowRightOutlined />}
              iconPlacement="end"
            >
              全部项目
            </Button>
          }
        >
          {!recent.length ? (
            <Empty description="还没有教学项目">
              <Button disabled={disabled} onClick={onCreate}>
                新建项目
              </Button>
            </Empty>
          ) : (
            recent.map((project) => (
              <article className="dashboard-project" key={project.id}>
                <div className="project-row-heading">
                  <h3>{project.name}</h3>
                  <Button
                    type="text"
                    icon={<ArrowRightOutlined />}
                    aria-label={`查看任务：${project.name}`}
                    onClick={() => onTasks(project.id)}
                  >
                    查看任务
                  </Button>
                </div>
                <p>{project.course}</p>
                <p>
                  {dateValue(project.createdAt) ? `创建于 ${project.createdAt}` : '创建日期未记录'}{' '}
                  · {project.tasks.length} 项任务
                </p>
                <ProgressMeter
                  percent={summary([project]).percent}
                  label={`${project.name}完成率`}
                />
              </article>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
