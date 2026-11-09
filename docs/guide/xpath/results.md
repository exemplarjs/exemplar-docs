# Getting results

The result of an expression is a [sequence of items](/guide/xpath/#write-an-expression): nodes the expression
selected, atomic values it computed, or maps, arrays and functions. The evaluation method determines how the items are
converted to JavaScript.

```ts twoslash
compiler.compile('//book[1]/title').evaluateString(doc); // 'Dune'
compiler.compile('sum(//price)').evaluateNumber(doc); // 35.5
compiler.compile('//book/price > 14').evaluateBoolean(doc); // true
```

The examples use the catalog from [Getting started](/guide/xpath/). `compiler` is an `XPathCompiler` and `doc` is the
catalog's tree, both created as that page shows.

Choose the method by the result required:

| Result                           | Method                                                | Returns                       |
| -------------------------------- | ----------------------------------------------------- | ----------------------------- |
| One string, number or boolean    | `evaluateString`, `evaluateNumber`, `evaluateBoolean` | `string`, `number`, `boolean` |
| A string or number for each item | `evaluateStrings`, `evaluateNumbers`                  | `string[]`, `number[]`        |
| Nodes                            | `selectNodes`                                         | `XdmNode[]`                   |
| Plain JavaScript values          | `evaluateJS`                                          | `unknown[]`                   |
| The items, unconverted           | `evaluate`                                            | `XdmValue`                    |

## Get one value

Use `evaluateString`, `evaluateNumber` or `evaluateBoolean` when the expression returns a single item.

```ts twoslash
const title = compiler.compile('//book[@id = "b2"]/title');
title.evaluateString(doc); // 'Emma'

const price = compiler.compile('//book[@id = "b2"]/price');
price.evaluateNumber(doc); // 8

const hasPoetry = compiler.compile('//book[@genre = "poetry"]');
hasPoetry.evaluateBoolean(doc); // false: there is no such book
```

When the item is a node, `evaluateString` returns its string value and `evaluateNumber` converts that string to a
number, so the expression needs no `string(…)` or `number(…)` call.

`evaluateBoolean` also tests for existence. It returns `false` for an empty sequence, an empty string and zero, and
`true` when the expression selects at least one node.

### When there is no item, or more than one

`evaluateString` and `evaluateNumber` accept an empty sequence and throw for a sequence of more than one item:

```ts twoslash
compiler.compile('//book[9]/title').evaluateString(doc); // '': there is no ninth book
compiler.compile('//book[9]/price').evaluateNumber(doc); // NaN

compiler.compile('//title').evaluateString(doc);
// XPathException: XPTY0004: evaluateString needs one item; the result has 3
```

An empty string can therefore mean either an empty element or no element. To distinguish the two, test for the
element with `evaluateBoolean`, or check the length of the array `evaluateStrings` returns.

To take the first of several items, select it in the expression: `(//title)[1]`.

`evaluateNumber` throws a `RangeError` for an integer too large for a JavaScript `number` to hold exactly.
[Large and exact numbers](#large-and-exact-numbers) shows how to get the exact value.

## Get a value for each item

`evaluateStrings` and `evaluateNumbers` return an array with one value for each item of the sequence, in order.

```ts twoslash
compiler.compile('//title').evaluateStrings(doc); // ['Dune', 'Emma', 'Cosmos']
compiler.compile('//price').evaluateNumbers(doc); // [12.5, 8, 15]
```

Text that is not a number becomes `NaN`, as it does with JavaScript's `Number`:
`compiler.compile('//title').evaluateNumbers(doc)` returns `[NaN, NaN, NaN]`.

## Get nodes

`selectNodes` returns the nodes an expression selects, as an array of `XdmNode`s. Use it to read several values from
each node, or to evaluate another expression with the node as its context.

```ts twoslash
const author = compiler.compile('string(author)');

for (const book of compiler.compile('//book[price > 10]').selectNodes(doc)) {
  console.log(book.attribute('id'), author.evaluateString(book));
}
// b1 Frank Herbert
// b3 Carl Sagan
```

A path returns its nodes in document order, without duplicates.
[Look at nodes yourself](/guide/xpath/tree#look-at-nodes-yourself) lists the members of `XdmNode`.

If the result holds any item that is not a node, `selectNodes` throws an `XPathException` with the code `XPTY0004`:

```ts twoslash
compiler.compile('count(//book)').selectNodes(doc);
// XPathException: XPTY0004: selectNodes needs nodes; the result holds a value of type xs:integer
```

Node identity is not object identity: two `XdmNode` objects from separate evaluations are not `===` even when they
refer to the same node. Compare nodes with `isSameNode`; see [Compare nodes](/guide/xpath/tree#compare-nodes).

## Get plain JavaScript values

`evaluateJS` converts each item to the closest JavaScript type. Use it when a result mixes types, or holds maps and
arrays.

```ts twoslash
const summary = compiler.compile(`
  //book ! map { "id": string(@id), "title": string(title), "price": number(price) }
`);

summary.evaluateJS(doc);
// [
//   Map { 'id' => 'b1', 'title' => 'Dune', 'price' => 12.5 },
//   Map { 'id' => 'b2', 'title' => 'Emma', 'price' => 8 },
//   Map { 'id' => 'b3', 'title' => 'Cosmos', 'price' => 15 },
// ]
```

It always returns an array, with one entry for each item. Items are converted by type:

| XPath value                                                  | JavaScript value                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| `xs:string`, `xs:anyURI`, `xs:untypedAtomic`                 | `string`                                                      |
| `xs:boolean`                                                 | `boolean`                                                     |
| `xs:integer`, `xs:decimal`, `xs:double`, `xs:float`          | `number`                                                      |
| `xs:date`, `xs:dateTime`, `xs:time` and the other date types | [`XMLGregorianCalendar`](/guide/xpath/dates)                  |
| `xs:duration` and its two subtypes                           | [`Duration`](/guide/xpath/dates)                              |
| `xs:hexBinary`, `xs:base64Binary`                            | `Uint8Array`                                                  |
| `xs:QName`                                                   | `string`, such as `'fn:abs'`                                  |
| An element, attribute or other node                          | `XdmNode`                                                     |
| A map                                                        | `Map`                                                         |
| An array                                                     | `Array`                                                       |
| A function                                                   | [`XdmFunction`](/guide/xpath/maps-arrays#work-with-functions) |

Two rows need care:

- **Nodes stay nodes.** `evaluateJS` does not convert a node to its string value. `//price` returns three `XdmNode`s,
  while `//price ! number(.)` returns `[12.5, 8, 15]`.
- **Numbers must fit.** An integer too large for a JavaScript `number` throws a `RangeError`;
  see [Large and exact numbers](#large-and-exact-numbers).

[Maps, arrays, JSON and functions](/guide/xpath/maps-arrays#get-maps-and-arrays-back) describes the contents of the
`Map`s and `Array`s.

## Get the items as XPath holds them

`evaluate` performs no conversion. It returns an `XdmValue`, an array of the items themselves. A node is an `XdmNode`,
as with `selectNodes`. An atomic value is an `XdmAtomicValue`, which holds the value together with its XPath type.

```ts twoslash
import { isAtomicValue, isNode } from '@exemplarjs/xdm';

for (const item of compiler.compile('(//book[1]/title, 42, "in stock")').evaluate(doc)) {
  if (isNode(item)) console.log('node', item.localName);
  else if (isAtomicValue(item)) console.log(String(item.type), item.value);
}
// node title
// xs:integer 42n
// xs:string in stock
```

Use it in three cases:

- The XPath type matters. `evaluateJS` returns `1`, `1.0` and `1e0` all as the number `1`; `evaluate` distinguishes an
  `xs:integer` from an `xs:decimal` and an `xs:double`.
- A number is too large or too precise for a JavaScript `number`. An `XdmAtomicValue` holds an integer as a `bigint`.
- The result is passed to another expression unchanged. Any item from `evaluate` is accepted as the value of a
  [variable](/guide/xpath/variables).

`select` takes the same arguments and returns an iterator over the items.

## Large and exact numbers

Inside an expression, integers and decimals are exact. Integers have no upper limit, and decimal arithmetic is
not subject to binary floating-point rounding:

```ts twoslash
compiler.compile('0.1 + 0.2 = 0.3').evaluateBoolean(); // true
compiler.compile('0.1 + 0.2').evaluateJS(); // [0.3]
0.1 + 0.2; // 0.30000000000000004 in JavaScript
```

A JavaScript `number` represents integers exactly only up to `Number.MAX_SAFE_INTEGER`, which is 2^53 − 1. The methods
that return a `number` throw for a larger result, and the others return it exactly:

```ts twoslash
const large = compiler.compile('9007199254740993');

large.evaluateString(); // '9007199254740993': every digit
large.evaluateNumber();
// RangeError: 9007199254740993 is too large for a JavaScript number; use evaluate() for the exact value
large.evaluateJS();
// RangeError: 9007199254740993 is too large for a JavaScript number; use a converter to bigint
```

| Method                              | An integer or decimal whose whole part is past 2^53 − 1 |
| ----------------------------------- | ------------------------------------------------------- |
| `evaluateString`, `evaluateStrings` | Written in full                                         |
| `evaluateNumber`, `evaluateNumbers` | Throws a `RangeError`                                   |
| `evaluateJS`                        | Throws a `RangeError`                                   |
| `evaluate`                          | Exact: an integer is held as a `bigint`                 |

### Get integers as `bigint`

To have `evaluateJS` return large integers, pass the compiler a converter for `xs:integer`. A converter's `toJS`
function converts values of one XPath type to JavaScript values; this one returns every integer as the `bigint` that
holds it:

```ts twoslash
import { XPathCompiler } from '@exemplarjs/xpath';

const exact = new XPathCompiler({
  converters: { 'xs:integer': { toJS: (value) => value.value } },
});

exact.compile('(9007199254740993, 2)').evaluateJS(); // [9007199254740993n, 2n]
```

A converter applies to its type and the types derived from it. One for `xs:integer` covers `xs:long`, `xs:int` and the
other integer types. One for `xs:decimal` covers every integer too, because `xs:integer` is derived from `xs:decimal`;
add one for `xs:integer` as well to treat integers differently.

::: details How `evaluateString` writes numbers
`evaluateString` formats a number by XPath's rules for casting to a string: `35.5`, `1` for the double `1e0`, and
`0.333333333333333333` for `1 div 3`, a decimal kept to eighteen places.
:::

## Binary values

XPath has two binary types, `xs:hexBinary` and `xs:base64Binary`, which differ only in their text form.
`evaluateJS` returns either as a `Uint8Array`, and `evaluateString` returns the text form.

```ts twoslash
const bytes = compiler.compile('xs:hexBinary("CAFE")');

bytes.evaluateJS(); // [Uint8Array [202, 254]]
bytes.evaluateString(); // 'CAFE'
compiler.compile('xs:base64Binary(xs:hexBinary("CAFE"))').evaluateString(); // 'yv4='
```

The `Uint8Array` is a copy, so writing to it does not affect the XPath value.

## What each method does with no items, or several

| Method                               | No items | More than one item                                                      |
| ------------------------------------ | -------- | ----------------------------------------------------------------------- |
| `evaluateString`                     | `''`     | Throws an `XPathException`, code `XPTY0004`                             |
| `evaluateNumber`                     | `NaN`    | Throws an `XPathException`, code `XPTY0004`                             |
| `evaluateBoolean`                    | `false`  | `true` when the first item is a node; otherwise throws, code `FORG0006` |
| `evaluateStrings`, `evaluateNumbers` | `[]`     | One entry for each                                                      |
| `selectNodes`                        | `[]`     | One node for each; throws, code `XPTY0004`, if any item is not a node   |
| `evaluateJS`, `evaluate`             | `[]`     | One entry for each                                                      |

Maps, arrays and functions have no string value, so `evaluateString` and `evaluateStrings` throw an `XPathException`
with the code `FOTY0014` for them. `evaluateNumber` and `evaluateNumbers` throw for maps and functions, with the code
`FOTY0013`, and accept an array only when it holds exactly one number. Use `evaluateJS` for these items.

## Results that wait for documents

Every method except `select` has an asynchronous counterpart whose name ends in `Async`, such as
`evaluateStringsAsync` and `selectNodesAsync`, which returns a promise. They are needed only when an expression reads
documents over the network; see
[Reading documents and collections](/guide/xpath/resources#read-over-the-network).

## Next steps

- [Passing variables](/guide/xpath/variables): the reverse conversion, from JavaScript values to XPath values.
- [The XDM tree](/guide/xpath/tree): the members of the nodes `selectNodes` returns.
- [Maps, arrays, JSON and functions](/guide/xpath/maps-arrays): structured results.
- [Dates, times and durations](/guide/xpath/dates): the date and duration classes `evaluateJS` returns.
