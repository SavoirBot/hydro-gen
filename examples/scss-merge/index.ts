import sass from 'node-sass';

import { newPipeline, newPagePipe, newAssetPipe } from '@savoirbot/hydro-gen';

const pipeline = newPipeline({ root: './temp' })
  .pipe(
    newPagePipe()
      .identify(() => ['/'])
      .generate(path => ({
        url: path,
        content:
          '<html><head><link rel="stylesheet" href="./index.css" /></head><body><h1>Hello, World!</h1></body></html>',
      }))
  )
  .pipe(
    newAssetPipe()
      .collect(() => './**.scss')
      .processAll(files => {
        const content = sass.renderSync({
          data: files.map(file => file.content).join('\n'),
        });

        return {
          path: '/',
          filename: 'index.css',
          content: content.css.toString(),
        };
      })
  );

pipeline.execute();
