import {createBrowserRouter} from 'react-router';

import Dashboard from '@/views/Dashboard';
import Fetch from '@/views/Fetch';
import {SSEFetchProvider} from "@/providers/SSEProvider";
import {SSEEventProvider} from "@/providers/SSEProvider/SSEEventProvider";


const withFetchProviders = (Component) => (props) => (
    <SSEFetchProvider>
        <Component {...props} />
    </SSEFetchProvider>
);
const withSSEProviders = (Component) => (props) => (
    <SSEEventProvider>
        <Component {...props} />
    </SSEEventProvider>
);

const routes = createBrowserRouter([
    {
        path: 'event/:userId?',
        children: [
            {index: true, Component: withSSEProviders(Fetch)},
        ],
    },
    {
        path: 'fetch/:userId?',
        children: [
            {index: true, Component: withFetchProviders(Fetch)},
        ],
    },
]);


export default routes;
