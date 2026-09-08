declare module "archiver" {
  import type { PassThrough } from "node:stream";

  interface Archiver extends PassThrough {
    append(
      source: string | Buffer,
      data?: { name?: string },
    ): Archiver;
    finalize(): Promise<void>;
    on(event: "error", listener: (err: Error) => void): Archiver;
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
  }

  function archiver(
    format: string,
    options?: { zlib?: { level?: number } },
  ): Archiver;

  export default archiver;
}
