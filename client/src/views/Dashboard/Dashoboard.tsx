import {block} from '@acrool/react-block';
import {Flex} from '@acrool/react-grid';
import {useLocale} from '@acrool/react-locale';
import {toast} from '@acrool/react-toaster';
import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router';



const baseApiUrl = 'http://localhost:3333';

const Dashboard = () => {
    const [sseSource, setSSESource] = useState<EventSource|null>(null)
    const [pingList, setPingList] = useState<string[]>([])
    const [notifications, setNotifications] = useState<string[]>([])
    const [userId, setUserId] = useState<string>('')
    const [connectedUsers, setConnectedUsers] = useState([])
    const [targetUserId, setTargetUserId] = useState('')
    const [notificationMessage, setNotificationMessage] = useState('')

    useEffect(() => {
        window.addEventListener('beforeunload', () => closeConnection())
        return () => {
            window.removeEventListener('beforeunload', () => closeConnection())
            closeConnection()
        }
    }, [])


    /**
     * 關閉連線
     */
    const closeConnection = () => {
        if (sseSource) {
            sseSource.close()
            setSSESource(null)
            setPingList(['已断开连接，等待重新连接...'])
        } else {
            toast.error('當前無連接');
            return;
        }
    }


    /**
     * 取得連線數
     */
    const getConnectedUsers = async () => {
        try {
            const response = await fetch(`${baseApiUrl}/users`)
            const result = await response.json()
            console.log('連接用戶列表:', result)
            if (result.success) {
                setConnectedUsers(result.data.users)
            }
        } catch (error) {
            console.error('獲取用戶列表失敗:', error)
        }
    }

    /**
     * 建立連線
     */
    const createConnection = () => {
        if (!userId) {
            toast.error('請先輸入UserId');
            return
        }

        if (!sseSource) {
            const source = new EventSource(`${baseApiUrl}/sse?userId=${userId}`)
            setSSESource(source)
            source.addEventListener('open', () => {
                console.log('Connection Opened')
                setPingList(['已建立連線，準備傳輸數據...'])
            })
            source.addEventListener('error', (e) => {
                console.log('Connection Error', e)
            })
            source.addEventListener('connected', (e) => {
                console.log('SSE 連接已建立', e)
                const data = JSON.parse(e.data)
                setPingList((prev) => [...prev, `連線確認: ${data.message}`])
            })
            source.addEventListener('ping', (e) => {
                console.log(e)
                setPingList((prev) => [...prev, e.data])
            })
            source.addEventListener('custom', (e) => {
                console.log(e)
            })
            source.addEventListener('notification', (e) => {
                console.log('收到通知:', e)
                const data = JSON.parse(e.data)
                setNotifications((prev) => [...prev, `${data.message} (${data.timestamp})`])
            })
        } else {
            toast.warning('建立新連線前，請先斷開連線');
        }
    }

    /**
     * 廣播全體使用者訊息
     */
    const triggerNotification = async () => {
        try {
            const response = await fetch(`${baseApiUrl}/trigger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `測試通知 - ${new Date().toLocaleTimeString()}`,
                    eventType: 'notification'
                })
            })
            const result = await response.json()
            toast.warning(`發送成功: ${result.message}`);
        } catch (error) {
            toast.error(`發送失敗，請檢查伺服器狀態`);
        }
    }


    /**
     * 通知特定使用者訊息
     */
    const notifySpecificUser = async () => {
        if (!targetUserId || !notificationMessage) {
            toast.warning(`請輸入目標用戶 ID 和通知訊息`);
            return
        }

        try {
            const response = await fetch('http://localhost:3333/notify-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    targetUserId,
                    message: notificationMessage,
                    eventType: 'notification'
                })
            })
            const result = await response.json()
            toast.warning(`個別通知結果 ${result.success ? '成功' : '失敗'}: ${result.message}`);

            if (result.success) {
                setNotificationMessage('')
            }
        } catch (error) {
            console.error('個別通知失敗:', error)
            toast.error('個別通知失敗，請檢查伺服器狀態');
        }
    }

    return (
        <div>
            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
                <h3>Login</h3>
                <div>
                    <input
                        type="text"
                        placeholder="UserId"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        style={{ marginRight: '10px' }}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <button onClick={createConnection} disabled={!userId}>
                    建立連線
                </button>
                <button onClick={closeConnection}>
                    斷開連線
                </button>
                <button onClick={triggerNotification}>
                    觸發全體通知
                </button>
                <button onClick={getConnectedUsers}>
                    取得所有已連接用戶
                </button>
            </div>

            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
                <h3>個別通知</h3>
                <div>
                    <input
                        type="text"
                        placeholder="目標用戶 ID"
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        style={{ marginRight: '10px' }}
                    />
                    <input
                        type="text"
                        placeholder="通知訊息"
                        value={notificationMessage}
                        onChange={(e) => setNotificationMessage(e.target.value)}
                        style={{ marginRight: '10px', width: '200px' }}
                    />
                    <button onClick={notifySpecificUser}>
                        發送個別通知
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>連接用戶列表:</h3>
                {connectedUsers.length > 0 ? (
                    <ul>
                        {connectedUsers.map((user, index) => (
                            <li key={index}>{user}</li>
                        ))}
                    </ul>
                ) : (
                    <p>暫無連接用戶</p>
                )}
            </div>

            <div style={{ marginTop: '10px' }}>
                <h3>Ping 訊息:</h3>
                {pingList.map((item, index) => (
                    <div key={item + index}>{item}</div>
                ))}
            </div>
            <div style={{ marginTop: '10px' }}>
                <h3>通知訊息:</h3>
                {notifications.map((item, index) => (
                    <div key={item + index} style={{ color: 'green' }}>{item}</div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
