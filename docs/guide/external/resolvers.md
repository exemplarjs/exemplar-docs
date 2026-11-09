# Resolvers and access

A document can reference external resources: an external [DTD](/guide/external/dtd), an external entity, an
[XInclude](/guide/external/xinclude) target. By default exemplar reads none of them, which is why the attribute
defaults of an external DTD are not applied, or an include is not found.

Reading them requires two factory settings, kept separate so that what may be read is decided independently of how
it is read:

1. **Allow a protocol.** `accessExternalDTD` and `accessExternalEntities` list the protocols the factory may read
   with, such as `'file'` or `'https'`. The list is passed to the resolver with each request, and the built-in
   resolvers check the absolute URI against it before reading.
2. **Supply a resolver.** `entityResolver` performs the read. The reader does no I/O of its own, so the resolver
   determines where content comes from: the file system, HTTP or the program's own store.

This catalog references a DTD in the same directory. The DTD gives `format` a default value:

::: code-group

```xml [books.xml]
<!DOCTYPE catalog SYSTEM "catalog.dtd">
<catalog>
  <book id="b1"><title>Dune</title></book>
</catalog>
```

```xml [catalog.dtd]
<!ATTLIST book format (hardback|paperback) "paperback">
```

:::

With both settings in place, the default is applied:

```ts twoslash
import { readFileSync } from 'node:fs';
import { DocumentBuilder } from '@exemplarjs/dom';
import { XMLInputFactory } from '@exemplarjs/xml';
import { fileResolver } from '@exemplarjs/xml/resolvers/file';

const xml = new XMLInputFactory({
  accessExternalDTD: ['file'], // step 1: DTDs may be read from files
  entityResolver: fileResolver({ root: '/data/shop' }), // step 2: and this reads them
});

const document = new DocumentBuilder(xml).parse({
  systemId: 'file:///data/shop/books.xml',
  bytes: readFileSync('/data/shop/books.xml'),
});

document.getElementsByTagName('book').item(0)?.getAttribute('format'); // 'paperback'
```

## Why there are two steps

Either setting alone reads nothing, and the error identifies the one that is missing.

With a protocol allowed and no resolver, the document fails at the `<!DOCTYPE>`:

```text
RESOLVER_MISSING: Reading file:///data/shop/catalog.dtd is allowed but there is no resolver to read it: set entityResolver or a catalog (file:///data/shop/books.xml 1:1)
```

With a resolver and no protocol allowed, the read is refused:

```text
ACCESS_REFUSED: Reading file:///data/shop/catalog.dtd is not allowed: the access list does not name 'file' (file:///data/shop/books.xml 1:1)
```

With neither, which is the default, the external DTD is skipped without an error and the document is read as if it
referenced none.

Because the settings are separate, one resolver can be shared between factories with different access lists: a
factory for trusted documents and one for untrusted input can use the same `fileResolver`. There are two access
lists, because DTDs and entities carry different risks:

| Option                   | Covers                                                                         |
| ------------------------ | ------------------------------------------------------------------------------ |
| `accessExternalDTD`      | An external DTD, and external parameter entities (`%name;`, used within a DTD) |
| `accessExternalEntities` | External entities, and [XInclude](/guide/external/xinclude) targets            |

Each takes an array of protocols, such as `['file']` or `['file', 'https']`, and defaults to the empty array. The
string `'all'` allows every protocol; use it only for trusted documents.

## Read local files

`fileResolver` reads `file:` URIs below one directory, its `root`, and nothing outside it. A reference to
`../../etc/passwd` resolves to nothing.

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';
// ---cut---
import { fileResolver } from '@exemplarjs/xml/resolvers/file';

const xml = new XMLInputFactory({
  accessExternalDTD: ['file'],
  accessExternalEntities: ['file'],
  entityResolver: fileResolver({ root: '/data/shop' }),
});
```

It runs on Node, Deno and Bun. Set the `systemId` of each source, as in the first example: a relative URI such as
`catalog.dtd` is resolved against the document's own URI.

## Fetch over HTTP

`fetchResolver` reads `http:` and `https:` URLs with `fetch`, in any runtime that provides it. To send headers or set
a timeout, pass your own function as its `fetch` option.

It returns a promise, which only the asynchronous APIs can await: `createAsyncStreamReader`,
`createAsyncEventReader`, and `parseAsync` on the tree builders.

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
import { XMLInputFactory } from '@exemplarjs/xml';
// ---cut---
import { fetchResolver } from '@exemplarjs/xml/resolvers';

const web = new XMLInputFactory({
  accessExternalDTD: ['https'],
  entityResolver: fetchResolver(),
});

const document = await new DocumentBuilder(web).parseAsync(source);
```

A synchronous reader that receives a promise from a resolver throws an `AsyncReaderRequiredError`:

```text
A synchronous reader needs a resolver that answers at once; use an asynchronous reader
```

A document with no external references never calls the resolver, so a program can parse synchronously and fall back
to `parseAsync` only when that error is thrown:

```ts twoslash
import { DocumentBuilder, type Document } from '@exemplarjs/dom';
import { XMLInputFactory } from '@exemplarjs/xml';
declare const web: XMLInputFactory;
// ---cut---
import { AsyncReaderRequiredError } from '@exemplarjs/xml';

async function parse(text: string): Promise<Document> {
  const builder = new DocumentBuilder(web);
  try {
    return builder.parse(text);
  } catch (error) {
    if (error instanceof AsyncReaderRequiredError) return builder.parseAsync(text);
    throw error;
  }
}
```

## Write your own resolver

Any object with a `resolveEntity` method can be passed as `entityResolver`. Write one when the content is stored
where the built-in resolvers cannot read it: a database, a bundle, an in-memory map.

The method receives a request and returns the content, or `undefined` to decline.

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';
declare const catalogDtd: string;
// ---cut---
const xml = new XMLInputFactory({
  entityResolver: {
    resolveEntity({ publicId, systemId }) {
      if (publicId === '-//Example//DTD Bookshop 1.0//EN') return { systemId, text: catalogDtd };
      return undefined;
    },
  },
});
```

This resolver returns content from its own store, so no protocol needs to be allowed. Access lists govern reads by
URI, and this resolver performs none.

### What the request holds

| Field      | Holds                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`     | What is requested: `[dtd]` for the document's DTD, `%name` for an external parameter entity, `[xinclude]` for an XInclude target, otherwise the entity's name |
| `publicId` | The [public identifier](/guide/external/dtd#when-the-dtd-is-in-a-separate-file), if one is given                                                              |
| `systemId` | The system identifier exactly as the document writes it, such as `catalog.dtd`                                                                                |
| `baseURI`  | The URI that a relative `systemId` is resolved against                                                                                                        |
| `access`   | The access list for this read: an array of protocols, or `'all'`                                                                                              |

For the DTD of the first example, the request is:

```text
{ name: '[dtd]', systemId: 'catalog.dtd', baseURI: 'file:///data/shop/books.xml', access: ['file'] }
```

### What to return

Return an object with the content in one of three forms, and preferably its URI:

| Field      | Holds                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------- |
| `text`     | The content as a string                                                                      |
| `bytes`    | The content as a `Uint8Array`; its encoding is detected as a document's is                   |
| `stream`   | The content as a byte stream; asynchronous readers only                                      |
| `systemId` | The URI it was read from, used in error locations and as the base URI for its own references |
| `encoding` | An encoding known from outside the content, such as an HTTP charset                          |

A resolver has three other possible results:

- Return `undefined` to decline. The next resolver in the order below is called, and if none returns content, the
  resource is skipped.
- Return a promise of any of the above. Only asynchronous readers accept one.
- Throw a `ResolutionError` to fail the document at the reference.

```ts twoslash
import { ErrorCode, ResolutionError, type EntityResolver } from '@exemplarjs/xml';
declare const store: Map<string, string>;
// ---cut---
const strict: EntityResolver = {
  resolveEntity({ systemId }) {
    const text = systemId === undefined ? undefined : store.get(systemId);
    if (text === undefined) {
      throw new ResolutionError(ErrorCode.RESOLVER_FAILED, `The schema store has no ${systemId}`);
    }
    return { systemId, text };
  },
};
```

The document then fails with an `XMLError` that carries your code and message, and the line and column of the
reference. Any other error a resolver throws propagates to the caller unchanged.

::: warning
A resolver that reads by URI, for example by calling `fetch` itself, must check the request's `access` list first and
throw a `ResolutionError` with `ErrorCode.ACCESS_REFUSED` for a protocol the list does not name. The built-in
resolvers do this; exemplar does not enforce it for a custom resolver.
:::

## The order resolvers are asked in

A factory has two resolver options. `entityResolver` is called for DTDs and entities. `uriResolver` has a `resolve`
method instead, and is called first for [XInclude](/guide/external/xinclude) targets. `fileResolver` and
`fetchResolver` implement both interfaces, so the same object can be passed for both options.

For each external reference, the first of these to return content is used:

1. The `uriResolver`, for an XInclude target only.
2. The `entityResolver`.
3. The [catalog](/guide/external/catalogs), if one is set.

If none returns content, a DTD or entity is skipped, and an XInclude target counts as missing. A catalog can be set to
[fail the document](/guide/external/catalogs#decide-what-happens-to-an-unknown-identifier) instead.

With no `entityResolver` and no catalog at all, a read that the access lists allow fails with `RESOLVER_MISSING`, as
[Why there are two steps](#why-there-are-two-steps) shows.

To combine resolvers, delegate from one to the next and return `undefined` at the end of the chain:

```ts twoslash
import type { EntityResolver } from '@exemplarjs/xml';
import { fileResolver } from '@exemplarjs/xml/resolvers/file';
declare const catalogDtd: string;
// ---cut---
const files = fileResolver({ root: '/data/shop' });

const combined: EntityResolver = {
  resolveEntity(request) {
    if (request.publicId === '-//Example//DTD Bookshop 1.0//EN') return { text: catalogDtd };
    return files.resolveEntity(request);
  },
};
```

## What happens when access is refused

Without an error handler, a refused read throws an `XMLError` with the code `ACCESS_REFUSED`, and parsing stops. With
a handler, it is reported to the handler's `error` function and parsing continues without the refused content. Here
the document's DTD is `https://shop.example/dtd/catalog.dtd`:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
import { XMLInputFactory } from '@exemplarjs/xml';
import { fetchResolver } from '@exemplarjs/xml/resolvers';
// ---cut---
const tolerant = new XMLInputFactory({
  entityResolver: fetchResolver(), // no protocol is allowed
  errorHandler: { error: (problem) => console.warn(problem.code, problem.description) },
});

const document = await new DocumentBuilder(tolerant).parseAsync(source);
// ACCESS_REFUSED Reading https://shop.example/dtd/catalog.dtd is not allowed: the access list does not name 'https'
```

Without the DTD, its attribute defaults and entities are missing. A reference to an entity the unread DTD may have
declared is reported as an `ENTITY_REFERENCE` event, as [DTDs and entities](/guide/external/dtd) describes.

A refused XInclude target is treated like one that cannot be found: the include's fallback is used if it has one, and
otherwise the document fails.

## What a relative address is relative to

Documents usually reference their DTD and entities by relative URI, such as `catalog.dtd`. A resolver receives the
URI as written and the base URI to resolve it against, and the built-in resolvers join the two. The base URI is
determined as follows:

- **A document's base URI is its `systemId`.** Set it on the source:
  `{ systemId: 'file:///data/shop/books.xml', bytes }`. Without one, relative URIs cannot be resolved, and the
  built-in resolvers find nothing.
- **`baseURI` overrides it.** Set `baseURI` on the source when the document was read from one location but its
  references are relative to another, such as a cached copy of a web page.
- **External content has its own base URI.** A DTD read from `https://shop.example/dtd/catalog.dtd` that references
  `common.dtd` gets `https://shop.example/dtd/common.dtd`, whatever the document's URI is. This is why a resolver
  should return the `systemId` of what it read.

::: details Changing the base URI for part of a document with `xml:base`
An element can carry an `xml:base` attribute. It changes the base URI for XInclude targets inside the element, and
the base URI its nodes report in a tree. It does not affect the DTD or entities, which are declared before any
element.

```xml
<catalog xml:base="https://cdn.example/books/" xmlns:xi="http://www.w3.org/2001/XInclude">
  <!-- read from https://cdn.example/books/dune.xml -->
  <xi:include href="dune.xml"/>
</catalog>
```

:::

::: details Supplying a DTD to a document that names none
A resolver may also have a `getExternalSubset` method. It is called when a document has a `<!DOCTYPE>` that
references no external DTD, and may return one to use. The request holds the name the `<!DOCTYPE>` gives and the
document's URI. Use it to apply attribute defaults and entities to documents that do not reference a DTD themselves.
:::

## Next steps

- [Catalogs](/guide/external/catalogs) maps the identifiers documents use to local copies, with no code.
- [Validating against a DTD](/guide/external/validation) checks the document against the DTD a resolver reads.
- [XInclude](/guide/external/xinclude) reads other documents through the same resolvers.
- [Reading documents and collections](/guide/xpath/resources) uses resolvers for XPath's `doc()` function.
- [Untrusted input](/guide/production/security) explains why nothing is read by default.
