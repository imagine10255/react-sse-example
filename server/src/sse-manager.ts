interface SSEMessage {
  message: string
  timestamp: string
}

interface NotificationResult {
  success: boolean
  message: string
  data?: any
}

export class SSEConnectionManager {
  private connections: Map<string, WritableStreamDefaultWriter> = new Map()

  /**
   * 添加 SSE 連接
   */
  addConnection(userId: string, writer: WritableStreamDefaultWriter): void {
    this.connections.set(userId, writer)
    console.log(`用戶 ${userId} 連接已添加，當前連接數: ${this.connections.size}`)
  }

  /**
   * 移除 SSE 連接
   */
  removeConnection(userId: string): void {
    this.connections.delete(userId)
    console.log(`用戶 ${userId} 連接已移除，當前連接數: ${this.connections.size}`)
  }

  /**
   * 向特定用戶發送通知
   */
  async notifyUser(userId: string, message: string, eventType: string = 'notification'): Promise<NotificationResult> {
    const writer = this.connections.get(userId)

    if (!writer) {
      return {
        success: false,
        message: `用戶 ${userId} 未連接`,
        data: { userId, message, eventType }
      }
    }

    try {
      const sseMessage: SSEMessage = {
        message,
        timestamp: new Date().toISOString()
      }

      const sseData = `event: ${eventType}\ndata: ${JSON.stringify(sseMessage)}\n\n`
      await writer.write(new TextEncoder().encode(sseData))

      return {
        success: true,
        message: `已向用戶 ${userId} 發送通知`,
        data: { userId, message, eventType }
      }
    } catch (error) {
      console.log('發送 SSE 訊息時發生錯誤:', error instanceof Error ? error.message : '未知錯誤')
      this.connections.delete(userId)
      return {
        success: false,
        message: `用戶 ${userId} 連接已斷開`,
        data: { userId, message, eventType }
      }
    }
  }

  /**
   * 向所有用戶發送通知
   */
  async notifyAll(message: string, eventType: string = 'notification'): Promise<NotificationResult> {
    let successCount = 0
    let failCount = 0
    const disconnectedUsers: string[] = []

    const sseMessage: SSEMessage = {
      message,
      timestamp: new Date().toISOString()
    }

    const sseData = `event: ${eventType}\ndata: ${JSON.stringify(sseMessage)}\n\n`

    // 向所有連接的 SSE 客戶端發送通知
    for (const [userId, writer] of this.connections.entries()) {
      try {
        await writer.write(new TextEncoder().encode(sseData))
        successCount++
      } catch (error) {
        console.log(`發送 SSE 訊息給用戶 ${userId} 時發生錯誤:`, error instanceof Error ? error.message : '未知錯誤')
        disconnectedUsers.push(userId)
        failCount++
      }
    }

    // 移除無效的連接
    disconnectedUsers.forEach(userId => {
      this.connections.delete(userId)
    })

    return {
      success: true,
      message: `已向 ${successCount} 個用戶發送通知，${failCount} 個連接失敗`,
      data: { message, eventType, successCount, failCount, disconnectedUsers }
    }
  }

  /**
   * 獲取當前連接的用戶列表
   */
  async getConnectedUsers(): Promise<string[]> {
    return Array.from(this.connections.keys())
  }

  /**
   * 獲取當前連接數
   */
  getConnectionCount(): number {
    return this.connections.size
  }

  /**
   * 清理所有連接
   */
  clearAllConnections(): void {
    this.connections.clear()
    console.log('所有 SSE 連接已清理')
  }
} 