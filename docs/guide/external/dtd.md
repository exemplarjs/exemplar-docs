# DTDs and entities

A _DTD_ (document type definition) is the set of declarations in a document's `<!DOCTYPE>`: entities, attribute
defaults and types, and the content models that validation checks against. An _entity_ is a named replacement text,
and an _entity reference_ such as `&publisher;` is replaced by it.

A reader applies entity and attribute declarations as it parses, which accounts for three common surprises: a
reference such as `&nbsp;` that is rejected, an attribute that is reported but is not in the file, and an `id` that
`getElementById` does not find.

This catalog's DTD declares the entity `publisher` and a default for the `format` attribute:

```xml
<!DOCTYPE catalog [
  <!ENTITY publisher "Chilton Books">
  <!ATTLIST book id     ID                   #REQUIRED
                 format (hardback|paperback) "paperback">
]>
<catalog>
  <book id="b1"><title>Dune</title><by>&publisher;</by></book>
  <book id="b2" format="hardback"><title>Emma</title><by>&publisher;</by></book>
</catalog>
```

Both declarations are applied as the document is read:

```ts twoslash
import { EventType } from '@exemplarjs/xml';

const reader = xml.createStreamReader(source);
while (reader.hasNext()) {
  if (reader.next() !== EventType.START_ELEMENT) continue;
  if (reader.localName() === 'book') console.log(reader.attribute('id'), reader.attribute('format'));
  if (reader.localName() === 'by') console.log(reader.elementText());
}
// b1 paperback
// Chilton Books
// b2 hardback
// Chilton Books
```

The first book has no `format` attribute in the file, but the reader reports the default, `paperback`. Each
`&publisher;` is reported as the entity's replacement text.

## What a DTD does to a document

A DTD has three effects. The first two change what a reader reports; the third applies only when validation is on.

| A DTD can…                                    | Declared with              | Effect                                                                                     |
| --------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| Define entities                               | `<!ENTITY>`                | `&name;` in the document is replaced by the entity's text                                  |
| Give attributes defaults and types            | `<!ATTLIST>`               | A missing attribute is reported with its default; an `ID` attribute identifies its element |
| Declare content models and allowed attributes | `<!ELEMENT>`, `<!ATTLIST>` | None, unless [validation is on](/guide/external/validation)                                |

A DTD may declare the same entity, or the same attribute of an element, more than once. The first declaration is used.
Each later one is reported to the [error handler](/guide/errors#handle-errors-yourself)'s `warning`, with the code
`DTD_DUPLICATE_ENTITY` or `DTD_DUPLICATE_ATTRIBUTE`.

## When `&nbsp;` is rejected

XML predefines five entities, which need no DTD: `&lt;` (`<`), `&gt;` (`>`), `&amp;` (`&`), `&quot;` (`"`) and
`&apos;` (`'`). Character references such as `&#160;` or `&#xA0;` need none either.

Every other entity must be declared in the document's DTD. The usual failure is an HTML entity name, such as `&nbsp;`,
in a document that has no DTD:

```ts twoslash
import { XMLError } from '@exemplarjs/xml';

try {
  const reader = xml.createStreamReader('<title>Dune&nbsp;Messiah</title>');
  while (reader.hasNext()) reader.next();
} catch (error) {
  if (error instanceof XMLError) console.log(error.message);
}
// WF_UNDECLARED_ENTITY: The entity nbsp is not declared (1:13)
```

When the documents cannot be fixed where they are produced, declare the missing entities with the factory's `entities`
option, a map of entity names to replacement text. They behave as if the document's DTD had declared them.

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';

const lenient = new XMLInputFactory({ entities: { nbsp: '\u00A0', copy: '©' } });

const reader = lenient.createStreamReader('<title>Dune&nbsp;Messiah</title>');
reader.nextTag();
reader.elementText(); // 'Dune\u00A0Messiah'
```

## Keep references as they are

By default a reader reports an entity's replacement text and never the reference itself. To preserve `&publisher;`
when copying a document, set `replaceEntityReferences: false`. Each reference to a declared entity is then reported
as an `ENTITY_REFERENCE` event between the text events around it; `name()` returns the entity's name and `text()` its
replacement text.

```ts twoslash
import { EventType, XMLInputFactory } from '@exemplarjs/xml';

const keeping = new XMLInputFactory({ replaceEntityReferences: false });

const reader = keeping.createStreamReader(source);
while (reader.hasNext()) {
  if (reader.next() === EventType.ENTITY_REFERENCE) console.log(reader.name(), '=', reader.text());
}
// publisher = Chilton Books
// publisher = Chilton Books
```

The five predefined entities and character references are still replaced. A reference to an undeclared entity is
still an error, so use `entities` for those.

## When the DTD is in a separate file

The declarations above are inside the document, between the square brackets. A `<!DOCTYPE>` can also reference an
external DTD file:

```xml
<!DOCTYPE catalog SYSTEM "catalog.dtd">
<!DOCTYPE catalog PUBLIC "-//Example//DTD Bookshop 1.0//EN" "https://shop.example/dtd/catalog.dtd">
```

The URI after `SYSTEM` is the DTD's _system identifier_. The `PUBLIC` form puts a _public identifier_ before it: a
name for the DTD that is independent of any location.

An _external entity_ takes its replacement text from a file in the same way:

```xml
<!ENTITY chapter1 SYSTEM "chapters/one.xml">
```

exemplar always reads the declarations inside the document. It reads an external DTD, an external entity or any other
external resource only when the factory allows it. For a document that references an external DTD, this means:

- Attribute defaults that the external DTD declares are not applied.
- A reference to an entity that the external DTD may declare is not an error, because the declaration cannot be
  ruled out. It is reported as an `ENTITY_REFERENCE` event whose `text()` is empty, and reading continues. A reference
  to an external entity is reported the same way. The exception is a document whose XML declaration has
  `standalone="yes"`, which asserts that it depends on no external declarations: a reference to an entity it does not
  declare itself is an error, with the code `WF_UNDECLARED_ENTITY`.

[Resolvers and access](/guide/external/resolvers) shows how to allow these reads, and
[Catalogs](/guide/external/catalogs) how to serve them from local copies. Once an external DTD has been read, a
reference to an entity that neither it nor the document declares is an error, with the code `VC_ENTITY_DECLARED`.

## Tell a default from a written attribute

A defaulted attribute is reported like any other. `isAttributeSpecified` takes an attribute index and returns whether
the attribute was written in the document, and `attributeType` returns the type the DTD declared.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
const reader = xml.createStreamReader(source);
while (reader.hasNext()) {
  if (reader.next() !== EventType.START_ELEMENT || reader.localName() !== 'book') continue;
  for (let i = 0; i < reader.attributeCount(); i++) {
    const origin = reader.isAttributeSpecified(i) ? 'written' : 'default';
    console.log(reader.attributeName(i), reader.attributeValue(i), reader.attributeType(i), origin);
  }
}
// id b1 ID written
// format paperback NMTOKEN default
// id b2 ID written
// format hardback NMTOKEN written
```

An undeclared attribute has the type `CDATA`, an unconstrained string. An enumerated attribute, like `format`, reports
`NMTOKEN`.

Each reading API exposes the same two facts:

| API           | Was it written?                  | Declared type             |
| ------------- | -------------------------------- | ------------------------- |
| The cursor    | `reader.isAttributeSpecified(i)` | `reader.attributeType(i)` |
| Event objects | `attribute.specified`            | `attribute.type`          |
| SAX           | `attributes.isSpecified(i)`      | `attributes.type(i)`      |
| The DOM       | `attr.specified`                 |                           |

## Find elements by ID

An attribute named `id` is an identifier only when the DTD declares it with the type `ID`, as the catalog above
does. The DOM's `getElementById` and XPath's `id()` function then find elements by it.

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';

const document = new DocumentBuilder(xml).parse(source);
document.getElementById('b2')?.getAttribute('format'); // 'hardback'
```

Without a DTD, a document marks an identifier by naming the attribute `xml:id`. exemplar always treats `xml:id` as an
ID and trims the spaces around its value.

```xml
<catalog>
  <book xml:id="b7"><title>Persuasion</title></book>
</catalog>
```

Two `xml:id` attributes with the same value, or a value that is not a valid name, do not stop the parse. Each is
reported as a warning with a code beginning `XMLID_`, and only to an
[error handler](/guide/errors#handle-errors-yourself) that has a `warning` function.

## Read the DOCTYPE itself

The cursor reports the `<!DOCTYPE>` as a `DTD` event. On that event, `doctype()` returns its name, the system
identifier of the external DTD if there is one, and the declared entities.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
const reader = xml.createStreamReader(source);
while (reader.hasNext()) {
  if (reader.next() !== EventType.DTD) continue;
  const doctype = reader.doctype();
  console.log(doctype.name, doctype.systemId);
  for (const entity of doctype.entities) console.log(entity.name, '=', entity.value);
}
// catalog undefined
// publisher = Chilton Books
```

A SAX handler receives each declaration through callbacks such as `startDTD` and `internalEntityDecl`, and a DOM
document exposes the DOCTYPE as `document.doctype`.

## Refuse DTDs altogether

Most XML exchanged between programs has no DTD. To reject any document that has one, set `disallowDoctype: true`. A
`<!DOCTYPE>` then fails the document with the code `DOCTYPE_DISALLOWED`.

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';

const noDtd = new XMLInputFactory({ disallowDoctype: true });
```

[Untrusted input](/guide/production/security) covers when to do this and the other protections.

## Next steps

- [Resolvers and access](/guide/external/resolvers) allows exemplar to read an external DTD.
- [Catalogs](/guide/external/catalogs) maps well-known DTDs to local copies.
- [Validating against a DTD](/guide/external/validation) checks a document against its declarations.
- [Untrusted input](/guide/production/security) covers the attacks that entities enable.
