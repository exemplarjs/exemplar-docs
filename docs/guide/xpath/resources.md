# Reading documents and collections

XPath 3.1 has functions that load external resources during evaluation: `doc()` for XML, `unparsed-text()` for text,
`json-doc()` for JSON and `collection()` for sets of documents. Use them to join data from several sources in one
expression. Every read goes through a resolver that is passed to the evaluation.

```ts twoslash
import { fileResolver } from '@exemplarjs/xml/resolvers/file';
import { XPathCompiler } from '@exemplarjs/xpath';

const compiler = new XPathCompiler({ baseURI: 'file:///data/' });
const titles = compiler.compile('doc("books.xml")//title');

const resources = { uriResolver: fileResolver({ root: '/data' }) };
titles.evaluateStrings(null, { resources }); // ['Dune', 'Emma']
```

There is no context document here, so the first argument is `null`. The `resources` option specifies what the evaluation
may read.

The relative reference `"books.xml"` is resolved against the compiler's `baseURI`; see [Set the base
URI](#set-the-base-uri).

| Function                                             | Reads                                    |
| ---------------------------------------------------- | ---------------------------------------- |
| `doc(uri)`                                           | An XML document, as an XDM tree          |
| `unparsed-text(uri)`                                 | A text file, as one string               |
| `unparsed-text-lines(uri)`                           | A text file, as one string for each line |
| `json-doc(uri)`                                      | A JSON file, as maps and arrays          |
| `collection(uri)`                                    | The documents of a collection            |
| `uri-collection(uri)`                                | The URIs of a collection's members       |
| `doc-available(uri)`, `unparsed-text-available(uri)` | Whether the read would succeed           |

## Nothing is read unless you allow it

By default these functions have no access to the file system or the network. Expressions often come from configuration,
users or other systems, and an unrestricted `doc()` would expose local files and internal network hosts to whoever
writes them.

Access is granted per evaluation, through the resolvers in its `resources` option. The compiler and the compiled
expression hold none, so the same expression can run with different access in different calls. Without a resolver, every
read fails:

```ts twoslash
import { XPathCompiler } from '@exemplarjs/xpath';
const compiler = new XPathCompiler({ baseURI: 'file:///data/' });
// ---cut---
compiler.compile('doc("books.xml")//title').evaluateStrings();
// XPathException: FODC0002: No resolver supplies file:///data/books.xml
```

The XML reader uses the same resolvers for the external resources that a document references; [Resolvers and
access](/guide/external/resolvers) describes them in full.

## Read files

`fileResolver` reads files below one directory, its `root`, on Node, Deno and Bun. A URI that resolves outside the root
is declined, so `doc("../secrets.xml")` fails in the same way as a file that does not exist.

```ts twoslash
import { fileResolver } from '@exemplarjs/xml/resolvers/file';
import { XPathCompiler } from '@exemplarjs/xpath';

const compiler = new XPathCompiler({ baseURI: 'file:///data/' });
const resources = { uriResolver: fileResolver({ root: '/data' }) };

// Books that are in stock, with stock levels from a JSON file: {"b1": 4, "b2": 0}
const inStock = compiler.compile(`
  let $stock := json-doc("stock.json")
  return doc("books.xml")//book[$stock(@id) > 0]/title
`);
inStock.evaluateStrings(null, { resources }); // ['Dune']

const notes = compiler.compile('unparsed-text-lines("notes.txt")');
notes.evaluateStrings(null, { resources }); // ['Open daily', '9 to 5']
```

Reads are stable within one evaluation: each URI is read once, however often the expression requests it, so
`doc("books.xml") is doc("books.xml")` is true.

Text is decoded with the encoding that the resolver reports, such as an HTTP charset. Failing that, the encoding passed
as the second argument is used, as in `unparsed-text("notes.txt", "iso-8859-1")`, then the one indicated by a byte order
mark or an XML declaration at the start of the file, then UTF-8. Bytes that do not decode raise an `XPathException` with
the code `FOUT1190`.

## Set the base URI

A resolver always receives an absolute URI. A relative reference such as `"books.xml"` is first resolved against the
compiler's `baseURI`.

```ts twoslash
import { XPathCompiler } from '@exemplarjs/xpath';
// ---cut---
const compiler = new XPathCompiler({ baseURI: 'file:///data/' });
// doc("books.xml") now means file:///data/books.xml
```

End a directory's URI with `/`; otherwise its last segment is replaced, not extended. Without a `baseURI`, a relative
URI raises an error:

```text
FODC0002: "books.xml" is relative, and there is no static base URI to resolve it against
```

## Read over the network

`fetchResolver` reads `http:` and `https:` URIs with `fetch`. It returns a promise, which the synchronous evaluation
methods cannot await, so use the methods that end in `Async`:

```ts twoslash
import { fetchResolver } from '@exemplarjs/xml/resolvers';
import { XPathCompiler } from '@exemplarjs/xpath';

const compiler = new XPathCompiler();
const total = compiler.compile('doc("https://example.org/prices.xml")//price => sum()');

const resources = { uriResolver: fetchResolver() };
await total.evaluateNumberAsync(null, { resources }); // 20.5
```

Every evaluation method except `select` has an `Async` counterpart, such as `evaluateStringsAsync` and
`selectNodesAsync`, which takes the same arguments and returns a promise of the same result.

The `Async` methods fetch in parallel where they can: before evaluation starts, they request every URI that appears in
the expression as a string literal. When evaluation reaches a resource that has not arrived, it suspends until the
resource is available.

::: warning
The synchronous methods throw a `PromiseNotAwaitedError`, a subclass of `TypeError` exported by `@exemplarjs/xpath`,
when a resolver returns a promise:
`A resolver answered with a promise, which only evaluateAsync and the other asynchronous methods wait for`. The `Async`
methods work with synchronous and asynchronous resolvers alike, so use them when the resolver is not known in advance.
:::

`fetchResolver` fetches any URL that the expression names. Do not combine it with untrusted expressions.

## Use documents you already have

The `documents` option maps URIs to trees that are already built. `doc()` returns the mapped tree without consulting a
resolver, which also makes this the way to query several in-memory documents in one expression.

```ts twoslash
declare const catalog: import('@exemplarjs/xdm').XdmNode;
declare const orders: import('@exemplarjs/xdm').XdmNode;
import { XPathCompiler } from '@exemplarjs/xpath';
// ---cut---
const documents = new Map([
  ['urn:shop:catalog', catalog],
  ['urn:shop:orders', orders],
]);

const compiler = new XPathCompiler();
const ordered = compiler.compile(`
  doc("urn:shop:catalog")//book[@id = doc("urn:shop:orders")//line/@book]/title
`);

ordered.evaluateStrings(null, { resources: { documents } });
```

The keys are absolute URIs. They are identifiers only and need not be resolvable, so `urn:` names such as these work.

::: details Write a resolver of your own
A resolver is an object with a `resolve(href, base)` method. It receives the absolute URI as `href` and returns the
content as `text` or `bytes`, or `undefined` to decline. This one serves from memory:

```ts twoslash
import type { URIResolver } from '@exemplarjs/xml';

const files: Record<string, string> = {
  'urn:shop:books': '<catalog><book><title>Dune</title></book></catalog>',
  'urn:shop:notes': 'Open daily',
};

const uriResolver: URIResolver = {
  resolve(href) {
    const text = files[href];
    return text === undefined ? undefined : { text, systemId: href };
  },
};
```

A resolver may return a promise, in which case the evaluation needs the `Async` methods.
:::

## Read a collection

XPath leaves the meaning of a collection URI to the application. `collection(uri)` returns whatever the
`collectionResolver` in `resources` lists as the members of that URI.

`collectionMap` creates a collection resolver from fixed lists. A member is either a URI, which is read as `doc()` would
read it, or a tree that is already built.

```ts twoslash
import { fileResolver } from '@exemplarjs/xml/resolvers/file';
// ---cut---
import { collectionMap } from '@exemplarjs/xpath';

const collectionResolver = collectionMap({
  'urn:shop:books': ['file:///data/books/dune.xml', 'file:///data/books/emma.xml'],
});
const resources = { collectionResolver, uriResolver: fileResolver({ root: '/data' }) };

const titles = compiler.compile('collection("urn:shop:books")//title');
titles.evaluateStrings(null, { resources }); // ['Dune', 'Emma']
```

URI members are read through the `uriResolver`, so both resolvers are needed here. Tree members need no `uriResolver`:
`collectionMap({ 'urn:shop:all': [catalog, orders] })`.

`collection()` with no argument reads the default collection, which is named by the second argument of `collectionMap`:
`collectionMap(lists, 'urn:shop:books')`.

### A directory as a collection

`directoryCollections` maps a directory's URI to the collection of the files in it, in name order. Like `fileResolver`,
it lists nothing outside its `root`, and it runs on Node, Deno and Bun.

```ts twoslash
import { fileResolver } from '@exemplarjs/xml/resolvers/file';
import { XPathCompiler } from '@exemplarjs/xpath';
// ---cut---
import { directoryCollections } from '@exemplarjs/xpath/resolvers/directory';

const compiler = new XPathCompiler({ baseURI: 'file:///data/' });
const resources = {
  collectionResolver: directoryCollections({ root: '/data' }),
  uriResolver: fileResolver({ root: '/data' }),
};

compiler.compile('collection("books/")//title').evaluateStrings(null, { resources });
// ['Dune', 'Emma']
```

The collection includes every file in the directory, whatever its extension, and does not recurse into subdirectories. A
file that does not parse as XML fails the evaluation, so restrict the selection when a directory holds other files. The
`select` option is a glob over the file names: `*` matches any characters, `?` matches one, and `(a|b)` matches either
alternative.

```ts twoslash
import { directoryCollections } from '@exemplarjs/xpath/resolvers/directory';
// ---cut---
const collectionResolver = directoryCollections({ root: '/data', select: '*.xml' });
```

An expression can override the option with a `select` parameter in the collection URI's query:
`collection("books/?select=*.(xml|xhtml)")`.

For any other source, such as a database query, write a collection resolver: an object with a `resolveCollection(uri)`
method that returns the members, or `undefined` for a collection it does not recognize. `uri` is `undefined` for the
default collection.

A collection URI that no resolver recognizes raises an `XPathException` with the code `FODC0002`.

## Parse XML held in a string

`parse-xml` and `parse-xml-fragment` parse XML held in a string, such as a JSON value or a database column. They read no
external resource, so they need no resolver.

```ts twoslash
const title = compiler.compile('parse-xml($text)//title', { variables: { text: 'xs:string' } });
title.evaluateString(null, { variables: { text: '<book><title>Dune</title></book>' } }); // 'Dune'

const bold = compiler.compile('parse-xml-fragment($text)/b', { variables: { text: 'xs:string' } });
bold.evaluateStrings(null, { variables: { text: 'A <b>bold</b> and <b>brave</b> book' } }); // ['bold', 'brave']
```

`parse-xml` requires a complete document with one root element. `parse-xml-fragment` accepts any mix of text and
elements that is valid as the content of an element. Both raise an `XPathException` with the code `FODC0006` for text
that is not well-formed.

## Control how documents are parsed

Documents that `doc()`, `collection()` and `parse-xml` read are built by an `XdmDocumentBuilder` with the default reader
settings. To apply other settings, such as validation or stricter limits, pass a builder [made with your
factory](/guide/xpath/tree#use-your-reader-settings) as `resources.builder`.

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { XMLInputFactory } from '@exemplarjs/xml';
import { fileResolver } from '@exemplarjs/xml/resolvers/file';

const strict = new XMLInputFactory({ disallowDoctype: true });

const resources = {
  uriResolver: fileResolver({ root: '/data' }),
  builder: new XdmDocumentBuilder(strict),
};
```

## Functions that are not available

A few standard functions depend on facilities that exemplar does not have or deliberately withholds. They are defined,
so expressions that call them compile, but they return nothing or raise an error:

- `environment-variable` and `available-environment-variables` report no variables, so an expression cannot read the
  process environment or any secrets in it.
- `load-xquery-module` raises an `XPathException` with the code `FOQM0006`, as there is no XQuery processor.
- `transform` raises an `XPathException` with the code `FOXT0004`, as there is no XSLT processor.

## Next steps

- [Resolvers and access](/guide/external/resolvers): the resolvers in detail, and how to write one.
- [Untrusted input](/guide/production/security): the settings to restrict when expressions or documents are untrusted.
- [Maps, arrays, JSON and functions](/guide/xpath/maps-arrays): querying what `json-doc` returns.
- [The XDM tree](/guide/xpath/tree): building the trees you pass as `documents`.
