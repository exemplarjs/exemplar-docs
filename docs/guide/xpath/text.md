# Regular expressions and collations

XPath has its own regular expression dialect, used by four functions, and it compares and sorts strings with a
_collation_: a named set of comparison rules, such as case-insensitive matching or the sort order of one language. This
page covers both, and how each relates to JavaScript's `RegExp` and `Intl.Collator`.

```ts twoslash
const fromAToD = compiler.compile(`//book[matches(title, '^[A-D]')]/title`);

fromAToD.evaluateStrings(doc); // ['Dune', 'Cosmos']
```

The examples use the catalog from [Getting started](/guide/xpath/).

## Match, replace and split

Four functions take a regular expression.

| Function                              | What it does                                                       |
| ------------------------------------- | ------------------------------------------------------------------ |
| `matches(text, pattern)`              | Whether the pattern is found anywhere in the text                  |
| `replace(text, pattern, replacement)` | The text with every match replaced                                 |
| `tokenize(text, pattern)`             | The substrings between matches                                     |
| `analyze-string(text, pattern)`       | The text divided into matches and non-matches, with capture groups |

Write expressions that contain patterns with `String.raw`, so that the backslashes are not consumed as JavaScript string
escapes.

```ts twoslash
const byH = compiler.compile(String.raw`//book[matches(author, '^\w+\s+H')]/title`);
byH.evaluateStrings(doc); // ['Dune']

const surnameFirst = compiler.compile(String.raw`replace(//book[1]/author, '^(\w+)\s+(\w+)$', '$2, $1')`);
surnameFirst.evaluateString(doc); // 'Herbert, Frank'

const tags = compiler.compile(String.raw`tokenize('classic, desert,  politics', ',\s*')`);
tags.evaluateStrings(); // ['classic', 'desert', 'politics']
```

`matches` is unanchored, like `RegExp.prototype.test`: use `^` and `$` to match the whole string.

`tokenize` with one argument splits on whitespace and discards the empty tokens at each end:
`tokenize('  Frank   Herbert ')` returns `Frank` and `Herbert`.

All four accept flags as a final argument, such as `matches(title, 'dune', 'i')` for case-insensitive matching.

### Take a match apart

`analyze-string` returns an XML tree instead of strings: a `match` element for each match, a `non-match` element for the
text between matches, and a `group` element inside a match for each capture group. Query it with a path. The elements
are in the namespace that the predeclared prefix `fn` is bound to.

```ts twoslash
const months = compiler.compile(String.raw`
  analyze-string('Shipped 2024-03-01, due 2024-03-28', '(\d{4})-(\d{2})-(\d{2})')
    /fn:match/fn:group[@nr = 3]
`);

months.evaluateStrings(); // ['01', '28']
```

### Pass patterns and text as variables

Pass a pattern from application code as a [variable](/guide/xpath/variables), not by string concatenation, so that
quotes in it need no escaping.

```ts twoslash
const search = compiler.compile('//title[matches(., $pattern, "i")]', {
  variables: { pattern: 'xs:string' },
});

search.evaluateStrings(doc, { variables: { pattern: '^d' } }); // ['Dune']
```

To search for literal user input, in which `.` and `*` have no special meaning, use `contains(., $text)`, or pass
`matches` the `q` flag, which treats the whole pattern as literal text.

::: warning
Do not run patterns from untrusted sources. Patterns are executed by the JavaScript engine's backtracking matcher, so a
pattern with nested quantifiers, such as `(a+)+$`, is open to catastrophic backtracking on crafted input, and an
evaluation cannot be interrupted. Matching untrusted _text_ is safe when the patterns are your own and avoid such
constructs.
:::

## How patterns differ from JavaScript's

The XPath dialect is close to JavaScript's, and most simple patterns mean the same in both. The differences are:

| In JavaScript                                 | In XPath                                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Flags `g`, `i`, `m`, `s`, `u`, `y`            | Flags `i`, `m`, `s`, plus `x` (ignore whitespace in the pattern) and `q` (the pattern is literal text). Any other flag is an error |
| `replace` changes the first match without `g` | `replace` always changes every match                                                                                               |
| `\d` and `\w` match ASCII only                | They match digits and letters in every script: `\w+` matches `Ünïcode`                                                             |
| `\s` includes the no-break space              | `\s` is space, tab, line feed and carriage return only                                                                             |
| `(?=…)`, `(?!…)`, `(?<=…)`                    | No lookahead or lookbehind                                                                                                         |
| `(?<name>…)`                                  | No named groups. `(…)` and `(?:…)` are both there                                                                                  |
| `\b`                                          | No word-boundary escape                                                                                                            |
| `\u00e9`, `\x41`                              | No such escapes. Write the character itself                                                                                        |
| `$&` in a replacement                         | `$0` is the whole match; `$1`, `$2` and so on are the groups                                                                       |
| A lone `$` or `\` in a replacement is literal | It is an error. Write `\$` and `\\`                                                                                                |
| `[a-z&&[^aeiou]]` with the `v` flag           | `[a-z-[aeiou]]`: a class with another subtracted from it                                                                           |
| `\p{Script=Greek}`                            | `\p{IsGreek}` for a Unicode block. Categories such as `\p{Lu}` are the same                                                        |
| A pattern may match nothing, as `x*` does     | `replace`, `tokenize` and `analyze-string` raise an error for such a pattern; `matches` allows it                                  |

Pattern errors are raised when the expression is evaluated, as an `XPathException` that identifies the position in the
pattern:

| Code       | Meaning                                                            |
| ---------- | ------------------------------------------------------------------ |
| `FORX0001` | An unknown flag                                                    |
| `FORX0002` | A pattern that is not valid                                        |
| `FORX0003` | A pattern that matches the empty string, where that is not allowed |
| `FORX0004` | A replacement string that is not valid                             |

## Compare and sort with a collation

By default XPath compares strings by code point. The result is the same on every runtime, but it is not a linguistic
order: `'dune' = 'Dune'` is false, and `Zebra` sorts before `apple`.

A collation replaces those rules. It is identified by a URI, passed as the last argument of a function that compares
strings, such as `compare`, `contains`, `sort` or `distinct-values`. The [XPath functions](/reference/xpath-functions)
reference shows which functions accept one.

Three collations are available.

| Collation              | URI                                                                            | Use it for                                                                     |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Codepoint              | `http://www.w3.org/2005/xpath-functions/collation/codepoint`                   | The default. Exact comparison                                                  |
| ASCII case-insensitive | `http://www.w3.org/2005/xpath-functions/collation/html-ascii-case-insensitive` | Keywords, identifiers and codes, where only `A` to `Z` should match `a` to `z` |
| Unicode                | `http://www.w3.org/2013/collation/UCA`, with options after a `?`               | Natural-language text, such as names and titles, in a given language           |

Any other URI raises an `XPathException` with the code `FOCH0002`.

### Compare without regard to case

Collation URIs are long, so keep them in constants and pass them as variables.

```ts twoslash
const ASCII_CASE_INSENSITIVE = 'http://www.w3.org/2005/xpath-functions/collation/html-ascii-case-insensitive';

const find = compiler.compile('//book[compare(title, $wanted, $collation) = 0]/@id', {
  variables: { wanted: 'xs:string', collation: 'xs:string' },
});

find.evaluateStrings(doc, { variables: { wanted: 'DUNE', collation: ASCII_CASE_INSENSITIVE } }); // ['b1']
```

`compare` returns `0` for equal strings, `-1` when the first sorts earlier and `1` when it sorts later. The operators
`=` and `<` always use the default collation; to compare with another, call `compare` or [change the
default](#change-the-default-collation).

The ASCII collation folds only `A` to `Z`: `É` and `é` remain distinct. For natural-language text, use the Unicode
collation at _primary strength_, which ignores both case and accents, as `Intl.Collator` does with
`sensitivity: 'base'`:

```ts twoslash
const same = compiler.compile(`
  compare('Résumé', 'resume', 'http://www.w3.org/2013/collation/UCA?strength=primary') = 0
`);

same.evaluateBoolean(); // true
```

### Sort for a language

Sort order is language-specific: Swedish places `Ä` and `Ö` after `Z`, and German sorts them with `A` and `O`. The
`lang` option selects the language:

```ts twoslash
const words = `('Zebra', 'Äpple', 'apple', 'Öl')`;

compiler.compile(`sort(${words})`).evaluateStrings();
// ['Zebra', 'apple', 'Äpple', 'Öl']: the default, by code point

compiler.compile(`sort(${words}, 'http://www.w3.org/2013/collation/UCA?lang=sv')`).evaluateStrings();
// ['apple', 'Zebra', 'Äpple', 'Öl']

compiler.compile(`sort(${words}, 'http://www.w3.org/2013/collation/UCA?lang=de')`).evaluateStrings();
// ['apple', 'Äpple', 'Öl', 'Zebra']
```

To sort elements, pass `sort` a key function that returns the string to sort on:

```ts twoslash
const byTitle = compiler.compile(`
  sort(//book, 'http://www.w3.org/2013/collation/UCA?lang=en', function($book) { string($book/title) })
    ! string(title)
`);

byTitle.evaluateStrings(doc); // ['Cosmos', 'Dune', 'Emma']
```

### Change the default collation

The compiler's `defaultCollation` option sets the collation that applies wherever an expression names none. The
operators `=` and `<` then use it too, and `default-collation()` returns it.

```ts twoslash
import { XPathCompiler } from '@exemplarjs/xpath';

const relaxed = new XPathCompiler({
  defaultCollation: 'http://www.w3.org/2013/collation/UCA?strength=primary',
});

relaxed.compile('//book[title = "DUNE"]/@id').evaluateStrings(doc); // ['b1']
relaxed.compile(`sort(('Zebra', 'apple'))`).evaluateStrings(); // ['apple', 'Zebra']
```

### Options of the Unicode collation

Options of the Unicode collation are separated by semicolons: `UCA?lang=de;strength=primary`.

| Option      | Values                                                                      | Effect                                                                                                      |
| ----------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `lang`      | A language tag such as `sv` or `de`                                         | The language whose ordering applies                                                                         |
| `strength`  | `primary`, `secondary`, `tertiary` (the default), `quaternary`, `identical` | The comparison level: base letters only, then accents, then case                                            |
| `numeric`   | `yes`, `no`                                                                 | `yes` sorts `item 9` before `item 10`                                                                       |
| `caseFirst` | `upper`, `lower`                                                            | Which case comes first when that is the only difference                                                     |
| `alternate` | `non-ignorable`, `shifted`                                                  | `shifted` ignores spaces and punctuation                                                                    |
| `fallback`  | `yes` (the default), `no`                                                   | `no` raises `FOCH0002` for anything that cannot be honoured exactly, instead of the closest supported match |

::: info
The Unicode collation is implemented with the runtime's `Intl.Collator`. Its order follows the Unicode data built into
that runtime, so two runtimes with different Unicode versions can order a few rare characters differently. For an order
that must be identical everywhere, use the codepoint collation.
:::

## Next steps

- [Passing variables](/guide/xpath/variables): pass patterns and collation URIs in.
- [XPath functions](/reference/xpath-functions): every function that takes a pattern or a collation.
- [Untrusted input](/guide/production/security): the other limits to set when input is untrusted.
