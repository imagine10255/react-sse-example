import {block} from '@acrool/react-block';
import {Col, Container, Flex, Row} from '@acrool/react-grid';
import {useLocale} from '@acrool/react-locale';
import {toast} from '@acrool/react-toaster';
import React, {useCallback, useEffect, useState} from 'react';
import {useNavigate} from 'react-router';
import {Controller, SubmitHandler, useForm} from "react-hook-form";
import clsx from 'clsx';



/**
 * Login
 */
interface ILoginForm {
    userId: string
}

const baseApiUrl = 'http://localhost:3333';

const Dashboard = () => {
    const [sseSource, setSSESource] = useState<EventSource|null>(null)
    const [pingList, setPingList] = useState<string[]>([])
    const [notifications, setNotifications] = useState<string[]>([])
    const [connectedUsers, setConnectedUsers] = useState([])
    const [targetUserId, setTargetUserId] = useState('')
    const [notificationMessage, setNotificationMessage] = useState('')
    const LoginHookForm = useForm<ILoginForm>();

    const icConnected = LoginHookForm.formState.isSubmitting || !!sseSource

    useEffect(() => {
        window.addEventListener('beforeunload', () => closeConnection())
        return () => {
            window.removeEventListener('beforeunload', () => closeConnection())
            closeConnection()
        }
    }, [])


    /**
     * 送出表單
     * @param formData
     */
    const handleSubmitLoginHandler: SubmitHandler<ILoginForm> = formData => {
        // block.show();

        console.log('formData.userId', formData.userId);


        if (!formData.userId) {
            toast.error('請先輸入UserId');
            return;
        }

        if (sseSource) {
            toast.error('建立新連線前，請先斷開連線');
            return;
        }

        const source = new EventSource(`${baseApiUrl}/sse?userId=${formData.userId}`)

        source.addEventListener('open', () => {
            console.log('Connection Opened')
            setPingList(['已建立連線，準備傳輸數據...'])
        })
        source.addEventListener('error', (e) => {
            console.log('Connection Error', e)
        })
        source.addEventListener('connected', (e) => {
            console.log('SSE 連接已建立', e)
            setSSESource(source)

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

    };

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


    const renderConnectionList  = () => {
        if(connectedUsers.length === 0){
            return <p>暫無連接用戶</p>;
        }

        return <Flex column className="align-items-start">
            <ul>
                {connectedUsers.map((user, idx) => (
                    <li key={idx}>{user}</li>
                ))}
            </ul>
        </Flex>
    }

    return (
        <Container fluid>
            <Row>
                <Col col="auto">
                    <Flex column className="gap-2">
                        <Flex className="gap-2">
                            <form onSubmit={LoginHookForm.handleSubmit(handleSubmitLoginHandler)}>
                                <Controller
                                    control={LoginHookForm.control}
                                    name="userId"
                                    defaultValue="tester"
                                    rules={{
                                        required: '請輸入帳號',
                                    }}
                                    render={({field, fieldState}) => {
                                        return <input
                                            {...field}
                                            placeholder="帳號"
                                            autoComplete="username"
                                            disabled={icConnected}
                                        />;
                                    }}
                                />

                                <button type="submit" className={clsx({'d-none': icConnected})}>建立連線</button>
                                <button type="button" onClick={closeConnection} className={clsx({'d-none': !icConnected})}>斷開連線</button>
                            </form>
                        </Flex>
                        <Flex column className="align-items-start">
                            <Flex className="align-items-center gap-2">
                                <div>連接用戶列表:</div>
                                <button type="button" onClick={getConnectedUsers}>
                                    Refresh
                                </button>
                            </Flex>
                            {renderConnectionList()}
                        </Flex>

                        <Flex column className="align-items-start">
                            <div>個別通知</div>
                            <select>
                                {connectedUsers.map((userId) => (
                                    <option value={userId} key={userId}>{userId}</option>
                                ))}
                            </select>
                        </Flex>
                        <div>個別通知</div>
                        <div>


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
                    </Flex>

                </Col>
                <Col col="auto" className="d-flex gap-2">

                </Col>
                <Col col>
                    <button type="button" onClick={triggerNotification}>
                        觸發全體通知
                    </button>

                </Col>
            </Row>

            <Row>
                <Col col>

                </Col>
            </Row>


            <div style={{ marginBottom: '20px' }}>

            </div>

            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>

            </div>

            <div style={{ marginBottom: '20px' }}>

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
        </Container>
    );
};

export default Dashboard;
