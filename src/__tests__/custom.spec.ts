import { Pipeline } from '../pipeline';
import { newCustomPipe } from '../custom';
import { newDataSourcePipe } from '../data-sources';

describe('newCustomPipe', () => {
  const mockData = {
    styles: {
      original: './temp/test/*.css',
      path: '/',
      filename: 'processed.css',
      content: 'test',
    },
  };

  let mockPipeline: Pipeline;

  beforeEach(async () => {
    mockPipeline = new Pipeline({ root: './temp/test' });

    mockPipeline.getData = jest.fn(() => mockData);
  });

  it('Will inject data when executed', async () => {
    const pipe = newCustomPipe().inject('test');

    await pipe.execute(mockPipeline);

    expect(mockPipeline.getData).toHaveBeenCalledWith('test');
  });

  it('Will inject data using the datasource rather than the name', async () => {
    const dataSource = newDataSourcePipe('test').fetch(() => mockData);

    const pipe = newCustomPipe().inject(dataSource);

    await pipe.execute(mockPipeline);

    expect(mockPipeline.getData).toHaveBeenCalledWith('test');
  });

  it('Will run commands from data', async () => {
    const command = jest.fn();

    const pipe = newCustomPipe().inject('test').command(command);

    await pipe.execute(mockPipeline);

    expect(command).toHaveBeenCalledWith(mockData);
  });
});
