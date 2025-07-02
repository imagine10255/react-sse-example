import '@acrool/react-grid/dist/index.css';
import '@acrool/react-dialog/dist/index.css';
import '@acrool/react-block/dist/index.css';
import '@acrool/react-toaster/dist/index.css';
import './index.css';

import {GridThemeProvider} from '@acrool/react-grid';
import composedProviders, {providerWithProps} from '@acrool/react-providers';
import {createElement} from 'react';
import ReactDOM from 'react-dom/client';

import ReactLocaleProvider from '@/library/acrool-react-locale';

import App from './App';
import {gridConfig} from './setup';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    createElement(composedProviders(
        [
            providerWithProps(ReactLocaleProvider, {}),
            providerWithProps(GridThemeProvider, {gridTheme: gridConfig}),
        ]
    )(App))
);
