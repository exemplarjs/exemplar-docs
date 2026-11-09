# Dropping content with filters

`createFilteredReader` takes a reader and one or more predicates; an event is reported only if every predicate returns
`true` for it. The predicates run inside [the cursor](/guide/cursor/)'s own `next()`, so the code that reads it never
sees a dropped event. Use filters to remove content such as comments, private notes or whole sections.

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
import { EventType, XMLInputFactory } from '@exemplarjs/xml';
import { createFilteredReader } from '@exemplarjs/xml/filters';

const xml = new XMLInputFactory();
const source = '<catalog><!-- draft --><book id="b1">Dune</book></catalog>';

const reader = createFilteredReader(xml.createStreamReader(source), (r) => r.eventType() !== EventType.COMMENT);

// Write out what the filtered reader reads.
const sink = new StringSink();
const writer = new XMLOutputFactory({ indent: '  ' }).createStreamWriter(sink);
writer.copy(reader);
console.log(sink.toString());
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="b1">Dune</book>
</catalog>
```

The last four lines serialize what the reader reads to a string, and `indent` puts each element on a line of its own;
[Writing XML](/guide/writing/) explains them. The other examples on this page call a `print(reader)` function that
contains those four lines.

## Write a filter

A `StreamFilter` receives the reader, positioned at an event, and can call any accessor to decide whether to keep it.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
import { createFilteredReader, type StreamFilter } from '@exemplarjs/xml/filters';

const noComments: StreamFilter = (reader) => reader.eventType() !== EventType.COMMENT;

const reader = createFilteredReader(xml.createStreamReader(source), noComments);
```

`createFilteredReader` returns a reader with the same `next()` loop and the same accessors.

::: warning
For a cursor, `createFilteredReader` installs the filter in the cursor it is given and returns that same cursor. Any
other reference to the original cursor is therefore filtered too.
:::

The filter is called for every event the cursor advances to except `END_DOCUMENT`, which is always reported, so that
a loop waiting for it terminates.

## Drop an element and everything in it

A filter sees one event at a time. Rejecting the start tag of `<internal>` drops only that tag; its text, its children
and its end tag are still reported. To drop the whole element, the filter must track whether it is inside one.

A filter cannot advance the cursor, so it cannot call [`skipElement()`](/guide/cursor/#skip-an-element) as a
hand-written loop can. It keeps a depth counter instead: the number of open elements inside the one being dropped,
itself included. The counter is incremented at each start tag and decremented at each end tag, and every event is
rejected while it is above zero.

```ts twoslash
import { EventType, type StreamReader } from '@exemplarjs/xml';
import { createFilteredReader, type StreamFilter } from '@exemplarjs/xml/filters';
declare function print(reader: StreamReader): void;
// ---cut---
/** Makes a filter that drops every element with this name, with all it contains. */
function dropElement(name: string): StreamFilter {
  // How many elements are open in the one being dropped, itself included; 0 outside one.
  let depth = 0;
  return (reader) => {
    const type = reader.eventType();
    if (type === EventType.START_ELEMENT && (depth > 0 || reader.localName() === name)) {
      depth++;
      return false;
    }
    if (type === EventType.END_ELEMENT && depth > 0) {
      depth--;
      return false;
    }
    return depth === 0;
  };
}

print(createFilteredReader(xml.createStreamReader(source), dropElement('internal')));
```

For this catalog:

```xml
<catalog>
  <!-- Prices checked on 3 March. -->
  <book id="b1">
    <title>Dune</title>
    <internal>
      <supplier>Northwind Books</supplier>
    </internal>
  </book>
</catalog>
```

it prints:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <!-- Prices checked on 3 March. -->
  <book id="b1">
    <title>Dune</title>

  </book>
</catalog>
```

A boolean flag is not enough, because an `<internal>` can contain another `<internal>`. The flag would be cleared at
the inner end tag, and the rest of the outer element would be reported.

::: warning
This filter is stateful: it holds the counter. Call `dropElement('internal')` again for each reader. Sharing one
filter between two readers that are read concurrently would mix their counts.
:::

## Use several filters

`createFilteredReader` accepts any number of filters. They run in argument order, and each is called only for the
events that every earlier filter kept.

```ts twoslash
import { EventType, type StreamReader } from '@exemplarjs/xml';
import { createFilteredReader, type StreamFilter } from '@exemplarjs/xml/filters';
declare function dropElement(name: string): StreamFilter;
declare function print(reader: StreamReader): void;
// ---cut---
const noComments: StreamFilter = (reader) => reader.eventType() !== EventType.COMMENT;

print(createFilteredReader(xml.createStreamReader(source), dropElement('internal'), noComments));
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>

  <book id="b1">
    <title>Dune</title>

  </book>
</catalog>
```

The order matters for a stateful filter, which is never called for an event that an earlier filter rejected. Here
`noComments` is never called for anything inside `<internal>`, because `dropElement` has already rejected it.

## Tidy up the whitespace left behind

The output above has whitespace-only lines where the comment and the `<internal>` element were. The line break and
indentation around an element are text events of their own, not part of the element, so dropping the element leaves
them in place.

The writer's `indent` does not remove them. The writer adds line breaks and indentation only inside elements that
contain no text, and `<catalog>` and `<book>` contain the source's whitespace as text.

In data-oriented XML, whitespace between elements is not significant, so drop all of it and have the writer indent
the result. `isWhitespace()` is true for text that is only whitespace:

```ts twoslash
import { type StreamReader } from '@exemplarjs/xml';
import { createFilteredReader, type StreamFilter } from '@exemplarjs/xml/filters';
declare function dropElement(name: string): StreamFilter;
declare const noComments: StreamFilter;
declare function print(reader: StreamReader): void;
// ---cut---
const noLayout: StreamFilter = (reader) => !reader.isWhitespace();

print(createFilteredReader(xml.createStreamReader(source), dropElement('internal'), noComments, noLayout));
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="b1">
    <title>Dune</title>
  </book>
</catalog>
```

The result no longer depends on how the source was formatted.

::: warning
Apply this only to data-oriented XML. In mixed content, such as `<p><b>big</b> <i>news</i></p>`, the space between the
two elements is whitespace-only text too, and dropping it would join the words. For such documents, keep the
whitespace and accept the blank lines, or drop only the whitespace that directly follows removed content.
:::

## Send the filtered reader somewhere

A filtered reader is still a reader, so everything that accepts a reader accepts it, and never receives the dropped
events.

Pass it to a tree builder, as [One record at a time](/guide/cursor/records) does with an unfiltered cursor, to query a
document without its internal notes:

```ts twoslash
import { createFilteredReader, type StreamFilter } from '@exemplarjs/xml/filters';
declare function dropElement(name: string): StreamFilter;
// ---cut---
import { XdmDocumentBuilder } from '@exemplarjs/xdm';

const reader = createFilteredReader(xml.createStreamReader(source), dropElement('internal'));
const catalog = new XdmDocumentBuilder(xml).parse(reader);

console.log(compiler.compile('count(//supplier)').evaluateNumber(catalog));
// 0
```

Or copy it directly to a writer with `writer.copy(reader)`, as the examples on this page do. No tree is built in
between, so the document is never held whole.

For a stream, filter an [asynchronous reader](/guide/cursor/streams) in the same way and use
`await writer.copyAsync(reader)`. The filter is not called for `NEED_INPUT`.

::: warning
A tree builder or a writer checks that the events it receives still form a well-formed document. A filter that drops
one tag of a pair and keeps the other fails there with an `XMLError` whose code is `WF_END_TAG_MISMATCH`. A
hand-written loop makes no such check.
:::

[Pipelines](/guide/pipelines) lists everything that accepts a reader.

## Next steps

- [Changing content with delegates](/guide/cursor/delegates): override what the cursor reports, where a filter can
  only drop events.
- [Drop events with a filter](/guide/events/#drop-events-with-a-filter): `createFilteredReader` on an event reader,
  where the filter receives each event object.
- [Copying and changing documents](/guide/writing/copying): more on copying a reader to a writer.
