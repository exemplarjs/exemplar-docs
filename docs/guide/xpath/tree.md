# The XDM tree

`XdmDocumentBuilder` builds the XDM tree that XPath expressions are evaluated against. The tree is compact: it holds
its nodes in typed arrays in document order and all its text in one string. It differs from [the DOM](/guide/dom/),
exemplar's other tree, in three ways:

- **It represents a document as the XPath data model defines it.** Entity references such as `&shop;` are replaced by
  their text, a CDATA section is ordinary text, and namespace declarations are not attributes.
  [What the tree keeps and drops](#what-the-tree-keeps-and-drops) has the full list.
- **It is read-only.** To change a document, use the DOM or [a writer](/guide/writing/copying).
- **An `XdmNode` object is a reference to a position in the tree**, created on demand. Two objects can refer to the
  same node, so nodes are compared with `isSameNode` and not with `===`; see [Compare nodes](#compare-nodes).

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';

const builder = new XdmDocumentBuilder();
const doc = builder.parse('<catalog><book id="b1"><title>Dune</title></book></catalog>');

doc.kindName; // 'document'
compiler.compile('//book/title').evaluateStrings(doc); // ['Dune']
```

`parse` returns the document node, which is the root of the tree; the root element, `catalog` here, is its child. The
document node is the usual [context](/guide/xpath/#choose-where-the-expression-starts) for evaluating an expression.

## Build from a string, bytes or a stream

`parse` takes a whole document as a string or as bytes, and detects the encoding of bytes. `parseAsync` also takes a
stream and awaits its chunks.

::: code-group

```ts twoslash [String]
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
// ---cut---
const doc = new XdmDocumentBuilder().parse(source);
```

```ts twoslash [Bytes]
// ---cut---
import { readFileSync } from 'node:fs';
import { XdmDocumentBuilder } from '@exemplarjs/xdm';

const doc = new XdmDocumentBuilder().parse(readFileSync('catalog.xml'));
```

```ts twoslash [Stream]
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
// ---cut---
const response = await fetch('https://example.org/catalog.xml');
const doc = await new XdmDocumentBuilder().parseAsync(response.body!);
```

:::

To record the document's URI, pass a source object with a `systemId`. XPath's `base-uri()` and `document-uri()` return
it, and relative URIs inside the document resolve against it.

```ts twoslash
// ---cut---
import { readFileSync } from 'node:fs';
import { XdmDocumentBuilder } from '@exemplarjs/xdm';

const doc = new XdmDocumentBuilder().parse({
  systemId: 'file:///data/catalog.xml',
  bytes: readFileSync('/data/catalog.xml'),
});

doc.documentURI; // 'file:///data/catalog.xml'
```

[Factories and sources](/guide/sources) lists every kind of source.

## Use your reader settings

The builder parses with an `XMLInputFactory`. Pass a configured factory to the constructor, and its options apply to
every tree the builder builds: DTD loading, validation, XInclude, resolvers and limits.

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { XMLInputFactory } from '@exemplarjs/xml';

const factory = new XMLInputFactory({ disallowDoctype: true });
const builder = new XdmDocumentBuilder(factory);
```

Two options are fixed, because the XPath data model requires them: documents are always parsed namespace-aware, and
entity references such as `&shop;` are always replaced by their text.

Reuse one builder. The trees it builds share a name table, so the element and attribute names of documents with the
same vocabulary are stored once.

## Build from a reader

`parse` and `parseAsync` also take an open reader, such as [the cursor](/guide/cursor/) that `createStreamReader`
returns. The tree is built from the events the reader reports, so a filtered reader produces a
filtered tree, and a reader positioned inside a large document produces a tree of one part of it.

### Leave parts out

`createFilteredReader` wraps a reader and reports only the events its predicate returns `true` for. To change events
instead of dropping them, wrap the reader in a delegate. This tree has no comments:

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
// ---cut---
import { EventType, type StreamFilter } from '@exemplarjs/xml';
import { createFilteredReader } from '@exemplarjs/xml/filters';

const noComments: StreamFilter = (reader) => reader.eventType() !== EventType.COMMENT;
const reader = createFilteredReader(xml.createStreamReader(source), noComments);

const doc = new XdmDocumentBuilder().parse(reader);
```

See [Dropping content with filters](/guide/cursor/filters) and
[Changing content with delegates](/guide/cursor/delegates).

### One record at a time

A large file of records need not be built as one tree. The builder starts at the reader's current position: at a
start tag, it builds a tree of that element alone and leaves the reader at its end tag. Advance the reader to each
record in turn, build its tree and query it; each tree can be discarded before the next is built.

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { EventType } from '@exemplarjs/xml';
// ---cut---
const builder = new XdmDocumentBuilder();
const title = compiler.compile('string(/book/title)');
const reader = xml.createStreamReader(source);

reader.nextTag(); // to <catalog>
while (reader.nextTag() === EventType.START_ELEMENT) {
  const book = builder.parse(reader); // a tree of this <book> alone
  console.log(title.evaluateString(book)); // 'Dune', then 'Emma', then 'Cosmos'
}
```

Each tree is a separate document with the record as its root element, so absolute paths start at `/book`.
[One record at a time](/guide/cursor/records) covers the full pattern, including streams.

::: details Options a reader must have
The factory that created the reader must have three options at their default values:

| Option                    | Must be | Why                                                |
| ------------------------- | ------- | -------------------------------------------------- |
| `namespaceAware`          | `true`  | XPath matches elements by namespace and local name |
| `replaceEntityReferences` | `true`  | The tree has text, not entity references           |
| `namespacePrefixes`       | `false` | Namespace declarations are not attributes in XPath |

A reader created with any other value is rejected before any input is read:

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { XMLInputFactory } from '@exemplarjs/xml';
// ---cut---
const plain = new XMLInputFactory({ namespaceAware: false });

new XdmDocumentBuilder().parse(plain.createStreamReader(source));
// InvalidArgumentError: XdmDocumentBuilder.parse needs a reader with namespaceAware: true
```

The builder's own factory must be namespace-aware too: `new XdmDocumentBuilder(plain)` throws the same kind of error.
The other two options matter only for readers created by the caller. When the builder parses a string, bytes or a
stream itself, it overrides them in the factory's options.
:::

::: details Build from SAX events or event objects
`createSAXHandler()` returns a handler that builds a tree from SAX events, so it can terminate a chain of SAX filters.
When the parse ends, the handler's `document` property is the document node.

```ts twoslash
// ---cut---
import { SAXParser } from '@exemplarjs/sax';
import { XdmDocumentBuilder } from '@exemplarjs/xdm';

const handler = new XdmDocumentBuilder().createSAXHandler();
new SAXParser().parse(source, handler);

const doc = handler.document;
```

See [SAX filters](/guide/sax/filters).

`build` takes any iterable of event objects: an event reader, or a generator that transforms an event reader's
events. `buildAsync` takes an async iterable.

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
// ---cut---
const doc = new XdmDocumentBuilder().build(xml.createEventReader(source));
```

See [Changing events with a generator](/guide/events/generators).
:::

## Build from a fragment

`parseFragment` builds a tree from content that has no single root element: any mix of text, elements, comments and
processing instructions, such as marked-up text stored in a database column. `parse` rejects such content, because it
is not a well-formed document. Each top-level node of the fragment becomes a child of the document node.

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
// ---cut---
const note = new XdmDocumentBuilder().parseFragment('Read <b>Dune</b> first.');

note.children().map((child) => child.kindName); // ['text', 'element', 'text']
compiler.compile('string(b)').evaluateString(note); // 'Dune'
```

`parseFragment` takes a string only. The text cannot contain an XML declaration or a DTD, and markup that is not
well-formed throws an `XMLError`, as it does in `parse`.

A second argument sets the tree's base URI, which XPath's `base-uri()` returns and relative URIs resolve against:
`parseFragment(text, 'file:///data/notes/')`. A fragment's tree has no document URI.

## What the tree keeps and drops

The tree holds what the XPath data model represents, which is not everything in the source text.

| In the document                      | In the tree                                                            |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Elements, attributes, text           | Kept                                                                   |
| Comments and processing instructions | Kept                                                                   |
| Whitespace between elements          | Kept, as text nodes                                                    |
| `<![CDATA[ … ]]>` sections           | Become ordinary text, joined with the text around them                 |
| Entity references such as `&shop;`   | Replaced by their text                                                 |
| `xmlns` declarations                 | Not attributes. Each element records its in-scope namespaces           |
| The DTD (`<!DOCTYPE …>`)             | Dropped, except for which attributes are IDs and its unparsed entities |
| Whitespace outside the root element  | Dropped                                                                |
| The XML declaration                  | Dropped                                                                |

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
// ---cut---
const note = new XdmDocumentBuilder().parse(
  '<!DOCTYPE note [<!ENTITY shop "Corner Books">]><note>From &shop;: <![CDATA[2 < 3]]></note>'
);

note.stringValue; // 'From Corner Books: 2 < 3', in one text node
```

A serialized tree is therefore an equivalent document, but not the same bytes. To preserve CDATA sections or the DTD,
use [the DOM](/guide/dom/) or copy the document with [a writer](/guide/writing/copying).

## Look at nodes yourself

Nodes can be read directly, which is often shorter than an expression per value when several values are needed from
one element. Every node is an `XdmNode`, obtained from an expression with
[`selectNodes`](/guide/xpath/results#get-nodes) or by navigating from the document node.

```ts twoslash
import { NodeKind } from '@exemplarjs/xdm';

const [book] = compiler.compile('//book').selectNodes(doc);

book.kind === NodeKind.ELEMENT; // true
book.kindName; // 'element'
book.localName; // 'book'
book.attribute('id'); // 'b1'
book.attribute('isbn'); // undefined: there is no such attribute
book.parent?.localName; // 'catalog'
```

| Member                      | Returns                                                                      |
| --------------------------- | ---------------------------------------------------------------------------- |
| `kind`, `kindName`          | The node kind: a `NodeKind` number, or its name such as `'element'`          |
| `localName`, `namespaceURI` | The two parts of the node's name; `''` when it has none                      |
| `nodeName`                  | The name as one object, with its prefix, or `null` for a node without a name |
| `stringValue`               | The node's text. For an element or a document, all descendant text, joined   |
| `attribute(name, uri?)`     | The value of one attribute, or `undefined`                                   |
| `attributes()`              | The attributes, as nodes                                                     |
| `children()`                | The child nodes, in document order                                           |
| `parent`, `root`            | The parent node, and the root of the tree                                    |
| `elementById(id)`           | The element with an ID, or `null`                                            |
| `baseURI`                   | The URI that relative URIs in the node resolve against, or `null`            |
| `documentURI`               | On a document node, the document's URI; otherwise `null`                     |

An attribute in a namespace takes the namespace as a second argument, so `xml:lang` is
`node.attribute('lang', XML_NAMESPACE)`, with `XML_NAMESPACE` imported from `@exemplarjs/xml`.

### Whitespace between elements is a node

The line breaks and indentation between elements are text nodes. In the catalog from
[Getting started](/guide/xpath/), `children()` of the `catalog` element returns seven nodes: three `book` elements and
the four whitespace text nodes around them. Filter by `kind`, or use a path, which selects elements by name.

```ts twoslash
import { NodeKind } from '@exemplarjs/xdm';
declare const catalog: import('@exemplarjs/xdm').XdmNode;
// ---cut---
const books = catalog.children().filter((child) => child.kind === NodeKind.ELEMENT);
books.map((book) => book.attribute('id')); // ['b1', 'b2', 'b3']
```

### An attribute named `id` is not an ID

`elementById`, and XPath's `id()` function, find an element only by an attribute that a DTD declares as an ID, or by
an `xml:id` attribute. For a plain `id` attribute, use a path such as `//book[@id = "b1"]`.

::: details Walk in any direction with `axis`
An _axis_ is a direction of navigation from a node: its children, its descendants, its ancestors, its following
siblings. `axis` iterates the nodes on one axis. Pass a name to select only the elements with that name.

```ts twoslash
import { ANY_NAME, Axis, NodeKind } from '@exemplarjs/xdm';
declare const book: import('@exemplarjs/xdm').XdmNode;
// ---cut---
// Every title element below the document.
for (const node of doc.axis(Axis.DESCENDANT, 'title')) {
  console.log(node.stringValue); // 'Dune', then 'Emma', then 'Cosmos'
}

// The elements after this one, with any name.
const anyElement = { kind: NodeKind.ELEMENT, name: ANY_NAME };
for (const node of book.axis(Axis.FOLLOWING_SIBLING, anyElement)) {
  console.log(node.attribute('id')); // 'b2', then 'b3'
}
```

A name in a namespace is an object: `{ localName: 'title', namespaceURI: 'http://purl.org/dc/elements/1.1/' }`. On
`Axis.ATTRIBUTE` a name selects the attributes with that name. A _node test_, an object with a kind and a name, selects
nodes of other kinds, as `anyElement` does here. Without a second argument, `axis` returns every node on the axis.
`Axis` has all thirteen of XPath's axes, from `Axis.ANCESTOR` to `Axis.SELF`.

An expression is usually shorter. `axis` is intended for code that traverses a whole tree.
:::

## Compare nodes

::: warning
Do not compare nodes with `===`. An `XdmNode` object is a reference to a position in the tree, created on demand, so
two objects can refer to the same node. Use `isSameNode`.
:::

Nodes from two expressions, or from one expression evaluated twice, are different objects:

```ts twoslash
const [first] = compiler.compile('//book[1]').selectNodes(doc);
const [byId] = compiler.compile('//book[@id = "b1"]').selectNodes(doc);

first === byId; // false, although both are the first book
first.isSameNode(byId); // true
```

For the same reason, a node cannot serve as a `Map` key or a `Set` member, and `array.includes(node)` returns `false`
for a different object that refers to the same node. Use `array.some((other) => other.isSameNode(node))`.

To sort nodes into document order, use `compareOrder`. It is both a method of `XdmNode` and a standalone comparator
for `sort`:

```ts twoslash
declare const nodes: import('@exemplarjs/xdm').XdmNode[];
// ---cut---
import { compareOrder } from '@exemplarjs/xdm';

nodes.sort(compareOrder);
```

It returns a negative number when the first node comes earlier, zero for the same node and a positive number when it
comes later. Nodes from different trees are ordered by which tree was built first.

## Next steps

- [Reading documents and collections](/guide/xpath/resources): load trees from within an expression, with `doc()` and
  `collection()`.
- [Pipelines](/guide/pipelines): how readers, filters, trees and writers compose.
- [Building and reading a DOM](/guide/dom/): the mutable tree, for changing a document.
