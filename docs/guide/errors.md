# Errors and locations

When a document cannot be read, exemplar throws an error that identifies the problem and its location. This page
covers the fields of the error, which errors a handler can intercept so that reading continues, and how to get the
location of any event.

This catalog has an error on its third line: the `title` element is never closed.

```xml
<catalog>
  <book id="b1"><title>Dune</title></book>
  <book id="b2"><title>Emma</book>
</catalog>
```

Reading it throws an `XMLError`:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
import { XMLError } from '@exemplarjs/xml';

try {
  new DocumentBuilder(xml).parse({ systemId: 'file:///data/books.xml', text: source });
} catch (error) {
  if (error instanceof XMLError) {
    console.log(error.message);
  } else {
    throw error;
  }
}
// WF_END_TAG_MISMATCH: Expected </title> (file:///data/books.xml 3:30)
```

The message is the error's code, a description, then the document's system id with the line and column. A document
read without a `systemId` has only the line and column: `(3:30)`.

## What an error holds

Every problem in a document is reported as an `XMLError`, whichever API reads it. Its fields:

| Field         | Holds                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `code`        | A fixed identifier for the kind of problem, such as `WF_END_TAG_MISMATCH`. Test this, not the message. |
| `message`     | The code, the description and the location together, ready to log                                      |
| `description` | The description alone, such as `Expected </title>`, for composing a custom message                     |
| `line`        | The line, counting from 1                                                                              |
| `column`      | The column, counting from 1                                                                            |
| `offset`      | The offset from the start of the text, counting from 0                                                 |
| `systemId`    | The system id of the document, when the source had one; `undefined` otherwise                          |
| `entities`    | The names of the [entities](/guide/external/dtd) the problem is inside, outermost first; usually empty |

`location` returns `line`, `column`, `offset` and `systemId` as one object.

Columns and offsets count UTF-16 code units, as JavaScript strings do, so `source.slice(error.offset)` starts at the
problem when `source` is the string that was parsed.

The codes are grouped by prefix: `WF_` for XML that is not well formed, `NS_` for namespaces, `VC_` for validation,
`ENCODING_`, `LIMIT_`, `XINCLUDE_` and so on. [Error codes](/reference/error-codes) lists every one. Each is also a
member of the `ErrorCode` object, which gives editor completion:

```ts twoslash
import { ErrorCode, XMLError } from '@exemplarjs/xml';
declare const error: unknown;
// ---cut---
if (error instanceof XMLError && error.code === ErrorCode.WF_END_TAG_MISMATCH) {
  // An end tag is missing or misplaced.
}
```

::: info
An `XMLError` has no stack trace beyond its first line. The relevant location is the one in the document, which the
fields above provide.
:::

## Which problems stop reading

Each problem is a fatal error, a recoverable error or a warning. The kind determines whether reading can continue.

**A fatal error** means the document cannot be parsed. Usually it is not well formed: an unclosed tag, a disallowed
character, or bytes that are invalid in the declared encoding. The input after that point cannot be interpreted
reliably, so the error is thrown and reading stops. No option changes that.

**A recoverable error** means the document is well formed and can be read to the end, but violates a constraint beyond
the syntax. The most common case is a document that does not [match its DTD](/guide/external/validation). A recoverable
error is thrown too, unless an [error handler](#handle-errors-yourself) with an `error` callback is supplied. In that
case it is passed to the callback and reading continues.

**A warning** reports a construct that is permitted but probably unintended. Warnings are never thrown, and are
discarded when there is no handler.

The table gives the kind of each group of codes. Several rows belong to features covered on later pages; each links
to its page.

| Problem                                                                                         | Codes                        | Kind              |
| ----------------------------------------------------------------------------------------------- | ---------------------------- | ----------------- |
| Malformed XML: tags, attributes, references, characters                                         | `WF_…`                       | Fatal error       |
| A prefix that is not declared, and other namespace mistakes                                     | `NS_…`                       | Fatal error       |
| Bytes that do not fit the encoding, or an encoding that is not supported                        | `ENCODING_…`                 | Fatal error       |
| A [limit](/reference/limits) exceeded                                                           | `LIMIT_…`                    | Fatal error       |
| A `<!DOCTYPE>` when [DTDs are refused](/guide/production/security#refuse-dtds)                  | `DOCTYPE_DISALLOWED`         | Fatal error       |
| An [include](/guide/external/xinclude) that fails                                               | `XINCLUDE_…`                 | Fatal error       |
| A [catalog](/guide/external/catalogs) with no match, under `'strict'`                           | `CATALOG_NO_MATCH`           | Fatal error       |
| A [catalog](/guide/external/catalogs) file that cannot be read                                  | `CATALOG_UNREADABLE`         | Fatal error       |
| A read the [access lists](/guide/external/resolvers) allow, with no resolver                    | `RESOLVER_MISSING`           | Fatal error       |
| The document does not [match its DTD](/guide/external/validation)                               | `VC_…`                       | Recoverable error |
| A read asked of a resolver or catalog that the [access lists](/guide/external/resolvers) refuse | `ACCESS_REFUSED`             | Recoverable error |
| A document declared as UTF-16 with no byte-order mark                                           | `ENCODING_UTF16_WITHOUT_BOM` | Recoverable error |
| An encoding given from outside that overrides the declared one                                  | `ENCODING_CONFLICT`          | Warning           |
| A DTD that declares an entity, or an element's attribute, twice                                 | `DTD_DUPLICATE_…`            | Warning           |
| An `xml:id` that is repeated or not a valid name                                                | `XMLID_…`                    | Warning           |

With no resolver and no catalog, a reference to a file the access lists do not allow is not an error: the file is not
read, and the document is read without it.

## Handle errors yourself

The factory's `errorHandler` option takes an object with up to three callbacks, one per kind: `fatalError`, `error`
for recoverable errors, and `warning`. Each callback receives the `XMLError`.

```ts twoslash
import { XMLError, XMLInputFactory } from '@exemplarjs/xml';

const problems: XMLError[] = [];

const tolerant = new XMLInputFactory({
  errorHandler: {
    warning: (problem) => console.warn(problem.message),
    error: (problem) => problems.push(problem), // collected, and reading continues
    fatalError: (problem) => console.error(problem.message), // the error is thrown after this returns
  },
});
```

| Callback     | Called for         | Without it               | With it                                              |
| ------------ | ------------------ | ------------------------ | ---------------------------------------------------- |
| `warning`    | Warnings           | The warning is discarded | It is called; reading continues                      |
| `error`      | Recoverable errors | The error is thrown      | It is called; reading continues                      |
| `fatalError` | Fatal errors       | The error is thrown      | It is called first; the error is thrown all the same |

All three callbacks are optional. The most common handler has only `error`, to collect validation errors, as
[Validating against a DTD](/guide/external/validation#collect-every-problem) shows.

To stop at a recoverable error, throw from `error`. The thrown value propagates to the code that is reading.

A [SAX](/guide/sax/) handler can define the same three callbacks itself, alongside `startElement` and the rest. Each
one it defines is called instead of the factory's.

## A failed reader stays failed

Once a reader has thrown an `XMLError`, it cannot continue. `hasNext()` returns false from then on, and `next()`
throws the same error again; the reader does not skip the malformed content and resume.

```ts twoslash
import { XMLError } from '@exemplarjs/xml';
// ---cut---
const reader = xml.createStreamReader(source);
try {
  while (reader.hasNext()) reader.next();
} catch (error) {
  if (error instanceof XMLError) console.log(error.code); // WF_END_TAG_MISMATCH
}

reader.hasNext(); // false

try {
  reader.next();
} catch (error) {
  if (error instanceof XMLError) console.log(error.code); // WF_END_TAG_MISMATCH, again
}
```

The events reported before the error reflect the document up to that point, and the application may already have
acted on them. If a document that fails must have no effect, read it to the end before acting on it, or build a tree,
which either completes or throws.

## Find where an event is

Every event has a location, not only errors. Locations are useful in application messages such as "the price on line
12 is not a number". These samples read the catalog above with its error corrected, and print where each `title`
starts.

::: code-group

```ts twoslash [Cursor]
import { EventType } from '@exemplarjs/xml';
// ---cut---
const reader = xml.createStreamReader({ systemId: 'file:///data/books.xml', text: source });
while (reader.hasNext()) {
  if (reader.next() === EventType.START_ELEMENT && reader.localName() === 'title') {
    console.log(reader.location());
  }
}
// { line: 2, column: 17, offset: 26, systemId: 'file:///data/books.xml' }
// { line: 3, column: 17, offset: 69, systemId: 'file:///data/books.xml' }
```

```ts twoslash [Event objects]
import { EventType } from '@exemplarjs/xml';
// ---cut---
for (const event of xml.createEventReader({ systemId: 'file:///data/books.xml', text: source })) {
  if (event.type === EventType.START_ELEMENT && event.name.localName === 'title') {
    console.log(event.location);
  }
}
// { line: 2, column: 17, offset: 26, systemId: 'file:///data/books.xml' }
// { line: 3, column: 17, offset: 69, systemId: 'file:///data/books.xml' }
```

```ts twoslash [SAX]
import { type Locator, SAXParser } from '@exemplarjs/sax';
// ---cut---
let locator: Locator;

new SAXParser(xml).parse(
  { systemId: 'file:///data/books.xml', text: source },
  {
    // Called once, before anything else. Keep the locator: it always describes the current event.
    setDocumentLocator: (given) => (locator = given),
    startElement(uri, localName) {
      if (localName === 'title') console.log(locator.lineNumber, locator.columnNumber, locator.systemId);
    },
  }
);
// 2 17 file:///data/books.xml
// 3 17 file:///data/books.xml
```

:::

A location is where the event starts: for a start tag, its `<`. It has the same four fields as an error: `line`,
`column`, `offset` and `systemId`. The SAX locator names them `lineNumber` and `columnNumber`, and has no offset.

Tree nodes do not record their locations. To report the line of a node, record it while reading, before the tree is
built.

## Errors in your own code

An `XMLError` concerns the document. Two other classes concern the code that calls exemplar:

| Class                  | Cause                                       | Example                                     |
| ---------------------- | ------------------------------------------- | ------------------------------------------- |
| `XMLError`             | The document                                | A tag that is never closed                  |
| `InvalidArgumentError` | An invalid option or argument               | A source object with neither text nor bytes |
| `IllegalStateError`    | A call that is invalid in the current state | `elementText()` when not at a start tag     |

All three are exported from `@exemplarjs/xml`, and each package that throws one exports it too.

```ts twoslash
import { IllegalStateError, InvalidArgumentError, XMLError } from '@exemplarjs/xml';

const reader = xml.createStreamReader('<title>Dune</title>');
try {
  reader.elementText(); // too early: the reader is not at the start tag yet
} catch (error) {
  if (error instanceof XMLError) console.log('Bad document:', error.message);
  else if (error instanceof InvalidArgumentError) console.log('Bad value:', error.message);
  else if (error instanceof IllegalStateError) console.log('Bad timing:', error.message);
  else throw error;
}
// Bad timing: elementText() needs a START_ELEMENT
```

The last two indicate bugs in the calling code, not problems to report to the sender of the document. An index that
is out of range, such as the fifth attribute of a start tag that has two, throws a built-in `RangeError`.

## Errors from other parts of exemplar

A few parts have their own error class:

- **XPath** throws an `XPathException`, with the standard XPath error codes.
  [Getting started with XPath](/guide/xpath/#handle-errors) covers it.
- **The writer** throws a `WriterError` when asked to write output that is not XML.
  [Writing XML](/guide/writing/) covers it.
- **A synchronous reader** throws an `AsyncReaderRequiredError` when it is given an
  [asynchronous source](/guide/sources#the-kinds-of-source), or when a resolver needs to wait.
  [Resolvers and access](/guide/external/resolvers#fetch-over-http) shows how to retry.

## Next steps

- [Pipelines](/guide/pipelines): the last page of the introduction, on how readers, changes and writers connect.
- [Error codes](/reference/error-codes): every code and its meaning.
- [Validating against a DTD](/guide/external/validation): an error handler in use.
- [Untrusted input](/guide/production/security): the errors that limits raise.
