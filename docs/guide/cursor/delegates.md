# Changing content with delegates

`StreamReaderDelegate` has every method of [the cursor](/guide/cursor/) and forwards each to the reader it wraps; a
subclass overrides the accessors whose results it changes. Use one to modify a document as it is read: normalize text,
convert values, rename elements.

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';
import { StreamReaderDelegate } from '@exemplarjs/xml/filters';

class Trimmed extends StreamReaderDelegate {
  override text(): string {
    return super.text().trim();
  }
}

const xml = new XMLInputFactory();
const reader = new Trimmed(xml.createStreamReader('<title>  Dune </title>'));

reader.nextTag();
console.log(`[${reader.elementText()}]`);
// [Dune]
```

## Override only what changes

Each method forwards to the same method on the delegate's `parent`, the reader it wraps, so an unmodified delegate
changes nothing. In `Trimmed` above, `text()` gets the parent's text through `super.text()` and returns it trimmed;
every other method still forwards. The parent itself is not modified and still reports the source's values.

Every API that takes a reader takes a delegate: a hand-written loop, a tree builder, a writer. Each of them sees what
the delegate reports.

::: tip Filter or delegate?
To **drop** events, use a [filter](/guide/cursor/filters), which takes less code. To **change** what an event reports,
use a delegate.
:::

The examples on this page call a `print(reader)` function, which copies a reader to a writer that
[indents the output](/guide/writing/#indent-the-output). Most of them read this catalog:

```xml
<catalog>
  <book id="b1">
    <title>Dune</title>
    <weight unit="lb">1.2</weight>
    <height unit="in">8.5</height>
  </book>
</catalog>
```

## Change text

Override `text()`, as `Trimmed` does. `elementText()` builds its result from `text()`, so it returns the changed text
too, which is why the opening example prints `[Dune]`.

The override applies to every event that has text, not only to text inside elements. `Trimmed` also trims comments,
and reduces the whitespace between elements to empty strings. This loop prints the text of every text event and
comment, in brackets:

```ts twoslash
import { EventType } from '@exemplarjs/xml';
import { StreamReaderDelegate } from '@exemplarjs/xml/filters';
class Trimmed extends StreamReaderDelegate {
  override text(): string {
    return super.text().trim();
  }
}
// ---cut---
// <book>
//   <!-- reprint -->
//   <title>  Dune </title>
// </book>
const reader = new Trimmed(xml.createStreamReader(source));

while (reader.next() !== EventType.END_DOCUMENT) {
  const type = reader.eventType();
  if (type === EventType.CHARACTERS || type === EventType.COMMENT) console.log(`[${reader.text()}]`);
}
// []
// [reprint]
// []
// [Dune]
// []
```

The three empty pairs of brackets are the whitespace between the tags, trimmed to empty strings.

Changing the text of particular elements only requires the delegate to track the reader's position, which
[Keep track of where you are](#keep-track-of-where-you-are) shows.

## Change attribute values

Override `attributeValue(index)`, the accessor that returns an attribute's value by index. This delegate changes every
`unit="lb"` to `unit="kg"`:

```ts twoslash
import { StreamReaderDelegate } from '@exemplarjs/xml/filters';
// ---cut---
class KilogramUnits extends StreamReaderDelegate {
  override attributeValue(index: number): string {
    const value = super.attributeValue(index);
    return this.attributeLocalName(index) === 'unit' && value === 'lb' ? 'kg' : value;
  }
}

const reader = new KilogramUnits(xml.createStreamReader('<weight unit="lb">1.2</weight>'));
reader.nextTag();
console.log(reader.attribute('unit'));
// kg
```

That one override is sufficient. `attribute('unit')`, the lookup by name, reads the value through the delegate's
`attributeValue(index)`, so it returns `kg` as well. `attribute()` needs no override.

## Rename an element

Two accessors report an element's name: `localName()` returns it without any prefix, and `name()` returns it as
written, prefix included. Override both, so that they agree:

```ts twoslash
import { type StreamReader } from '@exemplarjs/xml';
import { StreamReaderDelegate } from '@exemplarjs/xml/filters';
declare function print(reader: StreamReader | StreamReaderDelegate): void;
// ---cut---
class BooksAsItems extends StreamReaderDelegate {
  override localName(): string {
    const localName = super.localName();
    return localName === 'book' ? 'item' : localName;
  }

  override name(): string {
    const prefix = this.prefix();
    return prefix === '' ? this.localName() : `${prefix}:${this.localName()}`;
  }
}

print(new BooksAsItems(xml.createStreamReader('<catalog><book id="b1">Dune</book></catalog>')));
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <item id="b1">Dune</item>
</catalog>
```

The same two accessors apply at the end tag, so `</book>` becomes `</item>` with no more code.

Both overrides are needed because a consumer of the delegate may call either: a writer reads the local name and the
prefix, and the check that start and end tags match reads `name()`. If the two disagree, a tree builder or a writer
rejects the delegate with an `XMLError` whose code is `NS_QNAME`.

## Keep track of where you are

`text()` is called at a text event, which has no reference to the element that contains it. To convert the number in
`<weight unit="lb">1.2</weight>` to kilograms, the delegate must record that the reader has just passed that start
tag.

Override `next()`. Every advance goes through it, so it is the place to record the reader's position:

```ts twoslash
import { EventType, type StreamReader } from '@exemplarjs/xml';
import { StreamReaderDelegate } from '@exemplarjs/xml/filters';
declare function print(reader: StreamReader | StreamReaderDelegate): void;
// ---cut---
const KILOGRAMS_PER_POUND = 0.4536;

class Kilograms extends StreamReaderDelegate {
  /** Whether the reader is inside an element measured in pounds. */
  #inPounds = false;

  override next(): EventType {
    const type = super.next();
    if (type === EventType.START_ELEMENT) this.#inPounds = this.parent.attribute('unit') === 'lb';
    else if (type === EventType.END_ELEMENT) this.#inPounds = false;
    return type;
  }

  override attributeValue(index: number): string {
    const isUnit = this.#inPounds && this.attributeLocalName(index) === 'unit';
    return isUnit ? 'kg' : super.attributeValue(index);
  }

  override text(): string {
    const text = super.text();
    return this.#inPounds ? (Number(text) * KILOGRAMS_PER_POUND).toFixed(2) : text;
  }
}

print(new Kilograms(xml.createStreamReader(source)));
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="b1">
    <title>Dune</title>
    <weight unit="kg">0.54</weight>
    <height unit="in">8.5</height>
  </book>
</catalog>
```

`next()` calls `this.parent.attribute('unit')`, not `this.attribute('unit')`. The parent is the wrapped reader, which
returns the unit as it is in the source, `lb`. `this.attribute('unit')` would go through the delegate's own
`attributeValue` and return `kg`, the value every consumer of the delegate receives.

A consumer of the delegate may advance with `nextTag()` or `elementText()` instead. Both advance by calling the
delegate's own `next()`, so the override sees every advance.

## Stack delegates

To apply several changes in one pass, chain delegates. `createDelegatedReader` takes a reader and any number of
delegates and links them: the first delegate wraps the reader, the second wraps the first, and so on. It returns the
last one, which reports every delegate's changes.

```ts twoslash
import { type StreamReader } from '@exemplarjs/xml';
import { StreamReaderDelegate } from '@exemplarjs/xml/filters';
declare function print(reader: StreamReader | StreamReaderDelegate): void;
declare class Kilograms extends StreamReaderDelegate {}
declare class BooksAsItems extends StreamReaderDelegate {}
// ---cut---
import { createDelegatedReader } from '@exemplarjs/xml/filters';

const reader = createDelegatedReader(xml.createStreamReader(source), new Kilograms(), new BooksAsItems());

print(reader);
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <item id="b1">
    <title>Dune</title>
    <weight unit="kg">0.54</weight>
    <height unit="in">8.5</height>
  </item>
</catalog>
```

The delegates are constructed with no reader, as `new Kilograms()`, and `createDelegatedReader` sets each one's
parent. `delegate.parent = reader` can also be assigned directly. Using a delegate that has no parent yet throws an
`IllegalStateError`.

In a chain, a delegate's parent is the delegate before it, not the original reader. Each delegate therefore sees the
document as modified by the ones before it. Here `BooksAsItems` reads each name from `Kilograms`, and would get `kg`
if it read the weight's `unit`.

### Give a delegate settings of its own

A delegate that takes parameters in its constructor can appear more than once in a chain: one instance to convert
pounds, another to convert inches. Define a constructor that calls `super()` with no parent:

```ts twoslash
import { StreamReaderDelegate } from '@exemplarjs/xml/filters';
// ---cut---
class Converted extends StreamReaderDelegate {
  readonly #from: string;
  readonly #to: string;
  readonly #factor: number;

  constructor(from: string, to: string, factor: number) {
    super(); // no parent yet: createDelegatedReader supplies it
    this.#from = from;
    this.#to = to;
    this.#factor = factor;
  }

  // next(), attributeValue() and text() as in Kilograms, using #from, #to and #factor
}
```

Then `createDelegatedReader(reader, new Converted('lb', 'kg', 0.4536), new Converted('in', 'cm', 2.54))` converts
both units.

A delegate such as `Kilograms` holds state about the document it is reading, so do not share an instance between two
readers.

## Write the result or build a tree

A delegate is accepted wherever a reader is. The `print` function on this page wraps the stream writer's `copy`, which
writes what a reader reads. For a large file, wrap an asynchronous reader and use `copyAsync`. The document is then
changed chunk by chunk and never held whole:

```ts twoslash
import { StreamReaderDelegate } from '@exemplarjs/xml/filters';
declare class Kilograms extends StreamReaderDelegate {}
declare class BooksAsItems extends StreamReaderDelegate {}
// ---cut---
import { createReadStream, createWriteStream } from 'node:fs';
import { Writable } from 'node:stream';
import { XMLOutputFactory } from '@exemplarjs/writer';
import { createDelegatedReader } from '@exemplarjs/xml/filters';

const reader = createDelegatedReader(
  xml.createAsyncStreamReader(createReadStream('catalog.xml')),
  new Kilograms(),
  new BooksAsItems()
);

const writer = new XMLOutputFactory().createStreamWriter(Writable.toWeb(createWriteStream('metric.xml')));
await writer.copyAsync(reader);
await writer.close();
```

The delegates work unchanged on an asynchronous reader, which [Large files and streams](/guide/cursor/streams)
describes. `copyAsync` awaits the reader's input and respects the destination's backpressure before it reads more. See
[Copying and changing documents](/guide/writing/copying).

To query the changed document instead, pass the delegate to a tree builder, as
[the filters page](/guide/cursor/filters#send-the-filtered-reader-somewhere) does with a filtered reader:
`new XdmDocumentBuilder(xml).parse(reader)`.

Filters and delegates combine. `createFilteredReader` accepts a delegate, and its filters then see the delegate's
changes: a filter on a renamed element tests for the new name.

## What delegates are not good at

A delegate suits changes to content the document already has: text, an attribute's value, an element's name.

Adding content is harder. Adding an attribute to a start tag means overriding `attributeCount()` and every indexed
accessor, and keeping them consistent. Inserting an element between two others is harder still, because `next()`
would have to synthesize events.

For those cases, use one of the APIs in which an event is a value that can be created:

- [SAX filters](/guide/sax/filters) add or change attributes in a few lines.
- [A generator over event objects](/guide/events/generators) can yield new elements and text anywhere.

## What gets checked

A delegate can report anything, so a tree builder or a writer checks what it receives. It throws an `XMLError`, and
builds or writes nothing malformed, when:

- an element's or attribute's name is not a legal XML name (code `NS_QNAME`)
- `name()`, `localName()` and `prefix()` do not agree with each other (code `NS_QNAME`)
- start and end tags do not pair up (code `WF_END_TAG_MISMATCH`)
- there is more than one root element (code `WF_SECOND_ROOT`), or text outside it (code `WF_CONTENT_OUTSIDE_ROOT`)

These checks apply to what the delegate reports, not to the original input, which the cursor has already checked.

::: tip Coming from Java
`StreamReaderDelegate` is StAX's class of the same name, with `parent` in place of `getParent()` and `setParent()`.
`createDelegatedReader` has no StAX counterpart.
:::

## Next steps

- [Reading event objects](/guide/events/): read each event as an object that can be stored, changed and created.
- [SAX filters](/guide/sax/filters): add attributes and elements as a document is read.
- [Copying and changing documents](/guide/writing/copying): more on copying a reader to a writer.
- [Pipelines](/guide/pipelines): where a reader can go and what can change it on the way.
