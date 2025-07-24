import {Col, Container, Flex, Row} from '@acrool/react-grid';
import {toast} from '@acrool/react-toaster';
import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router';
import logger from "@acrool/js-logger";
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
    eventType: 'notification' | 'custom'
    selectedUserId: string
}

const logLevel = {
    log: logger.info,
    info: logger.info,
    warn: logger.warning,
    error: logger.danger,
}

const Client = () => {
    const {userId} = useParams<{ userId: string }>();
    const [messages, setMessages] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [clientCount, setClientCount] = useState(0);

    useEffect(() => {
        if (window.SharedWorker) {
            console.log('Connecting to SharedWorker...');
            try {
                const worker = new window.SharedWorker('/worker.js');
                console.log('SharedWorker created successfully');

                worker.port.start();
                console.log('SharedWorker port started');
                setIsConnected(true);

                worker.port.onmessage = function (e) {

                    const data = e.data;


                    if (e.type === 'message') {
                        if(e.data.type === 'logger'){
                            logLevel[data.level](`ShareWorker`, data.args);
                            return;
                        }

                        // 收到 SSE 廣播訊息
                        const message = e.data.message;
                        setMessages(prev => [...prev, message]);
                        toast.success(`收到新訊息: ${message}`);
                    }
                };

                worker.port.onmessageerror = function (e) {
                    console.log("Message error:", e);
                    logger.danger('SharedWorker 訊息錯誤');
                };

                // 可選：componentWillUnmount 時關閉 port
                return () => {
                    console.log('Disconnecting from SharedWorker...');
                    worker.port.close();
                };
            } catch (error) {
                console.error('Error creating SharedWorker:', error);
                logger.danger('建立 SharedWorker 失敗');
            }
        } else {
            logger.danger('不能使用 shareWorker');
            // 採用 fallback（如 BroadcastChannel 或 DedicatedWorker）
        }
    }, []);

    const handleReconnect = () => {
        if (window.SharedWorker) {
            const worker = new window.SharedWorker('/worker.js');
            worker.port.start();
            worker.port.postMessage('RECONNECT');
        }
    };

    return (
        <Container fluid>
            <Row>
                <Col col={12} md>
                    <Flex column className="align-items-start mb-10">
                        <h3>SharedWorker 狀態:</h3>
                        <Flex column className="align-items-start mb-10 text-left">
                            <p>SharedWorker 支援: {isEmpty(window.SharedWorker) ? '無' : '有'}</p>
                            <p>連接狀態: {isConnected ? '已連接' : '未連接'}</p>
                            <p>已接收訊息數: {messages.length}</p>
                            <button onClick={handleReconnect} className="btn btn-primary">
                                重新連接 SSE
                            </button>
                        </Flex>
                    </Flex>
                </Col>

                <Col col={12} md>
                    <Flex column className="align-items-start mb-10">
                        <h3>SSE 訊息:</h3>
                        <Flex column className="align-items-start mb-10 text-left">
                            {messages.length === 0 ? (
                                <p>尚未收到任何訊息</p>
                            ) : (
                                <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                                    {messages.map((msg, index) => (
                                        <div key={index} style={{
                                            padding: '8px',
                                            margin: '4px 0',
                                            backgroundColor: '#f5f5f5',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}>
                                            <strong>[{new Date().toLocaleTimeString()}]</strong> {msg}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Flex>
                    </Flex>
                </Col>
            </Row>
        </Container>
    );
};

export default Client;
