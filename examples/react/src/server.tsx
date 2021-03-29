import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import { App } from './app';

export const renderApp = (path: string): string =>
  ReactDOMServer.renderToString(
    <StaticRouter location={path}>
      <App />
    </StaticRouter>
  );
