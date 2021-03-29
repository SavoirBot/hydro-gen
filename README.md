# Hydro-gen
[![codecov](https://codecov.io/gh/SavoirBot/hydro-gen/branch/main/graph/badge.svg?token=A9UVKHB3LL)](https://codecov.io/gh/SavoirBot/hydro-gen)
![Pull Request validation](https://github.com/SavoirBot/hydro-gen/workflows/Pull%20Request%20validation/badge.svg)

Hydro-gen is a toolkit for building static site generators. It provides all the tools you need to [process data](#data-sources),
[create pages](#pages), [process assets](#assets), and [run custom commands](#custom-commands).

## Why a toolkit?
Static site generators abound, and they are all amazing. From our experience, however, they tend to be very 
opinionated and use a lot of routing and import magic to provide they desired experience. This works great for most 
users, but can be a problem when trying to extend their functionalities to generate sites with uncommon requirements.

They also tend to be built around their own internal tooling or complex tool pipelines. Building your own static 
site generator requires reading a lot of source code, making sense of complex generation pipelines, or learning a 
whole new toolkit built for far more than simply generating websites.

Hydro-gen aims to provide a simpler and fully extensible option for building your own static site generator for your 
won requirements. It provides a small set of tools with very specific functionalities that focus on generating sites 
based on files and data. It also provides a good amount of [examples](#examples) to guide users.

## How to use
```bash
npm install @savoirbot/hydro-gen
```

The main component of a hydro-gen built static site generator is the pipeline. The pipeline will execute all the 
pipes it is given in sequence. By itself, a pipeline doesn't do anything, but when combined with different types of 
pipes, it can generate and process files based on data.

```js
import { newPipeline } from "@savoirbot/hydro-gen";

// Executes the empty pipeline, returns a promise.
newPipeline({}).execute();
```

The `execute` method will trigger the generation. Pipelines are not idempotent and data saved from previous 
executions may remain in the pipeline in subsequent executions. It is recommended to recreate the pipeline if you 
need to execute it multiple times.

The pipeline will return a promise that resolve to nothing. The pipeline will not catch any errors triggered in its 
pipes and will instead let them trickle back to the root. It will not revert anything it has created or any data it 
has fetched. You can act on these errors to prevent any undesired behaviour using a then/catch.

```js
import { newPipeline } from "@savoirbot/hydro-gen";


newPipeline({}).execute().then(() => {/* Do something on success */}).catch(err => {/* Do something on error */});
```

Pipes are added with the `pipe` method. Pipes are always executed sequentially in the order they were added in. The 
pipe method is chainable, it returns the modified pipeline instance.

```js
import { newPipeline } from "@savoirbot/hydro-gen";

// Will execute pipe1, then pipe2 once pipe1 is done.
newPipeline({}).pipe(pipe1).pipe(pipe2).execute();
```

### Configuration
The pipeline can be configured using the object parameter from its constructor.

`root` allows you to specify a root folder to save generated files, it uses the current execution folder if omitted.

```js
import { newPipeline } from "@savoirbot/hydro-gen";

// Will save data in the dist folder
newPipeline({ root: './dist' }).execute();
```

### Data sources
Hydro-gen generates sites based on data. Data are fetched through data sources and added into the pipeline for any 
subsequent pipes. Data sources can be used to fetch anything the generator needs to create pages and assets.

```js
import { newPipeline, newDataSourcePipe } from "@savoirbot/hydro-gen";

newPipeline({})
  .pipe(newDataSourcePipe('some name'))
  .execute();
```

All data sources must be named. This name allows the pipeline to scope the fetched data and prevent other data sources 
from overwriting data.

Data is fetched from external sources using the `fetch` method. This method expects a single function as its 
parameter, it should return an object containing the data. The function may be async, the data source 
will wait for the function to resolve before moving on.

```js
import { newDataSourcePipe } from "@savoirbot/hydro-gen";

newDataSourcePipe('some name').fetch(() => {
  const apiData = fetch('some/api');
  
  return {
    apiData,
  };
});
```

`fetch` can be chained to fetch from multiple sources in a single data source. Functions are executed in parallel and 
merged once they all resolve. You must take care to namespace the data to prevent any undesired overwrites.

Once fetched, data can be process with the `process` method. This method takes a single function as its parameter, 
it should return an object containing the processes data and will receive the merged fetch data as a parameter.

```js
import { newDataSourcePipe } from "@savoirbot/hydro-gen";

newDataSourcePipe('some name')
  .fetch(() => {
      const apiData = fetch('some/api');
      
      return {
        apiData,
      };
    })
  .process(data => {
    return {
      ...data.apiData,
    }
  });
```

`fetch` can be chained to process data in sequence. The functions will be executed sequentially in order they were 
added to the datasource.

```js
import { newDataSourcePipe } from "@savoirbot/hydro-gen";

// Will execute process1, then process2 once process1 is done. process2 receives the data from process1.
newDataSourcePipe('some name')
  .fetch(someFetch)
  .process(process1)
  .process(process2);
```

Process functions can be omitted to simply save the fetched data.

A data source will always execute itself in the same order: first all `fetch` functions are resolved, and the data 
they return is merged in a single object, then all `process` function execute sequentially. Once completed, the 
data source will save the process data into the pipeline.

#### Parallel data sources
As said previously, all pipes execute sequentially in the pipeline. This may lead to slow builds if fetching from 
multiple APIs. In situations where the order of the data sources does not matter, the parallel data source pipeline 
can be used to execute data sources in parallel.

```js
import { newPipeline, newParallelDataSourcePipe, newDataSourcePipe } from "@savoirbot/hydro-gen";

// Both sources are executed in parallel rather than sequentially
newPipeline({})
  .pipe(
    newParallelDataSourcePipe()
      .pipeSource(newDataSourcePipe('source 1'))
      .pipeSource(newDataSourcePipe('source 2'))
    )
  .execute();
```

### Pages
Hydro-gen will generate pages through the pages pipes. Data is injected into these pipes, and the pages objects they 
return will automatically be generated by the pipeline.

```js
import { newPipeline, newPagePipe } from "@savoirbot/hydro-gen";

newPipeline({})
  .pipe(newPagePipe())
  .execute();
```

Data is selected from the pipeline through the use of the `inject` method. This method may take either a string 
containing the name of the requested data source, or the data source instance itself. The method can be chained to 
inject data from multiple sources.

```js
import { newDataSourcePipe, newPagePipe } from "@savoirbot/hydro-gen";

const datasource = newDataSourcePipe('some name');

newPagePipe().inject('some name');
// OR
newPagePipe().inject(datasource);
```

To start generating pages, you must identify which pages this pipe should generate. This is done through the 
`identify` method. This method takes a single function as its parameter, it should return a string or array of 
strings that represent the paths, relative to the pipeline `root`. The function receives the injected data as its 
parameter.

```js
import { newPagePipe } from "@savoirbot/hydro-gen";

// injected data
const data = {
  pages: ['some/page', 'other/page']
}

// Will create an html file for path some/page and other/page
newPagePipe()
  .inject('some data')
  .identify(data => data.pages);
```

The method can be chained to identify multiple pages. Identify functions are called in parallel, and they may be 
called in any order. Care must be taken to ensure no duplicate paths happen, the pipe will not clean duplicates, and 
it may lead to unwanted behaviors.

If needed, the identified paths can be filtered using the `select` method. It expects a string or RegEx as its 
parameter. If given a string, it will keep only paths that are equal to that string. When omitted, identified paths 
won't be filtered. The method can be chained to add multiple selection criteria.

```js
import { newPagePipe } from "@savoirbot/hydro-gen";

// Will only create a page for some/page
newPagePipe()
  .inject('some data')
  .identify(data => data.pages)
  .select('/some/page');
```

Once identified, pages need to be generated using the `generate` method. This method takes a single function as its 
parameter, it should return a page object and will receive the path and the injected data as parameters.

The page object consists of two properties:

- `url`, the URL where this page should be accessible. 
- `content`, the HTMl content to save.

```js
import { newPagePipe } from "@savoirbot/hydro-gen";

// Will generate a single HTML file containing the content under /some/page.html
newPagePipe()
  .inject('some data')
  .identify(() => ['/some/page'])
  .generate((path, data) => ({
    url: path,
    content: data.content,
  }));
```

`generate` methods may be chained to process pages multiple times and are called sequentially for each identified path.

```js
import { newPagePipe } from "@savoirbot/hydro-gen";

// generate1 is called for /some/page, then generate2 is called with the same path. Both are called
// again in the same order with /other/page
newPagePipe()
  .inject('some data')
  .identify(() => ['/some/page', '/other/page'])
  .generate(generate1)
  .generate(generate1);
```

A trailing slash can be added to identified patgs to generate an index page for a folder rather than a specific file 
in a folder.

```js
import { newPagePipe } from "@savoirbot/hydro-gen";

// Will generate a single HTML file containing the content under /some/page/index.html
newPagePipe()
  .identify(() => ['/some/page/']) // <- Trailing slash here
  .generate((path, data) => ({
    url: path,
    content: 'test',
  }));
```

Without at least one generate function, no pages will be generated.

A page pipe will always execute itself in the same order: first all data is injected, and the data they obtain is 
merged in a single object, then all `identify` function execute in parallel. Once completed, the selected filters 
are used to remove any unwanted identified paths. Finally, the `generate` functions are called sequentially to 
generate the pages.

### Assets
Hydro-gen will process assets through the assets pipes. Data is injected into these pipes, and the assets objects they
return will automatically be converted to files on the file system by the pipeline.

```js
import { newPipeline, newAssetPipe } from "@savoirbot/hydro-gen";

newPipeline({})
  .pipe(newAssetPipe())
  .execute();
```

Data is selected from the pipeline through the use of the `inject` method. This method may take either a string
containing the name of the requested data source, or the data source instance itself. The method can be chained to
inject data from multiple sources.

```js
import { newDataSourcePipe, newAssetPipe } from "@savoirbot/hydro-gen";

const datasource = newDataSourcePipe('some name');

newAssetPipe().inject('some name');
// OR
newAssetPipe().inject(datasource);
```

To start processing assets, you must collect which assets this pipe should process. This is done through the
`collect` method. This method takes a single function as its parameter, it should return a string or array of
strings that represent the file paths on the system, relative to the execution path. The function receives the injected 
data as its parameter. Hydro-gen uses [node-glob](https://www.npmjs.com/package/glob) to find files.

```js
import { newAssetPipe } from "@savoirbot/hydro-gen";

// injected data
const data = {
  files: '/syles/*.css'
}

// Will collect all the css files under /styles
newAssetPipe()
  .inject('some data')
  .collect(data => data.files);
```

The method can be chained to collect multiple assets. Collect functions are called in parallel, and they may be
called in any order. The pipe will find and read the files when collecting, an error will be logged if the file 
doesn't exist. Care must be taken to ensure no duplicate files happen, the pipe will not clean duplicates,
and it may lead to unwanted behaviors.

If needed, the collected paths can be filtered using the `select` method. It expects a string or RegEx as its
parameter. If given a string, it will keep only files whose fully qualified filenames are equal to that string. 
When omitted, the collected files won't be filtered. The method can be chained to add multiple selection criteria.

```js
import { newAssetPipe } from "@savoirbot/hydro-gen";

// Will only process the index.css file
newAssetPipe()
  .identify(() => '/styles/*.css')
  .select('/styles/index.css');
```

Once collected, assets can be process using the `processEach` or `processAll` methods. Both methods take a single 
function as their parameters, it should return one, or many, asset objects and will receive the file(s) being processed 
and the injected data as parameters.

The asset object consists of three properties:

- `path`, the path on the file system where to save this file, relative to the pipeline root.
- `filename`, the name of the file on the disk.
- `content`, the content to save in the file.

```js
import { newPagePipe } from "@savoirbot/hydro-gen";

// Will generate a css file for each collected file
newPagePipe()
  .inject('some data')
  .collect(() => '/styles/*.css')
  .processEach((file, data) => ({
    path: file.path,
    filename: `${file.filename}${file.extension}`,
    content: file.content,
  }));
```

`processEach` functions will execute sequentially for each asset collected and can be chained to process each file 
multiple times. `processAll` will execute sequentially on all the files at once and may be chained to process all 
the files multiple times.

```js
import { newPagePipe } from "@savoirbot/hydro-gen";

// Will generate a single HTML file containing the content under /some/page.html
newPagePipe()
  .inject('some data')
  .collect(() => '/styles/*.css')
  .processEach((file, data) => {
    /* Do something with each file */
  })
  .processAll((files, data) => {
    /* Do something with all the files */
  });
```

Without at least one process function, no assets will be generated.

An asset pipe will always execute itself in the same order: first all data is injected, and the data they obtain is
merged in a single object, then all `collect` function execute in parallel. Once completed, the selected filters
are used to remove any unwanted identified paths. Finally, the `processEach` and `processAll` functions are called 
sequentially in the order they were chained in to create assets.

## Custom commands
If the three pipelines are not enough, a fourth type of pipeline exists to run arbitrary commands on selected data.

```js
import { newPipeline, newCustomPipe } from "@savoirbot/hydro-gen";

newPipeline({})
  .pipe(newCustomPipe())
  .execute();
```

Like pages and assets pipes, the `inject` method can be called and chained to fetch data from the pipeline and use 
it in the commands.

```js
import { newDataSourcePipe, newCustomPipe } from "@savoirbot/hydro-gen";

const datasource = newDataSourcePipe('some name');

newCustomPipe().inject('some name');
// OR
newCustomPipe().inject(datasource);
```

Custom pipes expose a `command` method that can be used to execute arbitrary code on the injected data. The method 
takes a single function that receives the injected data as its single parameter. It should not return anything.

```js
import { newCustomPipe } from "@savoirbot/hydro-gen";

newCustomPipe().inject('some name').command(data => { /* Do something */ });
```

Commands are executed sequentially and can be chained to run more than one command on the same data.

### Writing your own pipes
Pipes are classes that expose an `execute` method with the pipeline as their parameter. If the four pipes do not 
cover your requirements, you can create new pipes by creating your own classes.

```js
import { newPipeline } from "@savoirbot/hydro-gen";

class SomePipe {
  execute(pipeline) {
    /* Do something */
  }
}

newPipeline({}).pipe(new SomePipe()).execute();
```

## Examples

- [Generating static pages without data](/examples/static).
- [Generating pages from an API based data source](/examples/from-api).
- [Generating pages from multiple data sources executed in parallel](/examples/parallel-fetching).
- [Generating pages from an API using JS template string](/examples/templates).
- [Generating pages from markdown](/examples/markdown).
- [Processing scss files and converting them to css](/examples/scss).
- [Processing multiple scss files and converting them to a single css file](/examples/scss-merge).
- [React app used to generate pages using SSR. The React code is bundled for the client using browserify](/examples/react).
