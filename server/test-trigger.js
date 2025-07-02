// 測試觸發 API 的腳本
async function testTriggerAPI() {
  try {
    const response = await fetch('http://localhost:3333/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: '這是一個測試通知',
        eventType: 'notification'
      })
    })
    
    const result = await response.json()
    console.log('API 回應:', result)
  } catch (error) {
    console.error('測試失敗:', error)
  }
}

// 測試用戶註冊
async function testUserRegistration() {
  try {
    const response = await fetch('http://localhost:3333/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'user001',
        userName: '測試用戶A'
      })
    })
    
    const result = await response.json()
    console.log('用戶註冊回應:', result)
  } catch (error) {
    console.error('用戶註冊測試失敗:', error)
  }
}

// 測試個別用戶通知
async function testNotifyUser(targetUserId = 'user001') {
  try {
    const response = await fetch('http://localhost:3333/notify-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUserId,
        message: `這是給用戶 ${targetUserId} 的個別通知`,
        eventType: 'notification'
      })
    })
    
    const result = await response.json()
    console.log('個別通知回應:', result)
  } catch (error) {
    console.error('個別通知測試失敗:', error)
  }
}

// 獲取連接用戶列表
async function getConnectedUsers() {
  try {
    const response = await fetch('http://localhost:3333/users')
    const result = await response.json()
    console.log('連接用戶列表:', result)
  } catch (error) {
    console.error('獲取用戶列表失敗:', error)
  }
}

// 執行所有測試
async function runAllTests() {
  console.log('=== 開始測試 ===')
  
  console.log('\n1. 測試用戶註冊')
  await testUserRegistration()
  
  console.log('\n2. 獲取連接用戶列表')
  await getConnectedUsers()
  
  console.log('\n3. 測試個別用戶通知')
  await testNotifyUser('user001')
  
  console.log('\n4. 測試全體通知')
  await testTriggerAPI()
  
  console.log('\n=== 測試完成 ===')
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
}

export { testTriggerAPI, testUserRegistration, testNotifyUser, getConnectedUsers, runAllTests } 