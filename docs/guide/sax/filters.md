# SAX filters

A SAX filter is a [handler](/guide/sax/) that forwards to another handler. It sits between the parser and that handler,
receives every call the parser makes, and passes on the same call, a changed one, additional ones or none. Use filters
to transform a document as it is read, in particular to add attributes or elements.

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

This filter upper-cases all text. The handler behind it serializes the calls it receives as XML, which shows the result:

```ts twoslash
import { SAXParser, XMLFilterImpl } from '@exemplarjs/sax';
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';

class UpperCase extends XMLFilterImpl {
  override characters(text: string): void {
    super.characters(text.toUpperCase());
  }
}

const sink = new StringSink();
const writing = new XMLOutputFactory({ indent: '  ' }).createSAXHandler(sink);

new SAXParser().parse(source, new UpperCase(writing));
console.log(sink.toString());
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="b1" lang="en">
    <title>DUNE</title>
    <price currency="GBP">8.99</price>
  </book>
  <book id="b2">
    <title>EMMA</title>
    <price currency="GBP">6.50</price>
  </book>
</catalog>
```

## How a filter works

`XMLFilterImpl` implements every handler method by forwarding the call unchanged to the next handler, the one passed
to its constructor. On its own it changes nothing.

To write a filter, subclass it and override the methods of interest. Inside an override:

- call `super.method(…)` with the same arguments to pass the call on;
- call it with different arguments to change what the next handler receives;
- call other `super` methods to add content;
- call nothing to drop the event.

The parser calls the filter and the filter calls the next handler, so the document passes through one event at a time.
Nothing is held in memory except the state the filter keeps.

The comment at the end of each filter below shows the part of the output that changes when the filter replaces
`UpperCase` in the first example.

## Rename an element

An element's name reaches a handler twice, at its start tag and its end tag, and in two forms each time: `localName`,
the name without a prefix, and `qName`, the qualified name as written. Change all four together:

```ts twoslash
import { type Attributes, XMLFilterImpl } from '@exemplarjs/sax';
// ---cut---
class BooksToItems extends XMLFilterImpl {
  override startElement(uri: string, localName: string, qName: string, attributes: Attributes): void {
    if (localName === 'book') super.startElement(uri, 'item', 'item', attributes);
    else super.startElement(uri, localName, qName, attributes);
  }

  override endElement(uri: string, localName: string, qName: string): void {
    if (localName === 'book') super.endElement(uri, 'item', 'item');
    else super.endElement(uri, localName, qName);
  }
}
// <item id="b1" lang="en"> … </item>
```

For an element with a prefix, `qName` keeps the prefix: renaming `dc:title` to `dc:name` passes `'name'` as the local
name and `'dc:name'` as the qualified name.

## Change attributes

The attributes that `startElement` receives are read-only, and valid only during the call. To change them, copy them
into an `AttributesImpl`, change the copy and pass the copy on.

### Set a value

Find the attribute's index with `index(name)`, which returns `-1` when the tag has no such attribute, then set the
value at that index:

```ts twoslash
import { type Attributes, XMLFilterImpl } from '@exemplarjs/sax';
// ---cut---
import { AttributesImpl } from '@exemplarjs/sax';

class InEuros extends XMLFilterImpl {
  override startElement(uri: string, localName: string, qName: string, attributes: Attributes): void {
    const index = attributes.index('currency');
    if (index < 0) {
      super.startElement(uri, localName, qName, attributes);
      return;
    }
    const changed = new AttributesImpl(attributes);
    changed.setValue(index, 'EUR');
    super.startElement(uri, localName, qName, changed);
  }
}
// <price currency="EUR">8.99</price>
```

`AttributesImpl` has methods that change the attribute at an index:

| Operation             | Method                                                       |
| --------------------- | ------------------------------------------------------------ |
| Change a value        | `setValue(index, value)`                                     |
| Rename an attribute   | `setLocalName(index, name)` and `setQName(index, name)`      |
| Remove an attribute   | `removeAttribute(index)`; later attributes shift down by one |
| Remove all attributes | `clear()`                                                    |

An attribute has a local name and a qualified name, as an element has, so a rename sets both. `setURI`, `setType` and
`setSpecified` set an attribute's remaining properties.

### Add an attribute

To add an attribute, copy the attributes and call `addAttribute` on the copy:

```ts twoslash
import { type Attributes, AttributesImpl, XMLFilterImpl } from '@exemplarjs/sax';
// ---cut---
class InStock extends XMLFilterImpl {
  override startElement(uri: string, localName: string, qName: string, attributes: Attributes): void {
    if (localName !== 'book') {
      super.startElement(uri, localName, qName, attributes);
      return;
    }
    const changed = new AttributesImpl(attributes);
    changed.addAttribute('', 'stock', 'stock', 'CDATA', '12');
    super.startElement(uri, localName, qName, changed);
  }
}
// <book id="b1" lang="en" stock="12">
```

The five arguments of `addAttribute` are the attribute's namespace (`''` for none), its local name, its qualified name,
its type and its value. The type is `'CDATA'` for an ordinary attribute.

## Add an element

To add an element, make the three calls the parser would make for it. This filter adds a `stock` element at the
end of every book, before passing on the book's end tag:

```ts twoslash
import { AttributesImpl, XMLFilterImpl } from '@exemplarjs/sax';
// ---cut---
class StockElement extends XMLFilterImpl {
  override endElement(uri: string, localName: string, qName: string): void {
    if (localName === 'book') {
      super.startElement('', 'stock', 'stock', new AttributesImpl());
      super.characters('12');
      super.endElement('', 'stock', 'stock');
    }
    super.endElement(uri, localName, qName);
  }
}
// <price currency="GBP">8.99</price>
//   <stock>12</stock></book>
```

## Drop an element

Dropping an element means passing on neither its start tag, nor its end tag, nor anything between them. Track the
nesting depth inside the element, and pass calls on only while it is zero:

```ts twoslash
import { type Attributes, XMLFilterImpl } from '@exemplarjs/sax';
// ---cut---
class WithoutPrices extends XMLFilterImpl {
  #depth = 0; // how many open elements deep inside a price

  override startElement(uri: string, localName: string, qName: string, attributes: Attributes): void {
    if (this.#depth > 0 || localName === 'price') this.#depth++;
    else super.startElement(uri, localName, qName, attributes);
  }

  override endElement(uri: string, localName: string, qName: string): void {
    if (this.#depth > 0) this.#depth--;
    else super.endElement(uri, localName, qName);
  }

  override characters(text: string): void {
    if (this.#depth === 0) super.characters(text);
  }
}
```

The price elements are removed. The whitespace that surrounded them remains, as a blank line in each book;
[Copying and changing documents](/guide/writing/copying#tidy-the-whitespace) shows how to remove it.

If the dropped elements can hold comments, processing instructions or CDATA sections, override `comment`,
`processingInstruction`, `startCDATA` and `endCDATA` in the same way. Otherwise those calls still pass through, and a
dropped CDATA section leaves an empty `<![CDATA[]]>` behind.

A namespace that a dropped element declares is reported through `startPrefixMapping` before the element's start tag,
so the filter has passed it on by the time it sees the element. The writing handler then writes the declaration on the
next element it writes.

## Chain several filters

A filter is a handler, so the handler behind a filter can be another filter. Events run through the chain from the
outermost filter inwards:

```ts twoslash
import { SAXParser, type SAXHandler, XMLFilterImpl } from '@exemplarjs/sax';
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
class BooksToItems extends XMLFilterImpl {}
class InStock extends XMLFilterImpl {}
const writing = new XMLOutputFactory().createSAXHandler(new StringSink());
// ---cut---
const chain = new InStock(new BooksToItems(writing));
new SAXParser().parse(source, chain);
// <item id="b1" lang="en" stock="12">
```

The calls run from left to right: the parser calls `InStock`, which calls `BooksToItems`, which calls the writing
handler. Each filter receives the output of those before it, so order matters: with the two swapped, `InStock`
receives `item` elements, matches no `book` and adds nothing.

A filter can also be constructed first and assigned its handler later, through its `handler` property:
`filter.handler = writing`.

## End the chain: build a tree or write XML

A chain ends in a handler that consumes the events. Write that handler yourself, as in
[Handling events with SAX](/guide/sax/), or use one of the three that exemplar provides.

### Build a tree

Both tree builders have a `createSAXHandler()` method, which returns a handler that builds a tree from the calls it
receives. Use `XdmDocumentBuilder` for a tree to query with [XPath](/guide/xpath/), and `DocumentBuilder` for a
[DOM](/guide/dom/). After the parse, the tree is the handler's `document`:

::: code-group

```ts twoslash [XDM tree]
import { SAXParser, XMLFilterImpl } from '@exemplarjs/sax';
class InStock extends XMLFilterImpl {}
// ---cut---
import { XdmDocumentBuilder } from '@exemplarjs/xdm';

const tree = new XdmDocumentBuilder().createSAXHandler();
new SAXParser().parse(source, new InStock(tree));

const total = compiler.compile('sum(//book/@stock)');
console.log(total.evaluateNumber(tree.document)); // 24
```

```ts twoslash [DOM]
import { SAXParser, XMLFilterImpl } from '@exemplarjs/sax';
class InStock extends XMLFilterImpl {}
// ---cut---
import { DocumentBuilder } from '@exemplarjs/dom';

const dom = new DocumentBuilder().createSAXHandler();
new SAXParser().parse(source, new InStock(dom));

console.log(dom.document.getElementsByTagName('book')[0]?.getAttribute('stock')); // 12
```

:::

Reading `document` before the parse has finished throws an `IllegalStateError`.

### Write XML

`createSAXHandler(destination)` on an `XMLOutputFactory` writes the events as XML, as the first example on this page
does. The destination is a `StringSink` for a string, or a `WritableStream` of bytes such as a file. For a stream, parse
with `parseAsync` and then await the handler's `close()`, which resolves once the stream has accepted everything:

```ts twoslash
import { SAXParser, XMLFilterImpl } from '@exemplarjs/sax';
class InStock extends XMLFilterImpl {}
// ---cut---
import { createWriteStream } from 'node:fs';
import { Writable } from 'node:stream';
import { XMLOutputFactory } from '@exemplarjs/writer';

const file = Writable.toWeb(createWriteStream('catalog-out.xml'));
const writing = new XMLOutputFactory().createSAXHandler(file);

await new SAXParser().parseAsync(stream, new InStock(writing));
await writing.close();
```

The factory's options apply, such as `indent` and `encoding`; see [Writing XML](/guide/writing/).

::: details What the writing handler preserves from the source

- Comments, processing instructions and CDATA sections are written as they were read.
- A `<!DOCTYPE>` keeps its public and system identifiers, but not the declarations written inside it between `[` and
  `]`. The parser has already applied those, for example by expanding the references they define.
- A prefix that a filter gives an element or attribute, with no declaration in scope, is declared on that element.

:::

## Add looked-up data

Filters suit enriching a document with external data: a price from a database, a region from a lookup table. Pass the
data to the filter's constructor, and the next handler through to `super`. This filter adds each book's stock level,
looked up by the book's `id`:

```ts twoslash
import { type Attributes, AttributesImpl, SAXParser, type SAXHandler, XMLFilterImpl } from '@exemplarjs/sax';
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
const writing = new XMLOutputFactory().createSAXHandler(new StringSink());
// ---cut---
class AddStock extends XMLFilterImpl {
  readonly #stock: ReadonlyMap<string, number>;

  constructor(stock: ReadonlyMap<string, number>, handler: SAXHandler) {
    super(handler);
    this.#stock = stock;
  }

  override startElement(uri: string, localName: string, qName: string, attributes: Attributes): void {
    const count = localName === 'book' ? this.#stock.get(attributes.value('id') ?? '') : undefined;
    if (count === undefined) {
      super.startElement(uri, localName, qName, attributes);
      return;
    }
    const changed = new AttributesImpl(attributes);
    changed.addAttribute('', 'stock', 'stock', 'CDATA', String(count));
    super.startElement(uri, localName, qName, changed);
  }
}

const stock = new Map([['b1', 12]]);
new SAXParser().parse(source, new AddStock(stock, writing));
// <book id="b1" lang="en" stock="12"> … <book id="b2">
```

Two worked examples in the exemplar repository take this further:
[SAX filters into XPath](https://github.com/io-timeout/exemplar/tree/main/examples/07-sax-filters-into-xpath) looks up
prices and regions and totals orders, and
[SAX filters into a file](https://github.com/io-timeout/exemplar/tree/main/examples/08-sax-filters-into-a-file) changes
attributes and writes a new document.

## Catch a filter's mistakes

A filter can pass on a sequence of calls that no document could produce. The three handlers validate what they
receive.

The tree-building handlers throw an `XMLError`, the error the parser throws for a document that is not well formed.
They check that:

- every end tag matches the start tag it closes, so a start tag renamed alone is caught;
- a name's local and qualified forms agree, so a rename that changes one of them alone is caught;
- there is one outermost element, with no text outside it;
- names are valid XML names.

A filter that renames `book` in `startElement` but not in `endElement` fails like this:

```text
XMLError: WF_END_TAG_MISMATCH: An end tag book where element item is open (5:3)
```

The writing handler applies the [stream writer's checks](/guide/writing/#escaping-and-checks) and throws a
`WriterError`. It also checks each end tag's name against the open element, so the same incomplete rename fails there
as well:

```text
WriterError: The end tag book does not match the open element item
```

::: details Documents parsed without namespaces
A parser whose factory has `namespaceAware: false` reports names as written, colons and all, with no namespace. The
handlers treat such events differently:

- The XDM handler rejects them with an `InvalidArgumentError`: an XDM tree always has namespaces.
- The DOM handler builds nodes without namespaces.
- The writing handler needs an output factory made with `namespaceAware: false` too, which writes names as given.

:::

::: tip Coming from Java
`XMLFilterImpl` and `AttributesImpl` are SAX's classes of the same names. A filter is given its handler in place of a
parent `XMLReader`: `new Filter(handler)`, or `filter.handler = …`, where Java has `setParent` and `setContentHandler`.
The building handlers do the work of a `TransformerHandler` with a `DOMResult` or `StreamResult`.
:::

## Next steps

- [Copying and changing documents](/guide/writing/copying): the other ways to transform a document on its way to a
  writer, and how to choose between them.
- [Getting started with XPath](/guide/xpath/): querying the tree a chain builds.
- [Pipelines](/guide/pipelines): how the reading APIs, trees and writers connect.
