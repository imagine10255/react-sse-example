import {createBrowserRouter} from 'react-router';

import Home from '@/views/Home';
import {SSEFetchProvider} from "@/providers/SSEProvider/SSEFetchProvider";
import {SSEEventProvider} from "@/providers/SSEProvider/SSEEventProvider";
import Share from "@/views/Share";


const withFetchProviders = (Component: React.FC) => (props) => (
    <SSEFetchProvider>
        <Component {...props} />
    </SSEFetchProvider>
);
const withSSEProviders = (Component: React.FC) => (props) => (
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
    {
        path: 'share',
        children: [
            {index: true, Component: Share},
        ],
    },
]);


export default routes;
