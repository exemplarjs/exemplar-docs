# Getting started with XPath

XPath is a query language for XML. An expression such as `//book[price < 10]/title` selects the nodes of a document
that match it, much as a CSS selector selects elements, and can also compute values from them. `@exemplarjs/xpath`
evaluates XPath 3.1 expressions against the tree built by `@exemplarjs/xdm`.

```bash
npm install @exemplarjs/xml @exemplarjs/xdm @exemplarjs/xpath
```

The examples on the XPath pages query this bookshop catalog:

```xml
<catalog>
  <book id="b1" genre="fiction">
    <title>Dune</title>
    <author>Frank Herbert</author>
    <price>12.50</price>
  </book>
  <book id="b2" genre="fiction">
    <title>Emma</title>
    <author>Jane Austen</author>
    <price>8.00</price>
  </book>
  <book id="b3" genre="science">
    <title>Cosmos</title>
    <author>Carl Sagan</author>
    <price>15.00</price>
  </book>
</catalog>
```

## Query a document

A query takes a tree and a compiled expression.

```ts twoslash
import { XdmDocumentBuilder } from '@exemplarjs/xdm';
import { XPathCompiler } from '@exemplarjs/xpath';

// 1. Build a tree from the document.
const doc = new XdmDocumentBuilder().parse(source);

// 2. Compile the expression.
const compiler = new XPathCompiler();
const titles = compiler.compile('//book/title');

// 3. Run it over the tree.
console.log(titles.evaluateStrings(doc));
// ['Dune', 'Emma', 'Cosmos']
```

`XdmDocumentBuilder` parses the document into an XDM tree (XDM is the XPath data model). The tree is compact and
read-only, designed for XPath evaluation: it holds its nodes in typed arrays in document order and all its text in one
string. `source` here is a string holding the catalog. To query a file, pass its bytes instead:
`parse(readFileSync('catalog.xml'))`. [The XDM tree](/guide/xpath/tree) covers streams and the other inputs.

`compile` parses and checks the expression and returns an `XPathExecutable`. `evaluateStrings` evaluates it against the
tree and returns the string value of each item in the result.

::: tip Coming from Java
`XPathCompiler.compile` is JAXP's `XPath.compile`, and the executable is its `XPathExpression`. The `evaluate…` methods
replace `evaluate(item, XPathConstants.STRING)` and the other return types.
:::

## Write an expression

A path is a series of steps separated by `/`, evaluated from left to right. Each step starts from the nodes the
previous step selected and selects their child elements with the given name. `//` selects descendants at any depth
instead of children, and `@` selects an attribute. A predicate in `[ ]` filters the selected nodes by a condition
or, given a number, by position, counted from 1. Each row below is evaluated against the catalog above.

| Expression                              | What it selects                         | Result                         |
| --------------------------------------- | --------------------------------------- | ------------------------------ |
| `/catalog/book/title`                   | An absolute path from the document root | `Dune`, `Emma`, `Cosmos`       |
| `//title`                               | Every `title`, at any depth             | `Dune`, `Emma`, `Cosmos`       |
| `//book/@id`                            | An attribute                            | `b1`, `b2`, `b3`               |
| `//book[2]/author`                      | A predicate on position                 | `Jane Austen`                  |
| `//book[@genre = 'fiction']/title`      | A predicate on an attribute             | `Dune`, `Emma`                 |
| `//book[price > 10]/title`              | A predicate on a child element          | `Dune`, `Cosmos`               |
| `count(//book)`                         | A function call                         | `3`                            |
| `sum(//price)`                          | An aggregate over the selected values   | `35.5`                         |
| `string-join(//title, ', ')`            | The selected values as one string       | `Dune, Emma, Cosmos`           |
| `//book ! (title \|\| ': ' \|\| price)` | An expression evaluated once per book   | `Dune: 12.50`, `Emma: 8.00`, … |

Three XPath terms recur on these pages. An _atomic value_ is a single typed value that is not a node, such as a
string, a number or a date. An _item_ is a node, an atomic value, a map, an array or a function. A _sequence_ is an
ordered, flat list of zero or more items, and every expression returns one. Nodes are of seven kinds: document,
element, attribute, text, comment, processing instruction and namespace.

A path returns a sequence of nodes, and a function such as `count` or `sum` computes an atomic value from one. In the
last row, `!` evaluates the expression on its right once for each item on its left, and `||` concatenates strings.

XPath 3.1 also has `for`, `let` and `if` expressions, maps, arrays and inline functions. Later pages use them where
they apply.

## Choose what comes back

The evaluation method determines the JavaScript type of the result. Four methods cover most queries:

```ts twoslash
// One string, number or boolean.
compiler.compile('//book[1]/title').evaluateString(doc); // 'Dune'
compiler.compile('count(//book)').evaluateNumber(doc); // 3
compiler.compile('//book/price > 14').evaluateBoolean(doc); // true

// One string per item.
compiler.compile('//book/@id').evaluateStrings(doc); // ['b1', 'b2', 'b3']
```

`evaluateString` and `evaluateNumber` expect a result of at most one item. They throw for a longer sequence, and
return `''` and `NaN` for an empty one.

`selectNodes` returns the nodes themselves, to read several values from each or to evaluate further expressions
against them:

```ts twoslash
for (const book of compiler.compile('//book[price > 10]').selectNodes(doc)) {
  console.log(book.attribute('id')); // 'b1', then 'b3'
}
```

[Getting results](/guide/xpath/results) covers every method, and how numbers, dates, maps and arrays are converted.

## Reuse a compiled expression

Compile an expression once and keep the executable: the expression is parsed and checked by `compile`, not on each
evaluation. An executable holds no state between evaluations, so one executable can be evaluated against any number of
documents.

```ts twoslash
declare const documents: import('@exemplarjs/xdm').XdmNode[];
// ---cut---
const cheapTitles = compiler.compile('//book[price < 10]/title');

for (const document of documents) {
  console.log(cheapTitles.evaluateStrings(document));
}
```

One compiler can serve a whole program as well. It holds the settings its expressions share, such as namespace
bindings.

### The compiler keeps its executables

Sometimes there is nowhere convenient to keep an executable: the expression arrives as text each time, read from
configuration or from the document being processed. The compiler keeps the executables it makes, so `compile` returns
the one it already has when it is given the same expression again.

```ts twoslash
const first = compiler.compile('//book[price < 10]/title');
const again = compiler.compile('//book[price < 10]/title');

console.log(first === again);
// true
```

Two calls share an executable when the expression text and the declared variables are both the same, and the variables
are declared in the same order. The cache holds the 256 executables used most recently and belongs to the compiler, so
it is released with it.

To have `compile` return a new executable on each call, turn the `cache` option off:

```ts twoslash
import { XPathCompiler } from '@exemplarjs/xpath';
// ---cut---
const uncached = new XPathCompiler({ cache: false });

console.log(uncached.compile('//book') === uncached.compile('//book'));
// false
```

## Pass a value in

Do not build an expression by concatenating strings. Declare a variable at compile time and supply its value at
evaluation, as with a parameter of a prepared SQL statement. The expression is compiled once, and the value is data
that cannot alter the expression.

```ts twoslash
const under = compiler.compile('//book[price < $max]/title', {
  variables: { max: 'xs:decimal' },
});

under.evaluateStrings(doc, { variables: { max: 13 } }); // ['Dune', 'Emma']
under.evaluateStrings(doc, { variables: { max: 10 } }); // ['Emma']
```

`'xs:decimal'` is the variable's declared type. TypeScript checks the value against it, so `{ max: 'cheap' }` is a
type error. [Passing variables](/guide/xpath/variables) covers the types and how JavaScript values are converted.

## Choose where the expression starts

The first argument of every evaluation method is the _context_: the item that paths are evaluated relative to. It can
be a document node, any other node, or omitted.

```ts twoslash
// A document node: paths start at the document root.
compiler.compile('count(//book)').evaluateNumber(doc); // 3

// A node: relative paths start there.
const [firstBook] = compiler.compile('//book').selectNodes(doc);
compiler.compile('title').evaluateString(firstBook); // 'Dune'

// No context: for expressions that read no document.
compiler.compile('1 + 2').evaluateNumber(); // 3
```

A path that starts with `/` is evaluated from the root of the context node's document, whichever node is the context.
An expression that needs a context and has none raises an error with the code `XPDY0002`.

To pass variables without a context, pass `null` as the first argument:
`executable.evaluateNumber(null, { variables: { max: 13 } })`.

## Query documents that use namespaces

When a query that looks correct returns nothing, the usual cause is a namespace. An unprefixed element name in an
expression matches only elements in no namespace, so it does not match the elements of a document that declares one:

```xml
<catalog xmlns="urn:example:shop" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <book>
    <dc:title>Dune</dc:title>
  </book>
</catalog>
```

```ts twoslash
compiler.compile('//book/title').evaluateStrings(doc); // []
```

Bind the prefixes that expressions use with the compiler's `namespaces` option. The prefixes need not be the ones in
the document, because names are matched by namespace URI.

```ts twoslash
import { XPathCompiler } from '@exemplarjs/xpath';

const compiler = new XPathCompiler({
  namespaces: { s: 'urn:example:shop', dc: 'http://purl.org/dc/elements/1.1/' },
});

compiler.compile('//s:book/dc:title').evaluateStrings(doc); // ['Dune']
```

When most of a document is in one namespace, set it as the `defaultElementNamespace` instead. Unprefixed element names
then match elements in that namespace. Attribute names are not affected, because unprefixed attributes are in no
namespace.

```ts twoslash
import { XPathCompiler } from '@exemplarjs/xpath';
// ---cut---
const compiler = new XPathCompiler({
  defaultElementNamespace: 'urn:example:shop',
  namespaces: { dc: 'http://purl.org/dc/elements/1.1/' },
});

compiler.compile('//book/dc:title').evaluateStrings(doc); // ['Dune']
```

The wildcard prefix `*:` matches a name in any namespace, as in `//*:book/*:title`. [Namespaces](/guide/namespaces)
covers namespaces themselves.

## Handle errors

An error in an expression is thrown as an `XPathException`, at one of two points:

- **At compile time**, for an error in the expression itself: invalid syntax, an unknown function, an undeclared
  variable. These are _static_ errors.
- **At evaluation**, for an error that depends on the data: text that is not a number, a document that cannot be
  read. These are _dynamic_ errors.

```ts twoslash
import { XPathException } from '@exemplarjs/xpath';

try {
  compiler.compile('//book[price >\n  $limit]');
} catch (error) {
  if (error instanceof XPathException) {
    error.code; // 'XPST0008'
    error.description; // 'The variable $limit is not declared'
    error.offset; // { start: 17, end: 23 }
    error.position; // { line: 2, column: 3 }
    error.message; // 'XPST0008: The variable $limit is not declared at line 2, column 3'
  }
}
```

| Property      | What it holds                                                                             |
| ------------- | ----------------------------------------------------------------------------------------- |
| `code`        | The standard XPath error code, the same in every XPath processor                          |
| `description` | A description of the error                                                                |
| `offset`      | For a static error, the start and end offsets of the error in the expression text, from 0 |
| `position`    | For a static error, the line and column where it starts, counted from 1                   |
| `message`     | The code, the description and the position combined                                       |

A dynamic error has a code and a description, but no `offset` or `position`:

```ts twoslash
import { XPathException } from '@exemplarjs/xpath';
// ---cut---
try {
  compiler.compile('xs:date(//book[1]/title)').evaluateString(doc);
} catch (error) {
  if (error instanceof XPathException) {
    error.code; // 'FORG0001'
    error.description; // '"Dune" is not a valid xs:date'
  }
}
```

`XPathErrorCode`, exported from `@exemplarjs/xpath`, has a named constant for each code:
`error.code === XPathErrorCode.UNDECLARED_NAME` tests for `'XPST0008'`.

An incorrect call to the API, as opposed to an error in the expression, is not an `XPathException`. Passing a value
for an undeclared variable, for example, throws an [`InvalidArgumentError`](/guide/errors#errors-in-your-own-code).

The [error codes](/reference/error-codes) page lists the codes.

## What is supported

The whole XPath 3.1 language is supported, with every function in its standard library. The
[XPath functions](/reference/xpath-functions) reference lists the functions.

Functions that load other documents, such as `doc` and `collection`, read nothing unless the evaluation is given a
resolver; see [Reading documents and collections](/guide/xpath/resources). A few functions, such as the one that reads
environment variables, are [not available](/guide/xpath/resources#functions-that-are-not-available).

## Next steps

- [Getting results](/guide/xpath/results): strings, numbers, nodes or plain JavaScript values.
- [Passing variables](/guide/xpath/variables): typed variables and how values are converted.
- [The XDM tree](/guide/xpath/tree): build trees from streams, readers and fragments, and read nodes directly.

The pages under "XPath in depth" are independent of each other:

- [Reading documents and collections](/guide/xpath/resources): `doc()`, `collection()` and resolvers.
- [Maps, arrays, JSON and functions](/guide/xpath/maps-arrays): query JSON and build structured results.
- [Dates, times and durations](/guide/xpath/dates): date values, arithmetic and formatting.
- [Regular expressions and collations](/guide/xpath/text): match, replace, split, compare and sort text.
- [Serializing results](/guide/xpath/serialize): serialize nodes and values as XML, HTML, JSON or text.
- [Smaller bundles](/guide/xpath/bundles): bundle only the functions an application calls.
