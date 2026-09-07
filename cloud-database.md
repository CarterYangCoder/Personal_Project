# 云开发迁移说明

1. 在微信开发者工具打开“云开发”，创建环境，并将环境 ID 填入 `cloud-config.js`。
2. 在云开发控制台创建集合：`profiles`、`workTasks`、`studyTasks`、`diaries`、`volunteerIntents`、`favoriteSongs`。
3. 私有集合设置为“仅创建者可读写”。由于记录由云函数以管理端身份创建，云函数会从可信上下文读取 OPENID 并显式写入 `_openid`；不要信任前端传入的用户标识。
4. 在开发者工具中右键 `cloudfunctions/dataService`，选择“上传并部署：云端安装依赖”。
5. 重新编译小程序。未填写环境 ID 时，小程序继续使用本地存储。

## DeepSeek AI 助手

1. 在云开发控制台打开“云函数” → `dataService` → “配置” → “环境变量”。
2. 新增 `DEEPSEEK_API_KEY`，值为你的 DeepSeek API Key。不要把密钥写入 `cloud-config.js`、前端代码或版本库。
3. 将云函数超时时间设置为至少 25 秒，然后重新上传并部署 `dataService`。

助手首次读取个人记录前会请求用户授权。允许后会向 DeepSeek 发送当前问题、最近 8 条对话，以及最多 12 条未完成事项、公益状态和日记元数据；不会发送日记正文。DeepSeek 暂不可用或用户选择“仅本地”时，会自动回退到本地建议。

用户可在助手页选择 `V4 Flash · 快速`、`V4 Flash · 深度思考` 或 `V4 Pro · 高质量`。模型及思考模式由云函数白名单控制，前端不能传入任意模型名称。

`workTasks`、`studyTasks`、`diaries`、`volunteerIntents` 和 `favoriteSongs` 建议分别为 `updatedAt` 与 `_openid` 建立索引。当前“可分享计划”只进入用户主动复制的摘要，并不是公开发布；如需公开内容，应单独使用审核后的公共集合，不要直接开放私有集合。
