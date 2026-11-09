# Pipelines: read, change, build or write

A pipeline connects a reader to a tree builder or a writer, optionally with stages in between that change the
events passing through. Pipelines cover building a tree to query, writing a new file, and copying a document with
content removed or altered on the way.

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
import { EventType, XMLInputFactory } from '@exemplarjs/xml';
import { createFilteredReader } from '@exemplarjs/xml/filters';

const xml = new XMLInputFactory();
const source = '<catalog><!-- draft --><book id="b1"><title>Dune</title></book></catalog>';

// Read...
const reader = xml.createStreamReader(source);
// ...change...
const withoutComments = createFilteredReader(reader, (r) => r.eventType() !== EventType.COMMENT);
// ...write. A StringSink collects the output as a string.
// The indent option lays the output out, one element to a line.
const sink = new StringSink();
const writer = new XMLOutputFactory({ indent: '  ' }).createStreamWriter(sink);
writer.copy(withoutComments);

console.log(sink.toString());
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="b1">
    <title>Dune</title>
  </book>
</catalog>
```

No stage here holds the whole document. Each event is read, tested and written before the next is read, so memory use
does not grow with the size of the input.

This page is an overview of what connects to what. The linked pages cover each part.

## The three parts

Every pipeline has the same three parts, and the example above has one of each.

1. **A reader.** Here it is the cursor. It could equally be a SAX parser or an event reader, the other two streaming
   APIs from [Choosing how to read](/guide/choosing-an-api).
2. **An optional change.** Here it is `createFilteredReader`, which takes one or more predicates and reports an event
   only if every predicate returns `true` for it. Without this part, the pipeline is a plain read or a plain copy.
3. **An ending**, which consumes the events and builds a result. Here it is a writer; it could be a tree builder instead.

The parts are independent: the ending can be replaced without touching the change, and the reverse.

## Swap the ending

Passing the same filtered reader to a tree builder produces a tree with no comments, ready to query with XPath:

```ts twoslash
import { EventType } from '@exemplarjs/xml';
import { createFilteredReader } from '@exemplarjs/xml/filters';
const source = '<catalog><!-- draft --><book id="b1"><title>Dune</title></book></catalog>';
const reader = xml.createStreamReader(source);
const withoutComments = createFilteredReader(reader, (r) => r.eventType() !== EventType.COMMENT);
// ---cut---
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { XPathCompiler } from '@exemplarjs/xpath';

const catalog = new XdmDocumentBuilder().parse(withoutComments);

const comments = new XPathCompiler().compile('count(//comment())');
console.log(comments.evaluateNumber(catalog));
// 0
```

A DOM builder, a SAX parser and `canonicalize`, which writes [canonical XML](/guide/writing/canonical), accept a
reader in the same way. [Every connection](#every-connection) below lists the calls.

Each of them consumes from the reader's current position. At the start of a document, that is the whole document. At a
start tag, it is that one element, and the reader is left at its end tag, which is how a large file is processed
[one record at a time](/guide/cursor/records).

::: info
Every ending checks its input. If a change produces events that do not form a document, such as an end tag with no
start tag or two root elements, the ending throws at that event: a tree builder an `XMLError`, a writer a
`WriterError`. It never produces a malformed tree or file.
:::

## Choose how to make the change

A filter can only drop events. Each reading API has its own mechanisms for changing them, with different
capabilities. Choose by the change required.

| Change                                                        | Use                                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Drop comments, elements or other content                      | A [cursor filter](/guide/cursor/filters): the least code                     |
| Change text, attribute values or names                        | A [delegate](/guide/cursor/delegates)                                        |
| Add attributes                                                | A [SAX filter](/guide/sax/filters)                                           |
| Add, move or duplicate elements and text                      | A [generator over event objects](/guide/events/generators), or a SAX filter  |
| Make many scattered changes to a document that fits in memory | Build a [DOM tree](/guide/dom/), change it, and [save it](/guide/dom/saving) |
| Make no change at all                                         | Pass the source straight to the builder or parser                            |

A delegate wraps a cursor and overrides selected accessors. A SAX filter sits between the parser and a handler: it
receives each callback and forwards it, modified or not. A generator function takes event objects and yields the
events to pass on: the originals, replacements or additions.

## Every connection

Each reading API reaches the same endings through its own calls. Every row is a supported connection. In the
calls, `xdmBuilder` is an `XdmDocumentBuilder`, `domBuilder` a `DocumentBuilder`, `saxParser` a `SAXParser` and
`output` an `XMLOutputFactory`, which creates `writer` and `eventWriter`.

| From          | Change with                                                                                           | Into                   | With                                   |
| ------------- | ----------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------- |
| A cursor      | [Filters](/guide/cursor/filters), [delegates](/guide/cursor/delegates)                                | An XDM tree, for XPath | `xdmBuilder.parse(reader)`             |
|               |                                                                                                       | A DOM tree             | `domBuilder.parse(reader)`             |
|               |                                                                                                       | Written XML            | `writer.copy(reader)`                  |
|               |                                                                                                       | Canonical XML          | `canonicalize(reader)`                 |
|               |                                                                                                       | A SAX handler          | `saxParser.parse(reader, handler)`     |
| SAX calls     | [SAX filters](/guide/sax/filters)                                                                     | An XDM tree, for XPath | `xdmBuilder.createSAXHandler()`        |
|               |                                                                                                       | A DOM tree             | `domBuilder.createSAXHandler()`        |
|               |                                                                                                       | Written XML            | `output.createSAXHandler(destination)` |
| Event objects | [A generator](/guide/events/generators), or [event filters](/guide/events/#drop-events-with-a-filter) | An XDM tree, for XPath | `xdmBuilder.build(events)`             |
|               |                                                                                                       | A DOM tree             | `domBuilder.build(events)`             |
|               |                                                                                                       | Written XML            | `eventWriter.add(events)`              |

SAX filters and generators need an ending too. [SAX filters](/guide/sax/filters#end-the-chain-build-a-tree-or-write-xml)
and [Changing events with a generator](/guide/events/generators#build-a-tree-from-the-events) show theirs.

## Mix the ways of reading

The reading APIs can be combined. A SAX parser and an event reader can both read from a cursor, so a filter or
delegate applied to the cursor carries through:

```ts twoslash
import { type SAXHandler, SAXParser } from '@exemplarjs/sax';
import { createFilteredReader, type StreamFilter } from '@exemplarjs/xml/filters';
declare const noComments: StreamFilter;
declare const handler: SAXHandler;
// ---cut---
const reader = createFilteredReader(xml.createStreamReader(source), noComments);

// Event objects from a filtered cursor:
const events = xml.createEventReader(reader);

// Or SAX calls from one (a reader can be read only once, so choose one):
// new SAXParser(xml).parse(reader, handler);
```

A job can then be split: a cursor filter drops the unwanted content, and a SAX filter or a generator adds the new
attributes or elements.

## When the input is a stream

Every connection above has an asynchronous form, for a `ReadableStream` or async iterable source such as an HTTP
response body. The structure of the code is the same.

| From          | Start with                                    | Into                                                                                                                                                   |
| ------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A cursor      | `xml.createAsyncStreamReader(stream)`         | `await builder.parseAsync(reader)`, `await writer.copyAsync(reader)`, `await canonicalizeAsync(reader)`, `await saxParser.parseAsync(reader, handler)` |
| SAX calls     | `await saxParser.parseAsync(stream, handler)` | The same handlers as before                                                                                                                            |
| Event objects | `xml.createAsyncEventReader(stream)`          | `await builder.buildAsync(events)`, `await eventWriter.addAsync(events)`                                                                               |

See [Large files and streams](/guide/cursor/streams) for the asynchronous cursor.

When writing to a file or a network stream, finish with `await writer.close()`. Its promise settles when the stream
has accepted all of the writer's output.

## Next steps

The rest of the guide covers one API at a time, and each group can be read independently.

- [Reading with the cursor](/guide/cursor/): the reader that most pipelines start from.
- [Dropping content with filters](/guide/cursor/filters) and
  [Changing content with delegates](/guide/cursor/delegates): changes made on a cursor.
- [SAX filters](/guide/sax/filters): changes made between a SAX parser and its handler.
- [Changing events with a generator](/guide/events/generators): changes made to event objects.
- [Copying and changing documents](/guide/writing/copying): the writer as the ending.
