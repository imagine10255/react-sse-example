import {block} from '@acrool/react-block';
import {Col, Container, Flex, Row} from '@acrool/react-grid';
import {useLocale} from '@acrool/react-locale';
import {toast} from '@acrool/react-toaster';
import React, {useCallback, useEffect, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router';
import {Controller, SubmitHandler, useForm} from "react-hook-form";
import clsx from 'clsx';
import {isEmpty} from "@acrool/js-utils/equal";



/**
 * Login
 */
interface ILoginForm {
    userId: string
}

/**
 * Message
 */
interface IMessageForm {
    message: string
    eventType: 'notification'|'custom'
}

const baseApiUrl = `${window.location.protocol}//${window.location.hostname}:8081`;

const Dashboard = () => {
    const {userId} = useParams<{userId: string}>();
    const [sseSource, setSSESource] = useState<EventSource|null>(null)

    const [pingList, setPingList] = useState<string[]>([])
    const [customList, setCustomList] = useState<string[]>([])

    const [notifications, setNotifications] = useState<string[]>([])
    const [connectedUsers, setConnectedUsers] = useState<string[]>([])

    const [activeUserId, setActiveUserId] = useState<string|null>(null)



    const LoginHookForm = useForm<ILoginForm>({
        defaultValues: {
            userId,
        }
    });
    const MessageHookForm = useForm<IMessageForm>({
        defaultValues: {
            eventType: 'notification',
            message: '',
        }
    });

    const icConnected = LoginHookForm.formState.isSubmitting || !!sseSource

    useEffect(() => {
        window.addEventListener('beforeunload', closeConnection);

        return () => {
            window.removeEventListener('beforeunload', closeConnection);
            closeConnection()
        }
    }, [])


    /**
     * 送出登入表單
     * @param formData
     */
    const handleSubmitLoginHandler: SubmitHandler<ILoginForm> = formData => {
        // block.show();

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
            setPingList(['已建立連線，準備傳輸數據...'])
        })
        source.addEventListener('error', (e) => {
            console.log('Connection Error', e)
        })
        source.addEventListener('connected', (e) => {
            console.log('SSE 連接已建立', e)
            setSSESource(source)
            getConnectedUsers();

            const data = JSON.parse(e.data)
            setPingList((prev) => [...prev, `連線確認: ${data.message}`])
        })
        source.addEventListener('ping', (e) => {
            console.log(e)
            setPingList((prev) => [...prev, e.data])
        })
        source.addEventListener('custom', (e) => {
            const data = JSON.parse(e.data)
            setCustomList((prev) => [...prev, `${data.message} (${data.timestamp})`])
        })
        source.addEventListener('notification', (e) => {
            const data = JSON.parse(e.data)
            setNotifications((prev) => [...prev, `${data.message} (${data.timestamp})`])
        })

    };

    /**
     * 送出訊息表單 (個別訊息)
     * @param formData
     */
    const handleSubmitMessageHandler: SubmitHandler<IMessageForm> = async formData => {
        // block.show();

        if (isEmpty(formData.message)) {
            toast.error('請先輸入訊息');
            return;
        }
        if (!activeUserId) {
            toast.warning(`請選擇目標User`);
            return;
        }

        try {
            const response = await fetch(`${baseApiUrl}/notifyUser`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: activeUserId,
                    message: formData.message,
                    eventType: formData.eventType,
                })
            })
            const result = await response.json()

            if (result.success) {
                toast.success(`個別通知結果成功: ${result.message}`);
                return;
            }
            toast.error(`個別通知結果失敗: ${result.message}`);
        } catch (error) {
            console.error('個別通知失敗:', error)
            toast.error('個別通知失敗，請檢查伺服器狀態');
        }

    };

    /**
     * 關閉連線
     */
    const closeConnection = () => {
        if (sseSource) {
            sseSource.close()
            setSSESource(null)
            setPingList(['已關閉連線'])
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
     * 廣播全體使用者訊息
     */
    const triggerNotification = async () => {
        try {
            const userId = LoginHookForm.getValues('userId');

            const response = await fetch(`${baseApiUrl}/trigger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `由${userId}發起廣播 - ${new Date().toISOString()}`,
                    eventType: 'notification'
                })
            })
            const result = await response.json()
            toast.success(`發送成功: ${result.message}`);
        } catch (error) {
            toast.error(`發送失敗，請檢查伺服器狀態`);
        }
    }


    /**
     * 渲染連線列表
     */
    const renderConnectionList  = () => {
        if(connectedUsers.length === 0){
            return <p>No users</p>;
        }

        return <Flex column className="align-items-start">
            <ul>
                {connectedUsers.map((userId, idx) => (
                    <li key={idx} onClick={() => setActiveUserId(userId)}>
                        <span className="mr-2">{userId}</span>
                        <span>{activeUserId === userId ? '🤛': ''}</span>
                    </li>
                ))}
            </ul>
        </Flex>
    }


    /**
     * 渲染 Ping 訊息
     */
    const renderPingMessage = () => {

        if(pingList.length === 0){
            return <div>No message</div>
        }

        return <Flex column className="align-items-start text-left">
            <ul>
                {pingList.map((item, index) => (
                    <li key={item + index}>{item}</li>
                ))}
            </ul>
        </Flex>
    }

    /**
     * 渲染 通知 訊息
     */
    const renderNotificationsMessage = () => {

        if(pingList.length === 0){
            return <div>No message</div>
        }

        return <Flex column className="align-items-start">
            <ul>
            {notifications.map((item, index) => (
                <li key={item + index} style={{ color: '#588e56' }}>{item}</li>
            ))}
            </ul>
        </Flex>
    }

    /**
     * 渲染 通知 訊息
     */
    const renderCustomMessage = () => {

        if(pingList.length === 0){
            return <div>No message</div>
        }

        return <Flex column className="align-items-start">
            <ul>
            {customList.map((item, index) => (
                <li key={item + index} style={{ color: '#4485bb' }}>{item}</li>
            ))}
            </ul>
        </Flex>
    }

    return (
        <Container fluid>
            <Row>
                <Col col={12} md="auto">
                    <Flex column className="gap-2">
                        <Flex className="gap-2 mb-10">
                            <form onSubmit={LoginHookForm.handleSubmit(handleSubmitLoginHandler)}>
                                <Controller
                                    control={LoginHookForm.control}
                                    name="userId"
                                    defaultValue=""
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



                        <Flex column className="align-items-start mb-10">
                            <Flex className="align-items-center gap-2">
                                <h3>連接用戶列表:</h3>
                                <button type="button" onClick={getConnectedUsers}>
                                    重整
                                </button>
                            </Flex>
                            {renderConnectionList()}
                        </Flex>

                        <Flex column className="gap-2 mb-10">

                            <form onSubmit={MessageHookForm.handleSubmit(handleSubmitMessageHandler)}>

                                <Controller
                                    control={MessageHookForm.control}
                                    name="message"
                                    defaultValue=""
                                    rules={{
                                        required: '請輸入訊息',
                                    }}
                                    render={({field, fieldState}) => {
                                        return <input
                                            {...field}
                                            placeholder="輸入通知訊息"
                                            autoComplete="username"
                                        />;
                                    }}
                                />

                                <Controller
                                    control={MessageHookForm.control}
                                    name="eventType"
                                    defaultValue="notification"
                                    rules={{
                                        required: '請選擇類型',
                                    }}
                                    render={({field, fieldState}) => {
                                        return <select
                                            {...field}>
                                            <option value="notification">Notification</option>
                                            <option value="custom">Custom</option>
                                        </select>;
                                    }}
                                />


                                <button type="submit">
                                    發送個別通知
                                </button>

                                <button type="button" onClick={triggerNotification}>
                                    廣播通知
                                </button>
                            </form>
                        </Flex>

                        <Flex column className="align-items-start mb-10">
                            <h3>Ping 訊息:</h3>
                            {renderPingMessage()}
                        </Flex>
                    </Flex>

                </Col>

                <Col col={12} md>

                    <Flex column className="align-items-start mb-10">
                        <h3>通知訊息:</h3>
                        <Flex column className="align-items-start mb-10 text-left">
                            {renderNotificationsMessage()}
                        </Flex>
                    </Flex>
                </Col>

                <Col col={12} md>

                    <Flex column className="align-items-start mb-10">
                        <h3>客製訊息:</h3>
                        <Flex column className="align-items-start mb-10 text-left">
                            {renderCustomMessage()}
                        </Flex>
                    </Flex>
                </Col>
            </Row>


        </Container>
    );
};

export default Dashboard;
