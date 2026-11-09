# Untrusted input

Several standard XML features can be used against the program that parses a document: external entities (XXE and
SSRF), entity expansion (billion laughs) and unbounded nesting. exemplar's defaults block each of them, so a factory
with no options is safe for untrusted documents. This page describes each attack and the default that stops it, then
the options that tighten or relax the defaults.

```ts twoslash
import { DocumentBuilder } from '@exemplarjs/dom';
import { XMLInputFactory } from '@exemplarjs/xml';

// The defaults are safe for untrusted documents.
const xml = new XMLInputFactory();
const document = new DocumentBuilder(xml).parse(source);
```

## The attacks and the defaults that stop them

### XXE and SSRF: external entities

An XML external entity (XXE) attack declares an
[external entity](/guide/external/dtd#when-the-dtd-is-in-a-separate-file) whose system identifier is a local file, and
references it in the content. A parser that resolves the entity puts the file's content into the parsed data, and an
application that returns that data discloses the file.

```xml
<!DOCTYPE order [
  <!ENTITY secret SYSTEM "file:///etc/passwd">
]>
<order><note>&secret;</note></order>
```

With an `http:` URL the same declaration is a server-side request forgery (SSRF): the parser sends a request from
inside your network to a host the attacker chooses.

exemplar reads no external resource unless the factory
[allows a protocol and has a resolver](/guide/external/resolvers). With the defaults the file is not read, and the
reference is reported as an `ENTITY_REFERENCE` event with no text.

### Billion laughs: entity expansion

An entity's replacement text can reference other entities. In a billion laughs attack each entity references the
previous one ten times, so the expanded size grows tenfold with every declaration. In the document below `&e;`
expands to 10,000 copies of `ha`, and five more declarations of the same form would make that two billion characters.

```xml
<!DOCTYPE order [
  <!ENTITY a "ha">
  <!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">
  <!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;">
  <!ENTITY d "&c;&c;&c;&c;&c;&c;&c;&c;&c;&c;">
  <!ENTITY e "&d;&d;&d;&d;&d;&d;&d;&d;&d;&d;">
]>
<order><note>&e;</note></order>
```

exemplar counts entity expansions as it performs them and fails the document when the count passes the limit, as it
does here:

```text
LIMIT_ENTITY_EXPANSIONS: More than 2500 entity expansions (8:14)
```

### Very deep nesting

A document of `<a><a><a>…` nested thousands deep is small to send, and can exhaust the memory or the call stack of
code that processes it recursively. exemplar fails a document nested more than 100 levels deep:

```text
LIMIT_ELEMENT_DEPTH: Elements are nested more than 100 deep (1:301)
```

## What is safe by default

| Attack                                              | Default                                                        |
| --------------------------------------------------- | -------------------------------------------------------------- |
| XXE and SSRF: reading local files or network URLs   | Nothing is read: no protocol is allowed and no resolver is set |
| Billion laughs: unbounded entity expansion          | [Limits](/reference/limits) on the number and size of entities |
| Deep nesting, very long names, very many attributes | A limit on each                                                |
| [XInclude](/guide/external/xinclude)                | Off; `xi:include` is read as an ordinary element               |
| XPath reading files with `doc()`                    | Nothing is read without a resolver                             |

Each default holds until an option changes it. If trusted documents need a protocol allowed, keep a separate factory
for untrusted ones.

::: warning
`accessExternalEntities: 'all'` with a file resolver rooted at `/` makes the XXE attack above work. Allow only the
protocols you need, and give `fileResolver` the narrowest `root`.
:::

## Refuse DTDs

XXE and billion laughs both require a `<!DOCTYPE>`. Most XML exchanged between programs, such as feeds, API payloads
and configuration, has none. If your documents need none, reject it:

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';

const untrusted = new XMLInputFactory({ disallowDoctype: true });
```

Any document with a `<!DOCTYPE>` then fails immediately:

```text
DOCTYPE_DISALLOWED: This parser does not accept a DOCTYPE (1:1)
```

This is the strictest setting; use it wherever documents need no DTD. The five predefined entities, such as `&amp;`,
still work, since they need no DTD.

## Tighten a limit

The default limits accommodate ordinary documents and stop the attacks above. If your documents are known to be
smaller, lower them: pass the factory a `limits` object with only the limits to change.

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';

const untrusted = new XMLInputFactory({
  disallowDoctype: true,
  limits: { elementDepth: 64, attributesPerElement: 50 },
});
```

| Limit                  | Default | What it counts                           |
| ---------------------- | ------- | ---------------------------------------- |
| `elementDepth`         | 100     | Element nesting depth                    |
| `attributesPerElement` | 200     | Attributes on one start tag              |
| `nameLength`           | 1,000   | Characters in one name                   |
| `entityExpansions`     | 2,500   | Entity expansions in one document        |
| `totalEntitySize`      | 100,000 | Characters all entities produce together |
| `generalEntitySize`    | 100,000 | Characters in one entity                 |

[Limits](/reference/limits) has the full list and the exact definition of each count.

A limit can be raised the same way for trusted documents. A large published DTD such as DocBook's performs more
entity expansions than the default allows, and needs `entityExpansions` raised.

There is no limit on the size of a document or of the text in it. If total size matters, limit the bytes before
passing them to a reader.

## What happens when a limit is hit

Exceeding a limit is a fatal error. The reader throws an `XMLError` whose code begins `LIMIT_`, located where the
limit was exceeded, and parsing cannot continue.

Here `source` is a document of `<a>` elements nested 65 deep:

```ts twoslash
import { XMLError, XMLInputFactory } from '@exemplarjs/xml';
// ---cut---
const untrusted = new XMLInputFactory({ limits: { elementDepth: 64 } });

try {
  const reader = untrusted.createStreamReader(source);
  while (reader.hasNext()) reader.next();
} catch (error) {
  if (error instanceof XMLError) console.log(error.message);
}
// LIMIT_ELEMENT_DEPTH: Elements are nested more than 64 deep (1:193)
```

Limits are checked during parsing, not afterwards, so the oversized content is never built. An
[error handler](/guide/errors#handle-errors-yourself) receives the error through `fatalError` but cannot suppress it.

## XPath on untrusted input

Two features need care when the _expression_, or part of it, is untrusted.

- **Regular expressions.** XPath's `matches`, `replace` and `tokenize` take a regular expression, and some patterns
  take a very long time on input crafted for them (ReDoS). Do not accept patterns from untrusted sources.
  [Regular expressions and collations](/guide/xpath/text) has the details.
- **Reading documents.** `doc()`, `unparsed-text()` and `collection()` read by URI, but only through a resolver
  supplied for the evaluation. Without one they read nothing. Give them a resolver as narrow as the one a reader
  would get. [Reading documents and collections](/guide/xpath/resources) has the details.

Untrusted _values_ are safe when passed as [variables](/guide/xpath/variables). Do not build an expression by string
concatenation.

## Trusted input: skip the checks

For documents that your own program has just written and that are known to be well formed, two of the reader's checks
can be turned off.

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';

const trusted = new XMLInputFactory({ checkWellFormedness: false });
```

The reader then no longer checks that:

- each end tag has the same name as its start tag;
- an attribute appears only once on a tag.

Every other check still runs, and the limits still apply.

::: warning
With the checks off, a document that violates these two rules is not reported; it is misread. `<a><b></c></a>` is
read as if the end tag were `</b>`, and a repeated attribute is reported twice. Use this only for input your own code
produced, never for anything a user or another system can influence.
:::

## Next steps

- [Limits](/reference/limits) lists every limit and its default.
- [Resolvers and access](/guide/external/resolvers) shows how to allow exactly what is needed.
- [Errors and locations](/guide/errors) explains the errors on this page.
- [DTDs and entities](/guide/external/dtd) covers DTDs, entities and entity references.
