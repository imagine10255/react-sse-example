
let response = null;
const clients = [];

console.log('SharedWorker started');

// shared-worker.js
self.onerror = (event) => {
    // 這裡 event.message, event.filename, event.lineno 都可以幫助你定位錯誤
    console.error('[SharedWorker error]', event.message, 'at', event.filename + ':' + event.lineno);
};
self.onconnect = async (e) => {

    const port = e.ports[0];
    clients.push(port);
    console.log('Client connected, total clients:', clients.length);

    // 重写 console.log / error
    ['log','info','warn','error'].forEach(level => {
        const orig = console[level];
        console[level] = (...args) => {
            orig(...args);           // 如果 DevTools 支持，也会在 Worker console 里显示
            port.postMessage({      // 再把信息发给主线程
                __log: true,
                level,
                args
            });
        };
    });


    // 發送連接確認訊息給 client
    port.postMessage('hello');

    // 第一次有 client 連進來時，才建立 SSE 連線
    if (!response) {
        console.log('Creating SSE connection...');

        // 使用相對路徑或完整的 URL
        const sseUrl = 'https://localhost:9081/api/sse/subscribe';
        console.log('SSE URL:', sseUrl);

        const userId = 'shareUser'
        try {
            const controller = new AbortController();
            response = await fetch(`${sseUrl}?userId=${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${userId}`,
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                },
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            // setState(prev => ({
            //     ...prev,
            //     pingList: ['已建立連線，準備傳輸數據...'],
            //     sseSource: reader
            // }));

            // await refreshConnectedUsers();

            // 處理流式數據
            const processStream = async () => {
                try {
                    while (true) {
                        const {done, value} = await reader.read();

                        if (done) {
                            console.log('Stream complete');

                            break;
                        }

                        const chunk = new TextDecoder().decode(value);
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('event: ')) {
                                const eventType = line.substring(7);
                                continue;
                            }

                            if (line.startsWith('data: ')) {
                                const data = line.substring(6);
                                const decodeData = JSON.parse(data.toString());

                                // 轉推給各個分頁
                                port.postMessage(decodeData);
                            }
                        }
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log('Stream aborted');

                    } else {
                        console.log(`Stream processing error: ${error.message}`);

                    }
                }
            };

            processStream();
        } catch (error) {
            // toast.error(`連接失敗，請檢查伺服器狀態 ${(error).message}`);
            // setState(prev => ({
            //     ...prev,
            //     isConnected: false,
            //     abortController: null
            // }));
        }
    }

    // 處理 client 傳來的訊息（如手動重連）
    // port.onmessage = (msg) => {
    //     console.log('Received message from client:', msg.data);
    //     if (msg.data === 'RECONNECT') {
    //         if (es) {
    //             es.close();
    //             es = null;
    //         }
    //         // 重新建立 SSE 連線
    //         if (!es) {
    //             console.log('Reconnecting SSE...');
    //             const sseUrl = 'http://localhost:8081/api/sse/subscribe';
    //             try {
    //                 es = new EventSource(sseUrl);
    //                 es.onmessage = (ev) => {
    //                     for (const p of clients) {
    //                         try {
    //                             p.postMessage({ type: 'SSE_EVENT', data: ev.data, id: ev.lastEventId });
    //                         } catch (error) {
    //                             console.log('Error posting message to client:', error);
    //                         }
    //                     }
    //                 };
    //                 es.onerror = () => {
    //                     es.close();
    //                     es = null;
    //                 };
    //             } catch (error) {
    //                 console.log('Error reconnecting SSE:', error);
    //             }
    //         }
    //     }
    // };

    port.start();
};
