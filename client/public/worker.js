let SSEResponse = null;
const clients = [];

console.log('SharedWorker started');


// 第一次有 client 連進來時，才建立 SSE 連線
// const sseUrl = 'https://localhost:9081/api/sse/subscribe';
const sseUrl = 'https://192.168.34.47:9081/api/sse/subscribe';


/**
 * 解析 decodeSSEMessage
 * @param sseValue
 */
function decodeSSEMessage(sseValue) {
    const chunk = new TextDecoder().decode(sseValue);
    const lines = chunk.split('\n');

    let eventBuffer = {};
    for (const line of lines) {

        if (line.startsWith('id: ')) {
            const match = line.match(/^(\w+):\s?(.*)$/);
            if (match) eventBuffer.id = match[2];
        }
        if (line.startsWith('event: ')) {
            const match = line.match(/^(\w+):\s?(.*)$/);
            if (match) eventBuffer.event = match[2];
        }
        if (line.startsWith('data: ')) {
            const match = line.match(/^(\w+):\s?(.*)$/);
            if (match) eventBuffer.data = JSON.parse(match[2]);
        }
    }
    return eventBuffer;
}


/**
 * 處理流式數據
 * @returns {Promise<void>}
 */
const processStream = async (reader) => {
    try {
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            const eventBuffer = decodeSSEMessage(value);
            // 廣播給所有 clients
            for (const port of clients) {
                port.postMessage(eventBuffer.data);
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Stream aborted');

        } else {
            console.error(`Stream processing error: ${error.message}`);

        }
    }
};

// shared-worker.js
self.onerror = (event) => {
    // 這裡 event.message, event.filename, event.lineno 都可以幫助你定位錯誤
    console.error('[SharedWorker error]', event.message, 'at', event.filename + ':' + event.lineno);
};

self.onconnect = async (e) => {
    const port = e.ports[0];

    // 重寫 console，讓子頁也可以看到
    ['log','info','warn','error'].forEach(level => {
        const orig = console[level];
        console[level] = (...args) => {
            orig(...args);
            port.postMessage({
                type: 'logger',
                level,
                args
            });
        };
    });


    clients.push(port);
    console.log('Client connected, total clients:', clients.length);


    port.onmessage = (event) => {
        if (event.data === 'disconnect') {
            // 從 clients 移除該 port
            const idx = clients.indexOf(port);
            if (idx !== -1) clients.splice(idx, 1);
            console.log('Client disconnected, total clients:', clients.length);
        }
    };


    // 發送連接確認訊息給 client
    port.postMessage({message: `hello ShareWorker ${SSEResponse ? '':'[Init]'}`});

    if(SSEResponse) return;

    console.log(`Creating SSE connection...${sseUrl}`);

    const userId = 'shareUser'
    const controller = new AbortController();
    SSEResponse = await fetch(`${sseUrl}?userId=${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${userId}`,
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
    });

    if (!SSEResponse.ok) throw new Error(`HTTP error! status: ${response.status}`);
    if (!SSEResponse.body) throw new Error('Response body is null');

    const reader = SSEResponse.body.getReader();
    processStream(reader);


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

