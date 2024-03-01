// testSetup.ts
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { beforeAll } from 'vitest';

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
});