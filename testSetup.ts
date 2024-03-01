// testSetup.ts
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { beforeAll } from 'vitest';
import { JSDOM } from "jsdom";

class ResponseFake {
  ok = true;
  constructor(public buffer: Buffer) {}
  async text() {
    return this.buffer.toString();
  }
}

beforeAll(() => {
  (globalThis.fetch as any) = (url: string) => {
    return readFile(resolve(__dirname, "src/tests/components/" + url)).then(
      (buffer) => new ResponseFake(buffer)
    );
  };

  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Ganko Test DOM</title>
      </head>
      <body>
        <div id="app"></div>
      </body>
    </html>
  `);

  (globalThis.document as any) = dom.window.document;
});