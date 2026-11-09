# Maps, arrays, JSON and functions

XPath 3.1 has maps and arrays as values, alongside nodes and atomic values. An expression can parse JSON into them, join
it with XML and return a structured result to JavaScript.

```ts twoslash
const overview = compiler.compile(`
  map { "count": count(//book), "titles": array { //title ! string() } }
`);

overview.evaluateJS(doc);
// [Map { 'count' => 3, 'titles' => ['Dune', 'Emma', 'Cosmos'] }]
```

The result is one map, which `evaluateJS` returns as a JavaScript `Map`, with the nested array as an `Array`. The XML
examples use the catalog from [Getting started](/guide/xpath/).

## Write maps and arrays

The syntax is close to JSON: a map is written `map { key: value }` and an array `[a, b]`.

| JSON               | XPath                    |
| ------------------ | ------------------------ |
| `{"id": "b1"}`     | `map { "id": "b1" }`     |
| `["Dune", "Emma"]` | `["Dune", "Emma"]`       |
| `true`, `false`    | `true()`, `false()`      |
| `null`             | `()`, the empty sequence |
| `12.5`             | `12.5`                   |

Unlike JSON, keys are not limited to strings: any atomic value, such as a number or a date, can be a key. Numerically
equal keys are the same key, so `1` and `1.0` cannot both be in one map.

An array is a single item, and arrays nest. A sequence is flat and is not itself an item: `//title` is a sequence of
three items, and `[1, 2, 3]` is a sequence of one.

The two array constructors differ in how they treat an expression that returns several items:

```ts twoslash
compiler.compile('array:size([//title])').evaluateNumber(doc); // 1: one member, holding three titles
compiler.compile('array:size(array { //title })').evaluateNumber(doc); // 3: a member for each title
```

Square brackets create one member per comma-separated expression; `array { … }` creates one member per item. Use
`array { … }` to convert a sequence to an array.

## Look inside with `?`

The lookup operator `?` reads a map entry by key and an array member by position. Positions start at 1.

```ts twoslash
compiler.compile('map { "title": "Dune", "price": 12.5 }?title').evaluateString(); // 'Dune'
compiler.compile('["Dune", "Emma", "Cosmos"]?2').evaluateString(); // 'Emma'
```

| Lookup                       | Returns                                      |
| ---------------------------- | -------------------------------------------- |
| `$map?title`                 | The value for the key `"title"`              |
| `$map?("first name")`        | The value for a key that is not a plain name |
| `$array?2`                   | The second member                            |
| `$map?*`, `$array?*`         | Every value, or every member                 |
| `$map("title")`, `$array(2)` | The same as `?`, written as a function call  |

Lookups chain, and each applies to every item that the previous one returned. A key that is absent from a map returns
the empty sequence, not an error. A position outside an array raises an `XPathException` with the code `FOAY0001`.

## Read JSON

`parse-json` converts JSON text to maps and arrays, which `?` then navigates as property access and indexing do in
JavaScript.

```json
{
  "shop": "Corner Books",
  "orders": [
    {
      "id": "o1",
      "items": [
        { "title": "Dune", "price": 12.5, "quantity": 2 },
        { "title": "Emma", "price": 8, "quantity": 1 }
      ]
    },
    { "id": "o2", "items": [] }
  ]
}
```

```ts twoslash
declare const json: string;
// ---cut---
const variables = { json: 'xs:string' } as const;

const shop = compiler.compile('parse-json($json)?shop', { variables });
shop.evaluateString(null, { variables: { json } }); // 'Corner Books'

const ids = compiler.compile('parse-json($json)?orders?*?id', { variables });
ids.evaluateStrings(null, { variables: { json } }); // ['o1', 'o2']

const total = compiler.compile('sum(parse-json($json)?orders?*?items?* ! (?price * ?quantity))', { variables });
total.evaluateNumber(null, { variables: { json } }); // 33
```

In the last expression, `?orders?*?items?*` is every item of every order, and `!` evaluates `?price * ?quantity` once
for each. A `?` with no left operand applies to the current item.

JSON values map to XPath values as follows:

| JSON            | XPath                    |
| --------------- | ------------------------ |
| An object       | A map with string keys   |
| An array        | An array                 |
| A string        | `xs:string`              |
| A number        | `xs:double`              |
| `true`, `false` | `xs:boolean`             |
| `null`          | `()`, the empty sequence |

`parse-json` raises an `XPathException` with the code `FOJS0001` for text that is not valid JSON. Nesting is limited to
1,000 levels, beyond which it raises the same error, so hostile input cannot exhaust the stack. When an object repeats a
key, the first value is kept, where `JSON.parse` keeps the last.

To read JSON from a file or a URL instead of a string, use `json-doc("stock.json")`. Like every function that loads an
external resource, it needs a resolver; see [Reading documents and collections](/guide/xpath/resources).

### Join JSON with XML

A map is also a function from key to value, so it can be called inside a path. This expression selects the books that
are in stock, with the stock levels supplied as JSON:

```ts twoslash
const inStock = compiler.compile('//book[parse-json($stock)(@id) > 0]/title', {
  variables: { stock: 'xs:string' },
});

inStock.evaluateStrings(doc, { variables: { stock: '{"b1": 4, "b2": 0, "b3": 1}' } }); // ['Dune', 'Cosmos']
```

## Get maps and arrays back

[`evaluateJS`](/guide/xpath/results#get-plain-javascript-values) returns a map as a JavaScript `Map` and an array as an
`Array`, and converts their contents recursively.

```ts twoslash
const book = compiler.compile(`
  map { "title": "Dune", "tags": ("classic", "desert"), "sizes": [1, 2], "isbn": () }
`);

book.evaluateJS();
// [Map { 'title' => 'Dune', 'tags' => ['classic', 'desert'], 'sizes' => [1, 2], 'isbn' => null }]
```

Inside a map or an array, a value is converted according to the number of items it holds:

| Items in the value | JavaScript value |
| ------------------ | ---------------- |
| No items           | `null`           |
| One item           | That item        |
| Several items      | An array         |

So `tags`, a sequence of two strings, and `sizes`, an array of two numbers, both become JavaScript arrays.

The outer array is the result sequence, with one entry per item, so an expression that returns one map produces an array
holding one `Map`.

To get JSON text instead of JavaScript objects, serialize in the expression:

```ts twoslash
const asJson = compiler.compile(`
  serialize(
    array { //book ! map { "id": string(@id), "price": number(price) } },
    map { "method": "json" }
  )
`);

asJson.evaluateString(doc);
// '[{"id":"b1","price":12.5},{"id":"b2","price":8},{"id":"b3","price":15}]'
```

[Serializing results](/guide/xpath/serialize#json) describes the `json` method.

## Pass maps and arrays in

A plain object or a `Map` passed as the value of a [variable](/guide/xpath/variables) becomes an XPath map.

```ts twoslash
const order = { id: 'o3', items: [{ title: 'Cosmos', price: 15, quantity: 1 }] };

const titles = compiler.compile('$order?items?title', { variables: ['order'] });
titles.evaluateStrings(null, { variables: { order } }); // ['Cosmos']
```

::: warning
A JavaScript array becomes an XPath _sequence_, not an XPath _array_. In the example, `$order?items` is a sequence of
maps, which is why `?title` applies to it directly and `?items?1` would not. To pass an XPath array, nest the list in
another: `{ items: [[…]] }`. [Lists are sequences, not arrays](/guide/xpath/variables#lists-are-sequences-not-arrays)
has the rule.
:::

For the same reason, `evaluateJS` results do not round-trip: an array passed back in as a variable arrives as a
sequence. To pass a value from one expression to another unchanged, take it from `evaluate`, which returns the XPath
value itself.

When the data is already JSON text, pass the text and call `parse-json`: JSON arrays then become XPath arrays, with no
nesting needed.

## Convert between JSON and XML

`json-to-xml` converts JSON text to an XML representation that ordinary paths can query, and `xml-to-json` converts that
representation back to JSON text.

```ts twoslash
const toXml = compiler.compile('serialize(json-to-xml($json), map { "indent": true() })', {
  variables: { json: 'xs:string' },
});

toXml.evaluateString(null, {
  variables: { json: '{"title": "Dune", "price": 12.5, "tags": ["classic"], "stock": null}' },
});
```

```xml
<map xmlns="http://www.w3.org/2005/xpath-functions">
  <string key="title">Dune</string>
  <number key="price">12.5</number>
  <array key="tags">
    <string>classic</string>
  </array>
  <null key="stock"/>
</map>
```

The elements are in the namespace that the predeclared prefix `fn` is bound to, so paths over them use `fn:`:

```ts twoslash
const price = compiler.compile('json-to-xml($json)//fn:number[@key = "price"]', {
  variables: { json: 'xs:string' },
});

price.evaluateNumber(null, { variables: { json: '{"title": "Dune", "price": 12.5}' } }); // 12.5
```

`xml-to-json` accepts only XML in this form; anything else raises an `XPathException` with the code `FOJS0006`. To
produce JSON from other XML, build maps and arrays and [serialize them](#get-maps-and-arrays-back).

## Work with functions

In XPath 3.1 functions are first-class values: an expression can define one inline, refer to a built-in one by name and
arity, and pass either to another function.

```ts twoslash
const labels = compiler.compile(`
  for-each(//book, function($book) { $book/title || " (" || $book/author || ")" })
`);

labels.evaluateStrings(doc);
// ['Dune (Frank Herbert)', 'Emma (Jane Austen)', 'Cosmos (Carl Sagan)']
```

| Syntax                    | Meaning                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `function($x) { $x * 2 }` | An inline function                                          |
| `upper-case#1`            | A reference to the built-in `upper-case` with one parameter |
| `$f(10)`                  | A call of the function in `$f`                              |
| `$vat(?, 0.2)`            | A partial application, with the second argument bound       |

The higher-order functions `for-each`, `filter`, `fold-left` and `sort` correspond to the JavaScript array methods
`map`, `filter`, `reduce` and `sort`, except that `sort` takes a key function, not a comparator.

```ts twoslash
const dearest = compiler.compile('filter(//book, function($book) { $book/price > 10 }) ! string(title)');
dearest.evaluateStrings(doc); // ['Dune', 'Cosmos']

const byPrice = compiler.compile('sort(//book, (), function($book) { number($book/price) }) ! string(title)');
byPrice.evaluateStrings(doc); // ['Emma', 'Dune', 'Cosmos']

const withTax = compiler.compile(`
  let $vat := function($price, $rate) { $price * (1 + $rate) },
      $uk := $vat(?, 0.2)
  return //price ! $uk(.)
`);
withTax.evaluateNumbers(doc); // [15, 9.6, 18]
```

For simple cases the `!` operator is shorter than `for-each`: `//book ! string(title)` evaluates `string(title)` for
each book.

::: details Get a function back and pass it in
A function returned by an expression arrives in JavaScript as an `XdmFunction` from `@exemplarjs/xdm`. It has a `name`,
which is `undefined` for an inline function, and an `arity`.

An `XdmFunction` cannot be called from JavaScript, but it can be passed to another expression as a variable and called
there.

```ts twoslash
import type { XdmFunction } from '@exemplarjs/xdm';

const [double] = compiler.compile('function($n) { $n * 2 }').evaluate() as [XdmFunction];
double.arity; // 1

const call = compiler.compile('$f(10)', {
  variables: { f: 'function(xs:integer) as xs:integer' },
});
call.evaluateNumber(null, { variables: { f: double } }); // 20
```

The declared type `function(xs:integer) as xs:integer` specifies the parameter and return types; `function(*)` accepts
any function.

Only functions created by an expression can be passed in. A JavaScript function has no XPath equivalent, and passing one
throws an `InvalidArgumentError`.
:::

## Next steps

- [Passing variables](/guide/xpath/variables): how JavaScript values are converted on the way in.
- [Reading documents and collections](/guide/xpath/resources): `json-doc` and resolvers.
- [Serializing results](/guide/xpath/serialize): JSON and XML output.
- [XPath functions](/reference/xpath-functions): the `map:` and `array:` functions.
