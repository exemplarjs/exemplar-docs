# Reading event objects

`createEventReader` returns a pull parser that reports each event as a read-only object. The object owns its data, so
it stays valid after the reader advances and can be stored, passed to other functions or yielded from a
[generator](/guide/events/generators). The reader allocates an object for every event and copies the event's strings
into it; the [cursor](/guide/cursor/) allocates no object per event and produces a string only when an accessor is
called. Use the event reader when events must outlive the step that read them, and the cursor otherwise.

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

This loop prints the local name of every start tag:

```ts twoslash
import { EventType, XMLInputFactory } from '@exemplarjs/xml';

const xml = new XMLInputFactory();

for (const event of xml.createEventReader(source)) {
  if (event.type === EventType.START_ELEMENT) console.log(event.name.localName);
}
// catalog
// book
// title
// price
// book
// title
// price
```

`createEventReader` accepts a string, bytes or any other [source](/guide/sources), and each call returns an independent
reader, so one `XMLInputFactory` serves any number of documents. The reader is an iterator, so `for...of` visits the
events in document order.

## Tell the kinds of event apart

Every event has a `type`, one of the `EventType` constants. `XMLEvent` is a union discriminated by `type`, so checking
it narrows the event to the properties of that kind.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
for (const event of xml.createEventReader(source)) {
  switch (event.type) {
    case EventType.START_ELEMENT:
      console.log('start', event.name.localName);
      break;
    case EventType.CHARACTERS:
      console.log('text', JSON.stringify(event.text));
      break;
    case EventType.END_ELEMENT:
      console.log('end', event.name.localName);
      break;
  }
}
// start catalog
// text "\n  "
// start book
// text "\n    "
// start title
// text "Dune"
// end title
// …
```

Whitespace between tags is reported as `CHARACTERS` events too, hence the `"\n  "` in the output.

Most documents produce only these types:

| `event.type`             | Reported for                                      | Properties                          |
| ------------------------ | ------------------------------------------------- | ----------------------------------- |
| `START_DOCUMENT`         | The start of the document                         | `version`, `encoding`, `standalone` |
| `START_ELEMENT`          | A start tag such as `<book id="b1">`              | `name`, `attributes`, `namespaces`  |
| `END_ELEMENT`            | An end tag such as `</book>`                      | `name`, `namespaces`                |
| `CHARACTERS`             | Text                                              | `text`                              |
| `CDATA`                  | A `<![CDATA[…]]>` section                         | `text`                              |
| `COMMENT`                | A comment                                         | `text`                              |
| `PROCESSING_INSTRUCTION` | A processing instruction such as `<?print wide?>` | `target`, `data`                    |
| `DTD`                    | The `<!DOCTYPE …>` declaration                    | `text`, `doctype`                   |
| `END_DOCUMENT`           | The end of the document                           | None                                |

An empty-element tag such as `<stock/>` produces a `START_ELEMENT` immediately followed by an `END_ELEMENT`. Event
properties are read-only.

::: details Less common types

- `SPACE` is whitespace between elements that a [validating](/guide/external/validation) reader identifies as layout
  only. It has `text`.
- `ENTITY_REFERENCE` is an entity reference such as `&chapter;` left unexpanded, which happens when the factory has
  `replaceEntityReferences: false`. It has `name` and `text`.
- `START_ENTITY` and `END_ENTITY` mark where the content of an expanded reference begins and ends. They are reported
  when the factory has `reportEntityBoundaries: true`, and have `name`.

[DTDs and entities](/guide/external/dtd) covers entities and references.

:::

## Read a start tag

A start tag event holds the element's name, its attributes and the namespaces the tag declares.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
for (const event of xml.createEventReader(source)) {
  if (event.type !== EventType.START_ELEMENT) continue;
  if (event.name.localName !== 'book') continue;

  console.log(event.attribute('id')?.value, event.attribute('lang')?.value);
  for (const attribute of event.attributes) console.log(' ', attribute.localName, '=', attribute.value);
}
// b1 en
//   id = b1
//   lang = en
// b2 undefined
//   id = b2
```

`event.attribute(name)` returns the attribute with that name, or `undefined` when the tag has none. `event.attributes`
is an array of all of them.

::: tip Coming from Java
The event reader is StAX's `XMLEventReader`, and the events are its `XMLEvent`s as one union type. In place of
`event.isStartElement()` and `event.asStartElement()`, compare `event.type`. `event.attribute('id')` is
`getAttributeByName(new QName("id"))`.
:::

### Names with a prefix

In a name such as `dc:title`, the prefix `dc` is bound to a namespace URI; see [Namespaces](/guide/namespaces). An
element's `name` is a `QName`, a qualified name with three parts, and an attribute has the same three beside its
`value`:

| Part           | For `<dc:title>`                | When the name has no prefix                         |
| -------------- | ------------------------------- | --------------------------------------------------- |
| `localName`    | `title`                         | The whole name                                      |
| `prefix`       | `dc`                            | `''`                                                |
| `namespaceURI` | The namespace URI bound to `dc` | `''`, or the default namespace when one is declared |

An unprefixed attribute is in no namespace, regardless of the default namespace.

`name.toString()` returns the name as written. To look up a prefixed attribute, pass its namespace URI as the second
argument of `attribute`:

```ts twoslash
import { EventType, XML_NAMESPACE } from '@exemplarjs/xml';

const text = '<dc:title xml:lang="en" xmlns:dc="http://purl.org/dc/elements/1.1/">Dune</dc:title>';

for (const event of xml.createEventReader(text)) {
  if (event.type !== EventType.START_ELEMENT) continue;
  console.log(event.name.toString(), event.name.namespaceURI, event.attribute('lang', XML_NAMESPACE)?.value);
}
// dc:title http://purl.org/dc/elements/1.1/ en
```

The `xmlns:dc="…"` declaration is not in `attributes`. It is in `event.namespaces`, the namespaces the tag
declares, as `{ prefix: 'dc', namespaceURI: 'http://purl.org/dc/elements/1.1/' }`.

## Read an element's text

An element's text is reported as one or more separate events. The reader's `elementText()` concatenates them: call it
after the start tag of an element with text-only content. It returns the text and advances the reader past the
element's end tag, and throws an `IllegalStateError` if it meets a child element.

This loop maps each book's title to its price. The reader is held in a variable so that the loop body can call
`elementText()` on it:

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
const reader = xml.createEventReader(source);
const prices = new Map<string, string>();
let title = '';

for (const event of reader) {
  if (event.type !== EventType.START_ELEMENT) continue;
  if (event.name.localName === 'title') title = reader.elementText();
  if (event.name.localName === 'price') prices.set(title, reader.elementText());
}
console.log(prices);
// Map(2) { 'Dune' => '8.99', 'Emma' => '6.50' }
```

### Step through by hand

The reader can also be advanced explicitly, which suits code that knows the structure it expects:

- `nextEvent()` returns the next event, and `hasNext()` returns whether there is one.
- `nextTag()` returns the next start or end tag. It skips whitespace, comments and processing instructions, and throws
  if it meets any other text first.
- `peek()` returns the next event without advancing, or `undefined` at the end of the document.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
const reader = xml.createEventReader('<book>\n  <!-- a classic -->\n  <title>Dune</title>\n</book>');

reader.nextTag(); // <book>
reader.nextTag(); // <title>, past the line breaks and the comment

const next = reader.peek();
if (next?.type === EventType.CHARACTERS) console.log(next.text); // Dune

console.log(reader.elementText()); // Dune: peek() did not move the reader
```

## Keep events for later

An event's strings are copies, not slices of the parser's input buffer, so a retained event does not keep that buffer
in memory. Events can be collected in an array, passed to another function or held back until later events have been
read:

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
const events = [...xml.createEventReader(source)];
const startTags = events.filter((event) => event.type === EventType.START_ELEMENT);
console.log(startTags.length); // 7
```

The [cursor](/guide/cursor/) creates no event objects: its accessors describe the current event only, and their results
change when it advances.

## Find where an event is

Every event has a `location`: the line, column and offset at which it starts in the source, for use in diagnostics
about the content.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
for (const event of xml.createEventReader(source)) {
  if (event.type === EventType.START_ELEMENT && event.name.localName === 'book') {
    const { line, column } = event.location;
    console.log(`book ${event.attribute('id')?.value} at ${line}:${column}`);
  }
}
// book b1 at 2:3
// book b2 at 6:3
```

Lines and columns are 1-based. [Errors and locations](/guide/errors) covers locations in more detail.

## Read from a stream

`createAsyncEventReader` takes a `ReadableStream` or an async iterable of bytes and parses each chunk as it arrives, so
the document is never buffered whole. The reader is an async iterable of events, and its `batches()` method iterates
them a batch at a time:

::: code-group

```ts twoslash [Per event]
import { EventType } from '@exemplarjs/xml';
// ---cut---
for await (const event of xml.createAsyncEventReader(stream)) {
  if (event.type === EventType.START_ELEMENT) console.log(event.name.localName);
}
```

```ts twoslash [Per batch]
import { EventType } from '@exemplarjs/xml';
// ---cut---
for await (const batch of xml.createAsyncEventReader(stream).batches()) {
  for (const event of batch) {
    if (event.type === EventType.START_ELEMENT) console.log(event.name.localName);
  }
}
```

:::

Iterating per event awaits once per event. `batches()` yields an array of the events that each input chunk completes,
so the loop awaits once per chunk and iterates the array synchronously.

The asynchronous reader supports iteration only: it has no `elementText()`, `nextTag()`, `nextEvent()` or `peek()`. To
read an element's text, concatenate its `CHARACTERS` events.

[Large files and streams](/guide/cursor/streams) shows how to open a stream over a file or a `fetch` response.

### Get the events as a web stream

`createEventStream` returns the events as a `ReadableStream`, for code built on web streams:

```ts twoslash
import type { XMLEvent } from '@exemplarjs/xml';
declare const consumer: WritableStream<XMLEvent>;
// ---cut---
await xml.createEventStream(stream).pipeTo(consumer);
```

::: details Feed the reader yourself
When the input is not a stream, such as messages from a socket, create the reader with no source, pass each chunk to
`feed()`, and call `endOfInput()` after the last one:

```ts twoslash
import { EventType } from '@exemplarjs/xml';
declare const firstHalf: Uint8Array;
declare const secondHalf: Uint8Array;
// ---cut---
const reader = xml.createAsyncEventReader();

reader.feed(firstHalf);
reader.feed(secondHalf);
reader.endOfInput();

for await (const event of reader) {
  if (event.type === EventType.START_ELEMENT) console.log(event.name.localName);
}
```

The loop can also run while chunks are still arriving: it awaits whenever it has consumed everything fed so far.
:::

## Drop events with a filter

`createFilteredReader` takes an event reader and one or more predicates. The reader then reports an event only if
every predicate returns `true` for it. This filter drops whitespace-only text:

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
import { createFilteredReader, type EventFilter } from '@exemplarjs/xml/filters';

const noLayout: EventFilter = (event) => event.type !== EventType.CHARACTERS || /[^ \t\r\n]/.test(event.text);

const reader = createFilteredReader(xml.createEventReader(source), noLayout);

for (const event of reader) {
  if (event.type === EventType.CHARACTERS) console.log(JSON.stringify(event.text));
}
// "Dune"
// "8.99"
// "Emma"
// "6.50"
```

`createFilteredReader` returns the same reader with the filters added. Iteration, `nextEvent()`, `nextTag()`, `peek()`
and `elementText()` all see only the kept events. A reader from `createAsyncEventReader` is filtered in the same way,
both per event and in `batches()`.

Several filters can be passed. They run in the order given, and each receives only the events that the earlier ones
kept. `END_DOCUMENT` is never passed to a filter and is always reported.

A filter sees one event at a time and can only drop it. To drop a whole element, or to change or add events, see
[Changing events with a generator](/guide/events/generators).

## Next steps

- [Changing events with a generator](/guide/events/generators): drop, change or add events, then build a tree or write a
  new document from them.
- [Reading with the cursor](/guide/cursor/): the pull parser that creates no event objects.
- [Factories and sources](/guide/sources): the inputs a reader accepts and the options it reads with.
- [Pipelines](/guide/pipelines): how the reading APIs, trees and writers connect.
