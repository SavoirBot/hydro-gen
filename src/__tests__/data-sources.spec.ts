import { Pipeline } from '../pipeline';
import { newDataSourcePipe, newParallelDataSourcePipe } from '../data-sources';

describe('newDataSourcePipe', () => {
  let mockPipeline: Pipeline;

  beforeEach(() => {
    mockPipeline = new Pipeline({});

    mockPipeline.addData = jest.fn();
  });

  it('Will trigger the fetching function when executed', async () => {
    const data = {};
    const fetchFunction = jest.fn(() => data);

    const pipe = newDataSourcePipe('test').fetch(fetchFunction);

    await pipe.execute(mockPipeline);

    expect(fetchFunction).toHaveBeenCalled();
    expect(mockPipeline.addData).toHaveBeenCalledWith('test', data);
  });

  it('Will trigger the processing function when executed', async () => {
    const data = {};
    const processFunction = jest.fn(data => data);

    const pipe = newDataSourcePipe('test')
      .fetch(() => data)
      .process(processFunction);

    await pipe.execute(mockPipeline);

    expect(processFunction).toHaveBeenCalledWith(data);
    expect(mockPipeline.addData).toHaveBeenCalledWith('test', data);
  });
});

describe('newParallelDataSourcePipe', () => {
  let mockPipeline: Pipeline;

  beforeEach(() => {
    mockPipeline = new Pipeline({});

    mockPipeline.addData = jest.fn();
  });

  it('Will trigger multiple data sources when executed', async () => {
    const data = {};
    const fetchFunction = jest.fn(() => data);

    const pipe = newParallelDataSourcePipe()
      .pipeSource(newDataSourcePipe('test-1').fetch(fetchFunction))
      .pipeSource(newDataSourcePipe('test-2').fetch(fetchFunction));

    await pipe.execute(mockPipeline);

    expect(fetchFunction).toHaveBeenCalledTimes(2);
    expect(mockPipeline.addData).toHaveBeenCalledWith('test-1', data);
    expect(mockPipeline.addData).toHaveBeenCalledWith('test-2', data);
  });
});
