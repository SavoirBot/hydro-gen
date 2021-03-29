import { newPipeline, newParallelDataSourcePipe, newDataSourcePipe, newPagePipe } from '@savoirbot/hydro-gen';

const APIData = [
  {
    configuration: {
      path: '/some/test',
    },
    title: 'Some test',
    content: 'Some test',
  },
  {
    configuration: {
      path: '/some/other/test',
    },
    title: 'Some other test',
    content: 'Some other test',
  },
];

interface PipelineData {
  api1Data: typeof APIData[0][];
  api2Data: typeof APIData[1][];
}

const pipeline = newPipeline({ root: './temp' })
  .pipe(
    newParallelDataSourcePipe()
      .pipeSource(
        newDataSourcePipe('api-1')
          .fetch(() => ({ api1Data: [APIData[0]] }))
          .process(data => data)
      )
      .pipeSource(
        newDataSourcePipe('api-2')
          .fetch(() => ({ api2Data: [APIData[1]] }))
          .process(data => data)
      )
  )
  .pipe(
    newPagePipe()
      .inject('api-1')
      .inject('api-2')
      .identify<PipelineData>(data => [...data.api1Data, ...data.api2Data].map(data => data.configuration.path))
      .select(/.*/)
      .generate<PipelineData>(async (path, data) => {
        const page = [...data.api1Data, ...data.api2Data].find(el => el.configuration.path === path);

        if (!page) {
          return null;
        }

        return {
          url: path,
          content: `${page.title}\n\n${page.content}`,
        };
      })
  );

pipeline.execute();
