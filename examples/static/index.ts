import { newPipeline, newPagePipe } from '@savoirbot/hydro-gen';

const pipeline = newPipeline({ root: './temp' }).pipe(
  newPagePipe()
    .identify(() => ['/'])
    .generate(path => ({
      url: path,
      content: '<html><body><h1>Hello, World!</h1></body></html>',
    }))
);

pipeline.execute();
