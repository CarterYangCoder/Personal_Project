const timeline = [
  { date: '07.26', title: '走进红色课堂', desc: '井冈山之路，让课本里的故事有了温度。', icon: '⛰', page: '/pages/volunteer/volunteer' },
  { date: '08.05', title: '终于返程到家', desc: '拿到了三天假期保护卡，三天过后就要和妈妈斗智斗勇', icon: '☀', page: '/pages/daily/daily' },
  { date: '08.13', title: '自己动手烧烤', desc: '集结了高中的好伙伴一起回老家烧烤，亲自体验了烧烤全流程，提前做好程序员的职业规划', icon: '◌', page: '/pages/daily/daily' },
  { date: '08.16', title: '新生手册，开始成稿', desc: '和学生会部长们把散落的想法整理成一份给新同学的见面礼。', icon: '✦', page: '/pages/work/work' },
  { date: '08.17', title: '弟弟生日', desc: '又见证弟弟长大了一岁', icon: '〰', page: '/pages/daily/daily' },
  { date: '08.21', title: '给夏天留一页', desc: '坐上返校的火车，告别这个假期', icon: '◌', page: '/pages/daily/daily' }
]
const quickLinks = [
  { icon: '📖', title: '工作任务', note: '管理我的待办', page: '/pages/work/work', tone: 'mint' },
  { icon: '🤝', title: '志愿一起做', note: '找到同行伙伴', page: '/pages/volunteer/volunteer', tone: 'orange' },
  { icon: '⏱', title: '学习计划', note: '四象限与番茄钟', page: '/pages/study/study', tone: 'blue' },
  { icon: '🎵', title: '生活记录', note: '每日一歌与日记', page: '/pages/daily/daily', tone: 'purple' }
]
const volunteerProjects = [
  { id: 1, name: '给远方孩子的一份开学礼', type: '闲置物品众筹', target: '偏远地区儿童', status: '长期征集', color: 'yellow', desc: '征集保存良好的童书、文具、书包和益智玩具。完成整理、消毒和分类后，再统一寄往有需要的学校或公益站点。', needs: ['童书文具', '分类打包', '物流协助'] },
  { id: 2, name: '让闲置衣物继续温暖', type: '物资筹集', target: '乡村儿童与家庭', status: '筹备中', color: 'green', desc: '面向同学和社区征集干净、适龄、适季的闲置衣物，以清单化方式登记，避免无效捐赠。', needs: ['衣物征集', '质量检查', '信息登记'] },
  { id: 3, name: '敬老院心愿清单', type: '线上筹资 + 线下陪伴', target: '对接敬老院', status: '等待同行者', color: 'blue', desc: '结合已对接敬老院的实际需求，筹集日用品或小额物资，也邀请伙伴参与陪伴、读报和节日活动。', needs: ['需求沟通', '线上筹资', '到院陪伴'] }
]
module.exports = { timeline, quickLinks, volunteerProjects }
