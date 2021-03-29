import React from 'react';
import { Switch, Route, Link } from 'react-router-dom';

const SomeTest: React.FunctionComponent = () => (
  <div>
    <h1>Some test</h1>
    <p>Some test</p>
  </div>
);

const SomeOtherTest: React.FunctionComponent = () => (
  <div>
    <h1>Some other test</h1>
    <p>Some other test</p>
  </div>
);

export const App: React.FunctionComponent = () => (
  <div>
    <nav>
      <ul>
        <li>
          <Link to="/some/test">
            Some test
          </Link>
        </li>
        <li>
          <Link to="/some/other/test">
            Some other test
          </Link>
        </li>
      </ul>
    </nav>
    <Switch>
      <Route path="/some/test">
        <SomeTest />
      </Route>
      <Route path="/some/other/test">
        <SomeOtherTest />
      </Route>
    </Switch>
  </div>
);
