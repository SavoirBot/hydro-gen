import fs from 'fs/promises';
import glob from 'glob';
import remark from 'remark';
import html from 'remark-html';
import frontmatter from 'remark-frontmatter';
import parseFrontmatter from 'remark-parse-frontmatter';

import { newPipeline, newDataSourcePipe, newPagePipe } from '@savoirbot/hydro-gen';

interface MarkdownPages {
  path: string;
  content: string;
}

interface PageData {
  pages: MarkdownPages[];
}

const pipeline = newPipeline({ root: './temp' })
  .pipe(
    newDataSourcePipe('data')
      .fetch(async () => {
        const pages = await new Promise<MarkdownPages[] | null>(resolve => {
          glob('./data/**.md', (err, matches) => {
            if (err) {
              resolve(null);
              return;
            }

            Promise.all(
              matches.map(async match => {
                const content = await fs.readFile(match).then(file => file.toString());

                return new Promise<MarkdownPages>(resolve => {
                  remark()
                    .use(frontmatter)
                    .use(parseFrontmatter)
                    .use(html)
                    .process(content, (err, file) => {
                      if (err) {
                        return;
                      }

                      resolve({
                        path: (file.data as { frontmatter: { path: string } }).frontmatter.path,
                        content: String(file.contents),
                      });
                    });
                });
              })
            ).then(value => resolve(value));
          });
        });

        return {
          pages,
        };
      })
      .process(data => data)
  )
  .pipe(
    newPagePipe()
      .inject('data')
      .identify<PageData>(data => {
        return data.pages.map(data => data.path);
      })
      .select(/.*/)
      .generate<PageData>(async (path, data) => {
        const page = data.pages.find(el => el.path === path);

        if (!page) {
          return null;
        }

        return {
          url: path,
          content: page.content,
        };
      })
  );

pipeline.execute();
