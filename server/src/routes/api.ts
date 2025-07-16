import { Router } from 'express';
import {SSEController} from '../controllers/SSEController';
import {objectKeys} from "@acrool/js-utils/object";

const router = Router();


objectKeys(SSEController).forEach(path => {
    const config = SSEController[path];
    if(config){
        router[config.method](path, config.func);
    }
})

export default router;
