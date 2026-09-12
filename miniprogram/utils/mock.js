const homePlans = [
  { id: 1, title: '完成英语阅读 30 分钟', time: '09:00 - 09:30', status: '已完成', statusKey: 'done', done: true },
  { id: 2, title: '整理实习周报', time: '13:00 - 15:00', status: '进行中', statusKey: 'doing', done: false },
  { id: 3, title: '参加社区志愿服务', time: '17:00 - 19:00', status: '待开始', statusKey: 'pending', done: false }
]
const homeModules = [
  { id: 'work', title: '工作', count: '8 项', page: '/pages/work/work', icon: '/assets/icons/briefcase-coral.png', tone: 'coral' },
  { id: 'study', title: '学习', count: '12 项', page: '/pages/study/study', icon: '/assets/icons/book-blue.png', tone: 'blue' },
  { id: 'volunteer', title: '公益', count: '6 项', page: '/pages/volunteer/volunteer', icon: '/assets/icons/heart-gold.png', tone: 'gold' },
  { id: 'daily', title: '生活', count: '10 项', page: '/pages/daily/daily', icon: '/assets/icons/leaf-green.png', tone: 'green' }
]
const workPreview = [
  { id: 'w1', startTime: '09:00', title: '整理活动策划方案', category: '实践活动', details: '完善活动流程与物料清单，确认执行细节。', status: '已完成', statusKey: 'done' },
  { id: 'w2', startTime: '13:00', title: '撰写实习周报', category: '实习实践', details: '梳理本周工作内容，准备下周计划。', status: '进行中', statusKey: 'doing' },
  { id: 'w3', startTime: '15:30', title: '对接志愿者团队', category: '志愿服务', details: '联系合作高校志愿者，确认参与名单。', status: '待开始', statusKey: 'pending' }
]
const studyPreview = [
  { id: 's1', title: '背诵单词 50 个', subject: '英语', priority: '高', timeLabel: '09:00 - 09:30', done: true },
  { id: 's2', title: '数学错题整理', subject: '数学', priority: '高', timeLabel: '10:00 - 11:00', done: true },
  { id: 's3', title: '阅读《人类简史》', subject: '语文', priority: '中', timeLabel: '14:00 - 15:00', done: false },
  { id: 's4', title: '做物理模拟试卷', subject: '物理', priority: '中', timeLabel: '19:00 - 20:30', done: false }
]
const dailyPreview = [
  { id: 'd1', time: '19:30', title: '傍晚跑步', category: '生活', content: '迎着晚风跑了 5 公里，海边的风真的好舒服！', imagePosition: 'left' },
  { id: 'd2', time: '12:30', title: '和朋友吃饭', category: '工作', content: '和好朋友一起吃了喜欢的日料，聊了很多有趣的事。', imagePosition: 'center' },
  { id: 'd3', time: '21:00', title: '看完一本书', category: '学习', content: '读完了《也许你该停下来》，有些话真的很治愈。', imagePosition: 'right' }
]
const volunteerProjects = [
  { id: 1, name: '守护蔚蓝海岸', type: '环保', place: '深圳 · 大鹏海滩', date: '7.15 - 8.30', joined: 12, total: 20, progress: 60, status: '已报名', color: 'green', image: '/assets/images/volunteer-cleanup.jpg', desc: '一起清理海滩垃圾，守护海洋的蔚蓝。', needs: ['海滩清洁', '垃圾分类', '环保宣传'] },
  { id: 2, name: '乡村图书角计划', type: '支教', place: '云南 · 红河', date: '7.10 - 8.25', joined: 8, total: 15, progress: 53, status: '去报名', color: 'orange', image: '/assets/images/volunteer-library.jpg', desc: '为乡村孩子搭建更多阅读的机会。', needs: ['童书募集', '图书整理', '阅读陪伴'] },
  { id: 3, name: '陪伴社区长者', type: '社区', place: '上海 · 徐汇区', date: '7.18 - 8.20', joined: 15, total: 20, progress: 75, status: '去报名', color: 'blue', image: '/assets/images/volunteer-elderly.jpg', desc: '用陪伴传递温暖，让社区更有温度。', needs: ['日常陪伴', '健康宣传', '活动协助'] }
]
module.exports = { homePlans, homeModules, workPreview, studyPreview, dailyPreview, volunteerProjects }
