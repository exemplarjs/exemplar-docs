# Smaller bundles

`@exemplarjs/xpath` includes the whole XPath 3.1 function library. Functions are looked up by name when an expression is
compiled, so a bundler cannot tell which ones are unused, and tree-shaking removes none of them. The _lean entry_,
`@exemplarjs/xpath/lean`, exports the same compiler with only the core functions; the rest of the library is added in
groups that are imported explicitly.

```ts twoslash
import { regexFunctions } from '@exemplarjs/xpath/groups/regex';
import { XPathCompiler } from '@exemplarjs/xpath/lean';

const compiler = new XPathCompiler({ functions: [regexFunctions] });

const words = compiler.compile('tokenize($text, ",")', { variables: ['text'] });
words.evaluateStrings(null, { variables: { text: 'classic,desert' } }); // ['classic', 'desert']
```

## Import the lean compiler

Change the import from `@exemplarjs/xpath` to `@exemplarjs/xpath/lean`. Its `XPathCompiler` takes the same options,
compiles the same language and returns the same executables.

```ts twoslash
import { XPathCompiler } from '@exemplarjs/xpath/lean';

const compiler = new XPathCompiler();

compiler.compile('//book[price > 10]/title ! upper-case(.)').evaluateStrings(doc); // ['DUNE', 'COSMOS']
compiler.compile('sum(//price)').evaluateNumber(doc); // 35.5
```

With no groups added, it supports the whole language and the core functions:

- paths, predicates, operators, `for`, `let`, `if`, `some` and `every`;
- maps, arrays, the `?` lookup, inline functions and function calls;
- casts and constructors such as `xs:date("2024-01-31")`, and arithmetic on the values they make;
- the functions on strings, numbers, booleans, sequences, nodes, names and URIs, the `math:` functions, and aggregates
  such as `count`, `sum` and `max`;
- the collations.

The rest of the library is divided into nine function groups.

## Add function groups

Each group is a separate module, so a bundle contains only the groups that are imported. Import the groups that your
expressions use and pass them in the compiler's `functions` option.

```ts twoslash
import { dateTimeFunctions } from '@exemplarjs/xpath/groups/date-time';
import { jsonFunctions } from '@exemplarjs/xpath/groups/json';
import { XPathCompiler } from '@exemplarjs/xpath/lean';

const compiler = new XPathCompiler({ functions: [dateTimeFunctions, jsonFunctions] });
```

| Group           | Import                                                                 | Functions                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `date-time`     | `dateTimeFunctions` from `@exemplarjs/xpath/groups/date-time`          | `current-date`, `current-dateTime`, `year-from-date` and the other component accessors for dates, times and durations, the timezone adjustments, `dateTime`, `implicit-timezone`, `parse-ietf-date` |
| `formatting`    | `formattingFunctions` from `@exemplarjs/xpath/groups/formatting`       | `format-number`, `format-integer`, `format-date`, `format-dateTime`, `format-time`                                                                                                                  |
| `regex`         | `regexFunctions` from `@exemplarjs/xpath/groups/regex`                 | `matches`, `replace`, `tokenize`, `analyze-string`                                                                                                                                                  |
| `higher-order`  | `higherOrderFunctions` from `@exemplarjs/xpath/groups/higher-order`    | `for-each`, `filter`, `fold-left`, `fold-right`, `for-each-pair`, `sort`, `apply`, `function-lookup`, `function-name`, `function-arity`, `random-number-generator`                                  |
| `maps`          | `mapFunctions` from `@exemplarjs/xpath/groups/maps`                    | The `map:` functions, such as `map:merge` and `map:keys`                                                                                                                                            |
| `arrays`        | `arrayFunctions` from `@exemplarjs/xpath/groups/arrays`                | The `array:` functions, such as `array:size` and `array:join`                                                                                                                                       |
| `json`          | `jsonFunctions` from `@exemplarjs/xpath/groups/json`                   | `parse-json`, `json-to-xml`, `xml-to-json`                                                                                                                                                          |
| `resources`     | `resourceFunctions` from `@exemplarjs/xpath/groups/resources`          | `doc`, `doc-available`, `collection`, `uri-collection`, the `unparsed-text` functions, `json-doc`, `parse-xml`, `parse-xml-fragment`                                                                |
| `serialization` | `serializationFunctions` from `@exemplarjs/xpath/groups/serialization` | `serialize`                                                                                                                                                                                         |

The [XPath functions](/reference/xpath-functions) reference lists every function.

Three cases are easy to miss:

- Map and array constructors and the `?` lookup need no group; only the `map:` and `array:` functions do.
- Date values and date arithmetic are part of the language, so `xs:date("2024-01-31") + xs:dayTimeDuration("P1D")`
  works without the `date-time` group.
- `sort` is in the `higher-order` group, even when it is called with no function.

## When a group is missing

A call to a function in a group that the compiler lacks fails at compile time, not at evaluation. The error is an
`XPathException` with the code `XPST0017`, and its description names the group and the import to add:

```ts twoslash
import { XPathCompiler } from '@exemplarjs/xpath/lean';
// ---cut---
const compiler = new XPathCompiler();

compiler.compile('format-number($n, "#,##0")', { variables: ['n'] });
// XPathException: XPST0017: There is no function format-number#2: it is in the formatting group;
// add formattingFunctions from @exemplarjs/xpath/groups/formatting to the compiler's functions,
// or compile with compileAsync at line 1, column 1
```

Because the check happens at compile time, a test that compiles each expression once finds every missing group.

## Load groups on demand

When expressions are not known at build time, or some are rarely used, `compileAsync` loads groups on demand: it finds
the function calls in the expression, imports the groups that the compiler lacks, and then compiles.

```ts twoslash
import { XPathCompiler } from '@exemplarjs/xpath/lean';
// ---cut---
const compiler = new XPathCompiler();

const formatted = await compiler.compileAsync('format-number($n, "#,##0")', { variables: ['n'] });
formatted.evaluateString(null, { variables: { n: 1234567 } }); // '1,234,567'
```

Each group is loaded with a dynamic `import()`, which bundlers emit as a separate chunk fetched on first use. A loaded
group stays registered with the compiler, so later calls to `compile` can use it too.

Only compilation is asynchronous: the returned executable is the same as one from `compile`, with the same synchronous
evaluation methods. `compileAsync` exists on the lean compiler only, because the full compiler already has every group. The two methods share
[the compiler's cache](/guide/xpath/#the-compiler-keeps-its-executables) of executables.

::: warning
`compileAsync` detects function calls statically. A function that is looked up by a name computed at run time, with
`function-lookup`, is found only if its group is already loaded. Add such groups in the `functions` option.
:::

## Keep the full compiler out

The saving depends on tree-shaking. Every exemplar package declares `"sideEffects": false` in its `package.json`, so
bundlers drop unused modules without further configuration.

Import `XPathCompiler` from `@exemplarjs/xpath/lean` everywhere: a single
`import { XPathCompiler } from '@exemplarjs/xpath'` anywhere in the bundle pulls in every group.

The lean entry also exports everything else that the full entry does, such as `XPathException`, `XPathErrorCode`,
`collectionMap` and the types, so nothing needs to be imported from the full entry:

```ts twoslash
import { XPathCompiler, XPathException } from '@exemplarjs/xpath/lean';
```

## Next steps

- [XPath functions](/reference/xpath-functions): every function, for deciding which groups to add.
- [Packages and runtimes](/reference/packages): the entry points of every package.
- [Getting started with XPath](/guide/xpath/): the compiler's other options.
