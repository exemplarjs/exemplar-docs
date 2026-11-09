# Canonical XML

The same XML document can be serialized in many ways: attributes in any order, single or double quotes, an empty
element as `<a/>` or `<a></a>`. _Canonical form_ is a standard serialization that removes those differences, so that
equivalent documents become identical bytes. Signing XML and verifying a signature require it, and it is useful for
comparing documents.

These two documents differ as text on almost every line, yet are equivalent:

::: code-group

```xml [a.xml]
<?xml version="1.0" encoding="UTF-8"?>
<!-- exported on Tuesday -->
<book   id='b1' xmlns:dc="http://purl.org/dc/elements/1.1/" format="paperback">
  <dc:title>Dune &#38; more</dc:title>
  <price currency="GBP"></price>
</book>
```

```xml [b.xml]
<book format="paperback" xmlns:dc="http://purl.org/dc/elements/1.1/" id="b1">
  <dc:title><![CDATA[Dune & more]]></dc:title>
  <price currency="GBP"/>
</book>
```

:::

`canonicalize`, from `@exemplarjs/canonical`, returns the same string for both:

```xml
<book xmlns:dc="http://purl.org/dc/elements/1.1/" format="paperback" id="b1">
  <dc:title>Dune &amp; more</dc:title>
  <price currency="GBP"></price>
</book>
```

Comparing documents then becomes comparing strings:

```ts twoslash
declare const a: string;
declare const b: string;
// ---cut---
import { canonicalize } from '@exemplarjs/canonical';

canonicalize(a) === canonicalize(b); // true
```

## What canonical form changes

Canonical form removes every difference that does not affect the document's content, and keeps every one that does.

| Removed or made uniform                                  | Kept exactly                                     |
| -------------------------------------------------------- | ------------------------------------------------ |
| The XML declaration and the `<!DOCTYPE>`                 | Element and attribute names, with their prefixes |
| The order of attributes: sorted                          | Attribute values                                 |
| Quotes and spacing inside tags                           | Text, including every space and line break       |
| `<a/>` against `<a></a>`: always written `<a></a>`       | The order of elements                            |
| CDATA sections and character references: written as text | Processing instructions                          |
| Entity references: replaced by their text                | Comments, with `comments: true`                  |
| Attribute defaults from the DTD: written out             |                                                  |
| Namespace declarations that repeat an enclosing one      |                                                  |

XML treats whitespace between elements as content, so it is kept: two documents that differ only in indentation have
different canonical forms.

## Canonicalize a document, a reader or a node

`canonicalize` accepts three kinds of input, and `canonicalizeAsync` also accepts a stream.

**A source.** Anything a reader accepts: a string, bytes, or a source object with a `systemId`.

```ts twoslash
import { canonicalize } from '@exemplarjs/canonical';
// ---cut---
const fromText = canonicalize(source);
const fromBytes = canonicalize({ systemId: 'file:///data/book.xml', bytes });
```

**A reader.** A [cursor](/guide/cursor/) is canonicalized from its current position: the whole document at the
start, or one element at a start tag, which leaves the reader on that element's end tag. The records of a large file
can therefore be canonicalized one at a time. A [filtered reader](/guide/cursor/filters) or a
[delegate](/guide/cursor/delegates) is accepted too. This takes the first `<line>` of an order:

```ts twoslash
import { canonicalize } from '@exemplarjs/canonical';
// ---cut---
const reader = xml.createStreamReader(source);
reader.nextTag(); // <order>
reader.nextTag(); // the first <line>

const firstLine = canonicalize(reader, { method: 'exc-c14n' });
```

**A DOM node.** A [DOM](/guide/dom/) document gives the same result as its source. An element gives the canonical
form of that element alone, as a signature over part of a document requires.

```ts twoslash
import type { Element } from '@exemplarjs/dom';
declare const signedInfo: Element;
// ---cut---
import { canonicalize } from '@exemplarjs/canonical';

const toSign = canonicalize(signedInfo, { method: 'exc-c14n', output: 'bytes' });
```

An element canonicalized apart from its document still depends on its ancestors' declarations. The methods below
differ in how they handle that.

**A stream.** `canonicalize` needs its whole input up front. For a `ReadableStream`, or an
[asynchronous reader](/guide/cursor/streams), call `canonicalizeAsync` with the same options and await the result.

```ts twoslash
import { canonicalizeAsync } from '@exemplarjs/canonical';

const canonical = await canonicalizeAsync(stream, { method: 'exc-c14n' });
```

## Choose a method

The `method` option selects one of three standard canonical forms. The first two give the same result for a whole
document, and differ for part of one.

Take the `line` element of this order:

```xml
<order xmlns="urn:example:shop" xmlns:dc="http://purl.org/dc/elements/1.1/" xml:id="o1" xml:lang="en">
  <line sku="b1"><dc:title>Dune</dc:title></line>
</order>
```

::: code-group

```xml [c14n]
<line xmlns="urn:example:shop" xmlns:dc="http://purl.org/dc/elements/1.1/" sku="b1" xml:id="o1" xml:lang="en"><dc:title>Dune</dc:title></line>
```

```xml [c14n11]
<line xmlns="urn:example:shop" xmlns:dc="http://purl.org/dc/elements/1.1/" sku="b1" xml:lang="en"><dc:title>Dune</dc:title></line>
```

```xml [exc-c14n]
<line xmlns="urn:example:shop" sku="b1"><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Dune</dc:title></line>
```

:::

| `method`     | Name                           | For part of a document                                                           | Use it                                                                        |
| ------------ | ------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `'c14n'`     | Canonical XML 1.0, the default | Copies every namespace in scope, and every `xml:` attribute of the ancestors     | To compare whole documents, or where a standard requires it                   |
| `'c14n11'`   | Canonical XML 1.1              | The same, but does not copy `xml:id`, and combines `xml:base` values correctly   | For parts of documents that use `xml:id` or `xml:base`                        |
| `'exc-c14n'` | Exclusive Canonicalization     | Writes only the namespaces the part itself uses, and copies no `xml:` attributes | Where the part is moved into another document, as in SOAP and SAML signatures |

The example shows why the later two exist. Under `'c14n'` the line inherits `xml:id="o1"`, an identifier that
belongs to the order. Both of the first two also make the result depend on context: the same line inside a different
envelope with other namespaces has a different canonical form. Exclusive canonicalization avoids that, which is why
signatures on messages carried inside envelopes use it.

To verify a signature, use the method the signature names.

::: details Two more methods, for testing parsers
`'suite-first'` and `'suite-second'` produce the canonical forms defined by the W3C XML conformance test suite. They
apply to whole documents read from a source. Requesting one for a DOM node, or for a single element, throws an
`InvalidArgumentError`.
:::

## Options

`canonicalize` and `canonicalizeAsync` take these options as their second argument. The
[stream writer's options](/reference/writer-options) do not apply, because canonical form fixes the layout and the
encoding.

| Option              | Default           | Meaning                                                                                           |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------- |
| `method`            | `'c14n'`          | The canonical form, from the table above                                                          |
| `comments`          | `false`           | Keeps comments. Signatures usually exclude them, so that adding a comment does not invalidate one |
| `inclusivePrefixes` | none              | For `'exc-c14n'`: prefixes whose namespaces are written even where unused                         |
| `output`            | `'string'`        | `'bytes'` returns the result as UTF-8 bytes, ready to hash                                        |
| `factory`           | a default factory | The `XMLInputFactory` used to read a source, with its resolvers and access lists                  |

```ts twoslash
import { canonicalize } from '@exemplarjs/canonical';
// ---cut---
const withComments = canonicalize(source, { comments: true });
const digestInput = canonicalize(source, { method: 'c14n11', output: 'bytes' });
```

`inclusivePrefixes` exists because exclusive canonicalization cannot detect a prefix that is used only inside text or
an attribute value, such as `xsi:type="shop:Order"`. The namespaces of the prefixes listed are kept. `'#default'`
stands for the default namespace.

```ts twoslash
import type { Element } from '@exemplarjs/dom';
declare const body: Element;
// ---cut---
import { canonicalize } from '@exemplarjs/canonical';

const toSign = canonicalize(body, { method: 'exc-c14n', inclusivePrefixes: ['shop', '#default'] });
```

## Documents with an external DTD or entities

Canonical form writes out attribute defaults and replaces entity references with their text. Both come from the
document's [DTD](/guide/external/dtd). If part of the DTD, or an entity stored in another file, cannot be read, the
result would silently differ from that of a processor that could read it, and a signature would fail to verify with
no indication why.

`canonicalize` therefore does not guess. When a document refers to an external resource that was not read, it throws
an `XMLError` with the code `C14N_UNREAD`:

```text
C14N_UNREAD: Part of the DTD could not be read (1:1)
C14N_UNREAD: The entity blurb could not be read (1:53)
```

To canonicalize such a document, pass a factory that is [permitted to read](/guide/external/resolvers) the resources
the document needs:

```ts twoslash
import { canonicalize } from '@exemplarjs/canonical';
import { XMLInputFactory } from '@exemplarjs/xml';
import { fileResolver } from '@exemplarjs/xml/resolvers/file';

const reading = new XMLInputFactory({
  accessExternalDTD: ['file'],
  accessExternalEntities: ['file'],
  entityResolver: fileResolver({ root: '/data' }),
});

const canonical = canonicalize({ systemId: 'file:///data/book.xml', bytes }, { factory: reading });
```

A document with no `<!DOCTYPE>`, or with all its declarations inside the document, needs no factory.

## Documents that cannot be canonicalized

Canonical form is not defined for two kinds of document, and `canonicalize` throws an `XMLError` for them:

| Code                      | The document…                                                   |
| ------------------------- | --------------------------------------------------------------- |
| `C14N_RELATIVE_NAMESPACE` | uses a namespace that is a relative URI, such as `xmlns="shop"` |
| `C14N_VERSION`            | is XML 1.1, declared with `<?xml version="1.1"?>`               |

## Next steps

- [Writing XML](/guide/writing/): non-canonical output, with indentation and a choice of encoding.
- [Namespaces](/guide/namespaces): the declarations that the methods treat differently.
- [DTDs and entities](/guide/external/dtd): attribute defaults and entities.
- [Resolvers and access](/guide/external/resolvers): how to permit a factory to read a DTD.
- [Getting started with XPath](/guide/xpath/): query a document with XPath expressions.
