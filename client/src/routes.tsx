import {createBrowserRouter} from 'react-router';

import Home from '@/views/Home';
import {SSEFetchProvider} from "@/providers/SSEProvider/SSEFetchProvider";
import {SSEEventProvider} from "@/providers/SSEProvider/SSEEventProvider";
// import Share from './views/Share';
import Client from "@/views/Share/Client";


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
            {index: true, Component: withSSEProviders(Home)},
        ],
    },
    {
        path: 'fetch/:userId?',
        children: [
            {index: true, Component: withFetchProviders(Home)},
        ],
    },
    // {
    //     path: 'share',
    //     children: [
    //         {index: true, Component: Share},
    //     ],
    // },
    {
        path: 'client',
        children: [
            {index: true, Component: Client},
        ],
    },
]);


export default routes;
