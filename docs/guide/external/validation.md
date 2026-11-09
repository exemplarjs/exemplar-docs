# Validating against a DTD

DTD validation checks a document against the declarations in its [DTD](/guide/external/dtd): the content model of
each element, the attributes that are required, and the values attributes may take. Use it to reject documents that
do not conform to a published DTD before processing them.

This catalog's DTD declares that every book contains a title followed by a price, and has a unique `id`. The second
book violates both constraints:

```xml
<!DOCTYPE catalog [
  <!ELEMENT catalog (book*)>
  <!ELEMENT book (title, price)>
  <!ATTLIST book id ID #REQUIRED>
  <!ELEMENT title (#PCDATA)>
  <!ELEMENT price (#PCDATA)>
]>
<catalog>
  <book id="b1"><title>Dune</title><price>9.99</price></book>
  <book id="b1"><title>Emma</title></book>
</catalog>
```

Without validation the document parses without error: it is well formed, which is all a reader checks by default.
With a validator set on the factory, the first violation throws:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
import { dtdValidator } from '@exemplarjs/validation';
import { XMLError, XMLInputFactory } from '@exemplarjs/xml';

const validating = new XMLInputFactory({ validator: dtdValidator() });

try {
  new DocumentBuilder(validating).parse(source);
} catch (error) {
  if (error instanceof XMLError) console.log(error.message);
}
// VC_ID: The ID b1 is used more than once (10:3)
```

## Turn validation on

The validator is a separate package, so programs that never validate do not include it:

::: code-group

```bash [npm]
npm install @exemplarjs/validation
```

```bash [pnpm]
pnpm add @exemplarjs/validation
```

```bash [yarn]
yarn add @exemplarjs/validation
```

:::

Pass `dtdValidator()` as the factory's `validator` option. Every reader, parser and tree builder created from that
factory then validates as it reads. A document with no `<!DOCTYPE>` has no declarations to conform to, and that is
reported as a validity error too.

## Collect every problem

A validity error does not prevent the rest of the document from being parsed. To collect every error instead of
stopping at the first, set an [error handler](/guide/errors#handle-errors-yourself) on the factory. Its `error`
function is called for each one:

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
import { dtdValidator } from '@exemplarjs/validation';
import { XMLError, XMLInputFactory } from '@exemplarjs/xml';
// ---cut---
const problems: XMLError[] = [];

const validating = new XMLInputFactory({
  validator: dtdValidator(),
  errorHandler: { error: (problem) => problems.push(problem) },
});

const document = new DocumentBuilder(validating).parse(source);

for (const problem of problems) {
  console.log(problem.message);
}
// VC_ID: The ID b1 is used more than once (10:3)
// VC_ELEMENT_VALID: The content of book is incomplete; expected price (10:36)
```

The parse completes and returns the tree, and the array holds the errors. A document that is not well formed, such as
one with a missing end tag, still throws: well-formedness errors are fatal, and no handler can recover from them.

::: warning
A factory uses its error handler for every document it reads. When one factory is shared between documents, clear the
array before each parse, or use `problem.systemId` to tell the documents apart.
:::

## Understand what was reported

Each validity error is an `XMLError`, the same class that is thrown for a document that is not well formed.
[Errors and locations](/guide/errors#what-an-error-holds) describes its fields. Its `code` identifies the constraint
that was violated and begins `VC_`. The most common are:

| Code                    | The document…                                                              |
| ----------------------- | -------------------------------------------------------------------------- |
| `VC_ELEMENT_VALID`      | has an element where the DTD does not allow it, or one it does not declare |
| `VC_REQUIRED_ATTRIBUTE` | omits an attribute the DTD requires                                        |
| `VC_ATTRIBUTE_TYPE`     | has an attribute the DTD does not declare for that element                 |
| `VC_ENUMERATION`        | gives an attribute a value outside its enumeration                         |
| `VC_ID`                 | uses the same ID twice                                                     |
| `VC_IDREF`              | references an ID that no element has                                       |
| `VC_ROOT_ELEMENT`       | has no `<!DOCTYPE>`, or a root element the `<!DOCTYPE>` does not name      |

[Error codes](/reference/error-codes) lists them all.

## Where the DTD comes from

The catalog above has its DTD inside the document. More often a document references an external DTD:

```xml
<!DOCTYPE catalog SYSTEM "catalog.dtd">
<catalog>
  <book id="b1"><title>Dune</title><price>9.99</price></book>
</catalog>
```

exemplar reads no external resource unless the factory allows it, and a validator does not change that. To validate
this document, configure the factory to read the DTD, as [Resolvers and access](/guide/external/resolvers) describes:
allow the protocol of its URI and supply a resolver. Here the DTD is a file in the document's directory:

```ts twoslash
import { readFileSync } from 'node:fs';
import { DocumentBuilder } from '@exemplarjs/dom';
import { dtdValidator } from '@exemplarjs/validation';
import { XMLError, XMLInputFactory } from '@exemplarjs/xml';
import { fileResolver } from '@exemplarjs/xml/resolvers/file';

const problems: XMLError[] = [];

const validating = new XMLInputFactory({
  validator: dtdValidator(),
  accessExternalDTD: ['file'],
  entityResolver: fileResolver({ root: '/data/shop' }),
  errorHandler: { error: (problem) => problems.push(problem) },
});

const document = new DocumentBuilder(validating).parse({
  systemId: 'file:///data/shop/books.xml',
  bytes: readFileSync('/data/shop/books.xml'),
});
```

The source needs its `systemId`, because the relative URI `catalog.dtd` is resolved against it.

When documents reference a DTD by URL, a [catalog](/guide/external/catalogs) maps it to a local copy. Set it as the
factory's `catalog` option alongside the validator.

## Validate with any way of reading

Validation runs inside the reader, before any event reaches your code, so it behaves the same in every reading API.
Use the validating factory wherever any other factory is used.

::: code-group

```ts twoslash [Cursor]
import { XMLInputFactory } from '@exemplarjs/xml';
declare const validating: XMLInputFactory;
// ---cut---
const reader = validating.createStreamReader(source);
while (reader.hasNext()) reader.next();
```

```ts twoslash [Event objects]
import { XMLInputFactory } from '@exemplarjs/xml';
declare const validating: XMLInputFactory;
// ---cut---
for (const event of validating.createEventReader(source)) {
  // Each event has already been checked.
}
```

```ts twoslash [SAX]
import { SAXParser } from '@exemplarjs/sax';
import { XMLInputFactory } from '@exemplarjs/xml';
declare const validating: XMLInputFactory;
// ---cut---
new SAXParser(validating).parse(source, {
  // A SAX handler can receive the problems itself.
  error: (problem) => console.log(problem.message),
});
```

```ts twoslash [DOM]
import { DocumentBuilder } from '@exemplarjs/dom';
import { XMLInputFactory } from '@exemplarjs/xml';
declare const validating: XMLInputFactory;
// ---cut---
const document = new DocumentBuilder(validating).parse(source);
```

```ts twoslash [XDM tree]
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { XMLInputFactory } from '@exemplarjs/xml';
declare const validating: XMLInputFactory;
// ---cut---
const tree = new XdmDocumentBuilder(validating).parse(source);
```

:::

A streaming reader reports a validity error when it reaches it, after your code has already processed the preceding
content. References to IDs are checked last, when the document ends and every ID is known, so a `VC_IDREF` error is
always reported then. If nothing from an invalid document may be used, read it to the end before acting on it, or
build a tree.

::: tip Ignorable whitespace
A validator can identify whitespace that cannot be content. Between the books of the catalog above, the line breaks
and indentation are formatting only, because the content model of `catalog` allows nothing but `book` elements. A
validating cursor reports such whitespace as a `SPACE` event, not `CHARACTERS`, and SAX calls `ignorableWhitespace`,
so it can be skipped safely.
:::

## When the DTD cannot be read

A validator can only check against declarations that were read.

### Nothing was read

If the document references an external DTD and the factory is not configured to read it, or the resolver does not
supply it, there are no declarations to check against. Every element and attribute is then reported as undeclared:

```text
VC_ELEMENT_VALID: The element type catalog is not declared (file:///data/shop/books.xml 2:1)
VC_ELEMENT_VALID: The element type book is not declared (file:///data/shop/books.xml 3:3)
VC_ATTRIBUTE_TYPE: The attribute id is not declared for book (file:///data/shop/books.xml 3:3)
VC_ELEMENT_VALID: The element type title is not declared (file:///data/shop/books.xml 3:17)
VC_ELEMENT_VALID: The element type price is not declared (file:///data/shop/books.xml 3:36)
```

A list like this, starting at the root element, almost always means the DTD was not read. Check the access list and
the resolver before the document.

### Access was refused, or there is no resolver

If a resolver is set but the access list does not allow the DTD's URI, that is reported first, as a separate error
with the code `ACCESS_REFUSED`. The undeclared-element errors follow it.

If the access list allows the URI but the factory has no resolver and no catalog, the document fails with the code
`RESOLVER_MISSING`, whether or not there is an error handler.

[Why there are two steps](/guide/external/resolvers#why-there-are-two-steps) shows both messages.

### Part of the DTD was not read

Large DTDs are often split into several files that the main file includes. If one of them cannot be read, the
declarations that were read still apply, and elements declared only in the missing file are reported as undeclared.

## Next steps

- [Errors and locations](/guide/errors) covers error handlers and the kinds of error in full.
- [Error codes](/reference/error-codes) lists every `VC_` code.
- [XInclude](/guide/external/xinclude) assembles one document from several files.
- [Untrusted input](/guide/production/security) covers what to allow for untrusted documents.
