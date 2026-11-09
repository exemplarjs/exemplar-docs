# Choosing how to read

exemplar has five APIs for reading a document. Three are streaming: the cursor, event objects and SAX. Two build an
in-memory tree: the DOM and XDM. This page shows the same task in each and compares them.

## The same task, five ways

The task: list each book's id and title from this catalog.

```xml
<catalog>
  <book id="b1"><title>Dune</title><price>9.99</price></book>
  <book id="b2"><title>Emma</title><price>7.50</price></book>
</catalog>
```

Every version prints the same two lines:

```text
b1: Dune
b2: Emma
```

::: code-group

```ts twoslash [Cursor]
import { EventType, XMLInputFactory } from '@exemplarjs/xml';

const reader = new XMLInputFactory().createStreamReader(source);

let id: string | undefined;
for (let type = reader.next(); type !== EventType.END_DOCUMENT; type = reader.next()) {
  if (type !== EventType.START_ELEMENT) continue;
  if (reader.localName() === 'book') id = reader.attribute('id');
  else if (reader.localName() === 'title') console.log(`${id}: ${reader.elementText()}`);
}
```

```ts twoslash [Event objects]
import { EventType, XMLInputFactory } from '@exemplarjs/xml';

const events = new XMLInputFactory().createEventReader(source);

let id: string | undefined;
for (const event of events) {
  if (event.type !== EventType.START_ELEMENT) continue;
  if (event.name.localName === 'book') id = event.attribute('id')?.value;
  else if (event.name.localName === 'title') console.log(`${id}: ${events.elementText()}`);
}
```

```ts twoslash [SAX handlers]
import { SAXParser } from '@exemplarjs/sax';

let id: string | undefined;
let title: string | undefined;

new SAXParser().parse(source, {
  startElement(uri, localName, qName, attributes) {
    if (localName === 'book') id = attributes.value('id');
    else if (localName === 'title') title = '';
  },
  characters(text) {
    if (title !== undefined) title += text;
  },
  endElement(uri, localName) {
    if (localName !== 'title') return;
    console.log(`${id}: ${title}`);
    title = undefined;
  },
});
```

```ts twoslash [DOM tree]
import { DocumentBuilder } from '@exemplarjs/dom';

const document = new DocumentBuilder().parse(source);

for (const book of document.getElementsByTagName('book')) {
  const title = book.getElementsByTagName('title').item(0);
  console.log(`${book.getAttribute('id')}: ${title?.textContent}`);
}
```

```ts twoslash [XDM tree and XPath]
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { XPathCompiler } from '@exemplarjs/xpath';

const catalog = new XdmDocumentBuilder().parse(source);
const titles = new XPathCompiler().compile("//book ! (@id || ': ' || title)");

for (const line of titles.evaluateStrings(catalog)) console.log(line);
```

:::

## What each one is

**The cursor** is a pull parser: `next()` advances to the next event, and accessor methods read the current event's
name, attributes and text. No object is created for an event. See [Reading with the cursor](/guide/cursor/).

**Event objects** come from an event reader, a pull parser that returns each event as an object. Unlike the cursor's
accessors, an event object stays valid after the reader advances, so events can be stored, passed to other functions
and replaced in a generator function. See [Reading event objects](/guide/events/).

**SAX** is the push API: the parser calls the handler's callbacks, such as `startElement` and `characters`, as it
reads. The handler keeps its own state between callbacks, as `title`
does above. See [Handling events with SAX](/guide/sax/).

**A DOM tree** holds the whole document as mutable nodes that can be traversed in any direction, with the same
interface as the browser DOM. See [Building and reading a DOM](/guide/dom/).

**An XDM tree** also holds the whole document, in a compact read-only form designed for XPath: its nodes are held in
typed arrays in document order, and all its text in one string. It is rarely traversed directly: XPath expressions are
evaluated against it and return JavaScript values. See [Getting started with XPath](/guide/xpath/).

## Which to pick

Choose by the task.

- **Extracting or computing values.** Build an XDM tree and use XPath. One expression often replaces a loop and its
  state variables.
- **A large file, or a stream.** Use the cursor. Its memory use does not grow with the size of the document.
- **A large file of repeated records, queried with XPath.** Advance from record to record with the cursor and build a
  tree for each. [One record at a time](/guide/cursor/records) shows how.
- **Modifying a document and saving it.** For a document that fits in memory, a DOM tree is the most direct: modify
  the nodes, then serialize the tree. For a larger one, modify the events in a streaming
  [pipeline](/guide/pipelines).
- **Porting code from Java or another SAX library.** Keep the handlers and use SAX. New code is usually clearer with
  the cursor, where the loop decides what to read next.
- **Keeping events after the reader advances.** Use event objects. Code that reads values and moves on can use the
  cursor, which creates no objects for them.

The choice is not exclusive: a cursor can feed a tree builder, a SAX parser or a writer, as
[Pipelines](/guide/pipelines) shows.

## What each one holds in memory

The three streaming APIs read a document of any size in a small, fixed amount of memory. The two trees hold the whole
document.

| API                | Memory                                   |
| ------------------ | ---------------------------------------- |
| Cursor             | A small window on the document           |
| Event objects      | A small window, plus an object per event |
| SAX handlers       | A small window on the document           |
| DOM tree           | The whole document                       |
| XDM tree and XPath | The whole document, compactly            |

::: tip Coming from Java
The cursor is StAX's `XMLStreamReader`, event objects are its `XMLEventReader`, SAX is SAX, and the DOM is the W3C
DOM. The XDM tree is the data model that XPath 3.1 processors use. [Coming from Java](/reference/java) maps the names.
:::

## Next steps

- [Factories and sources](/guide/sources): how readers are created, and the inputs they accept.
- [Reading with the cursor](/guide/cursor/): the cursor in full.
- [Getting started with XPath](/guide/xpath/): XDM trees and XPath queries.
- [Pipelines](/guide/pipelines): how readers, tree builders and writers connect.
