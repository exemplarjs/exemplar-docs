# XInclude

XInclude is the XML mechanism for assembling one document from several files: an `xi:include` element is replaced by
the document, or the text, that its `href` references. Enable it for documents that contain `xi:include` elements.

This book references its two chapters:

::: code-group

```xml [book.xml]
<book xmlns:xi="http://www.w3.org/2001/XInclude">
  <title>Dune</title>
  <xi:include href="chapters/one.xml"/>
  <xi:include href="chapters/two.xml"/>
</book>
```

```xml [chapters/one.xml]
<chapter xml:id="arrakis"><title>Arrakis</title><para>A beginning is a delicate time.</para></chapter>
```

```xml [chapters/two.xml]
<chapter xml:lang="fr"><title>Muad'Dib</title><para>Le dormeur doit se réveiller.</para></chapter>
```

:::

With XInclude enabled, each `xi:include` element in `book.xml` is replaced by the document it references:

```ts twoslash
import { readFileSync } from 'node:fs';
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { xincludeProcessor } from '@exemplarjs/xinclude';
import { XMLInputFactory } from '@exemplarjs/xml';
import { fileResolver } from '@exemplarjs/xml/resolvers/file';
import { XPathCompiler } from '@exemplarjs/xpath';

const xml = new XMLInputFactory({
  xinclude: xincludeProcessor(),
  accessExternalEntities: ['file'],
  entityResolver: fileResolver({ root: '/data/book' }),
});

const book = new XdmDocumentBuilder(xml).parse({
  systemId: 'file:///data/book/book.xml',
  bytes: readFileSync('/data/book/book.xml'),
});

new XPathCompiler().compile('//chapter/title').evaluateStrings(book); // ['Arrakis', "Muad'Dib"]
```

Serialized, the resulting document is:

```xml
<book xmlns:xi="http://www.w3.org/2001/XInclude">
  <title>Dune</title>
  <chapter xml:id="arrakis" xml:base="chapters/one.xml"><title>Arrakis</title><para>A beginning is a delicate time.</para></chapter>
  <chapter xml:lang="fr" xml:base="chapters/two.xml"><title>Muad'Dib</title><para>Le dormeur doit se réveiller.</para></chapter>
</book>
```

## Turn XInclude on

XInclude is off by default, and an `xi:include` element is then reported as an ordinary element. Enabling it requires
three settings:

1. **The processor.** Install `@exemplarjs/xinclude` and pass `xincludeProcessor()` as the factory's `xinclude`
   option.
2. **Access.** Included documents are external resources, so `accessExternalEntities` must list the protocols they
   may be read with.
3. **A resolver.** [Resolvers and access](/guide/external/resolvers) covers the built-in resolvers and how to write
   one. A [catalog](/guide/external/catalogs) also works.

::: code-group

```bash [npm]
npm install @exemplarjs/xinclude
```

```bash [pnpm]
pnpm add @exemplarjs/xinclude
```

```bash [yarn]
yarn add @exemplarjs/xinclude
```

:::

With the first two and no resolver or catalog, every include fails with the code `RESOLVER_MISSING`.

Set the source's `systemId`, the URI of the document. A relative `href` such as `chapters/one.xml` is resolved against
it, and cannot be resolved without one.

An included document may itself contain includes. They are processed the same way, with the same options.

## Include text

Add `parse="text"` to include a file as text. Markup characters in it, such as `&` and `<`, are included as character
data and are not parsed.

```xml
<book xmlns:xi="http://www.w3.org/2001/XInclude">
  <licence><xi:include href="licence.txt" parse="text"/></licence>
</book>
```

With a `licence.txt` that contains `Copyright 1965 Frank Herbert & co.`, the result is:

```xml
<book xmlns:xi="http://www.w3.org/2001/XInclude">
  <licence>Copyright 1965 Frank Herbert &amp; co.</licence>
</book>
```

A text file is decoded as UTF-8 unless one of these specifies another encoding: a byte-order mark, an encoding the
resolver reports, such as an HTTP charset, or an `encoding` attribute on the `xi:include`.

## Include part of a document

Add an `xpointer` attribute to include one element of the target, with its content. A pointer selects the element by
ID, by position, or by both.

| Form                            | Selects                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `xpointer="arrakis"`            | The element whose ID is `arrakis`                                  |
| `xpointer="element(/1/2)"`      | By position: the second child element of the first (root) element  |
| `xpointer="element(arrakis/1)"` | Both: the first child element of the element whose ID is `arrakis` |

```xml
<book xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include href="chapters/one.xml" xpointer="element(/1/2)"/>
</book>
```

This includes only the paragraph of chapter one:

```xml
<book xmlns:xi="http://www.w3.org/2001/XInclude">
  <para xml:base="chapters/one.xml">A beginning is a delicate time.</para>
</book>
```

An ID is an `xml:id` attribute, or an attribute that the target's DTD declares with the type `ID`.
[DTDs and entities](/guide/external/dtd#find-elements-by-id) covers both.

Omit `href` to select from the including document itself:

```xml
<book xmlns:xi="http://www.w3.org/2001/XInclude">
  <note xml:id="signed">Signed copy</note>
  <copy><xi:include xpointer="signed"/></copy>
</book>
```

::: info
Pointers of the form `xpointer(…)`, which contain an XPath expression, are not supported. An include that uses one is
treated as selecting nothing.
:::

## Fall back when the target is missing

An include whose target cannot be read fails the document. To continue instead, give the include an `xi:fallback`
child element, whose content replaces the include.

```xml
<book xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include href="chapters/three.xml">
    <xi:fallback><chapter><title>Coming soon</title></chapter></xi:fallback>
  </xi:include>
</book>
```

If `chapters/three.xml` does not exist, the result is:

```xml
<book xmlns:xi="http://www.w3.org/2001/XInclude">
  <chapter><title>Coming soon</title></chapter>
</book>
```

An empty `<xi:fallback/>` includes nothing when the target is missing.

A fallback applies to a target that cannot be read, a target the access list refuses, and a pointer that selects
nothing. It does not apply to a target that was read and is not well formed, or to a factory that has no resolver at
all. Those fail the document.

## What is added to included content

In the result at the top of the page, each included chapter has an added `xml:base` attribute. XInclude adds two
attributes to the top-level element of included content, so that the content keeps its meaning in its new location.

- **`xml:base`** records the URI the content was read from. A relative URI inside chapter one, such as an image
  reference, is still resolved against `chapters/one.xml` and not `book.xml`.
- **`xml:lang`** records the content's language when it differs from the language in effect at the include. If the
  book has `xml:lang="en"`, chapter one is included with `xml:lang=""` (no language), because it did not inherit
  English in its own file. Chapter two keeps its own `xml:lang="fr"`.

To include the content exactly as it is in its file, turn either off:

```ts twoslash
import { xincludeProcessor } from '@exemplarjs/xinclude';
import { XMLInputFactory } from '@exemplarjs/xml';
// ---cut---
const asWritten = new XMLInputFactory({
  xinclude: xincludeProcessor({ fixupBaseURIs: false, fixupLanguage: false }),
  accessExternalEntities: ['file'],
});
```

Namespace declarations need no option. When a pointer selects an element from inside a document, the namespace
declarations it inherited from its ancestors are repeated on the included element, so its prefixes still resolve.

## Errors you may see

XInclude's own errors are `XMLError`s with a code beginning `XINCLUDE_`, located at the `xi:include` element
concerned.

| Code                 | Meaning                                                             | What to check                                              |
| -------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| `XINCLUDE_RESOURCE`  | The target could not be read, and there is no fallback              | The message, which gives the cause: see below              |
| `XINCLUDE_POINTER`   | The `xpointer` selects nothing, and there is no fallback            | The ID or position, and that the target declares IDs       |
| `XINCLUDE_LOOP`      | A document includes itself, directly or through others              | The chain of `href`s                                       |
| `XINCLUDE_ATTRIBUTE` | An attribute of `xi:include` is missing or not allowed              | `href` has no `#…` part; `parse` is `xml` or `text`        |
| `XINCLUDE_STRUCTURE` | `xi:include` or `xi:fallback` is in the wrong place                 | An include holds at most one fallback and no other include |
| `XINCLUDE_ROOT`      | An include at the top level yields something other than one element | A document needs exactly one root element                  |
| `XINCLUDE_TEXT`      | Included text contains a character XML does not allow               | Control characters in the text file                        |

[Error codes](/reference/error-codes#xinclude) lists them all.

The message of `XINCLUDE_RESOURCE` gives the cause:

```text
No resolver supplies file:///data/book/chapters/three.xml
Reading file:///data/book/chapters/one.xml is not allowed: the access list does not name 'file'
chapters/one.xml cannot be resolved against no base URI
```

An include that the access list allows, in a factory with no `uriResolver`, no `entityResolver` and no catalog, fails
with `RESOLVER_MISSING` instead, whether or not it has a fallback.

A target that is not well formed fails with the error for its own defect, such as `WF_END_TAG_MISMATCH`, and the
error's `systemId` identifies the included file.

## Include with any way of reading

Inclusion runs inside the reader, so it behaves the same in every reading API: the cursor, event objects, SAX and the
tree builders all receive the resulting document. Use the factory from the top of this page wherever any other
factory is used.

No tree is built from an included document. A resolver returns its content whole, and the reader then parses it into
events in sequence with the rest of the document. For an include with a pointer, the reader skips the target's events
up to the selected element and reports only that subtree.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
let chapters = 0;
const reader = xml.createAsyncStreamReader({ systemId: 'file:///data/book/book.xml', stream });
await reader.forEachEvent((type) => {
  if (type === EventType.START_ELEMENT && reader.localName() === 'chapter') chapters++;
});
```

With an asynchronous reader like this one, a resolver may fetch included documents over the network. A synchronous
reader with such a resolver throws an [`AsyncReaderRequiredError`](/guide/external/resolvers#fetch-over-http).

::: details When a document is read twice
Two cases need content the reader has already passed, so the document is parsed again from the start: an include
that selects from the including document itself (no `href`), and a pointer with several parts whose later part
selects something earlier in the target. In the first case, a document given as a stream with no `systemId` cannot be
read again, and the include fails with `XINCLUDE_RESOURCE`.
:::

## Next steps

- [Resolvers and access](/guide/external/resolvers) covers how included documents are resolved and which reads are
  allowed.
- [Catalogs](/guide/external/catalogs) maps `href`s to local copies.
- [Errors and locations](/guide/errors) explains `XMLError` and its fields.
- [Untrusted input](/guide/production/security) covers what to allow for untrusted documents.
