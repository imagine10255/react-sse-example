import {createBrowserRouter} from 'react-router';

import Home from '@/views/Home';
import {SSEFetchProvider} from "@/providers/SSEProvider/SSEFetchProvider";
import {SSEEventProvider} from "@/providers/SSEProvider/SSEEventProvider";
import {SSEFetchBroadcastChannelProvider} from "@/providers/SSEProvider/SSEFetchBroadcastChannelProvider";
import Share from "@/views/Share";
import Frame from "@/views/Frame";


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
const withBroadcastChannelProviders = (Component: React.FC) => (props) => (
    <SSEFetchBroadcastChannelProvider>
        <Component {...props} />
    </SSEFetchBroadcastChannelProvider>
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
        path: 'broadcast/:userId?',
        children: [
            {index: true, Component: withBroadcastChannelProviders(Home)},
        ],
    },
    {
        path: 'share',
        children: [
            {index: true, Component: Share},
        ],
    },
    {
        path: 'frame/:userId?',
        children: [
            {index: true, Component: Frame},
        ],
    },
]);


export default routes;
