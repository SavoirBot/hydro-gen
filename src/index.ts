import {
  newDataSourcePipe,
  newParallelDataSourcePipe,
  FetchFunction as DataFetchFunction,
  ProcessFunction as DataProcessFunction,
} from './data-sources';
import {
  newPagePipe,
  IdentificationFunction as PageIdentificationFunction,
  ProcessFunction as PageProcessFunction,
} from './pages';
import {
  newAssetPipe,
  IdentificationFunction as AssetIdentificationFunction,
  ProcessEachFunction as AssetProcessEachFunction,
  ProcessAllFunction as AssetProcessAllFunction,
} from './assets';
import { newCustomPipe, ExecutionFunction as CustomExecutionFunction } from './custom';
import { newPipeline } from './pipeline';

export {
  newPipeline,
  newDataSourcePipe,
  newParallelDataSourcePipe,
  newPagePipe,
  newAssetPipe,
  newCustomPipe,
  DataFetchFunction,
  DataProcessFunction,
  PageIdentificationFunction,
  PageProcessFunction,
  AssetIdentificationFunction,
  AssetProcessEachFunction,
  AssetProcessAllFunction,
  CustomExecutionFunction,
};
