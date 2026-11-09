# Passing variables

An expression references a variable as `$name`, and its value is supplied from JavaScript at evaluation. Use one for
any part of a query that changes between evaluations: a price limit, a search term, a list of ids. The expression is
compiled once, and a value is never parsed as part of the expression.

```ts twoslash
const byGenre = compiler.compile('//book[@genre = $genre]/title', { variables: ['genre'] });

byGenre.evaluateStrings(doc, { variables: { genre: 'fiction' } }); // ['Dune', 'Emma']
byGenre.evaluateStrings(doc, { variables: { genre: 'science' } }); // ['Cosmos']
```

The examples use the catalog from [Getting started](/guide/xpath/). `compiler` is an `XPathCompiler` and `doc` is the
catalog's tree, both created as that page shows.

## Declare variables when you compile

An expression can reference only the variables declared when it is compiled. The `variables` option takes one of two
forms.

An array of names declares untyped variables, which accept any value, as in the example above:
`{ variables: ['genre'] }`.

An object maps each name to a type:

```ts twoslash
const under = compiler.compile('//book[price < $max]/title', {
  variables: { max: 'xs:decimal' },
});

under.evaluateStrings(doc, { variables: { max: 10 } }); // ['Emma']
```

Prefer the second form. A declared type determines how the JavaScript value is converted, and TypeScript
[checks each call](#what-typescript-checks) against it.

An untyped variable takes its XPath type from the JavaScript value passed, and XPath compares a string differently
from a number. Here a price limit passed as a string, as it would be from a form field or a URL query string, selects
nothing and raises no error:

```ts twoslash
const untyped = compiler.compile('//book[price < $max]/title', { variables: ['max'] });

untyped.evaluateStrings(doc, { variables: { max: 10 } }); // ['Emma']
untyped.evaluateStrings(doc, { variables: { max: '10' } }); // []: the prices are compared as text
```

Declared as `xs:decimal`, the variable is always a number. TypeScript then requires a `number`, and at run time a
string that does not parse as a number is an error instead of an empty result.

### The types you can declare

A type is the name of an XPath type, optionally followed by an occurrence indicator: `?` for zero or one value, `*`
for zero or more, `+` for one or more.

| Declaration                                   | Means                 | JavaScript value to pass                                                  |
| --------------------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| `'xs:string'`                                 | Exactly one string    | `string`                                                                  |
| `'xs:decimal'`, `'xs:integer'`, `'xs:double'` | Exactly one number    | `number` or `bigint`                                                      |
| `'xs:boolean'`                                | Exactly one boolean   | `boolean`                                                                 |
| `'xs:date'`, `'xs:dateTime'`                  | Exactly one date      | `Date`, a string such as `'2024-01-31'`, or an `XMLGregorianCalendar`     |
| `'xs:string?'`                                | One string, or none   | `string`, `null` or `undefined`                                           |
| `'xs:string*'`                                | Any number of strings | An array of strings, one string, or `null`                                |
| `'xs:string+'`                                | One or more strings   | An array of strings, or one string                                        |
| `'element()'`                                 | One element           | `XdmNode`                                                                 |
| `'node()*'`                                   | Any number of nodes   | An array of `XdmNode`s                                                    |
| `'map(*)'`                                    | A map                 | A `Map` or a plain object                                                 |
| `'item()*'`                                   | Any sequence          | Anything in the table [below](#how-javascript-values-become-xpath-values) |

Type names can use any prefix bound in the compiler. The `xs:` prefix is bound by default.

## Pass values when you evaluate

Values are passed in the `variables` property of the options object that every evaluation method takes after the
[context](/guide/xpath/#choose-where-the-expression-starts). Pass `null` as the context when the expression reads no
document.

```ts twoslash
const total = compiler.compile('sum($prices) * (1 + $rate)', {
  variables: { prices: 'xs:decimal*', rate: 'xs:decimal' },
});

total.evaluateNumber(null, { variables: { prices: [12.5, 8], rate: 0.2 } }); // 24.6
```

### Pass a list of values

Declare the type with `*` and pass a JavaScript array. In XPath, `=` between sequences is true when any pair of items
from the two sides is equal, so `@id = $ids` tests membership, like SQL's `IN`:

```ts twoslash
const byIds = compiler.compile('//book[@id = $ids]/title', {
  variables: { ids: 'xs:string*' },
});

byIds.evaluateStrings(doc, { variables: { ids: ['b1', 'b3'] } }); // ['Dune', 'Cosmos']
```

The array is converted to a sequence, not to an XPath array; see
[Lists are sequences, not arrays](#lists-are-sequences-not-arrays).

### What TypeScript checks

The executable's type carries the declarations. A value of the wrong type, a missing variable and an undeclared
variable are all type errors:

```ts twoslash
// @errors: 2322 2345 2353 2554
const under = compiler.compile('//book[price < $max]/title', {
  variables: { max: 'xs:decimal' },
});
// ---cut---
under.evaluateStrings(doc, { variables: { max: 'cheap' } });
under.evaluateStrings(doc);
under.evaluateStrings(doc, { variables: { max: 10, min: 5 } });
```

With an array of names, TypeScript checks the names but accepts any value.

### What is checked when the expression runs

The same rules are enforced at run time, for callers that are not type-checked.

| Error                                                   | Thrown                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| A string that does not parse as the declared type       | `XPathException`, code `FORG0001`: `"ten" is not a valid xs:decimal`   |
| A value of another type, such as a number for a string  | `XPathException`, code `XPTY0004`                                      |
| Too many or too few values, or none where one is needed | `XPathException`, code `XPTY0004`                                      |
| A variable that was not declared                        | `InvalidArgumentError`: `The variable $min is not declared`            |
| A value XPath has no type for                           | `InvalidArgumentError`: `… has no XPath value; add a converter for it` |

An untyped variable that is given no value is the empty sequence, not an error.

## How JavaScript values become XPath values

For an untyped variable, or one declared `item()*`, each JavaScript value is converted as this table shows.

| JavaScript value                   | XPath value                                                             |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `string`                           | `xs:string`                                                             |
| `number`                           | `xs:double`, even for a whole number                                    |
| `bigint`                           | `xs:integer`                                                            |
| `boolean`                          | `xs:boolean`                                                            |
| `Date`                             | `xs:dateTime` in UTC                                                    |
| `Uint8Array`                       | `xs:base64Binary`, holding a copy of the bytes                          |
| `null`, `undefined`                | The empty sequence                                                      |
| An array                           | A sequence of its entries. See [below](#lists-are-sequences-not-arrays) |
| A `Map` or a plain object          | A map                                                                   |
| An `XdmNode`                       | That node                                                               |
| `XMLGregorianCalendar`, `Duration` | The [date, time or duration](/guide/xpath/dates) it holds               |
| Any item from `evaluate`           | Itself, unchanged                                                       |

Any other value, such as a function, a `Set` or an instance of an application class, throws an
`InvalidArgumentError`.

A node passed as a variable can belong to any tree, so one expression can join two documents:

```ts twoslash
declare const orders: import('@exemplarjs/xdm').XdmNode;
// ---cut---
const ordered = compiler.compile('//book[@id = $orders//line/@book]/title', {
  variables: { orders: 'document-node()' },
});

ordered.evaluateStrings(doc, { variables: { orders } });
```

## Declared types change the conversion

A declared type is not only a check: it selects the XPath type a JavaScript value is converted to.

### Numbers

A `number` is converted to the declared numeric type. This matters for money: a `number` passed to an `xs:decimal`
variable becomes an exact decimal, while one passed to an untyped variable remains a floating-point `xs:double`.

```ts twoslash
const typed = compiler.compile('$n + 0.2', { variables: { n: 'xs:decimal' } });
typed.evaluateString(null, { variables: { n: 0.1 } }); // '0.3'

const untyped = compiler.compile('$n + 0.2', { variables: ['n'] });
untyped.evaluateString(null, { variables: { n: 0.1 } }); // '0.30000000000000004'
```

It also matters wherever XPath requires an integer. A `3` passed to an untyped variable is an `xs:double`, which is
not accepted there:

```ts twoslash
compiler.compile('1 to $n', { variables: ['n'] }).evaluateNumbers(null, { variables: { n: 3 } });
// XPathException: XPTY0004: A range's ends must be integers, not xs:double

compiler.compile('1 to $n', { variables: { n: 'xs:integer' } }).evaluateNumbers(null, { variables: { n: 3 } }); // [1, 2, 3]
```

An `xs:integer` variable accepts only whole numbers. Passing `3.5` raises an `XPathException` with the code
`XPTY0004`.

### Strings

A string is parsed as the declared type, so `'2024-01-31'` becomes a date for an `xs:date` variable.

At run time the same holds for the numeric types and `xs:boolean`: `'10'` becomes a number for an `xs:decimal`
variable. TypeScript does not accept a string for those types, so type-checked code must convert it first.

### Bytes

A `Uint8Array` becomes an `xs:base64Binary` unless the variable is declared `xs:hexBinary`. The two types hold the same
bytes and differ only in their text form:

```ts twoslash
const cover = new Uint8Array([0xca, 0xfe]);

compiler.compile('string($b)', { variables: ['b'] }).evaluateString(null, { variables: { b: cover } }); // 'yv4='
compiler.compile('string($b)', { variables: { b: 'xs:hexBinary' } }).evaluateString(null, { variables: { b: cover } }); // 'CAFE'
```

### Plain objects

A map converted from a plain object has `xs:string` keys, because JavaScript object keys are strings. Declare the
map's key and value types to have them converted:

```ts twoslash
const stock = { 1: 5, 2: 7 };

const untyped = compiler.compile('$stock(2)', { variables: ['stock'] });
untyped.evaluateJS(null, { variables: { stock } }); // []: the keys are the strings "1" and "2"

const typed = compiler.compile('$stock(2)', {
  variables: { stock: 'map(xs:integer, xs:integer)' },
});
typed.evaluateJS(null, { variables: { stock } }); // [7]
```

The keys of a JavaScript `Map` are converted by their own types, so `new Map([[2, 7]])` works without a declared type.

## Lists are sequences, not arrays

XPath has two list types, and a JavaScript array converts to only one of them.

Sequences are what expressions return and functions take: what `//title` selects, and what `count()` and `sum()`
accept. They are flat and cannot nest. An XPath array is a single item that holds a list of values, like a JSON array,
and can nest. Arrays appear mostly when working with JSON.

::: warning
A JavaScript array passed as a variable becomes a **sequence**. To pass an XPath **array**, wrap it in another array:
the outer array is the sequence, and an array nested inside it is an XPath array.
:::

```ts twoslash
const count = compiler.compile('count($x)', { variables: ['x'] });

count.evaluateNumber(null, { variables: { x: [1, 2, 3] } }); // 3: a sequence of three numbers
count.evaluateNumber(null, { variables: { x: [[1, 2, 3]] } }); // 1: a sequence of one array

const size = compiler.compile('array:size($x)', { variables: ['x'] });
size.evaluateNumber(null, { variables: { x: [[1, 2, 3]] } }); // 3
```

The same rule applies to the values inside a map: `{ tags: ['a', 'b'] }` produces a `tags` entry that is a sequence of
two strings, and `{ tags: [['a', 'b']] }` produces one that is an array. To be explicit without the nested brackets,
construct the array with `XdmArray.of([...])` from `@exemplarjs/xdm`, which takes XPath values such as
`XdmAtomicValue.string('a')`.

In a sequence, `null` contributes no item, so `[1, null, 2]` is a sequence of two.

When the data is already JSON, the alternative is to pass the JSON text and call `parse-json` in the expression, which
maps JSON arrays to XPath arrays; see [Maps, arrays, JSON and functions](/guide/xpath/maps-arrays#read-json).

## Customize the conversion

Converters replace the default conversion between JavaScript values and values of one XPath type. They are passed to
the compiler, keyed by type name, and each has up to two functions:

- `fromJS(value, type)` converts a JavaScript value to an XPath value for a variable declared with that type. Return
  `undefined` to fall back to the default conversion.
- `toJS(value)` converts an XPath value of that type to a JavaScript value in the results of `evaluateJS`.

By default a `Date` is treated as an instant, so passing one to an `xs:date` variable produces the UTC date, with a `Z`
timezone. This converter instead converts a `Date` to the calendar day in the local timezone:

```ts twoslash
import { XdmAtomicValue, XMLGregorianCalendar, XS } from '@exemplarjs/xdm';
import { XPathCompiler } from '@exemplarjs/xpath';

const pad = (n: number) => String(n).padStart(2, '0');

const localDates = new XPathCompiler({
  converters: {
    'xs:date': {
      fromJS(value) {
        if (!(value instanceof Date)) return undefined;
        const text = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
        return XdmAtomicValue.calendar(XMLGregorianCalendar.parse(text, XS.date));
      },
    },
  },
});

const day = localDates.compile('string($d)', { variables: { d: 'xs:date' } });
day.evaluateString(null, { variables: { d: new Date(2024, 1, 1) } }); // '2024-02-01'
```

A converter for a type also applies to the types derived from it, so one for `xs:decimal` is called for integers
too. Add one for `xs:integer` to treat integers differently.

### Pass values of your own class

A converter can also accept instances of an application class. For a typed variable, the converter for the declared
type is called. For an untyped variable, each converter's `fromJS` is called in turn, and the first value returned is
used. Pass the class as the compiler's type argument, and TypeScript accepts it wherever an atomic type is declared:

```ts twoslash
import { Decimal, XdmAtomicValue } from '@exemplarjs/xdm';
import { XPathCompiler } from '@exemplarjs/xpath';

class Money {
  readonly amount: string;
  constructor(amount: string) {
    this.amount = amount;
  }
}

const shop = new XPathCompiler<Money>({
  converters: {
    'xs:decimal': {
      fromJS: (value) => (value instanceof Money ? XdmAtomicValue.decimal(Decimal.from(value.amount)) : undefined),
    },
  },
});

const double = shop.compile('$price * 2', { variables: { price: 'xs:decimal' } });
double.evaluateString(null, { variables: { price: new Money('9.99') } }); // '19.98'
```

`Decimal.from` parses a decimal from a string and throws an `InvalidArgumentError` for invalid input.
`Decimal.parse` returns `undefined` instead.

[Large and exact numbers](/guide/xpath/results#get-integers-as-bigint) shows a `toJS` converter that returns integers as `bigint`s.

## Next steps

- [The XDM tree](/guide/xpath/tree): build trees from streams and readers, and read nodes directly.
- [Maps, arrays, JSON and functions](/guide/xpath/maps-arrays): passing structured data and functions.
- [Dates, times and durations](/guide/xpath/dates): passing and reading dates.
