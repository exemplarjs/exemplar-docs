# Changing events with a generator

An event reader is an iterable of [event objects](/guide/events/), so a generator function can transform a document as
it is read. The generator consumes the reader's events and yields the ones to keep, along with any it replaces or adds.
Its output is again an iterable of events, which a tree builder or an event writer accepts.

This generator drops every comment, and an event writer writes what is left:

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
import { EventType, type XMLEvent, XMLInputFactory } from '@exemplarjs/xml';

function* withoutComments(input: Iterable<XMLEvent>): Generator<XMLEvent> {
  for (const event of input) {
    if (event.type !== EventType.COMMENT) yield event;
  }
}

const xml = new XMLInputFactory();
const reader = xml.createEventReader('<catalog><!-- old stock --><book>Dune</book></catalog>');

const sink = new StringSink();
const writer = new XMLOutputFactory({ indent: '  ' }).createEventWriter(sink);
writer.add(withoutComments(reader));
writer.flush();

console.log(sink.toString());
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book>Dune</book>
</catalog>
```

The `StringSink` collects the writer's output as a string, and the `indent` option writes each element on its own
line, indented.

The chain is lazy: the writer pulls each event from the generator, which pulls it from the reader. The document passes
through one event at a time and is never held in memory whole.

Dropping single events, as here, needs only a [filter on the reader](/guide/events/#drop-events-with-a-filter). A
generator can also drop whole elements, replace events and add new ones.

The rest of this page uses the catalog from [Reading event objects](/guide/events/), held in `source`:

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

## Drop an element

Dropping an element means dropping its start tag, its end tag and everything between them. Track the nesting depth
inside the element, and yield only while it is zero:

```ts twoslash
import { EventType, type XMLEvent } from '@exemplarjs/xml';
// ---cut---
function* withoutPrices(input: Iterable<XMLEvent>): Generator<XMLEvent> {
  let depth = 0; // how many open elements deep inside a price
  for (const event of input) {
    if (event.type === EventType.START_ELEMENT && (depth > 0 || event.name.localName === 'price')) depth++;
    if (depth === 0) yield event;
    else if (event.type === EventType.END_ELEMENT) depth--;
  }
}
```

Written out, the catalog has no prices:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="b1" lang="en">
    <title>Dune</title>

  </book>
  <book id="b2">
    <title>Emma</title>

  </book>
</catalog>
```

The blank lines are the whitespace that surrounded each price: separate text events, which the generator kept.
[Copying and changing documents](/guide/writing/copying#tidy-the-whitespace) shows how to drop them, so that the writer
can indent the result afresh.

## Change an event

Event properties are read-only, so an event is changed by replacing it: create a new event with an `XMLEventFactory`
and yield that instead. This generator upper-cases every title:

```ts twoslash
import { EventType, type XMLEvent } from '@exemplarjs/xml';
// ---cut---
import { XMLEventFactory } from '@exemplarjs/xml';

const eventFactory = new XMLEventFactory();

function* loudTitles(input: Iterable<XMLEvent>): Generator<XMLEvent> {
  let inTitle = false;
  for (const event of input) {
    if (event.type === EventType.START_ELEMENT) inTitle = event.name.localName === 'title';
    else if (event.type === EventType.END_ELEMENT) inTitle = false;

    if (inTitle && event.type === EventType.CHARACTERS) yield eventFactory.createCharacters(event.text.toUpperCase());
    else yield event;
  }
}
// <title>DUNE</title> … <title>EMMA</title>
```

::: details All the factory's methods

| Creates                  | Method                                                  |
| ------------------------ | ------------------------------------------------------- |
| A start tag              | `createStartElement(name, attributes?, namespaces?)`    |
| An end tag               | `createEndElement(name, namespaces?)`                   |
| An attribute             | `createAttribute(name, value)`                          |
| A namespace declaration  | `createNamespace(prefix, namespaceURI)`                 |
| Text                     | `createCharacters(text)`                                |
| A CDATA section          | `createCData(text)`                                     |
| A comment                | `createComment(text)`                                   |
| A processing instruction | `createProcessingInstruction(target, data)`             |
| Ignorable whitespace     | `createIgnorableSpace(text)`                            |
| An unexpanded reference  | `createEntityReference(name, text?)`                    |
| The start of a document  | `createStartDocument(encoding?, version?, standalone?)` |
| The end of a document    | `createEndDocument()`                                   |

A `name` is a `QName`, which [Add events](#add-events) shows how to construct. An attribute's name can also be a string.

:::

### Change a start tag

A start tag event has a name, attributes and namespace declarations. To change one of the three, create a new start
tag and pass the other two through from the original. This generator adds an attribute to every book:

```ts twoslash
import { EventType, type XMLEvent, XMLEventFactory } from '@exemplarjs/xml';
const eventFactory = new XMLEventFactory();
// ---cut---
function* checked(input: Iterable<XMLEvent>): Generator<XMLEvent> {
  for (const event of input) {
    if (event.type === EventType.START_ELEMENT && event.name.localName === 'book') {
      const attributes = [...event.attributes, eventFactory.createAttribute('checked', 'yes')];
      yield eventFactory.createStartElement(event.name, attributes, event.namespaces);
    } else {
      yield event;
    }
  }
}
// <book id="b1" lang="en" checked="yes"> … <book id="b2" checked="yes">
```

::: warning
To rename an element, change its end tag as well as its start tag: yield a new `createEndElement` with the same new
name. A start tag renamed alone no longer matches its end tag, and a tree builder
[rejects the events](#catch-a-generator-s-mistakes).
:::

## Add events

A generator can yield more events than it consumes. This one appends a `stock` element to every book by yielding three
new events before the book's end tag. Tag names are `QName` objects: `new QName(namespaceURI, localName)`, with `''` as
the namespace URI for a name in no namespace.

```ts twoslash
import { EventType, type XMLEvent, XMLEventFactory } from '@exemplarjs/xml';
const eventFactory = new XMLEventFactory();
// ---cut---
import { QName } from '@exemplarjs/xml';

const STOCK = new QName('', 'stock');

function* withStock(input: Iterable<XMLEvent>): Generator<XMLEvent> {
  for (const event of input) {
    if (event.type === EventType.END_ELEMENT && event.name.localName === 'book') {
      yield eventFactory.createStartElement(STOCK);
      yield eventFactory.createCharacters('12');
      yield eventFactory.createEndElement(STOCK);
    }
    yield event;
  }
}
// <book id="b1" lang="en"> … <stock>12</stock></book>
```

## Combine generators

Generators compose by nesting. Each consumes what the previous one yields, so here `withStock` receives books whose
prices have already been removed:

```ts twoslash
import type { XMLEvent } from '@exemplarjs/xml';
declare function withoutPrices(input: Iterable<XMLEvent>): Generator<XMLEvent>;
declare function withStock(input: Iterable<XMLEvent>): Generator<XMLEvent>;
// ---cut---
const events = withStock(withoutPrices(xml.createEventReader(source)));
// <book id="b1" lang="en"> … <title>Dune</title> … <stock>12</stock></book>
```

## Build a tree from the events

The `build` method of both tree builders accepts any iterable of events. Use `XdmDocumentBuilder` for a tree to query
with [XPath](/guide/xpath/), and `DocumentBuilder` for a [DOM](/guide/dom/).

::: code-group

```ts twoslash [XDM tree]
import type { XMLEvent } from '@exemplarjs/xml';
declare function checked(input: Iterable<XMLEvent>): Generator<XMLEvent>;
// ---cut---
import { XdmDocumentBuilder } from '@exemplarjs/xdm';

const tree = new XdmDocumentBuilder(xml).build(checked(xml.createEventReader(source)));

const count = compiler.compile('count(//book[@checked = "yes"])');
console.log(count.evaluateNumber(tree)); // 2
```

```ts twoslash [DOM]
import type { XMLEvent } from '@exemplarjs/xml';
declare function checked(input: Iterable<XMLEvent>): Generator<XMLEvent>;
// ---cut---
import { DocumentBuilder } from '@exemplarjs/dom';

const document = new DocumentBuilder(xml).build(checked(xml.createEventReader(source)));

const first = document.getElementsByTagName('book')[0];
console.log(first?.getAttribute('checked')); // yes
```

:::

The tree contains what the generator yielded, as if the source had been written that way.

## Write the events as XML

To write the events as a new document, pass them to an event writer, as in the first example on this page. Its `add`
method accepts one event or any iterable of events, and `flush()` passes everything written so far to the destination:

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
import type { XMLEvent } from '@exemplarjs/xml';
declare function checked(input: Iterable<XMLEvent>): Generator<XMLEvent>;
const writer = new XMLOutputFactory().createEventWriter(new StringSink());
// ---cut---
writer.add(checked(xml.createEventReader(source)));
writer.flush();
```

The writer can also write bytes to a file or any other stream. [Writing XML](/guide/writing/#write-to-a-file-or-a-stream)
covers destinations, encodings and indentation, which work the same for the event writer.

## Work with a stream

For events from an asynchronous reader, write the generator as an `async function*` that iterates with `for await`.
`buildAsync` and `addAsync` accept its output:

```ts twoslash
import { XMLOutputFactory } from '@exemplarjs/writer';
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { EventType, type XMLEvent } from '@exemplarjs/xml';
declare const destination: WritableStream<Uint8Array>;
// ---cut---
async function* withoutComments(input: AsyncIterable<XMLEvent>): AsyncGenerator<XMLEvent> {
  for await (const event of input) {
    if (event.type !== EventType.COMMENT) yield event;
  }
}

// Into a tree:
const tree = await new XdmDocumentBuilder(xml).buildAsync(withoutComments(xml.createAsyncEventReader(stream)));

// Or into a file or other stream:
const writer = new XMLOutputFactory().createEventWriter(destination);
await writer.addAsync(withoutComments(xml.createAsyncEventReader(stream)));
await writer.close();
```

`addAsync` applies backpressure: it periodically awaits the destination, so output does not accumulate in memory when
the destination is slow. `close()` resolves once the destination has received everything.

## Catch a generator's mistakes

A generator can yield an invalid sequence: an end tag whose start tag it dropped, or text after the last end tag. The
tree builders check the events as they arrive and throw an `XMLError`, the error a reader throws for a source that is
not well formed. They check that:

- every end tag matches the start tag it closes;
- there is one outermost element, with no text outside it;
- names are valid XML names.

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { EventType, type XMLEvent } from '@exemplarjs/xml';
// ---cut---
function* broken(input: Iterable<XMLEvent>): Generator<XMLEvent> {
  for (const event of input) {
    const isPriceStart = event.type === EventType.START_ELEMENT && event.name.localName === 'price';
    if (!isPriceStart) yield event; // the end tags are still there
  }
}

new XdmDocumentBuilder(xml).build(broken(xml.createEventReader(source)));
// XMLError: WF_END_TAG_MISMATCH: An end tag price where element book is open (4:31)
```

The event writer applies the [stream writer's checks](/guide/writing/#escaping-and-checks), and throws a
`WriterError` for output that would not be well formed. Given the same events, it fails with
`The end tag price does not match the open element book`.

## Make an element from nothing

The events need not come from a reader, or form a whole document. When the first event is a start tag, with no
`START_DOCUMENT` before it, the builders create a document containing that one element, and the event writer writes the
element with no XML declaration. This generator creates a `book` element:

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { QName, type XMLEvent, XMLEventFactory } from '@exemplarjs/xml';
const eventFactory = new XMLEventFactory();
// ---cut---
const BOOK = new QName('', 'book');
const TITLE = new QName('', 'title');

function* oneBook(): Generator<XMLEvent> {
  yield eventFactory.createStartElement(BOOK, [eventFactory.createAttribute('id', 'b3')]);
  yield eventFactory.createStartElement(TITLE);
  yield eventFactory.createCharacters('Persuasion');
  yield eventFactory.createEndElement(TITLE);
  yield eventFactory.createEndElement(BOOK);
}

const tree = new XdmDocumentBuilder(xml).build(oneBook());
console.log(compiler.compile('/book/title').evaluateString(tree)); // Persuasion
```

An event writer serializes the same events as `<book id="b3"><title>Persuasion</title></book>`.

::: details Elements in a namespace
A new start tag in a namespace needs a namespace declaration, or the writer rejects the prefix. Pass it as the third
argument:

```ts twoslash
import { QName, XMLEventFactory } from '@exemplarjs/xml';
const eventFactory = new XMLEventFactory();
// ---cut---
const DC = 'http://purl.org/dc/elements/1.1/';
const title = new QName(DC, 'title', 'dc');

const start = eventFactory.createStartElement(title, [], [eventFactory.createNamespace('dc', DC)]);
// <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">
```

An `XMLOutputFactory` made with `repairNamespaces: true` adds missing declarations automatically.
:::

## Next steps

- Two worked examples in the exemplar repository are complete programs:
  [a generator into a tree and XPath](https://github.com/exemplarjs/exemplar/tree/main/examples/09-change-events-with-a-generator)
  and [a generator into a new document](https://github.com/exemplarjs/exemplar/tree/main/examples/10-events-into-a-file).
- [Copying and changing documents](/guide/writing/copying): the other ways to transform a document on its way to a
  writer, and how to choose between them.
- [Pipelines](/guide/pipelines): how the reading APIs, trees and writers connect.
