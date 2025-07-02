import {createBrowserRouter} from 'react-router';

import Dashboard from '@/views/Dashboard';

const routes = createBrowserRouter([
    {
        path: ':userId?',
        children: [
            {index: true, Component: Dashboard},
        ],
    },
]);


export default routes;
