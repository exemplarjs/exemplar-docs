# Writing XML

The stream writer produces XML from a sequence of calls: start an element, write an attribute, write text, end the
element. It escapes text, checks that the output is well-formed XML, and passes output to its destination as it goes,
so the writer never holds the whole document.

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';

const sink = new StringSink();
const writer = new XMLOutputFactory({ indent: '  ' }).createStreamWriter(sink);

writer.writeStartDocument();
writer.writeStartElement('catalog');
writer.writeStartElement('book');
writer.writeAttribute('id', 'b1');
writer.writeStartElement('title');
writer.writeCharacters('Dune');
writer.writeEndElement(); // </title>
writer.writeEndElement(); // </book>
writer.writeEndElement(); // </catalog>
writer.writeEndDocument();

console.log(sink.toString());
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="b1">
    <title>Dune</title>
  </book>
</catalog>
```

## Write a document step by step

`XMLOutputFactory` holds the output options, here [`indent`](#indent-the-output), and no per-document state, so one
instance can create any number of writers. Each writer is bound to the destination it is created with; a `StringSink`
collects the output as a string, which `toString()` returns.

The calls follow document order:

| Call                          | What it writes                                                          |
| ----------------------------- | ----------------------------------------------------------------------- |
| `writeStartDocument()`        | The XML declaration, `<?xml version="1.0" encoding="UTF-8"?>`           |
| `writeStartElement(name)`     | A start tag, which stays open for attributes                            |
| `writeAttribute(name, value)` | An attribute on the start tag just written                              |
| `writeCharacters(text)`       | Text                                                                    |
| `writeEndElement(name?)`      | The end tag of the innermost open element                               |
| `writeEndDocument()`          | End tags for every element still open; the sink then has all the output |

Three rules apply to these calls:

- `writeEndElement` needs no name: the writer closes the innermost open element. If a name is passed, as in
  `writeEndElement('book')`, the writer checks it against the open element and throws a `WriterError` on a mismatch,
  which catches unbalanced end tags.
- `writeEndDocument` closes every open element, so the three `writeEndElement` calls at the end of the example are
  optional.
- Attributes directly follow their element's start tag, before any text or child element.

`writeStartDocument` is optional. Omit it to write a fragment with no declaration.

::: tip Coming from Java
The stream writer is StAX's `XMLStreamWriter`, and the factory is `XMLOutputFactory`. Options are passed to the
factory's constructor in place of `setProperty`, and are named after the JAXP output properties;
[Coming from Java](/reference/java) lists them side by side.
:::

## Escaping and checks

### Escaping text and attribute values

Pass text to the writer unescaped. Characters with a meaning in XML, such as `&` and `<`, are written as references,
so the document reads back as exactly the text passed in:

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
const sink = new StringSink();
const writer = new XMLOutputFactory().createStreamWriter(sink);
// ---cut---
writer.writeStartElement('title');
writer.writeAttribute('note', 'the "big" one');
writer.writeCharacters('Fish & Chips <new>');
writer.writeEndElement();
// <title note="the &quot;big&quot; one">Fish &amp; Chips &lt;new&gt;</title>
```

Tabs and line breaks in attribute values are written as references too, because a parser would otherwise normalize
them to spaces. Do not escape text before passing it in, or it is escaped twice.

The factory's `escaping: 'minimal'` option escapes only what XML requires. Its output does not always round-trip: a
parser normalizes a carriage return in text to a line feed, and a tab or line break in an attribute value to a space.

### Well-formedness checks

The writer checks each call as it is made, and throws a `WriterError` for one that would make the output not well
formed. The error has a `code` and a `message`:

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
const sink = new StringSink();
const writer = new XMLOutputFactory().createStreamWriter(sink);
// ---cut---
writer.writeStartElement('book');
writer.writeCharacters('Dune');
writer.writeAttribute('id', 'b1');
// WriterError WRITE_STATE: Attributes go directly after a start tag
```

The checks reject, among others:

- a name that is not an XML name, such as `my book`
- the same attribute twice on one element
- a second outermost element, or text outside the outermost element
- `--` in a comment, and `]]>` in a CDATA section
- a prefix that no namespace declaration covers

[Error codes](/reference/error-codes) lists the codes. `checkWellFormedness: false` on the factory turns these checks
off, except that an attribute or a namespace declaration must still directly follow its start tag.

## Write empty elements, comments and other content

An element started and ended with nothing in between is written in the short form, `<stock/>`. `writeEmptyElement`
writes one in a single call, and takes attributes like any start tag:

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
const sink = new StringSink();
const writer = new XMLOutputFactory().createStreamWriter(sink);
// ---cut---
writer.writeStartElement('book');
writer.writeEmptyElement('stock');
writer.writeAttribute('count', '12');
writer.writeEndElement();
// <book><stock count="12"/></book>
```

The writer has a method for each of the other constructs in a document:

| Call                                                  | What it writes                                          |
| ----------------------------------------------------- | ------------------------------------------------------- |
| `writeComment(' spring list ')`                       | `<!-- spring list -->`                                  |
| `writeProcessingInstruction('print', 'wide')`         | `<?print wide?>`                                        |
| `writeCData('a < b')`                                 | `<![CDATA[a < b]]>`, text written without escaping      |
| `writeDTD('<!DOCTYPE catalog SYSTEM "catalog.dtd">')` | The DOCTYPE, verbatim                                   |
| `writeEntityRef('shop')`                              | `&shop;`, a reference to an entity the DOCTYPE declares |

A DOCTYPE goes after `writeStartDocument` and before the first element. The factory can also generate one: created
with `doctypeSystem: 'catalog.dtd'`, it starts every document with a DOCTYPE that names the outermost element.
[DTDs and entities](/guide/external/dtd) covers DOCTYPEs and entities.

Two calls write a whole subtree at once. `writeNode(node)` writes a DOM tree or part of one; see
[Changing and saving a DOM](/guide/dom/saving#write-the-tree-as-a-string). `copy(reader)` writes what a reader reads;
see [Copying and changing documents](/guide/writing/copying).

## Indent the output

With an `indent` string on the factory, each element starts on a new line, indented by that string once per level,
and the XML declaration and a DOCTYPE each get a line of their own. Without one the writer adds no whitespace, and
the output is a single line, as in the examples above.

This document has an element that holds text:

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
const sink = new StringSink();
// ---cut---
const writer = new XMLOutputFactory({ indent: '  ' }).createStreamWriter(sink);

writer.writeStartDocument();
writer.writeStartElement('catalog');
writer.writeStartElement('book');
writer.writeAttribute('id', 'b1');
writer.writeStartElement('title');
writer.writeCharacters('Dune');
writer.writeEndElement();
writer.writeStartElement('blurb');
writer.writeCharacters('A ');
writer.writeStartElement('em');
writer.writeCharacters('great');
writer.writeEndElement();
writer.writeCharacters(' read');
writer.writeEndDocument();

console.log(sink.toString());
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="b1">
    <title>Dune</title>
    <blurb>A <em>great</em> read</blurb>
  </book>
</catalog>
```

Nothing was added inside `<blurb>`. Whitespace next to text would become part of the text, so once an element
contains text, the writer adds no whitespace inside it or its descendants. Indentation therefore never changes a
document's text.

To suppress indentation inside particular elements whatever they contain, list their names in the factory's
`suppressIndentation` option.

## Choose where the output goes

`createStreamWriter` takes one of these destinations:

| Destination                    | Output                                                                     |
| ------------------------------ | -------------------------------------------------------------------------- |
| `new StringSink()`             | A string, returned by `toString()` at the end.                             |
| `new BytesSink()`              | The encoded bytes as one `Uint8Array`, returned by `toBytes()` at the end. |
| A `WritableStream<Uint8Array>` | A file, a request body or any other byte stream.                           |
| A custom sink                  | Anything else: a log, a hash, a test double.                               |

The writer buffers output and passes it on in chunks, so a sink does not always hold everything written so far.
`writeEndDocument()` flushes the remainder. Call `flush()` to do the same at any other time, for example to read the
sink after writing a fragment without `writeEndDocument()`:

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
// ---cut---
const sink = new StringSink();
const writer = new XMLOutputFactory().createStreamWriter(sink);

writer.writeStartElement('title');
writer.writeCharacters('Dune');
writer.writeEndElement();
writer.flush();

console.log(sink.toString()); // <title>Dune</title>
```

::: details Write a custom sink
A custom sink implements `write(chunk)`, which receives text, or `writeBytes(chunk)`, which receives encoded bytes:

```ts twoslash
import { XMLOutputFactory } from '@exemplarjs/writer';
// ---cut---
import type { Sink } from '@exemplarjs/writer';

const chunks: string[] = [];
const collecting: Sink = {
  write(chunk) {
    chunks.push(chunk);
  },
};

const writer = new XMLOutputFactory().createStreamWriter(collecting);
writer.writeEmptyElement('catalog');
writer.writeEndDocument();
console.log(chunks); // [ '<catalog/>' ]
```

A sink that applies backpressure, or that needs closing, has two more methods. `drain()` returns a promise that
resolves when the sink can accept more; it is what `writer.drain()` awaits. `close()` is called by `writer.close()`,
and may return a promise. A sink without them is treated as always ready and as needing no close.

`new WritableStreamSink(stream)` is the sink the writer wraps a `WritableStream` in.
:::

## Write to a file or a stream

To write a file, pass the writer a web `WritableStream` of bytes instead of a sink. The writer encodes the text and
passes it on in chunks during writing, so the output is never in memory whole.

```ts twoslash
declare const books: { id: string; title: string }[];
// ---cut---
import { createWriteStream } from 'node:fs';
import { Writable } from 'node:stream';
import { XMLOutputFactory } from '@exemplarjs/writer';

const file = Writable.toWeb(createWriteStream('catalog.xml'));
const writer = new XMLOutputFactory({ indent: '  ' }).createStreamWriter(file);

writer.writeStartDocument();
writer.writeStartElement('catalog');
for (const [index, book] of books.entries()) {
  writer.writeStartElement('book');
  writer.writeAttribute('id', book.id);
  writer.writeCharacters(book.title);
  writer.writeEndElement();
  if (index % 1000 === 0) await writer.drain();
}
writer.writeEndDocument();
await writer.close();
```

`drain` and `close` exist because the write methods are synchronous and never wait for the stream.

- **`await writer.drain()`** waits until the stream can accept more. The write methods return immediately, and output
  the stream has not yet accepted is queued in memory, so a loop that writes a million books without pausing queues
  most of the document. Awaiting `drain()` at intervals bounds the queue; it resolves immediately when the stream is
  ready.
- **`await writer.close()`** flushes the remaining output, closes the stream, and resolves when the stream has
  accepted everything. Always await it: until it resolves, the file may be incomplete.

Any web `WritableStream` works the same way, such as an upload body or a compression stream piped to a file.

### Choose an encoding

Bytes are written as UTF-8 unless another encoding is set, on the factory or for one writer:

```ts twoslash
import { XMLOutputFactory } from '@exemplarjs/writer';
declare const file: WritableStream<Uint8Array>;
// ---cut---
const latin1 = new XMLOutputFactory({ encoding: 'ISO-8859-1', indent: '  ' }).createStreamWriter(file);
// or, for one writer:
const ascii = new XMLOutputFactory().createStreamWriter(file, { encoding: 'US-ASCII' });
```

The XML declaration names the encoding, and a character the encoding cannot represent is written as a numeric
character reference, so no text is lost:

```xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<title>Émile &#8212; &#8364;5</title>
```

The writer supports UTF-8, UTF-16 and single-byte encodings such as US-ASCII, ISO-8859-1 and windows-1252;
[Encodings](/guide/production/encodings) has the details. A character reference is valid only in text and attribute
values, so a character the encoding cannot represent in an element name or a comment throws a `WriterError`. An
encoding the writer has no encoder for throws an `InvalidArgumentError` when the writer is created.

## Write namespaces

To write an element in a [namespace](/guide/namespaces), declare a prefix for the namespace on an element, then use
the prefix in the names of elements and attributes:

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
const sink = new StringSink();
const writer = new XMLOutputFactory().createStreamWriter(sink);
// ---cut---
const DC = 'http://purl.org/dc/elements/1.1/';

writer.writeStartElement('catalog');
writer.writeNamespace('dc', DC); // xmlns:dc="…" on <catalog>
writer.writeStartElement('dc', 'title', DC);
writer.writeCharacters('Dune');
writer.writeEndDocument();
// <catalog xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Dune</dc:title></catalog>
```

`writeNamespace` directly follows a start tag, as an attribute does, and the declaration is in scope for that element
and its descendants. `writeDefaultNamespace(uri)` declares a default namespace, `xmlns="…"`; elements written by
local name alone within its scope are in that namespace.

To write an element in no namespace within the scope of a default namespace, start it with an empty prefix and
namespace, as in `writeStartElement('', 'note', '')`, and call `writeDefaultNamespace('')` on it, which writes
`xmlns=""`. Without that the element would be read back in the outer namespace, so the writer rejects it with the
code `WRITE_UNBOUND_PREFIX`.

### Let the writer declare namespaces

With `repairNamespaces: true` on the factory, the writer tracks declarations itself: pass the namespace of each
element and attribute, and the writer adds any declarations that are missing.

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
const sink = new StringSink();
const DC = 'http://purl.org/dc/elements/1.1/';
// ---cut---
const writer = new XMLOutputFactory({ repairNamespaces: true }).createStreamWriter(sink);

writer.writeStartElement('catalog');
writer.writeStartElement('dc', 'title', DC);
writer.writeAttribute('urn:shop', 'shelf', 'A3');
writer.writeEndDocument();
// <catalog><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:ns1="urn:shop" ns1:shelf="A3"/></catalog>
```

The attribute has a namespace and no prefix, so the writer generated one: `ns1`, then `ns2` and so on. Each
declaration is written on the element that needs it. For one declaration on the outermost element instead of one per
element, call `writeNamespace` there, as in the previous example.

### Name elements and attributes with a QName

The methods that take a prefix, a local name and a namespace take them in that order:

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
const writer = new XMLOutputFactory({ repairNamespaces: true }).createStreamWriter(new StringSink());
const DC = 'http://purl.org/dc/elements/1.1/';
// ---cut---
writer.writeStartElement('dc', 'title', DC); // prefix, local name, namespace
writer.writeAttribute('dc', 'lang', DC, 'en'); // prefix, local name, namespace, value
```

Swapping two of the strings is a mistake TypeScript cannot catch. A `QName` (qualified name) is one object that holds
the namespace, local name and prefix of a name, and both methods accept one. Define each name once and reuse it:

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';
const writer = new XMLOutputFactory({ repairNamespaces: true }).createStreamWriter(new StringSink());
const DC = 'http://purl.org/dc/elements/1.1/';
// ---cut---
import { QName } from '@exemplarjs/xml';

const TITLE = new QName(DC, 'title', 'dc'); // namespace, local name, prefix
const LANG = new QName(DC, 'lang', 'dc');

writer.writeStartElement(TITLE);
writer.writeAttribute(LANG, 'en');
// <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/" dc:lang="en">
```

[Event objects](/guide/events/) also expose names as `QName`s, so a name read from one document can be written
directly into another.

## Next steps

- [Copying and changing documents](/guide/writing/copying): pipe a reader into a writer, with changes on the way.
- [Canonical XML](/guide/writing/canonical): write a document in canonical form, for signing or comparison.
- [Writer options](/reference/writer-options): every option of the output factory, including escaping, CDATA elements
  and character maps.
- [Changing and saving a DOM](/guide/dom/saving): write a tree with `writeNode`.
- [Serializing results](/guide/xpath/serialize): write the results of an XPath query.
