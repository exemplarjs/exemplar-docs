// What the code samples share without setting it up each time: a factory, a source, a compiler and a document.
import type { XdmNode } from '@exemplarjs/xdm';
import type { XMLInputFactory } from '@exemplarjs/xml';
import type { XPathCompiler } from '@exemplarjs/xpath';

declare global {
  /** A factory with the default options. */
  const xml: XMLInputFactory;
  /** A document to read. */
  const source: string;
  /** A document's bytes. */
  const bytes: Uint8Array;
  /** A stream of a document's bytes. */
  const stream: ReadableStream<Uint8Array>;
  /** An XPath compiler with the default static context. */
  const compiler: XPathCompiler;
  /** An XDM document. */
  const doc: XdmNode;
}
