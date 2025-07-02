import express from 'express'

const app = express()
const PORT = 3333

// 儲存所有 SSE 連接，以用戶 ID 為 key
const sseConnections = new Map()

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Authorization,X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method'
  )
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, PUT, DELETE')
  res.header('Allow', 'GET, POST, PATCH, OPTIONS, PUT, DELETE')
  next()
})

// 解析 JSON 請求體
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})





/**
 * 通知特定用戶的 API
 */
app.post('/notify-user', (req, res) => {
  const { targetUserId, message, eventType = 'notification' } = req.body

  if (!targetUserId || !message) {
    return res.status(400).json({
      success: false,
      message: '需要提供 targetUserId 和 message'
    })
  }

  console.log(`發送通知給用戶 ${targetUserId}: ${message}`)

  const userConnection = sseConnections.get(targetUserId)

  if (!userConnection) {
    return res.json({
      success: false,
      message: `用戶 ${targetUserId} 未連接`,
      data: { targetUserId, message, eventType }
    })
  }

  try {
    userConnection.write(`event: ${eventType}\n`)
    userConnection.write(`data: ${JSON.stringify({ message, timestamp: new Date().toISOString() })}\n\n`)

    res.json({
      success: true,
      message: `已向用戶 ${targetUserId} 發送通知`,
      data: { targetUserId, message, eventType }
    })
  } catch (error) {
    console.log('發送 SSE 訊息時發生錯誤:', error.message)
    sseConnections.delete(targetUserId)
    res.json({
      success: false,
      message: `用戶 ${targetUserId} 連接已斷開`,
      data: { targetUserId, message, eventType }
    })
  }
})





/**
 * 通知所有用戶的 API
 */
app.post('/trigger', (req, res) => {
  const { message = '預設訊息', eventType = 'notification' } = req.body

  console.log(`收到觸發請求: ${message}, 事件類型: ${eventType}`)

  let successCount = 0
  let failCount = 0

  // 向所有連接的 SSE 客戶端發送通知
  sseConnections.forEach((clientRes, userId) => {
    try {
      clientRes.write(`event: ${eventType}\n`)
      clientRes.write(`data: ${JSON.stringify({ message, timestamp: new Date().toISOString() })}\n\n`)
      successCount++
    } catch (error) {
      console.log(`發送 SSE 訊息給用戶 ${userId} 時發生錯誤:`, error.message)
      // 移除無效的連接
      sseConnections.delete(userId)
      failCount++
    }
  })

  res.json({
    success: true,
    message: `已向 ${successCount} 個用戶發送通知，${failCount} 個連接失敗`,
    data: { message, eventType, successCount, failCount }
  })
})






/**
 * 獲取當前連接用戶列表
 */
app.get('/users', (req, res) => {
  const users = Array.from(sseConnections.keys())
  res.json({
    success: true,
    message: `當前有 ${users.length} 個用戶連接`,
    data: { users, count: users.length }
  })
})

app.get('/sse', async function (req, res) {
  const { userId } = req.query

  if (!userId) {
    return res.status(400).send('需要提供 userId 參數')
  }

  console.log(`用戶 ${userId} 建立 SSE 連接`)
  res.set({
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive'
  })
  res.flushHeaders()

  // 將此連接加入到用戶連接映射中
  sseConnections.set(userId, res)

  let shouldStop = false

  res.on('close', () => {
    console.log(`用戶 ${userId} 已斷開連接`)
    shouldStop = true
    // 從連接映射中移除
    sseConnections.delete(userId)
    res.end()
  })

  // 發送初始連接確認訊息
  res.write(`event: connected\n`)
  res.write(`data: ${JSON.stringify({ message: `用戶 ${userId} SSE 連接已建立`, userId, timestamp: new Date().toISOString() })}\n\n`)

  let count = 0

  while (count <= 2 && !shouldStop) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    res.write('retry: 0\n\n')
    res.write(`event: sping\n`)
    res.write(`data: _ping ${++count}\n\n`)
    console.log('已发送', '消息类型：xping', count)
    res.write(`event: custom\n`)
    res.write(`data: custom ${count}\n\n`)
    console.log('已发送', '消息类型：custom', count)
  }
})





app.listen(PORT, () => {
  console.log(`Listen Port:${PORT}`)
})
