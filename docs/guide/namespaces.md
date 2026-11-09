# Namespaces

An XML namespace qualifies element and attribute names, so that a `title` from one vocabulary is distinct from a
`title` from another. A document uses namespaces when it has prefixed names, such as `<dc:title>`, or `xmlns`
attributes. This page covers how each API reports namespaced names, and how to query them with XPath.

This book mixes two vocabularies: the shop's own, and Dublin Core, a standard vocabulary for metadata such as titles
and authors.

```xml
<book xmlns="urn:example:shop" xmlns:dc="http://purl.org/dc/elements/1.1/" id="b1" xml:lang="en">
  <dc:title dc:kind="main">Dune</dc:title>
  <price>9.99</price>
</book>
```

This loop prints each element's name as written, then its local name and namespace URI:

```ts twoslash
import { EventType } from '@exemplarjs/xml';

const reader = xml.createStreamReader(source);
while (reader.hasNext()) {
  if (reader.next() === EventType.START_ELEMENT) {
    console.log(reader.name(), '=', reader.localName(), 'in', reader.namespaceURI());
  }
}
// book = book in urn:example:shop
// dc:title = title in http://purl.org/dc/elements/1.1/
// price = price in urn:example:shop
```

## What a name is made of

A namespace is identified by a URI, such as `http://purl.org/dc/elements/1.1/`, called the _namespace URI_. It serves
only as a unique identifier; nothing is fetched from it.

A document binds a prefix to the URI and writes names as `prefix:localName`. The name as written is a _QName_
(qualified name). An element's identity is two strings:

- its **namespace URI**, which identifies the vocabulary;
- its **local name**, the name without the prefix.

The prefix is only an alias. Two documents may bind different prefixes to the same namespace, or the same prefix to
different ones, so code should compare namespace URIs and local names, never prefixes.

## How a document declares namespaces

A start tag declares namespaces with `xmlns` attributes. A declaration is in scope for that element and its
descendants.

| Written on a start tag     | Meaning                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| `xmlns:dc="http://…"`      | Names with the prefix `dc`, elements and attributes, are in that namespace |
| `xmlns="urn:example:shop"` | Elements with no prefix are in that namespace, the _default namespace_     |

In the book above, `price` has no prefix, so it is in the default namespace, `urn:example:shop`.

::: warning
The default namespace applies to elements only. An unprefixed attribute, such as `id` above, is in no namespace,
whatever namespace its element is in. Look it up by local name alone: `reader.attribute('id')` finds it, and
`reader.attribute('id', 'urn:example:shop')` does not.
:::

A prefix with no declaration in scope is an error. The reader throws with the code `NS_UNBOUND_PREFIX` and a
description such as `The prefix dc is not bound`.

## Read names from each API

Each API exposes the same parts of a name under slightly different names. Each example below finds the `dc:title`
element and its `dc:kind` attribute by namespace URI and local name. The argument order differs: the cursor and event
objects take the local name first, SAX and the DOM the namespace URI first.

::: code-group

```ts twoslash [Cursor]
import { EventType } from '@exemplarjs/xml';
// ---cut---
const DC = 'http://purl.org/dc/elements/1.1/';

const reader = xml.createStreamReader(source);
while (reader.hasNext()) {
  if (reader.next() !== EventType.START_ELEMENT) continue;
  if (reader.namespaceURI() === DC && reader.localName() === 'title') {
    reader.name(); // 'dc:title'
    reader.prefix(); // 'dc'
    reader.attribute('kind', DC); // 'main'
  }
}
```

```ts twoslash [Event objects]
import { EventType } from '@exemplarjs/xml';
// ---cut---
const DC = 'http://purl.org/dc/elements/1.1/';

for (const event of xml.createEventReader(source)) {
  if (event.type !== EventType.START_ELEMENT) continue;
  const { name } = event; // a QName: the three parts of a name in one object
  if (name.namespaceURI === DC && name.localName === 'title') {
    name.toString(); // 'dc:title'
    name.prefix; // 'dc'
    event.attribute('kind', DC)?.value; // 'main'
  }
}
```

```ts twoslash [SAX]
import { SAXParser } from '@exemplarjs/sax';
// ---cut---
const DC = 'http://purl.org/dc/elements/1.1/';

new SAXParser(xml).parse(source, {
  startElement(uri, localName, qName, attributes) {
    if (uri === DC && localName === 'title') {
      qName; // 'dc:title'
      attributes.value(DC, 'kind'); // 'main'
    }
  },
});
```

```ts twoslash [DOM]
import { DocumentBuilder } from '@exemplarjs/dom';
// ---cut---
const DC = 'http://purl.org/dc/elements/1.1/';

const document = new DocumentBuilder(xml).parse(source);
const title = document.getElementsByTagNameNS(DC, 'title').item(0)!;
title.nodeName; // 'dc:title'
title.localName; // 'title'
title.namespaceURI; // 'http://purl.org/dc/elements/1.1/'
title.getAttributeNS(DC, 'kind'); // 'main'
```

:::

For an element or attribute in no namespace, the namespace URI is the empty string, and so is the prefix of an
unprefixed name. The DOM is the exception: it returns `null`, as browsers do.

::: details All the names in one table

| API                             | Namespace URI           | Local name           | Name as written   | Attribute by name                        |
| ------------------------------- | ----------------------- | -------------------- | ----------------- | ---------------------------------------- |
| [Cursor](/guide/cursor/)        | `reader.namespaceURI()` | `reader.localName()` | `reader.name()`   | `reader.attribute(localName, uri)`       |
| [Event objects](/guide/events/) | `name.namespaceURI`     | `name.localName`     | `name.toString()` | `event.attribute(localName, uri)`        |
| [SAX](/guide/sax/)              | `uri`                   | `localName`          | `qName`           | `attributes.value(uri, localName)`       |
| [DOM](/guide/dom/)              | `node.namespaceURI`     | `node.localName`     | `node.nodeName`   | `element.getAttributeNS(uri, localName)` |
| [XPath](/guide/xpath/)          | `namespace-uri(.)`      | `local-name(.)`      | `name(.)`         | `@prefix:name`                           |

:::

## Query a document that has namespaces

In an XPath expression, an unprefixed element name matches an element in no namespace, whatever the document's
default namespace is. A query written without prefixes therefore selects nothing in the book above, because `book` and
`price` are in the shop's namespace:

```ts twoslash
// `doc` is the book above, built into a tree for XPath.
compiler.compile('/book/price').evaluateString(doc); // ''
```

Declare prefixes for the namespaces in the compiler's options and use them in the expression. These prefixes are
independent of the document's:

```ts twoslash
import { XPathCompiler } from '@exemplarjs/xpath';

const shop = new XPathCompiler({
  namespaces: { s: 'urn:example:shop', dc: 'http://purl.org/dc/elements/1.1/' },
});

shop.compile('/s:book/s:price').evaluateString(doc); // '9.99'
shop.compile('/s:book/dc:title/@dc:kind').evaluateString(doc); // 'main'
```

When most names are in one namespace, set it as the namespace of unprefixed element names:

```ts twoslash
import { XPathCompiler } from '@exemplarjs/xpath';
// ---cut---
const shop = new XPathCompiler({ defaultElementNamespace: 'urn:example:shop' });

shop.compile('/book/price').evaluateString(doc); // '9.99'
```

## The `xml` prefix is always there

The prefix `xml` needs no declaration. It is reserved for a few attributes that have the same meaning in every
document, such as `xml:lang` for the language of the content and `xml:id` for an identifier, and it is always bound to
the namespace `http://www.w3.org/XML/1998/namespace`.

`xml:lang` is read like any other namespaced attribute:

```ts twoslash
import { XML_NAMESPACE } from '@exemplarjs/xml';

const reader = xml.createStreamReader(source);
reader.nextTag(); // <book ... xml:lang="en">
reader.attribute('lang', XML_NAMESPACE); // 'en'
```

A document cannot bind the `xml` prefix to another namespace, or bind another prefix to its namespace. Either is an
error with the code `NS_RESERVED`.

## See which namespaces a tag declares

The declarations themselves are rarely needed, since each name already carries its namespace URI. For the cases that
need them, such as copying them to another document, each API reports them separately from the attributes.

::: code-group

```ts twoslash [Cursor]
const reader = xml.createStreamReader(source);
reader.nextTag(); // <book>

for (let i = 0; i < reader.namespaceCount(); i++) {
  console.log(`'${reader.namespacePrefix(i)}' -> ${reader.namespaceURI(i)}`);
}
// '' -> urn:example:shop
// 'dc' -> http://purl.org/dc/elements/1.1/
```

```ts twoslash [Event objects]
import { EventType } from '@exemplarjs/xml';
// ---cut---
for (const event of xml.createEventReader(source)) {
  if (event.type !== EventType.START_ELEMENT) continue;
  for (const { prefix, namespaceURI } of event.namespaces) {
    console.log(`'${prefix}' -> ${namespaceURI}`);
  }
}
// '' -> urn:example:shop
// 'dc' -> http://purl.org/dc/elements/1.1/
```

```ts twoslash [SAX]
import { SAXParser } from '@exemplarjs/sax';
// ---cut---
new SAXParser(xml).parse(source, {
  // Called before the start tag that holds the declaration.
  startPrefixMapping: (prefix, uri) => console.log(`'${prefix}' -> ${uri}`),
  // Called after that element's end tag.
  endPrefixMapping: (prefix) => console.log(`'${prefix}' ends`),
});
// '' -> urn:example:shop
// 'dc' -> http://purl.org/dc/elements/1.1/
// '' ends
// 'dc' ends
```

:::

The empty prefix denotes the default namespace.

::: details See the declarations among the attributes too

By default `xmlns` attributes are excluded from the attribute list, since they are declarations, not data. Set
`namespacePrefixes: true` to include them. The namespace accessors still work.

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';

const withDeclarations = new XMLInputFactory({ namespacePrefixes: true });

const reader = withDeclarations.createStreamReader(source);
reader.nextTag(); // <book>
for (let i = 0; i < reader.attributeCount(); i++) {
  console.log(reader.attributeName(i), '=', reader.attributeValue(i));
}
// xmlns = urn:example:shop
// xmlns:dc = http://purl.org/dc/elements/1.1/
// id = b1
// xml:lang = en
```

On the cursor these attributes are in the namespace `http://www.w3.org/2000/xmlns/`, which is reserved for them.

A SAX handler receives these attributes with no namespace URI and no local name, unless the parser is created with
`new SAXParser(xml, { xmlnsURIs: true })`.

:::

## Turn namespace processing off

Some documents use colons in names without declaring prefixes, and some applications need names exactly as written.
With `namespaceAware: false`, the reader treats a colon as an ordinary name character.

```ts twoslash
import { EventType, XMLInputFactory } from '@exemplarjs/xml';

const plain = new XMLInputFactory({ namespaceAware: false });

const reader = plain.createStreamReader('<dc:title dc:kind="main">Dune</dc:title>');
reader.nextTag();
reader.name(); // 'dc:title'
reader.localName(); // 'dc:title'
reader.namespaceURI(); // ''
reader.attribute('dc:kind'); // 'main'
```

With the option off:

- A prefix needs no declaration. The document above is read without an error, although `dc` is never declared.
- The local name is the whole name, and every prefix and namespace URI is the empty string. Look attributes up by
  their whole name: `attribute('dc:kind')`.
- `xmlns` attributes are ordinary attributes, and `namespaceCount()` is 0.

::: details What else the option changes

- A SAX handler receives the empty string for `uri` and `localName`. Use `qName`.
- A DOM built with the option off has `null` for the `localName` and `namespaceURI` of every node.
- `xml:id` is no longer recognized as an identifier, because it is found by its namespace.
- [XInclude](/guide/external/xinclude), [canonical XML](/guide/writing/canonical) and the
  [tree that XPath queries](/guide/xpath/tree) need namespaces. Each throws an `InvalidArgumentError` when given a
  factory or reader made with the option off.

:::

## Next steps

- [Errors and locations](/guide/errors): the fields of an error such as `NS_UNBOUND_PREFIX`, and how to handle it.
- [Reading with the cursor](/guide/cursor/): attributes and names in full.
- [Getting started with XPath](/guide/xpath/): more queries over namespaced documents.
- [Writing XML](/guide/writing/): how to write names in a namespace.
- [Reader options](/reference/options): `namespaceAware` and `namespacePrefixes`, with the other options.
