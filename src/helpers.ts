import { Pipeline } from './pipeline';

export const collectData = (keys: string[], pipeline: Pipeline): Record<string, unknown> => {
  let collectedData = {};
  keys.forEach(key => {
    collectedData = {
      ...collectedData,
      ...pipeline.getData(key),
    };
  });

  return collectedData;
};

export const collectIdentifiers = async <Out>(
  identifierFuncs: ((input: Record<string, unknown>) => Out)[],
  data: Record<string, unknown>
): Promise<string[]> => {
  const collected = await Promise.all(
    identifierFuncs.map(async identifier => {
      let result = await identifier(data);

      if (result && typeof result === 'function') {
        result = result(data);
      }

      if (typeof result === 'string') {
        return [result];
      } else if (Array.isArray(result)) {
        return result;
      }

      return [];
    })
  );

  return collected.flat(1);
};
