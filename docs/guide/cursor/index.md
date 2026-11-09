# Reading with the cursor

The cursor, `StreamReader`, is exemplar's pull parser: the application calls `next()` to advance through the document
and reads the current event through accessor methods. It holds only its current position, and creates the string for
a name or for text only when its accessor is called. Event readers, the SAX parser and the tree builders all read
through a cursor.

```ts twoslash
import { EventType, XMLInputFactory } from '@exemplarjs/xml';

const xml = new XMLInputFactory();
const reader = xml.createStreamReader('<book id="b1"><title>Dune</title></book>');

for (let type = reader.next(); type !== EventType.END_DOCUMENT; type = reader.next()) {
  if (type === EventType.START_ELEMENT) console.log('start', reader.localName());
  else if (type === EventType.CHARACTERS) console.log('text ', reader.text());
  else if (type === EventType.END_ELEMENT) console.log('end  ', reader.localName());
}
// start book
// start title
// text  Dune
// end   title
// end   book
```

[Factories and sources](/guide/sources) covers the sources `createStreamReader` accepts and reusing the factory.

## What an event is

This document:

```xml
<catalog>
  <book id="b1">Dune</book>
</catalog>
```

produces this sequence of events:

| Event            | What the cursor is at                         |
| ---------------- | --------------------------------------------- |
| `START_DOCUMENT` | The start, before any input is read           |
| `START_ELEMENT`  | `<catalog>`                                   |
| `CHARACTERS`     | The line break and two spaces before `<book>` |
| `START_ELEMENT`  | `<book id="b1">`                              |
| `CHARACTERS`     | `Dune`                                        |
| `END_ELEMENT`    | `</book>`                                     |
| `CHARACTERS`     | The line break before `</catalog>`            |
| `END_ELEMENT`    | `</catalog>`                                  |
| `END_DOCUMENT`   | The end                                       |

In this sequence:

- Attributes are not events. They are part of the start tag and are read while the cursor is at it.
- Whitespace between elements is text, reported as `CHARACTERS` events like any other text. Most loops ignore it.
- An empty element such as `<br/>` is two events: a `START_ELEMENT` immediately followed by an `END_ELEMENT`.

Most code handles only these five event types. Comments, processing instructions and the other constructs have types
of their own, listed in [The other events](#the-other-events).

## Move through a document

A new reader is positioned at `START_DOCUMENT`. `next()` advances to the next event and returns its type, one of the
constants on `EventType`. `END_DOCUMENT` is the last event: calling `next()` after it throws an `IllegalStateError`.

The usual loop advances until `END_DOCUMENT` and tests the type of each event:

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
const reader = xml.createStreamReader(source);
let books = 0;

for (let type = reader.next(); type !== EventType.END_DOCUMENT; type = reader.next()) {
  if (type === EventType.START_ELEMENT && reader.localName() === 'book') books++;
}
```

Accessors such as `localName()` read the event the cursor is at. After `next()` the previous event is no longer
available, so store anything needed later in a variable first.

`eventType()` returns the current event's type without advancing.

::: warning
The cursor checks well-formedness as it parses, so an error such as a missing end tag is reported where it occurs:
`next()` throws an `XMLError` there, after every event before it has been reported.
[Errors and locations](/guide/errors) shows how to handle the error.
:::

## Read names

At a `START_ELEMENT` or an `END_ELEMENT`, `localName()` returns the element's name without any prefix. In a document
that does not use namespaces, that is the whole name.

A name can carry a prefix, as in `<s:book xmlns:s="urn:example:shop">`. The prefix is bound to a
[namespace](/guide/namespaces) URI. Each part of such a name has an accessor:

| Accessor         | For `<s:book xmlns:s="urn:example:shop">` |
| ---------------- | ----------------------------------------- |
| `localName()`    | `book`                                    |
| `prefix()`       | `s`                                       |
| `name()`         | `s:book`                                  |
| `namespaceURI()` | `urn:example:shop`                        |

For an element with no prefix and no namespace, `prefix()` and `namespaceURI()` return empty strings and `name()`
equals `localName()`.

Compare names by `localName()` and `namespaceURI()`, not by prefix: two documents can bind different prefixes to the
same namespace.

## Read attributes

At a start tag, `attribute(name)` returns an attribute's value, or `undefined` when the tag has no such attribute.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
// <book id="b1" lang="en">...</book>
// <book id="b2">...</book>
const reader = xml.createStreamReader(source);

for (let type = reader.next(); type !== EventType.END_DOCUMENT; type = reader.next()) {
  if (type === EventType.START_ELEMENT && reader.localName() === 'book') {
    console.log(reader.attribute('id'), reader.attribute('lang'));
  }
}
// b1 en
// b2 undefined
```

A prefixed attribute, such as `xml:lang`, is in a namespace; pass the namespace URI as the second argument. The `xml`
prefix is always bound to the same one, exported as `XML_NAMESPACE`:

```ts twoslash
const reader = xml.createStreamReader(source);
// ---cut---
import { XML_NAMESPACE } from '@exemplarjs/xml';

// <book xml:lang="en">
const language = reader.attribute('lang', XML_NAMESPACE);
```

### Walk every attribute

When the names are not known in advance, iterate over the attributes by index. `attributeCount()` returns the number
of attributes, and each indexed accessor takes an index from 0:

```ts twoslash
const reader = xml.createStreamReader(source);
// ---cut---
// <book id="b1" lang="en">
for (let i = 0; i < reader.attributeCount(); i++) {
  console.log(`${reader.attributeLocalName(i)} = ${reader.attributeValue(i)}`);
}
// id = b1
// lang = en
```

Attributes are available only at a `START_ELEMENT`. At any other event `attributeCount()` returns 0 and
`attribute(name)` returns `undefined`. An index that is not below the count throws a `RangeError`.

::: tip Coming from Java
`attribute('id')` is StAX's `getAttributeValue(null, "id")`, with the local name first. The other accessors are StAX's
without the `get`: `getLocalName()` is `localName()`, `getAttributeCount()` is `attributeCount()`.
:::

## Read text

At a `CHARACTERS` event, `text()` returns the text. References such as `&amp;` and `&#233;` are already replaced by
the characters they represent.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
const reader = xml.createStreamReader('<title>Pride &amp; Prejudice</title>');

for (let type = reader.next(); type !== EventType.END_DOCUMENT; type = reader.next()) {
  if (type === EventType.CHARACTERS) console.log(reader.text());
}
// Pride & Prejudice
```

`isWhitespace()` returns whether the text, or a CDATA section, consists only of spaces, tabs and line breaks. Use it
to skip the whitespace between elements:

```ts twoslash
import { EventType } from '@exemplarjs/xml';
const reader = xml.createStreamReader(source);
const type = reader.next();
// ---cut---
if (type === EventType.CHARACTERS && !reader.isWhitespace()) {
  console.log(reader.text());
}
```

::: warning
One `CHARACTERS` event does not necessarily hold all of an element's text; the text can be split across several
events. For example, `<note>See <![CDATA[<title>]]> above</note>` produces three: `See `, then `<title>`, then
` above`.

To read an element's text as one string, use `elementText()`, described next, or create the factory with
`coalescing: true`, which merges adjacent text into one `CHARACTERS` event.
:::

## Step from tag to tag

Data-oriented XML consists of elements that contain either other elements or a single value. Two methods shorten the
code that reads it.

`nextTag()` advances to the next start or end tag, skipping whitespace, comments and processing instructions. A CDATA
section that contains only whitespace counts as whitespace.

`elementText()`, called at a start tag, returns the element's text and leaves the cursor at its end tag. It
concatenates the text across however many events it spans, and omits comments and processing instructions.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
// <catalog>
//   <book id="b1" lang="en">
//     <title>Dune</title>
//     <price currency="GBP">9.99</price>
//   </book>
//   ...
// </catalog>
const reader = xml.createStreamReader(source);

reader.nextTag(); // <catalog>
while (reader.nextTag() === EventType.START_ELEMENT) {
  // at <book>
  const id = reader.attribute('id');
  reader.nextTag(); // <title>
  const title = reader.elementText();
  reader.nextTag(); // <price>
  const price = reader.elementText();
  reader.nextTag(); // </book>
  console.log(`${id}: ${title}, ${price}`);
}
// b1: Dune, 9.99
// b2: Emma, 7.50
```

The `while` loop ends when `nextTag()` returns `END_ELEMENT` in place of another `<book>`: that is `</catalog>`.

Both methods are strict, so a document with an unexpected structure fails early. Each throws an `IllegalStateError`:

- `nextTag()` throws if it encounters text that is not whitespace before the next tag.
- `elementText()` throws if the cursor is not at a start tag, or if the element has a child element.

When the structure is less predictable, use the `next()` loop and branch on the name, calling `elementText()` only for
elements known to contain text. [Getting started](/guide/getting-started#read-a-document) reads titles that way.

### Skip an element

`skipElement()`, called at a start tag, skips the element and all its descendants and leaves the cursor at its end
tag.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
// <book id="b1">
//   <title>Dune</title>
//   <reviews><review>Vast.</review><review>Dry.</review></reviews>
//   <price currency="GBP">9.99</price>
// </book>
const reader = xml.createStreamReader(source);

reader.nextTag(); // <catalog>
while (reader.nextTag() === EventType.START_ELEMENT) {
  reader.nextTag(); // <title>
  const title = reader.elementText();
  reader.nextTag(); // <reviews>
  reader.skipElement(); // now at </reviews>
  reader.nextTag(); // <price>
  console.log(title, reader.elementText());
  reader.nextTag(); // </book>
}
// Dune 9.99
// Emma 7.50
```

At any event other than a start tag, `skipElement()` throws an `IllegalStateError`.

## The other events

Besides elements and text, a document can contain comments, processing instructions, CDATA sections and a DOCTYPE
declaration. Each has an event type of its own, so a loop that tests only for the types it handles ignores them.

| Event                    | What the cursor is at          | Read it with                                              |
| ------------------------ | ------------------------------ | --------------------------------------------------------- |
| `COMMENT`                | `<!-- reprint due -->`         | `text()`, the comment without `<!--` and `-->`            |
| `PROCESSING_INSTRUCTION` | `<?print landscape?>`          | `piTarget()` for `print`, `piData()` for `landscape`      |
| `CDATA`                  | `<![CDATA[<b>]]>`              | `text()`, the text inside the section                     |
| `DTD`                    | A `<!DOCTYPE ...>` declaration | `doctype()`; see [DTDs and entities](/guide/external/dtd) |

A `CDATA` section is literal text in which `<` and `&` need no escaping; treat it as text. With `coalescing: true` on
the factory it is merged into the adjacent `CHARACTERS` and the type is never reported.

The XML declaration, `<?xml version="1.0" encoding="UTF-8"?>` at the start of a document, is not an event.
`version()`, `declaredEncoding()` and `standalone()` return its values at any event. Each is `undefined` when the
declaration does not specify it.

`encoding()` is different: it returns the encoding the bytes were decoded with, such as `utf-8`, and `undefined` for a
document supplied as a string. [Encodings](/guide/production/encodings) explains how the two can differ.

### Entity references

An _entity_ is named replacement text that a document declares once in its DTD, the declarations that `<!DOCTYPE>`
introduces, and references as `&name;`. The five predefined entities (`&amp;`, `&lt;`, `&gt;`, `&quot;` and `&apos;`)
need no declaration.

The cursor replaces each reference with the entity's text, so the reference itself is never reported. The text of a
declared entity is reported as a `CHARACTERS` event of its own, which is another reason an element's text can span
several events.

A reference to an undeclared entity is an error. [DTDs and entities](/guide/external/dtd) covers declarations, entities
stored in other files, and keeping references unreplaced with `replaceEntityReferences`.

::: details Marking where an entity's text starts and ends
With the factory option `reportEntityBoundaries: true`, references are still replaced, and two additional events
delimit each replacement: `START_ENTITY` before it and `END_ENTITY` after it. At both, `name()` returns the entity's
name. So `<note>From &shop; &amp; friends</note>` produces `CHARACTERS`, `START_ENTITY`, `CHARACTERS`, `END_ENTITY`,
`CHARACTERS`.

Entity references inside attribute values are not delimited.
:::

## Find where an event is

`location()` returns the position in the source where the current event starts. Use it in application-level messages
about a document's content, such as "the book on line 5 has no `lang`":

```ts twoslash
const reader = xml.createStreamReader(source);
// ---cut---
const { line, column } = reader.location();
```

Lines and columns are 1-based. A location also has an `offset`, the 0-based position from the start of the document,
and the `systemId`, the document's URI, when [the source specifies one](/guide/sources#why-the-system-id-matters).
Columns and offsets are counted in UTF-16 code units, so they match `string.length` and `string.slice`.

The errors a reader throws carry the same four values.
[Errors and locations](/guide/errors#find-where-an-event-is) has a full example.

## All the accessors

Every accessor describes the current event. A parameter named `i` is a 0-based index.

| Accessor                                                               | Returns                                                                    | At                                  |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------- |
| `eventType()`                                                          | The current event's type                                                   | Any event                           |
| `hasNext()`                                                            | Whether there is another event; false at `END_DOCUMENT` and after an error | Any event                           |
| `location()`                                                           | The position where the event starts                                        | Any event                           |
| `localName()`, `prefix()`, `namespaceURI()`                            | The parts of the element's name                                            | A start or end tag                  |
| `name()`                                                               | The element's name as written, or an entity's name                         | A start or end tag, an entity event |
| `attribute(localName, namespaceURI?)`                                  | An attribute's value by name, or `undefined`                               | A start tag                         |
| `attributeCount()`                                                     | The number of attributes                                                   | A start tag; 0 elsewhere            |
| `attributeValue(i)`                                                    | An attribute's value                                                       | A start tag                         |
| `attributeLocalName(i)`, `attributePrefix(i)`, `attributeNamespace(i)` | The parts of an attribute's name                                           | A start tag                         |
| `attributeName(i)`                                                     | An attribute's name as written                                             | A start tag                         |
| `attributeType(i)`                                                     | The type the DTD declares for the attribute; `CDATA` when it declares none | A start tag                         |
| `isAttributeSpecified(i)`                                              | Whether the attribute appears in the tag, not defaulted by the DTD         | A start tag                         |
| `namespaceCount()`                                                     | The number of namespace declarations on the tag                            | A start or end tag                  |
| `namespacePrefix(i)`, `namespaceURI(i)`                                | A namespace declaration's prefix and URI                                   | A start or end tag                  |
| `text()`                                                               | The text                                                                   | Text, CDATA, a comment              |
| `isWhitespace()`                                                       | Whether the text is all whitespace                                         | Text, CDATA                         |
| `piTarget()`, `piData()`                                               | A processing instruction's target and data                                 | A processing instruction            |
| `doctype()`                                                            | The DOCTYPE's name, identifiers and declarations                           | A `DTD` event                       |
| `version()`, `declaredEncoding()`, `standalone()`                      | The XML declaration's values                                               | Any event                           |
| `encoding()`                                                           | The encoding the bytes were decoded with; `undefined` for a string         | Any event                           |

Four methods advance the cursor: `next()`, `nextTag()`, `elementText()` and `skipElement()`. All the others leave its
position unchanged.

## Next steps

- [Large files and streams](/guide/cursor/streams): parse a `ReadableStream` or an async iterable chunk by chunk.
- [One record at a time](/guide/cursor/records): run XPath over a file too large for a single tree.
- [Dropping content with filters](/guide/cursor/filters): remove events before the loop sees them.
- [Changing content with delegates](/guide/cursor/delegates): override what the cursor reports.
