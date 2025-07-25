import path from 'node:path';

import react from '@vitejs/plugin-react-swc';
import {defineConfig} from 'vite';
import svgr from 'vite-plugin-svgr';
import mkcert from'vite-plugin-mkcert';

const enableSSL: boolean = false;


// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        svgr(),
        enableSSL ? mkcert(): undefined,
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        }
    },
    server: {
        port: 1182,
        https: enableSSL,
        host: '0.0.0.0', // for debug
    },
});
