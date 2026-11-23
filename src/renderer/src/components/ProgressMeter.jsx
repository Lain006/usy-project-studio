/* eslint-disable react/prop-types */
import { Progress } from 'antd'
export default function ProgressMeter({ percent, label = '任务完成率' }) {
  return (
    <Progress
      className="progress-meter"
      aria-label={label}
      percent={percent}
      strokeColor="#1d5fbf"
      size="small"
      format={(value) => `${value}%`}
    />
  )
}
