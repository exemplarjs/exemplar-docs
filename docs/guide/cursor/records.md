# One record at a time

A large XML file is very often a sequence of similar records: orders, products, log entries. Building a tree for one
record at a time makes each record queryable with XPath, while memory use stays at about one record whatever the size
of the file.

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { EventType, XMLInputFactory } from '@exemplarjs/xml';
import { XPathCompiler } from '@exemplarjs/xpath';

const xml = new XMLInputFactory();
const reader = xml.createStreamReader(source);
const builder = new XdmDocumentBuilder(xml);

const compiler = new XPathCompiler();
const id = compiler.compile('string(/order/@id)');
const total = compiler.compile('sum(/order/line ! (xs:decimal(@price) * xs:integer(@quantity)))');

reader.nextTag(); // <orders>
while (reader.nextTag() === EventType.START_ELEMENT) {
  const order = builder.parse(reader); // one <order>, as a small tree
  console.log(`${id.evaluateString(order)}: ${total.evaluateString(order)}`);
}
// 1001: 32.48
// 1002: 11.25
// 1003: 40.47
```

The input:

```xml
<orders>
  <order id="1001" status="shipped">
    <line sku="B-101" quantity="2" price="8.99"/>
    <line sku="B-205" quantity="1" price="14.50"/>
  </order>
  <order id="1002" status="open">
    <line sku="B-310" quantity="1" price="11.25"/>
  </order>
  <order id="1003" status="open">
    <line sku="B-101" quantity="3" price="8.99"/>
    <line sku="B-412" quantity="2" price="6.75"/>
  </order>
</orders>
```

The loop is [the cursor's](/guide/cursor/#step-from-tag-to-tag). `XdmDocumentBuilder` builds an XDM tree, a compact,
read-only tree in the XPath data model, designed for XPath evaluation. It copies its strings, so a record's tree holds
no reference to the input. [Getting started with XPath](/guide/xpath/) introduces the queries.

## When to build a tree per record

An in-memory tree supports any query, but it holds the whole document, and a file with ten million orders will not
fit.

The cursor reads a file of any size, but every query is then hand-written loop code. Totalling an order's lines with
the cursor means tracking the current order, reading attributes, converting and adding.

A tree per record provides queries without holding the file. It applies whenever no query spans records: each order is
small, and can be discarded once it has been processed.

## Build one record, then move on

`XdmDocumentBuilder` usually parses a whole source. Given a reader, it builds from the reader's current position:

- With the reader at the start of the document, `parse(reader)` builds the whole document.
- With the reader at a **start tag**, `parse(reader)` builds that element and its content as a document of its own,
  and leaves the reader at the element's end tag.

The loop therefore advances the cursor to each record's start tag and passes the reader to the builder:

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { EventType } from '@exemplarjs/xml';
const builder = new XdmDocumentBuilder(xml);
// ---cut---
const reader = xml.createStreamReader(source);

reader.nextTag(); // to <orders>, the outermost element
while (reader.nextTag() === EventType.START_ELEMENT) {
  // The reader is at an <order> start tag.
  const order = builder.parse(reader);
  // The reader is now at that order's </order>.
}
// The reader is at </orders>.
```

After each `parse`, the `nextTag()` in the `while` condition returns either the start tag of another `<order>` or the
`END_ELEMENT` of `</orders>`, which ends the loop.

Each `order` is a complete tree whose root element is `<order>`. Once the loop advances and nothing references the
tree, it can be garbage-collected, so memory use stays at about one record however long the file is.

If the records are nested deeper in the file, or mixed with other elements, find them with an ordinary `next()` loop
and call `parse` whenever the reader is at a start tag with the record's name.

## Query each record

Compile expressions once, before the loop, as the example at the top of this page does. A compiled expression can be
evaluated against any number of trees.

Write paths relative to the record's tree, not the file. The tree's root element is `<order>`, so `/order/@id` selects
the id. `/orders/order/@id` selects nothing, because `<orders>` is not in this tree.

State that spans records, such as a grand total, belongs in variables outside the loop.

## Read records from a stream

The examples so far parse a string. For a file too large to load, or a download, use an asynchronous reader, as
[Large files and streams](/guide/cursor/streams) describes. The loop keeps its structure, and each method that may
have to await input is replaced by its `Async` variant:

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { EventType } from '@exemplarjs/xml';
const id = compiler.compile('string(/order/@id)');
const total = compiler.compile('sum(/order/line ! (xs:decimal(@price) * xs:integer(@quantity)))');
// ---cut---
import { createReadStream } from 'node:fs';

const reader = xml.createAsyncStreamReader(createReadStream('/data/orders.xml'));
const builder = new XdmDocumentBuilder(xml);

await reader.nextTagAsync(); // <orders>
while ((await reader.nextTagAsync()) === EventType.START_ELEMENT) {
  const order = await builder.parseAsync(reader);
  console.log(`${id.evaluateString(order)}: ${total.evaluateString(order)}`);
}
```

`parseAsync` accepts a reader as `parse` does, and awaits input whenever a record extends past the chunks received so
far. Evaluating the XPath is synchronous: by then the record's tree is complete.

In this form neither the file nor a tree of it is ever in memory whole.

## Use a DOM tree or SAX handlers

The DOM builder and the SAX parser accept a reader in the same way: given one at a start tag, each consumes that
element and leaves the reader at its end tag. Both have `parseAsync` for a stream too.

::: code-group

```ts twoslash [DOM tree]
// ---cut---
import { DocumentBuilder } from '@exemplarjs/dom';
import { EventType } from '@exemplarjs/xml';

const reader = xml.createStreamReader(source);
const builder = new DocumentBuilder(xml);

reader.nextTag();
while (reader.nextTag() === EventType.START_ELEMENT) {
  const order = builder.parse(reader).documentElement!;
  console.log(order.getAttribute('id'), order.getElementsByTagName('line').length);
}
// 1001 2
// 1002 1
// 1003 2
```

```ts twoslash [SAX handlers]
import type { SAXHandler } from '@exemplarjs/sax';
import { EventType } from '@exemplarjs/xml';
declare const handler: SAXHandler;
// ---cut---
import { SAXParser } from '@exemplarjs/sax';

const reader = xml.createStreamReader(source);
const parser = new SAXParser(xml);

reader.nextTag();
while (reader.nextTag() === EventType.START_ELEMENT) {
  // The handler gets startDocument, this order's events, then endDocument.
  parser.parse(reader, handler);
}
```

:::

## Copy chosen records into a new document

The stream writer consumes one record from a reader as a builder does. `writer.copy(reader)`, with the reader at a
start tag, writes that element and leaves the reader at its end tag. Because it writes an element and not a whole
document, it can be called part-way through a document that other calls are writing.

This example copies the open orders into a new document. A record that is not copied must still be consumed, with
[`reader.skipElement()`](/guide/cursor/#skip-an-element).

```ts twoslash
// ---cut---
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
import { EventType } from '@exemplarjs/xml';

const reader = xml.createStreamReader(source);
const sink = new StringSink();
const writer = new XMLOutputFactory({ indent: '  ' }).createStreamWriter(sink);

writer.writeStartDocument();
writer.writeStartElement('open-orders');

reader.nextTag(); // <orders>
while (reader.nextTag() === EventType.START_ELEMENT) {
  if (reader.attribute('status') === 'open') writer.copy(reader);
  else reader.skipElement();
}

writer.writeEndDocument();
console.log(sink.toString());
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<open-orders>
  <order id="1002" status="open">
    <line sku="B-310" quantity="1" price="11.25"/>
  </order>
  <order id="1003" status="open">
    <line sku="B-101" quantity="3" price="8.99"/>
    <line sku="B-412" quantity="2" price="6.75"/>
  </order>
</open-orders>
```

The decision uses only the start tag's attributes, before anything is copied, so no tree is needed. The `indent`
option starts each record on a line of its own. Inside a record, the source's whitespace is copied unchanged.

With an asynchronous reader, use `await writer.copyAsync(reader)`. [Writing XML](/guide/writing/) covers the writer
itself, and [Copying and changing documents](/guide/writing/copying) has more on `copy`.

To select records by their content and not only their start tag, build each record's tree, query it, and write the
selected records from the tree.

## Namespaces a record inherits

Records often depend on a namespace declared once, on the root element:

```xml
<export xmlns="urn:example:shop">
  <order id="1001">...</order>
</export>
```

`<order>` is in the namespace `urn:example:shop`, though the declaration is on `<export>`, which is not part of a
record's tree. The builder keeps every namespace that is in scope at the record's start tag, so the record's elements
have the names they had in the file.

Queries then bind the namespace as they would for the whole document:

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { EventType } from '@exemplarjs/xml';
const builder = new XdmDocumentBuilder(xml);
const reader = xml.createStreamReader(source);
// ---cut---
import { XPathCompiler } from '@exemplarjs/xpath';

const shop = new XPathCompiler({ namespaces: { s: 'urn:example:shop' } });
const id = shop.compile('string(/s:order/@id)');

reader.nextTag(); // <export>
while (reader.nextTag() === EventType.START_ELEMENT) {
  console.log(id.evaluateString(builder.parse(reader)));
}
// 1001
```

`writer.copy(reader)` does the same: it declares on the copied element every namespace in scope there that the output
does not already declare. [Namespaces](/guide/namespaces) explains prefixes and declarations.

## Things to watch

- **The reader's position.** A builder reads from the start of a document or from a start tag. At any other event,
  such as text, it throws an `IllegalStateError` that names the reader's current event.
- **Filters and delegates.** A reader can drop content with a [filter](/guide/cursor/filters) or change it with a
  [delegate](/guide/cursor/delegates), the subjects of the next two pages. Each record's tree then contains what the
  reader reports.
- **The reader's options.** A reader parses with the options of the factory that created it, whichever builder it is
  passed to. `XdmDocumentBuilder` requires a reader that processes namespaces and replaces entity references, as the
  default options do. It rejects any other with an `InvalidArgumentError` that names the option.

## Next steps

- [The XDM tree](/guide/xpath/tree): the contents of a record's tree and how to navigate it.
- [Getting results](/guide/xpath/results): the ways to get values from an expression.
- [Dropping content with filters](/guide/cursor/filters): remove parts of a document as it is read.
- [Pipelines](/guide/pipelines): everything else that accepts a reader.
