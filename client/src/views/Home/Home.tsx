import {Col, Container, Flex, Row} from '@acrool/react-grid';
import {toast} from '@acrool/react-toaster';
import React from 'react';
import {useParams} from 'react-router';
import {Controller, SubmitHandler, useForm} from "react-hook-form";
import clsx from 'clsx';
import {isEmpty} from "@acrool/js-utils/equal";
import { useSSEConnection, useSSEMessage, useSSEMessages } from '@/providers/SSEProvider';

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
    selectedUserId: string
}

const Home = () => {
    const {userId} = useParams<{userId: string}>();

    // 使用封裝的 SSE hooks
    const { isConnecting, connect, disconnect, isConnected } = useSSEConnection();
    const { isSending, sendMessage, broadcastMessage } = useSSEMessage();
    const {
        pingMessages,
        customMessages,
        notificationMessages,
        connectedUsers,
        refreshConnectedUsers
    } = useSSEMessages();

    const LoginHookForm = useForm<ILoginForm>({
        defaultValues: {
            userId,
        }
    });
    const MessageHookForm = useForm<IMessageForm>({
        defaultValues: {
            eventType: 'notification',
            message: '',
            selectedUserId: '',
        }
    });

    /**
     * 送出登入表單
     * @param formData
     */
    const handleSubmitLoginHandler: SubmitHandler<ILoginForm> = async formData => {
        if (!formData.userId) {
            toast.error('請先輸入UserId');
            return;
        }

        await connect(formData.userId);
    };

    /**
     * 送出訊息表單 (個別訊息)
     * @param formData
     */
    const handleSubmitMessageHandler: SubmitHandler<IMessageForm> = async formData => {
        if (isEmpty(formData.message)) {
            toast.error('請先輸入訊息');
            return;
        }
        if (!formData.selectedUserId) {
            toast.warning(`請選擇目標User`);
            return;
        }

        await sendMessage(formData.selectedUserId, formData.message, formData.eventType);
    };

    /**
     * 關閉連線
     */
    const closeConnection = () => {
        disconnect();
    }

    /**
     * 廣播全體使用者訊息
     */
    const triggerNotification = async () => {
        const userId = LoginHookForm.getValues('userId');
        await broadcastMessage(`由${userId}發起廣播`);
    }

    /**
     * 渲染連線列表
     */
    const renderConnectionList  = () => {
        if(connectedUsers.length === 0){
            return <p>No users</p>;
        }

        return <Flex column className="align-items-start">
            <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                {connectedUsers.map((userId, idx) => {
                    const id = `active_${userId}`;

                    return <li key={idx}>
                        <label htmlFor={id}>
                            <span className="mr-2">
                                <Controller
                                    control={MessageHookForm.control}
                                    name="selectedUserId"
                                    render={({field}) => (
                                        <input
                                            type="radio"
                                            name="activeId"
                                            id={id}
                                            value={userId}
                                            checked={field.value === userId}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                            }}
                                        />
                                    )}
                                />
                            </span>
                            <span className="mr-2">{userId}</span>
                        </label>
                    </li>;
                })}
            </ul>
        </Flex>
    }

    /**
     * 渲染 Ping 訊息
     */
    const renderPingMessage = () => {
        if(pingMessages.length === 0){
            return <div>No message</div>
        }

        return <Flex column className="align-items-start text-left">
            <ul>
                {pingMessages.map((item, index) => (
                    <li key={item + index}>{item}</li>
                ))}
            </ul>
        </Flex>
    }

    /**
     * 渲染 通知 訊息
     */
    const renderNotificationsMessage = () => {
        if(notificationMessages.length === 0){
            return <div>No message</div>
        }

        return <Flex column className="align-items-start">
            <ul>
            {notificationMessages.map((item, index) => (
                <li key={item + index} style={{ color: '#588e56' }}>{item}</li>
            ))}
            </ul>
        </Flex>
    }

    /**
     * 渲染 自定義 訊息
     */
    const renderCustomMessage = () => {
        if(customMessages.length === 0){
            return <div>No message</div>
        }

        return <Flex column className="align-items-start">
            <ul>
            {customMessages.map((item, index) => (
                <li key={item + index} style={{ color: '#4485bb' }}>{item}</li>
            ))}
            </ul>
        </Flex>
    }

    return (
        <Container fluid>
            <Row>
                <Col col={12} md>
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
                                            disabled={isConnected}
                                        />;
                                    }}
                                />

                                <button
                                    type="submit"
                                    className={clsx({'d-none': isConnected})}
                                    disabled={isConnecting}
                                >
                                    {isConnecting ? '連接中...' : '建立連線'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeConnection}
                                    className={clsx({'d-none': !isConnected})}
                                >
                                    斷開連線
                                </button>
                            </form>
                        </Flex>

                        <Flex column className="align-items-start mb-10">
                            <Flex className="align-items-center gap-2">
                                <h3>連接用戶列表:</h3>
                                <button type="button" onClick={refreshConnectedUsers}>
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

                                <button type="submit" disabled={isSending}>
                                    {isSending ? '發送中...' : '發送個別通知'}
                                </button>

                                <button type="button" onClick={triggerNotification} disabled={isSending}>
                                    {isSending ? '發送中...' : '廣播通知'}
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
                        <h3>Notifications:</h3>
                        <Flex column className="align-items-start mb-10 text-left">
                            {renderNotificationsMessage()}
                        </Flex>
                    </Flex>
                </Col>

                <Col col={12} md>
                    <Flex column className="align-items-start mb-10">
                        <h3>Customer:</h3>
                        <Flex column className="align-items-start mb-10 text-left">
                            {renderCustomMessage()}
                        </Flex>
                    </Flex>
                </Col>
            </Row>
        </Container>
    );
};

export default Home;
