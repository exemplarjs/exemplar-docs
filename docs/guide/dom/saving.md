# Changing and saving a DOM

A [DOM tree](/guide/dom/) is edited in place with the browser's methods, then serialized with `XMLSerializer` or,
for indentation, an encoding or a stream destination, with the stream writer's `writeNode`. This page notes where
behaviour differs from a browser's.

This example adds a book to a catalog and serializes the result:

```ts twoslash
import { DocumentBuilder, XMLSerializer } from '@exemplarjs/dom';

const text = '<catalog><book id="b1"><title>Dune</title><price currency="GBP">8.99</price></book></catalog>';
const document = new DocumentBuilder().parse(text);
const catalog = document.documentElement;
if (catalog === null) throw new Error('The document is empty');

const book = document.createElement('book');
book.setAttribute('id', 'b2');
const title = document.createElement('title');
title.textContent = 'Emma';
book.appendChild(title);
catalog.appendChild(book);

console.log(new XMLSerializer().serializeToString(document));
```

```xml
<catalog><book id="b1"><title>Dune</title><price currency="GBP">8.99</price></book><book id="b2"><title>Emma</title></book></catalog>
```

The samples in the next three sections continue from this one, with `document`, `catalog` and `book` as defined
here.

## Create and add nodes

As in a browser, the document creates a node and its future parent inserts it with `appendChild(node)`,
`insertBefore(node, other)` or `replaceChild(node, old)`. The newer `append()`, `before()` and `replaceWith()` are
[not implemented](/guide/dom/#what-browsers-have-that-this-tree-does-not).

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse('<catalog><book/></catalog>');
const catalog = document.documentElement!;
// ---cut---
catalog.insertBefore(document.createComment(' spring list '), catalog.firstChild);
// <catalog><!-- spring list --><book id="b1">…
```

The document has a method for each kind of node:

| Node                     | Call                                                    |
| ------------------------ | ------------------------------------------------------- |
| An element               | `document.createElement('book')`                        |
| Text                     | `document.createTextNode('Emma')`                       |
| A comment                | `document.createComment(' spring list ')`               |
| A CDATA section          | `document.createCDATASection('a < b')`                  |
| A processing instruction | `document.createProcessingInstruction('print', 'wide')` |

`createTextNode` is rarely needed: setting an element's `textContent`, as the first example does, replaces the
element's children with one text node.

Names are checked on creation. A name that is not a valid XML name, such as `my book`, throws a `DOMException` named
`InvalidCharacterError`.

## Change attributes and text

Attributes are set, changed and removed by name on their element:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse('<catalog><book/></catalog>');
// ---cut---
const first = document.getElementsByTagName('book')[0];
if (first === undefined) throw new Error('no books');

first.setAttribute('lang', 'en'); // adds it
first.setAttribute('id', 'dune'); // changes it
first.removeAttribute('lang'); // takes it out again

const price = first.getElementsByTagName('price')[0];
if (price !== undefined) price.textContent = '9.49';
// <book id="dune"><title>Dune</title><price currency="GBP">9.49</price></book>
```

## Remove nodes

`node.remove()` detaches a node and everything inside it from the tree. `parent.removeChild(node)` does the same from
the parent and returns the node:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse('<catalog><book/></catalog>');
const catalog = document.documentElement!;
// ---cut---
document.getElementsByTagName('price')[0]?.remove();

const comment = catalog.firstChild;
if (comment !== null) catalog.removeChild(comment);
// <catalog><book id="dune"><title>Dune</title></book><book id="b2"><title>Emma</title></book></catalog>
```

A removed node remains usable and can be inserted elsewhere later.

::: warning
Lists such as `childNodes` are live. To remove nodes while iterating over a list, iterate over a copy:
`for (const node of [...parent.childNodes])`. Iterating over the live list skips nodes as earlier ones are removed.
:::

## Move and copy nodes

A node has at most one parent, so inserting a node that is already in the tree moves it. To insert a copy, clone the
node with `cloneNode(true)`; `true` makes the clone deep.

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
// ---cut---
const document = new DocumentBuilder().parse('<catalog><book id="b1"/><book id="b2"/></catalog>');
const catalog = document.documentElement;
const first = document.getElementsByTagName('book')[0];
if (catalog === null || first === undefined) throw new Error('The catalog is empty');

catalog.appendChild(first); // moves b1 to the end
// <catalog><book id="b2"/><book id="b1"/></catalog>

catalog.appendChild(first.cloneNode(true)); // adds a copy of b1
// <catalog><book id="b2"/><book id="b1"/><book id="b1"/></catalog>
```

A node from another document cannot be inserted directly. Where a browser adopts it implicitly, `appendChild` here
throws a `DOMException` named `WrongDocumentError`. Call `document.importNode(node, true)` for a deep copy owned by
this document, or `document.adoptNode(node)` to move the node itself out of the other document.

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse('<catalog><book id="b1"/><book id="b2"/></catalog>');
const catalog = document.documentElement!;
// ---cut---
const other = new DocumentBuilder().parse('<catalog><book id="b9"/></catalog>');
const b9 = other.getElementsByTagName('book')[0];

if (b9 !== undefined) catalog.appendChild(document.importNode(b9, true));
// <catalog><book id="b2"/><book id="b1"/><book id="b1"/><book id="b9"/></catalog>
```

## Create elements in a namespace

`createElement` creates an element in no namespace. `createElementNS` takes the namespace and the name as it is to be
written, prefix included. `setAttributeNS` does the same for attributes:

```ts twoslash
import { DocumentBuilder, XMLSerializer } from '@exemplarjs/dom';
// ---cut---
const DC = 'http://purl.org/dc/elements/1.1/';
const document = new DocumentBuilder().parse('<catalog><book/></catalog>');
const book = document.getElementsByTagName('book')[0];

const title = document.createElementNS(DC, 'dc:title');
title.textContent = 'Dune';
book?.appendChild(title);
book?.setAttributeNS('urn:shop', 'shop:shelf', 'A3');

console.log(new XMLSerializer().serializeToString(document));
```

```xml
<catalog><book xmlns:shop="urn:shop" shop:shelf="A3"><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Dune</dc:title></book></catalog>
```

The code adds no `xmlns` declarations: serializing a tree adds the declarations the tree needs and does not have.
[Namespaces](/guide/namespaces) covers prefixes and namespaces.

::: warning
An element created with `createElement` has a `localName` of `null`, where a browser returns its name. Read
`nodeName` or `tagName`, or create the element with `createElementNS(null, name)`.
:::

## Write the tree as a string

`XMLSerializer`'s `serializeToString` takes a document or any other node, and writes it with no XML declaration and
no added whitespace:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse('<catalog><book/></catalog>');
// ---cut---
import { XMLSerializer } from '@exemplarjs/dom';

const text = new XMLSerializer().serializeToString(document);
```

For indentation, an XML declaration or another encoding, use the [stream writer](/guide/writing/) from
`@exemplarjs/writer`. Create one from an `XMLOutputFactory` with the options required, and pass the tree to
`writeNode`:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse('<catalog><book/></catalog>');
// ---cut---
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';

const sink = new StringSink();
const writer = new XMLOutputFactory({ indent: '  ' }).createStreamWriter(sink);

writer.writeNode(document);
writer.flush();

console.log(sink.toString());
```

For the catalog as edited at the top of this page, the output is:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="dune">
    <title>Dune</title>
  </book>
  <book id="b2">
    <title>Emma</title>
  </book>
</catalog>
```

The writer buffers its output, and `flush()` passes the remainder on to the `StringSink`. Given a document,
`writeNode` writes the XML declaration first, then the `<!DOCTYPE>` if the document has one; with `indent`, each
starts on a line of its own. The options most relevant here:

| Option               | Effect                                                                  |
| -------------------- | ----------------------------------------------------------------------- |
| `indent`             | The string that indents each level. Without it, no whitespace is added. |
| `omitXMLDeclaration` | `true` omits the XML declaration.                                       |
| `encoding`           | The encoding named in the declaration, and used when writing bytes.     |

[Writer options](/reference/writer-options) lists them all.

::: info
Indentation never changes a document's text. The writer adds line breaks and spaces only inside elements that hold no
text of their own. A tree parsed from an indented file holds that layout as text nodes, so the writer adds nothing to
it.
:::

### Write part of a tree

`writeNode` takes any node, so one element can be written alone, or inside a document written with the
[writer's own methods](/guide/writing/):

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
const document = new DocumentBuilder().parse('<catalog><book/></catalog>');
const sink = new StringSink();
// ---cut---
const writer = new XMLOutputFactory({ indent: '  ' }).createStreamWriter(sink);
const emma = document.getElementsByTagName('book')[1];

writer.writeStartDocument();
writer.writeStartElement('bestsellers');
if (emma !== undefined) writer.writeNode(emma);
writer.writeEndDocument();
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bestsellers>
  <book id="b2">
    <title>Emma</title>
  </book>
</bestsellers>
```

## Write the tree to a file

To write a file, pass the writer a `WritableStream` of bytes instead of a sink, and close the writer at the end.
`close()` resolves when the stream has accepted all the output:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
const document = new DocumentBuilder().parse('<catalog><book/></catalog>');
// ---cut---
import { createWriteStream } from 'node:fs';
import { Writable } from 'node:stream';
import { XMLOutputFactory } from '@exemplarjs/writer';

const file = Writable.toWeb(createWriteStream('catalog.xml'));
const writer = new XMLOutputFactory({ indent: '  ', encoding: 'ISO-8859-1' }).createStreamWriter(file);

writer.writeNode(document);
await writer.close();
```

The output is UTF-8 unless another encoding is set. A character the encoding cannot represent is written as a
numeric character reference such as `&#8212;`, so no text is lost.
[Writing XML](/guide/writing/#write-to-a-file-or-a-stream) covers streams and encodings.

## Tidy the tree

A tree does not need normalizing before it is serialized. Normalization is for code that reads the tree after a
series of edits and expects it to look freshly parsed, with each run of text in a single node.

`document.normalizeDocument()` normalizes the whole tree. It merges adjacent text nodes and removes empty ones. It
also adds the `xmlns` attributes the tree needs, so that the tree itself declares every namespace it uses.

`document.domConfig` holds parameters that extend what the call does. Set them before it:

```ts twoslash
import { DocumentBuilder, XMLSerializer } from '@exemplarjs/dom';
// ---cut---
const document = new DocumentBuilder().parse('<note>a<![CDATA[ < ]]>b<!-- checked --></note>');

document.domConfig.setParameter('cdata-sections', false);
document.domConfig.setParameter('comments', false);
document.normalizeDocument();

console.log(new XMLSerializer().serializeToString(document));
// <note>a &lt; b</note>
```

| Parameter                    | Default | Effect when `false`                                                                   |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------- |
| `cdata-sections`             | `true`  | Converts CDATA sections to text.                                                      |
| `comments`                   | `true`  | Removes comments.                                                                     |
| `entities`                   | `true`  | Replaces [entity reference nodes](#entity-references-in-the-tree) with their content. |
| `element-content-whitespace` | `true`  | Removes whitespace in elements that the DTD declares to contain only elements.        |
| `namespace-declarations`     | `true`  | Removes `xmlns` attributes from the tree.                                             |

::: details The other parameters
`domConfig.parameterNames` lists every parameter, and `canSetParameter(name, value)` reports whether a value is
supported.

- `check-character-normalization` and `normalize-characters` concern Unicode normalization of text.
- `well-formed`, `namespaces` and `split-cdata-sections` are on by default and can be turned off.
- `infoset` set to `true` sets several of the others at once: it turns `entities` and `cdata-sections` off, and
  `comments`, `namespaces`, `namespace-declarations`, `well-formed` and `element-content-whitespace` on.
- `error-handler` takes a function that is called with each problem found, such as a CDATA section that had to be
  split because it contained `]]>`. Without one, normalization continues past them.
- `validate`, `validate-if-schema`, `datatype-normalization` and `canonical-form` cannot be turned on. For canonical
  output, see [Canonical XML](/guide/writing/canonical).

:::

## Entity references in the tree

By default the builder expands each reference to an [entity](/guide/external/dtd), such as `&shop;`, and the tree
keeps no record of it. A factory created with `replaceEntityReferences: false` keeps each reference as a node of its
own, with the replacement text as its children:

```ts twoslash
import { DocumentBuilder, XMLSerializer } from '@exemplarjs/dom';
import { XMLInputFactory } from '@exemplarjs/xml';
// ---cut---
const text = '<!DOCTYPE catalog [<!ENTITY shop "Books &amp; Co">]><catalog><seller>&shop;</seller></catalog>';
const builder = new DocumentBuilder(new XMLInputFactory({ replaceEntityReferences: false }));
const document = builder.parse(text);

const seller = document.getElementsByTagName('seller')[0];
console.log(seller?.firstChild?.nodeName); // shop
console.log(seller?.textContent); // Books & Co

console.log(new XMLSerializer().serializeToString(document));
// <!DOCTYPE catalog [<!ENTITY shop "Books &amp; Co">]><catalog><seller>&shop;</seller></catalog>
```

Reading is unaffected: `textContent` still returns the text. Serializing writes the reference back as `&shop;`, which
is the reason to keep the nodes: a document that uses entities round-trips with its references intact.

The content of an entity reference node is read-only, because it belongs to the declaration and not to the
reference. Modifying it throws a `DOMException` named `NoModificationAllowedError`. To change the text, replace the
whole reference node with a text node. `document.createEntityReference('shop')` creates a new reference.

[DTDs and entities](/guide/external/dtd) covers entities and the other declarations in a DTD.

## Next steps

- [Writing XML](/guide/writing/): the stream writer in full.
- [Writer options](/reference/writer-options): every output option.
- [Copying and changing documents](/guide/writing/copying): pipe a reader into a writer and change content on the
  way, without a tree.
- [Getting started with XPath](/guide/xpath/): query a document with XPath expressions.
