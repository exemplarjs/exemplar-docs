# Handling events with SAX

SAX is the push API: the parser calls a handler's `startElement`, `characters`, `endElement` and other callbacks as it
reads. `SAXParser` drives a [cursor](/guide/cursor/) and passes each event's data as callback arguments, so it creates
no event objects and every reader option applies. Use it to port code written against SAX, to transform a document
with [SAX filters](/guide/sax/filters), which can add attributes and elements, or to read the element and attribute
declarations of a DTD, which the other streaming APIs do not report. For new code that only reads, the cursor is
usually clearer, because the loop decides what to read next.

The examples on this page read this catalog, held in a string called `source`:

```xml
<catalog>
  <book id="b1" lang="en">
    <title>Dune</title>
    <price currency="GBP">8.99</price>
  </book>
  <book id="b2">
    <title>Emma</title>
    <price currency="GBP">6.50</price>
  </book>
</catalog>
```

This handler implements two callbacks, which the parser calls for every start and end tag:

```ts twoslash
import { SAXParser } from '@exemplarjs/sax';

const parser = new SAXParser();

parser.parse(source, {
  startElement(uri, localName) {
    console.log('start', localName);
  },
  endElement(uri, localName) {
    console.log('end', localName);
  },
});
// start catalog
// start book
// start title
// end title
// start price
// end price
// end book
// …
```

`parse` returns when the whole document has been read. Every handler method is optional: this handler has none for
text, so the parser reads the text without reporting it.

## Write a handler

Each callback reports one event, so a handler usually keeps state between calls. This one collects the titles: it sets
a flag when a `title` starts, accumulates the text that follows, and stores it when the `title` ends:

```ts twoslash
import { SAXParser } from '@exemplarjs/sax';
const parser = new SAXParser();
// ---cut---
const titles: string[] = [];
let inTitle = false;
let text = '';

parser.parse(source, {
  startElement(uri, localName) {
    if (localName === 'title') {
      inTitle = true;
      text = '';
    }
  },
  characters(chunk) {
    if (inTitle) text += chunk;
  },
  endElement(uri, localName) {
    if (localName === 'title') {
      titles.push(text);
      inTitle = false;
    }
  },
});

console.log(titles); // [ 'Dune', 'Emma' ]
```

`startElement` and `endElement` receive an element's name in three forms:

- `uri` is the element's namespace URI, or `''` when it has none.
- `localName` is the name without a prefix: `title` for `<dc:title>`.
- `qName` is the qualified name, as written: `dc:title`.

[Namespaces](/guide/namespaces) covers prefixes and namespace URIs.

A handler can also be a class instance, which keeps the state with the callbacks. A class that `implements SAXHandler`
has its method names and parameters type-checked:

```ts twoslash
import { SAXParser } from '@exemplarjs/sax';
const parser = new SAXParser();
// ---cut---
import type { SAXHandler } from '@exemplarjs/sax';

class ElementCounter implements SAXHandler {
  count = 0;

  startElement(): void {
    this.count++;
  }
}

const counter = new ElementCounter();
parser.parse(source, counter);
console.log(counter.count); // 7
```

## Text may arrive in several calls

The parser may call `characters` more than once for the text of one element. A new call starts at each CDATA section,
at each reference to an [entity that a DTD declares](/guide/external/dtd), and after each comment or processing instruction in the text.
Built-in references such as `&amp;` are replaced in place and start no new call:

```ts twoslash
import { SAXParser } from '@exemplarjs/sax';
const parser = new SAXParser();
// ---cut---
parser.parse('<title>Pride &amp; Prejudice<![CDATA[ <1813>]]></title>', {
  characters(chunk) {
    console.log(JSON.stringify(chunk));
  },
});
// "Pride & Prejudice"
// " <1813>"
```

One `characters` call is therefore not necessarily an element's whole text. Concatenate the chunks and use the result
when the element ends, as the title collector above does.

## Read attributes

`startElement` receives the start tag's attributes as its fourth argument. `value(name)` returns one attribute's value,
or `undefined` when the tag has no such attribute. The attributes are also accessible by index, from `0` to
`length - 1`:

```ts twoslash
import { SAXParser } from '@exemplarjs/sax';
const parser = new SAXParser();
// ---cut---
parser.parse(source, {
  startElement(uri, localName, qName, attributes) {
    if (localName !== 'book') return;
    console.log(attributes.value('id'), attributes.value('lang'));
    for (let i = 0; i < attributes.length; i++) {
      console.log(' ', attributes.qName(i), '=', attributes.value(i));
    }
  },
});
// b1 en
//   id = b1
//   lang = en
// b2 undefined
//   id = b2
```

The attributes object has these members:

| Member                                  | Returns                                                           |
| --------------------------------------- | ----------------------------------------------------------------- |
| `length`                                | The number of attributes on the tag                               |
| `value(qName)`, `value(uri, localName)` | A value by name, or `undefined`                                   |
| `index(qName)`, `index(uri, localName)` | An attribute's position by name, or `-1`                          |
| `value(i)`                              | The value at a position                                           |
| `qName(i)`, `localName(i)`, `uri(i)`    | The name at a position: as written, without prefix, its namespace |
| `type(i)`                               | The type a DTD declares for it, `CDATA` when none does            |
| `isSpecified(i)`                        | Whether it was written in the tag, not supplied by a DTD default  |

::: warning
The attributes object is valid only during the `startElement` call: it reads directly from the parser's state, which
changes once the callback returns. Copy the values you need; do not retain the object.
:::

## Handle errors

The parser reports problems in the document through three methods:

| Method              | Called for                                                                           |
| ------------------- | ------------------------------------------------------------------------------------ |
| `warning(error)`    | A condition that is not an error; parsing continues                                  |
| `error(error)`      | A recoverable error, such as a [validation](/guide/external/validation) error        |
| `fatalError(error)` | A document that is not well formed; `parse` throws the error when the method returns |

Each method receives an `XMLError` with a `code`, a `message` and a `location`:

```ts twoslash
import { SAXParser } from '@exemplarjs/sax';
const parser = new SAXParser();
// ---cut---
try {
  parser.parse('<catalog>\n  <book>\n</catalog>', {
    fatalError(error) {
      console.log(error.code, 'at line', error.location.line);
    },
  });
} catch (error) {
  // the same error, thrown once fatalError has returned
}
// WF_END_TAG_MISMATCH at line 3
```

When the handler has no `error` method, a recoverable error goes to the `errorHandler` option of the
[parser's factory](#set-the-parser-s-options) if that has an `error` method, and is otherwise thrown from `parse`.
[Errors and locations](/guide/errors) covers errors in full.

## Find where you are

The parser calls `setDocumentLocator` before any other method, passing a `Locator`. Keep a reference to it: during any
later callback, it returns the position at which the event being reported starts:

```ts twoslash
import { SAXParser } from '@exemplarjs/sax';
const parser = new SAXParser();
// ---cut---
import type { Locator } from '@exemplarjs/sax';

let locator: Locator | undefined;

parser.parse(source, {
  setDocumentLocator(given) {
    locator = given;
  },
  startElement(uri, localName) {
    if (localName === 'price') console.log(`price at ${locator?.lineNumber}:${locator?.columnNumber}`);
  },
});
// price at 4:5
// price at 8:5
```

Lines and columns are 1-based. The locator also has the document's `systemId` (its URI, when the source gave one), its
`xmlVersion` and its `encoding`.

## Parse a stream

`parseAsync` takes a `ReadableStream` or an async iterable of bytes and calls the same handler methods as each chunk
arrives, so the document is never buffered whole:

```ts twoslash
import { SAXParser } from '@exemplarjs/sax';
const parser = new SAXParser();
// ---cut---
let books = 0;

await parser.parseAsync(stream, {
  startElement(uri, localName) {
    if (localName === 'book') books++;
  },
});
console.log(books);
```

The handler's methods remain synchronous; only `parseAsync` itself is awaited.
[Large files and streams](/guide/cursor/streams) shows how to open a stream over a file or a `fetch` response.

## Parse from a cursor

`parse` and `parseAsync` also accept a [cursor](/guide/cursor/) in place of a source. The handler then receives the
events the cursor reads, starting from the cursor's current position.

When the cursor is positioned on a start tag, only that element is parsed. The handler receives the element as a
document of its own, and the cursor is left on the element's end tag. A loop can then process a large file one record
at a time:

```ts twoslash
import { SAXParser, type SAXHandler } from '@exemplarjs/sax';
import { EventType } from '@exemplarjs/xml';
const parser = new SAXParser();
declare const bookHandler: SAXHandler;
// ---cut---
const reader = xml.createStreamReader(source);
reader.nextTag(); // <catalog>

while (reader.nextTag() === EventType.START_ELEMENT) {
  parser.parse(reader, bookHandler); // one <book>, start to end
}
```

[One record at a time](/guide/cursor/records) covers this pattern.

A cursor can also have [filters](/guide/cursor/filters) that drop content or [delegates](/guide/cursor/delegates) that
change it, and the handler receives only their output.

::: warning
When you pass a cursor, the options and error handler of the factory that created it apply, not the parser's. The
handler's `warning`, `error` and `fatalError` methods are not called: errors are thrown from `parse`, or go to that
factory's `errorHandler`.
:::

## Set the parser's options

`SAXParser` has no reader options of its own: pass an `XMLInputFactory` to its constructor and the parser reads with
that factory's options, so everything in [Reader options](/reference/options) applies. Without a factory, the parser
uses the defaults.

```ts twoslash
import { SAXParser } from '@exemplarjs/sax';
import { XMLInputFactory } from '@exemplarjs/xml';
// ---cut---
const parser = new SAXParser(new XMLInputFactory({ coalescing: true }));
```

With `coalescing` on, as here, entity references and CDATA sections no longer start a new `characters` call. A comment
or processing instruction inside an element's text still does, so the handler must still concatenate.

::: details The parser's own two options
The parser takes two options of its own as a second constructor argument. The factory's options control how the XML is
read; the parser's control how it is reported to the handler. Both are rarely needed:

| Option           | Default | Effect                                                                                                 |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `resolveDTDURIs` | `true`  | Reports file references in DTD declarations as full URIs. Set it to `false` to report them as written. |
| `xmlnsURIs`      | `false` | Reports `xmlns` attributes as being in the `http://www.w3.org/2000/xmlns/` namespace, not in none.     |

```ts twoslash
import { SAXParser } from '@exemplarjs/sax';
// ---cut---
const parser = new SAXParser(xml, { resolveDTDURIs: false, xmlnsURIs: true });
```

Namespace declarations such as `xmlns:dc="…"` reach the handler through `startPrefixMapping` and are not in the
attributes. A factory made with `namespacePrefixes: true` also lists them as attributes, and `xmlnsURIs` then decides
which namespace they report.

With `namespaceAware: false` on the factory, names are not split: `uri` and `localName` are `''`, and `qName` holds the
name as written.
:::

## Every handler method

`SAXHandler` has a method for every construct in a document, not only elements and text. All are optional, and all
belong to the same object.

### Content

| Method                                            | Called for                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `startDocument()`, `endDocument()`                | The start and end of the document                                            |
| `startElement(uri, localName, qName, attributes)` | A start tag                                                                  |
| `endElement(uri, localName, qName)`               | An end tag                                                                   |
| `characters(text)`                                | Text, including the text of CDATA sections                                   |
| `ignorableWhitespace(text)`                       | Whitespace between elements that a validating parser identifies as layout    |
| `processingInstruction(target, data)`             | A processing instruction such as `<?print wide?>`                            |
| `startPrefixMapping(prefix, uri)`                 | A namespace declaration, before the start tag that declares it               |
| `endPrefixMapping(prefix)`                        | The end of that declaration's element                                        |
| `skippedEntity(name)`                             | A reference such as `&chapter;` that the parser did not expand               |
| `setDocumentLocator(locator)`                     | Once, before any other method; see [Find where you are](#find-where-you-are) |

An empty-element tag such as `<stock/>` produces a `startElement` immediately followed by an `endElement`.

### Comments, CDATA and the DOCTYPE

These methods report how the document was written, which matters when copying it.

| Method                                           | Called for                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| `comment(text)`                                  | A comment                                                             |
| `startCDATA()`, `endCDATA()`                     | Around the `characters` calls for a `<![CDATA[…]]>` section           |
| `startDTD(name, publicId, systemId)`, `endDTD()` | The `<!DOCTYPE …>` declaration; its declarations come between the two |
| `startEntity(name)`, `endEntity(name)`           | Around the content that a reference such as `&shop;` expands to       |

::: details Methods for DTD declarations
These report the declarations of a document's [DTD](/guide/external/dtd). Few programs need them.

| Method                                                         | Called for                                 |
| -------------------------------------------------------------- | ------------------------------------------ |
| `elementDecl(name, model)`                                     | `<!ELEMENT catalog (book)*>`               |
| `attributeDecl(elementName, attributeName, type, mode, value)` | `<!ATTLIST book id ID #REQUIRED>`          |
| `internalEntityDecl(name, value)`                              | `<!ENTITY shop "Books &amp; Co">`          |
| `externalEntityDecl(name, publicId, systemId)`                 | `<!ENTITY chapter SYSTEM "ch1.xml">`       |
| `notationDecl(name, publicId, systemId)`                       | `<!NOTATION gif SYSTEM "image/gif">`       |
| `unparsedEntityDecl(name, publicId, systemId, notationName)`   | `<!ENTITY cover SYSTEM "c.gif" NDATA gif>` |

:::

::: tip Coming from Java
`SAXParser` is SAX's `XMLReader`, and `SAXHandler` is `ContentHandler`, `LexicalHandler`, `DeclHandler`, `DTDHandler`
and `ErrorHandler` in one interface, so there is one handler to pass in place of five setters. Text arrives as a string,
not as a `char[]` with a start and length. `Attributes` has the methods of `Attributes2` under shorter names:
`value(i)` for `getValue(i)`, `index(qName)` for `getIndex(qName)`. The locator is a `Locator2`.

The factory's options stand in for SAX's features: `namespaceAware` for `namespaces`, `namespacePrefixes` for
`namespace-prefixes`. The parser's own two are `resolve-dtd-uris` and `xmlns-uris`.
[Coming from Java](/reference/java) lists the rest.
:::

## Next steps

- [SAX filters](/guide/sax/filters): change events between the parser and a handler, then build a tree or write a new
  document.
- [Reader options](/reference/options): every option the parser's factory takes.
- [Pipelines](/guide/pipelines): how the reading APIs, trees and writers connect.
