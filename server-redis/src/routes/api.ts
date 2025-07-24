import { Router } from 'express';
import {SSEController} from '../controllers/SSEController';
import {objectKeys} from "@acrool/js-utils/object";

const router = Router();

// 處理動態路由和靜態路由
objectKeys(SSEController).forEach(path => {
    const config = SSEController[path];
    if(config){
        if (path.includes(':')) {
            // 動態路由，需要特殊處理
            const routePath = path.replace(':userId', ':userId');
            router[config.method](routePath, config.func);
        } else {
            // 靜態路由
            router[config.method](path, config.func);
        }
    }
})

export default router;
