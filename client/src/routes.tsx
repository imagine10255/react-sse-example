import {createBrowserRouter} from 'react-router';

import Dashboard from '@/views/Dashboard';
import Login from '@/views/Login';

const routes = createBrowserRouter([
    {
        path: '/sign',
        children: [
            {path: 'login', Component: Login},
        ],
    },
    {
        path: '/',
        children: [
            {index: true, Component: Dashboard},
        ],
    },
]);


export default routes;
