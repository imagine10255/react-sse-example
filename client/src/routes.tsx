import {createBrowserRouter} from 'react-router';

import Dashboard from '@/views/Dashboard';
import Fetch from '@/views/Fetch';

const routes = createBrowserRouter([
    {
        path: ':userId?',
        children: [
            {index: true, Component: Dashboard},
        ],
    },
    {
        path: 'fetch/:userId?',
        children: [
            {index: true, Component: Fetch},
        ],
    },
]);


export default routes;
