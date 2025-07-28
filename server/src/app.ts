import express from 'express';
import apiRouter from './routes/api';
import ngrok from 'ngrok';
import fs from 'fs';
import https from 'https';

const app = express();
// 優先使用環境變數PORT，然後是命令列參數，最後是預設值8081
const PORT = process.env.PORT || 8081;

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

app.use(express.json());

app.use('/api/sse', apiRouter);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// app.listen(PORT, () => {
//     console.log(`Listen Port:${PORT}`);
// });


// Load the HTTPS certificate and key
// const options = {
//     key: fs.readFileSync('localhost+3-key.pem'),
//     cert: fs.readFileSync('localhost+3.pem'),
// };
//
// https.createServer(options, app).listen(9081, () => {
//     console.log(`Listen Port:9081`);
// });


app.listen(PORT, async () => {
    console.log(`App listening on http://localhost:${PORT}`);

    try {
        const url = await ngrok.connect({
            addr: PORT,
            // authtoken: process.env.NGROK_AUTH_TOKEN, // 如果你设置了环境变量
            authtoken: '278tK5Mg3V3PLGQsx2ruAxu5XRC_565bwZHerepd6RJqzmMv3', // 如果你设置了环境变量
            // subdomain: 'sse',
            // region: 'us', // 可选：指定隧道区域
        });
        console.log(`ngrok tunnel opened at ${url}`);
    } catch (err) {
        console.error('Error starting ngrok:', err);
    }
});
