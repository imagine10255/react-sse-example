import express from 'express';
import apiRouter from './routes/api';

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

app.listen(PORT, () => {
    console.log(`Listen Port:${PORT}`);
});
