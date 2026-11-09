# Getting started

exemplar is an XML toolkit for JavaScript and TypeScript, built around a conformant XML 1.0 and 1.1 parser. It
provides:

- three streaming APIs for reading: a pull cursor, event objects and SAX;
- two in-memory trees: a DOM, and an XDM tree queried with XPath 3.1;
- a streaming writer, and canonical XML;
- DTD validation, XInclude and XML catalogs.

It runs on Node, Deno, Bun and in browsers, and each part is a separate package.

This page covers installation and two examples: reading a document with the cursor, and querying one with XPath.

## Install

The two programs on this page need three packages:

::: code-group

```bash [npm]
npm install @exemplarjs/xml @exemplarjs/xdm @exemplarjs/xpath
```

```bash [pnpm]
pnpm add @exemplarjs/xml @exemplarjs/xdm @exemplarjs/xpath
```

```bash [yarn]
yarn add @exemplarjs/xml @exemplarjs/xdm @exemplarjs/xpath
```

```bash [bun]
bun add @exemplarjs/xml @exemplarjs/xdm @exemplarjs/xpath
```

```bash [deno]
deno add npm:@exemplarjs/xml npm:@exemplarjs/xdm npm:@exemplarjs/xpath
```

:::

The packages are released together under one version number. Install them all at the same version.

::: details What each package is for

| Package                     | What it is for                                                   |
| --------------------------- | ---------------------------------------------------------------- |
| `@exemplarjs/xml`           | Parsing: the factory, the cursor, event objects, errors          |
| `@exemplarjs/sax`           | The SAX parser and SAX filters                                   |
| `@exemplarjs/dom`           | A mutable DOM tree with the browser's DOM interface              |
| `@exemplarjs/xdm`           | The XDM tree: compact, read-only, built for XPath                |
| `@exemplarjs/xpath`         | XPath 3.1 queries                                                |
| `@exemplarjs/writer`        | Writing XML                                                      |
| `@exemplarjs/validation`    | Validating a document against its DTD                            |
| `@exemplarjs/xinclude`      | XInclude: assembling a document from several files               |
| `@exemplarjs/catalog`       | XML catalogs: resolving DTDs and other files to local copies     |
| `@exemplarjs/canonical`     | Canonical XML, for comparing and signing documents               |
| `@exemplarjs/encodings-cjk` | Decoding Japanese, Chinese and Korean encodings other than UTF-8 |

[Packages and runtimes](/reference/packages) lists every import path and what each runtime supports.

:::

## Read a document

The first program reads a catalog of books and prints each title. Save it as `books.mjs` and run it with
`node books.mjs`.

```ts twoslash
import { EventType, XMLInputFactory } from '@exemplarjs/xml';

const source = `<catalog>
  <book id="b1"><title>Dune</title><price>9.99</price></book>
  <book id="b2"><title>Emma</title><price>7.50</price></book>
</catalog>`;

const xml = new XMLInputFactory();
const reader = xml.createStreamReader(source);

for (let type = reader.next(); type !== EventType.END_DOCUMENT; type = reader.next()) {
  if (type === EventType.START_ELEMENT && reader.localName() === 'title') {
    console.log(reader.elementText());
  }
}
// Dune
// Emma
```

`XMLInputFactory` holds the parser configuration and no per-document state, so one instance can be shared across the
application. `createStreamReader` returns the cursor, exemplar's pull parser: `next()` advances to the next event and
returns its type, and accessors such as `localName()` and `elementText()` read the current event.

The cursor creates no object per event and does not buffer the document, so its memory use does not grow with the size
of the input. [Reading with the cursor](/guide/cursor/) covers it in full.

::: tip
The samples in this guide are TypeScript. Hover over a name in any of them to see its type.
:::

## Ask a question with XPath

The second program parses the same catalog into an XDM tree and queries it with XPath 3.1. XDM is the XPath data
model, and exemplar's XDM tree is a compact, read-only tree designed for XPath evaluation: it holds its nodes in typed
arrays in document order and all its text in one string.

```ts twoslash
const source = `<catalog>
  <book id="b1"><title>Dune</title><price>9.99</price></book>
  <book id="b2"><title>Emma</title><price>7.50</price></book>
</catalog>`;
// ---cut---
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { XPathCompiler } from '@exemplarjs/xpath';

const catalog = new XdmDocumentBuilder().parse(source);
const compiler = new XPathCompiler();

// The titles of the books that cost less than 9.
const cheap = compiler.compile('//book[price < 9]/title');
console.log(cheap.evaluateStrings(catalog));
// [ 'Emma' ]

// The number of books.
const count = compiler.compile('count(//book)');
console.log(count.evaluateNumber(catalog));
// 2
```

`compile` parses the expression once, and the compiled expression can be evaluated any number of times, against any
tree. The evaluation method determines the JavaScript type of the result: `evaluateStrings` returns an array of
strings, `evaluateNumber` a single number.

The tree holds the whole document in memory. For a file too large for that,
[One record at a time](/guide/cursor/records) builds a tree per record. [Getting started with XPath](/guide/xpath/)
continues from here.

## Next steps

The next five pages complete the introduction: [choosing a reading API](/guide/choosing-an-api),
[factories and sources](/guide/sources), [namespaces](/guide/namespaces), [errors and locations](/guide/errors), and
[pipelines](/guide/pipelines), which connect readers to tree builders and writers. Or go directly to a task:

| Task                                            | Start with                                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Read a file, an HTTP response or another source | [Factories and sources](/guide/sources)                                                              |
| Read a large file without buffering it          | [Large files and streams](/guide/cursor/streams), then [One record at a time](/guide/cursor/records) |
| Query a document                                | [Getting started with XPath](/guide/xpath/)                                                          |
| Change a document                               | [Pipelines](/guide/pipelines)                                                                        |
| Write XML                                       | [Writing XML](/guide/writing/)                                                                       |
| Validate a document                             | [Validating against a DTD](/guide/external/validation)                                               |
| Read untrusted XML                              | [Untrusted input](/guide/production/security)                                                        |
