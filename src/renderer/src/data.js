export const initialProjects = [
  {
    id: 'p_1',
    name: '金融数据上链存证系统',
    course: '区块链技术及应用',
    description: '基于区块链技术的金融数据上链存证系统',
    createdAt: '2023-01-01',
    folderPath: 'D:\\USY-Projects\\finance-chain',
    tasks: [
      { id: 't_1', title: '撰写开题报告和需求分析说明书', completed: true },
      { id: 't_2', title: '搭建 FISCO-BCOS/Hardhat 以太坊底层区块链网络', completed: true },
      { id: 't_3', title: '编写存证智能合约及单元测试', completed: false },
      { id: 't_4', title: '开发前端可视化交互页面与接口联调', completed: false }
    ]
  },
  {
    id: 'p_2',
    name: '智能合约开发项目',
    course: '区块链技术及应用',
    description: '基于区块链技术的智能合约开发',
    createdAt: '2023-01-02',
    folderPath: 'D:\\USY-Projects\\smart-contract',
    tasks: []
  }
]
