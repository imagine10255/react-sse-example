import {createBrowserRouter} from 'react-router';

import Home from '@/views/Home';
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
            {index: true, Component: withSSEProviders(Home)},
        ],
    },
    {
        path: 'fetch/:userId?',
        children: [
            {index: true, Component: withFetchProviders(Home)},
        ],
    },
]);


export default routes;
