import browserify from 'browserify';
import tsify from 'tsify';

import { newPipeline, newPagePipe, newAssetPipe } from '@savoirbot/hydro-gen';

import { renderApp } from './src/server';

const pageTemplate = (content: string): string => `<html>
  <body>
    <div id="app">${content}</div>
    <script type="text/javascript" src="/index.js"/>
  </body>
</html>`;

const pipeline = newPipeline({ root: './temp' })
  .pipe(
    newPagePipe()
      .identify(() => ['/some/test', '/some/other/test'])
      .generate(path => ({
        url: path,
        content: pageTemplate(renderApp(path)),
      }))
  )
  .pipe(
    newAssetPipe()
      .collect(() => 'src/client.tsx')
      .processAll(async files => {
        const file = files[0];
        const result: string = await new Promise(resolve =>
          browserify(`${file.path}/${file.filename}${file.extension}`)
            .plugin(tsify, {
              project: './tsconfig.compile.json',
            })
            .transform('babelify', { extensions: ['.tsx', '.ts'] })
            .bundle((_, src) => {
              resolve(src.toString());
            })
        );

        return {
          path: '/',
          filename: 'index.js',
          content: result,
        };
      })
  );

pipeline.execute();
