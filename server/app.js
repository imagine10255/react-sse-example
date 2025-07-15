import express from 'express'

const app = express()
const PORT = 8081

// 格式化日期函數：顯示 月/日 時:分:秒
function formatDateTime(date) {
    const month = date.getMonth() + 1 // getMonth() 返回 0-11
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    
    return `${month}/${day} ${hours}:${minutes}:${seconds}`
}

// 儲存所有 SSE 連接，以用戶 ID 為 key
const sseConnections = new Map()

// 簡單的 CORS 中間件
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, cache-control, Authorization');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }

    next();
});

// 解析 JSON 請求體
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})





/**
 * 通知特定用戶的 API
 */
app.post('/notifyUser', (req, res) => {
    const {userId, message, eventType = 'notification'} = req.body

    if (!userId || !message) {
        return res.status(400).json({
            success: false,
            message: '需要提供 userId 和 message'
        })
    }
    const userConnection = sseConnections.get(userId)


    if (!userConnection) {
        return res.json({
            success: false,
            message: `用戶 ${userId} 未連接`,
            data: {userId, message, eventType}
        })
    }

    try {
        userConnection.write(`event: ${eventType}\n`)
        userConnection.write(`data: ${JSON.stringify({
            type: eventType,
            message,
            timestamp: new Date().toISOString(),
            formattedTime: formatDateTime(new Date())
        })}\n\n`)

        res.json({
            success: true,
            message: `已向用戶 ${userId} 發送通知`,
            data: {userId, message, eventType}
        })
    } catch (error) {
        console.log('發送 SSE 訊息時發生錯誤:', error.message)
        sseConnections.delete(userId)
        res.json({
            success: false,
            message: `用戶 ${userId} 連接已斷開`,
            data: {userId, message, eventType}
        })
    }
})


/**
 * 通知所有用戶的 API
 */
app.post('/trigger', (req, res) => {
    const {message = '預設訊息', eventType = 'notification'} = req.body

    let successCount = 0
    let failCount = 0

    // 向所有連接的 SSE 客戶端發送通知
    sseConnections.forEach((clientRes, userId) => {
        try {
            clientRes.write(`event: ${eventType}\n`)
            clientRes.write(`data: ${JSON.stringify({
                type: eventType,
                message,
                timestamp: new Date().toISOString(),
                formattedTime: formatDateTime(new Date())
            })}\n\n`)
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
        data: {message, eventType, successCount, failCount}
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
        data: {users, count: users.length}
    })
})


/**
 * SSE 長連線 event-stream, keep-alive
 */
app.get('/sse', async function (req, res) {
    const {userId} = req.query
    const authHeader = req.headers.authorization

    // 從 Authorization header 中提取用戶 ID
    let headerUserId = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
        headerUserId = authHeader.substring(7)
    }

    const authUserId = userId || headerUserId;
    // 驗證用戶身份
    if (!authUserId) {
        console.log('身份驗證失敗:', { userId, headerUserId })
        return res.status(401).send('身份驗證失敗')
    }


    console.log(`用戶 ${userId} 建立 SSE 連接`)
    res.set({
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive'
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
    res.write(`data: ${JSON.stringify({
        type: 'connected',
        message: `用戶 ${userId} SSE 連接已建立`,
        userId,
        timestamp: new Date().toISOString(),
        formattedTime: formatDateTime(new Date())
    })}\n\n`)

    // 定期發送 ping 訊息保持連接活躍
    const pingInterval = setInterval(() => {
        if (shouldStop) {
            clearInterval(pingInterval)
            return
        }

        try {
            res.write(`event: ping\n`)
            res.write(`data: ${JSON.stringify({
                type: 'ping',
                message: `Ping from server - ${formatDateTime(new Date())}`,
                timestamp: new Date().toISOString(),
                formattedTime: formatDateTime(new Date())
            })}\n\n`)
        } catch (error) {
            console.log(`發送 ping 給用戶 ${userId} 時發生錯誤:`, error.message)
            clearInterval(pingInterval)
            sseConnections.delete(userId)
        }
    }, 30000) // 每30秒發送一次 ping

    // 清理定時器
    res.on('close', () => {
        clearInterval(pingInterval)
    })

})


app.listen(PORT, () => {
    console.log(`Listen Port:${PORT}`)
})
