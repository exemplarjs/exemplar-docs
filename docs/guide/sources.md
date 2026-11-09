# Factories and sources

Every reader is created by an `XMLInputFactory` from a source. The factory holds the parser configuration. The source
is a string, bytes, a stream, or a _source object_, which pairs one of those with metadata such as the document's URL.
This page covers configuring a factory and the forms a source takes.

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';

const xml = new XMLInputFactory();
const reader = xml.createStreamReader('<greeting>Hello</greeting>');

reader.nextTag(); // move to <greeting>
console.log(reader.elementText());
// Hello
```

## Make one factory and reuse it

The options passed to the `XMLInputFactory` constructor apply to every reader the factory creates.

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';
// ---cut---
// Adjacent text and CDATA sections are merged into one event, in every reader this factory creates.
const xml = new XMLInputFactory({ coalescing: true });

const first = xml.createStreamReader('<a>one</a>');
const second = xml.createStreamReader('<b>two</b>');
```

Create one factory at startup and share it. A factory holds no per-document state, so it can create any number of
readers, in sequence or concurrently. The options are then defined in one place: a tightened limit or a disabled
feature applies everywhere.

When part of a program needs different options, derive a second factory. `withOptions` returns a new factory with the
same options except the ones given:

```ts twoslash
// ---cut---
// For uploads: refuse any document that has a DOCTYPE.
const strict = xml.withOptions({ disallowDoctype: true });
```

[Reader options](/reference/options) lists every option.

## Give the other APIs your factory

A factory has a method for each kind of reader in `@exemplarjs/xml`. The tree builders and the SAX parser in the other
packages take a factory as a constructor argument.

```ts twoslash
// ---cut---
import { DocumentBuilder } from '@exemplarjs/dom';
import { SAXParser } from '@exemplarjs/sax';
import { XdmDocumentBuilder } from '@exemplarjs/xdm';

const cursor = xml.createStreamReader(source);
const events = xml.createEventReader(source);

const xdmBuilder = new XdmDocumentBuilder(xml);
const domBuilder = new DocumentBuilder(xml);
const saxParser = new SAXParser(xml);
```

Each of these reads with the factory's options. Without the argument, as in `new XdmDocumentBuilder()`, a factory with
the default options is used.

## The kinds of source

Every API that reads a document accepts the same kinds of source.

| Input                         | Pass                              | Example                                                  |
| ----------------------------- | --------------------------------- | -------------------------------------------------------- |
| The document as text          | A string                          | `xml.createStreamReader('<a/>')`                         |
| The document as bytes         | A `Uint8Array`                    | `xml.createStreamReader(readFileSync('a.xml'))`          |
| The bytes in chunks           | An iterable of `Uint8Array`       | `xml.createStreamReader([firstHalf, secondHalf])`        |
| An asynchronous byte stream   | A `ReadableStream`                | `xml.createAsyncStreamReader(response.body)`             |
|                               | An async iterable of `Uint8Array` | `xml.createAsyncStreamReader(createReadStream('a.xml'))` |
| Any of these, with its origin | A source object                   | `xml.createStreamReader({ systemId, bytes })`            |

A string is parsed as it is. Bytes are decoded first, as [How bytes are decoded](#how-bytes-are-decoded) describes.
Chunks can be any size, and a chunk boundary can fall inside a character or a tag.

A `ReadableStream` or an async iterable requires an asynchronous reader: `createAsyncStreamReader` or
`createAsyncEventReader`, or a method whose name ends in `Async`, such as `parseAsync`. A synchronous reader given a
stream throws an `AsyncReaderRequiredError`. [Large files and streams](/guide/cursor/streams) covers asynchronous
reading.

::: tip
On Node, `readFileSync(path)` with no encoding argument returns bytes, which is the better input: exemplar then
detects the document's encoding. Reading the file as a `'utf8'` string is correct only for files that are UTF-8.
:::

## Say where the document came from

A string or a `Uint8Array` carries no information about its origin. A source object adds it, most often as the
_system id_ (system identifier), the URL of the document. Put the content in exactly one of `text`,
`bytes`, `chunks` or `stream`, and add the metadata that is known. A source object with more than one of the four, or
with none, throws an `InvalidArgumentError`.

```ts twoslash
import { readFileSync } from 'node:fs';
// ---cut---
const reader = xml.createStreamReader({
  systemId: 'file:///data/catalog.xml',
  bytes: readFileSync('/data/catalog.xml'),
});
```

| Property   | What it is                                                                      |
| ---------- | ------------------------------------------------------------------------------- |
| `text`     | The document as a string                                                        |
| `bytes`    | The document as a `Uint8Array`                                                  |
| `chunks`   | The document as an iterable of `Uint8Array` chunks                              |
| `stream`   | The document as a `ReadableStream` or an async iterable of `Uint8Array`         |
| `systemId` | The document's URL                                                              |
| `baseURI`  | The URL to resolve relative references against, when it differs from `systemId` |
| `publicId` | The document's _public identifier_, a location-independent name, if it has one  |
| `encoding` | The encoding of the bytes, when it is known from outside the document           |

## Why the system id matters

The system id is a `file:` URL for a file, or the request URL for an HTTP response. Two features depend on it.

**Error messages.** An error's message ends with the system id, the line and the column, so a log line identifies the
file:

```ts twoslash
import { EventType, XMLError } from '@exemplarjs/xml';
// ---cut---
const broken = '<catalog>\n  <book>\n</catalog>';

try {
  const reader = xml.createStreamReader({ systemId: 'file:///data/catalog.xml', text: broken });
  while (reader.next() !== EventType.END_DOCUMENT);
} catch (error) {
  if (!(error instanceof XMLError)) throw error;
  console.log(error.message);
}
// WF_END_TAG_MISMATCH: Expected </book> (file:///data/catalog.xml 3:3)
```

Without the system id, `error.systemId` is `undefined` and the message has only the line and column.
[Errors and locations](/guide/errors) covers errors in full.

**Relative references.** A document can refer to other files by relative URL: a _DTD_ (document type definition, a
file of declarations for the document's structure), or a file included with XInclude. These references are resolved
against the document's system id, so without one they cannot be resolved. With a system id of
`file:///data/catalog.xml`, a reference to `catalog.dtd` resolves to `file:///data/catalog.dtd`.
[Resolvers and access](/guide/external/resolvers) covers how such files are then read.

On Node, `pathToFileURL(path).href` from `node:url` converts a file path to this URL.

## How bytes are decoded

exemplar detects the encoding of bytes from the document itself. A document can name its encoding in its XML
declaration, as in `<?xml version="1.0" encoding="ISO-8859-1"?>`. A document that declares no encoding is read as
UTF-8.

Set `encoding` only when the encoding is known from outside the document, such as the `charset` of an HTTP response.
It takes precedence over the declared encoding:

```ts twoslash
const response = await fetch('https://example.org/catalog.xml');
const charset: string | undefined = undefined;
// ---cut---
const reader = xml.createAsyncStreamReader({
  systemId: response.url,
  stream: response.body!,
  encoding: charset, // from the Content-Type header, or undefined when it names none
});
```

A string is already decoded, so none of this applies to it, and any `encoding` in its XML declaration is ignored. If
the string starts with a byte-order mark character, as a file read as `'utf8'` text on Node can, the reader skips it.

[Encodings](/guide/production/encodings) covers the full detection order, the supported encodings, and the errors
thrown when the bytes and their declared encoding disagree.

## Next steps

- [Namespaces](/guide/namespaces): prefixed names and `xmlns` declarations.
- [Reading with the cursor](/guide/cursor/): read a document from any of these sources.
- [Large files and streams](/guide/cursor/streams): read asynchronous sources.
- [Reader options](/reference/options): every option a factory takes.
- [Errors and locations](/guide/errors): the errors a reader throws, and their locations.
