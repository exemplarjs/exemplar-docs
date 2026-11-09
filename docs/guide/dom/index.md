# Building and reading a DOM

`@exemplarjs/dom` implements DOM Level 3 Core for Node and any other runtime: a mutable tree with every node type,
attribute types and IDs taken from the [DTD](/guide/external/dtd), `normalizeDocument()` and base URIs. Use it to run
code written against the browser DOM, for random access to a document, or to edit a document and serialize it again.

On top of Level 3 it has the browser's `DOMParser` and `XMLSerializer`, the element-only traversal properties and
`remove()`. Later browser APIs such as `querySelector` are not implemented;
[What browsers have that this tree does not](#what-browsers-have-that-this-tree-does-not) lists what is missing.

The examples on this page read this catalog, held in a string named `source`:

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

Parse it and print every title:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';

const builder = new DocumentBuilder();
const document = builder.parse(source);

for (const title of document.getElementsByTagName('title')) {
  console.log(title.textContent);
}
// Dune
// Emma
```

`parse` returns once the whole document is in memory, and the tree takes more memory than the document's text. For a
document too large for that, use the streaming [cursor](/guide/cursor/).

## Build a tree

`parse` takes a string or bytes. `parseAsync` takes a `ReadableStream` or an async iterable of bytes and returns a
promise of the document:

::: code-group

```ts twoslash [String or bytes]
import { DocumentBuilder } from '@exemplarjs/dom';
// ---cut---
const builder = new DocumentBuilder();

const fromText = builder.parse('<catalog><book id="b1"/></catalog>');
const fromBytes = builder.parse(bytes);
```

```ts twoslash [Stream]
import { DocumentBuilder } from '@exemplarjs/dom';
// ---cut---
const builder = new DocumentBuilder();

const document = await builder.parseAsync(stream);
```

:::

A builder holds only its options and its input factory, so one instance can build any number of documents.

For a document that is not well formed, `parse` throws an `XMLError` with a message and a location; see
[Errors and locations](/guide/errors).

## Find elements

`document.documentElement` is the outermost element, `<catalog>` here. `getElementsByTagName` is available on the
document and on elements, where it searches only that element's descendants. The name `'*'` matches every element.

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse(source);
// ---cut---
const books = document.getElementsByTagName('book');
console.log(books.length); // 2

const second = books[1];
console.log(second?.getElementsByTagName('title')[0]?.textContent); // Emma
```

### Find elements in a namespace

`getElementsByTagName` matches the name as written, prefix included: `<dc:title>` matches `'dc:title'`, not
`'title'`. For documents that use namespaces, use `getElementsByTagNameNS`, which takes the namespace URI and the
local name, and so matches whatever prefix the document uses:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const builder = new DocumentBuilder();
// ---cut---
const DC = 'http://purl.org/dc/elements/1.1/';
const document = builder.parse(`<catalog xmlns:dc="${DC}"><book><dc:title>Dune</dc:title></book></catalog>`);

console.log(document.getElementsByTagNameNS(DC, 'title')[0]?.textContent); // Dune
```

[Namespaces](/guide/namespaces) covers prefixes and namespaces.

### Find an element by its ID

`document.getElementById` differs from a browser's in one respect. In XML, an attribute named `id` is not an ID
unless it is declared as one, either by the document's DTD or by your code with `setIdAttribute`:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse(source);
// ---cut---
console.log(document.getElementById('b1')); // null: id is not declared as an ID

for (const book of document.getElementsByTagName('book')) book.setIdAttribute('id', true);
console.log(document.getElementById('b1')?.tagName); // book
```

A document whose DTD declares the attribute, with `<!ATTLIST book id ID #REQUIRED>`, needs no `setIdAttribute` call.
[DTDs and entities](/guide/external/dtd) covers DTDs.

## Read text and attributes

`textContent` returns the concatenated text of a node's descendants. Attributes are read by name from their element:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse(source);
// ---cut---
const book = document.getElementsByTagName('book')[0];
if (book === undefined) throw new Error('no books');

console.log(book.getAttribute('id')); // b1
console.log(book.getAttribute('stock')); // null: there is no such attribute
console.log(book.hasAttribute('stock')); // false
console.log(book.getElementsByTagName('price')[0]?.textContent); // 8.99

for (const attribute of book.attributes) console.log(attribute.nodeName, '=', attribute.nodeValue);
// id = b1
// lang = en
```

`getAttribute` returns `null` for a missing attribute, as in browsers. For attributes in a namespace, such as
`xml:lang`, use `getAttributeNS(namespace, localName)` and the other `NS` methods.

::: tip Coming from Java
Java's `getAttribute` returns an empty string for a missing attribute. For that behaviour, create the builder with
`new DocumentBuilder(factory, { missingAttribute: 'empty' })`. For documents created from scratch, the option is on
`new DOMImplementation({ missingAttribute: 'empty' })`.
:::

## Walk the tree

`parentNode`, `childNodes`, `firstChild`, `lastChild`, `previousSibling` and `nextSibling` work as in a browser.
Whitespace between tags is kept as text nodes, and comments are nodes, so an indented document has a text node
between every pair of elements:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse(source);
const book = document.getElementsByTagName('book')[0]!;
// ---cut---
import { Node } from '@exemplarjs/dom';

console.log([...book.childNodes].map((node) => node.nodeName));
// [ '#text', 'title', '#text', 'price', '#text' ]

const elements = [...book.childNodes].filter((node) => node.nodeType === Node.ELEMENT_NODE);
console.log(elements.map((node) => node.nodeName));
// [ 'title', 'price' ]
```

`Node` is not a global outside a browser; import it for the node type constants: `Node.ELEMENT_NODE`,
`Node.TEXT_NODE`, `Node.COMMENT_NODE` and the rest.

### Step over elements only

Five properties skip text and comment nodes: `firstElementChild`, `lastElementChild`, `nextElementSibling`,
`previousElementSibling` and `childElementCount`.

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse(source);
const book = document.getElementsByTagName('book')[0]!;
// ---cut---
console.log(book.childElementCount); // 2

for (let child = book.firstElementChild; child !== null; child = child.nextElementSibling) {
  console.log(child.nodeName);
}
// title
// price
```

## Turn a list into an array

`childNodes`, `attributes` and the results of `getElementsByTagName` are DOM lists, not arrays, as in a browser. A
list has `length`, `list[i]`, `item(i)` and `for...of`, but no `map` or `filter`. Convert one with `[...list]` or
`Array.from(list)`:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse(source);
// ---cut---
const titles = Array.from(document.getElementsByTagName('title'), (title) => title.textContent);
console.log(titles); // [ 'Dune', 'Emma' ]
```

All of these lists are live, as in a browser. An array made from a list is a snapshot.

::: warning
Do not read a list with `Object.values`, `Object.keys`, `Object.entries`, `{ ...list }` or `for...in`. They read the
list's own index properties, which `childNodes` can leave empty just after the tree has changed. `[...list]` and
`Array.from(list)` always return the current nodes.
:::

## Run code written for browsers

Browser code parses with `DOMParser` and serializes with `XMLSerializer`. `@exemplarjs/dom` exports both:

```ts twoslash
import { DOMParser, XMLSerializer } from '@exemplarjs/dom';

const document = new DOMParser().parseFromString('<catalog><book id="b1"/></catalog>', 'application/xml');
const text = new XMLSerializer().serializeToString(document);
console.log(text); // <catalog><book id="b1"/></catalog>
```

`DOMParser` accepts strings only and parses XML only: the types `'application/xml'`, `'text/xml'`,
`'application/xhtml+xml'` and `'image/svg+xml'`. The type `'text/html'` throws a `DOMException` named
`NotSupportedError`, and any other type throws an `InvalidArgumentError`.

### Check for a parsing error

`DocumentBuilder` throws on a document that is not well formed. `DOMParser` behaves as in browsers: it returns a
document whose outermost element is named `parsererror` and contains the message.

```ts twoslash
import { DOMParser } from '@exemplarjs/dom';
// ---cut---
const broken = new DOMParser().parseFromString('<catalog><book></catalog>', 'application/xml');

if (broken.getElementsByTagName('parsererror').length > 0) {
  console.log(broken.documentElement?.textContent);
}
// XML Parsing Error: Expected </book>
// Location: about:blank
// Line Number 1, Column 18:<catalog><book></catalog>
// -----------------^
```

That error is easy to leave unchecked, so prefer `DocumentBuilder` unless you are porting browser code.

### What browsers have that this tree does not

The tree implements DOM Level 3 Core, plus the element-only properties and `remove()`. Later browser additions, most
of them specific to web pages, are not implemented:

| Not implemented                                                 | Use instead                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `querySelector`, `querySelectorAll`                             | `getElementsByTagName`, or [XPath](/guide/xpath/) for anything more selective        |
| `children`                                                      | `firstElementChild` and `nextElementSibling`, or `childNodes` filtered by `nodeType` |
| `append()`, `prepend()`, `before()`, `after()`, `replaceWith()` | `appendChild`, `insertBefore`, `replaceChild`                                        |
| `innerHTML`, `outerHTML`                                        | A builder to parse, `XMLSerializer` to serialize                                     |
| HTML-specific properties such as `id` and `classList`           | `getAttribute`                                                                       |
| `addEventListener` and events of any kind                       | No equivalent: the tree has no events                                                |
| Tree walkers, node iterators and ranges                         | `childNodes` and the sibling properties                                              |

## Choose what the tree holds

By default the tree keeps everything in the document: comments, the whitespace between tags, and each
`<![CDATA[…]]>` section as a node of its own. Four options change that. Two are options of the builder. The other two
change what the parser reports, so they are options of the [`XMLInputFactory`](/guide/sources) passed to the builder:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
// ---cut---
import { XMLInputFactory } from '@exemplarjs/xml';

const factory = new XMLInputFactory({ coalescing: true });
const builder = new DocumentBuilder(factory, { ignoringComments: true });

const document = builder.parse('<note>a<![CDATA[ < ]]>b<!-- checked --></note>');
console.log(document.documentElement?.childNodes.length); // 1: the text "a < b"
```

| Option                             | Set on      | Effect                                                                          |
| ---------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| `ignoringComments`                 | The builder | Omits comments.                                                                 |
| `ignoringElementContentWhitespace` | The builder | Omits whitespace in elements that the DTD declares to contain only elements.    |
| `coalescing`                       | The factory | Converts CDATA sections to text and merges them with adjacent text.             |
| `replaceEntityReferences: false`   | The factory | Keeps entity references such as `&shop;` as nodes, so they serialize unchanged. |

`ignoringElementContentWhitespace` needs a DTD. Without one, the builder cannot distinguish layout whitespace from
content, and keeps all of it.

[Changing and saving a DOM](/guide/dom/saving#entity-references-in-the-tree) shows entity reference nodes. The
factory has further options for limits, DTDs and security, listed in [Reader options](/reference/options), and
`new DOMParser(factory)` accepts a factory in the same way.

::: tip Coming from Java
`DocumentBuilder` is JAXP's, with its factory's `setIgnoringComments` and `setIgnoringElementContentWhitespace` as the
two options. `coalescing` and `replaceEntityReferences` are `setCoalescing` and `setExpandEntityReferences`. The tree is
DOM Level 3 Core, as `org.w3c.dom` is.
:::

## Build from content changed on the way in

A builder also accepts exemplar's streaming readers as input, so content can be dropped or changed before it reaches
the tree, or a tree built for one part of a large file:

| The builder call             | Builds from                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `builder.parse(reader)`      | A [cursor](/guide/cursor/), from its current position, such as [one record](/guide/cursor/records) |
| `builder.createSAXHandler()` | The output of a chain of [SAX filters](/guide/sax/filters)                                         |
| `builder.build(events)`      | Event objects, such as those a [generator](/guide/events/generators) yields                        |

[Pipelines](/guide/pipelines) compares the three.

## Next steps

- [Changing and saving a DOM](/guide/dom/saving): edit the tree and serialize it.
- [Getting started with XPath](/guide/xpath/): query a document with XPath expressions.
- [Untrusted input](/guide/production/security): the options to set before parsing untrusted documents.
