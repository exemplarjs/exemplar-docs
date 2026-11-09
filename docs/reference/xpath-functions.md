# XPath functions

The XPath functions available, by group, with those that accept a collation and those that are unavailable or limited.
The groups matter only with the [lean entry point](/guide/xpath/bundles), where each group is added separately.

`@exemplarjs/xpath` includes every function on this page. `@exemplarjs/xpath/lean` includes only the core functions; the
other groups are added explicitly. The `math:`, `map:` and `array:` prefixes are predeclared.

## The groups

| Group           | Import                                   | Export                   | Has                                                                                    |
| --------------- | ---------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| Core            | always there                             |                          | [String, numeric, sequence, node and context functions](#core)                         |
| `date-time`     | `@exemplarjs/xpath/groups/date-time`     | `dateTimeFunctions`      | [Date and time components, timezone adjustment, the current date and time](#date-time) |
| `formatting`    | `@exemplarjs/xpath/groups/formatting`    | `formattingFunctions`    | [Formatting numbers and dates](#formatting)                                            |
| `regex`         | `@exemplarjs/xpath/groups/regex`         | `regexFunctions`         | [Regular expressions](#regex)                                                          |
| `higher-order`  | `@exemplarjs/xpath/groups/higher-order`  | `higherOrderFunctions`   | [Functions that take function items](#higher-order)                                    |
| `maps`          | `@exemplarjs/xpath/groups/maps`          | `mapFunctions`           | [The `map:` functions](#maps)                                                          |
| `arrays`        | `@exemplarjs/xpath/groups/arrays`        | `arrayFunctions`         | [The `array:` functions](#arrays)                                                      |
| `json`          | `@exemplarjs/xpath/groups/json`          | `jsonFunctions`          | [Parsing JSON and converting it to and from XML](#json)                                |
| `resources`     | `@exemplarjs/xpath/groups/resources`     | `resourceFunctions`      | [Reading documents, text and collections](#resources)                                  |
| `serialization` | `@exemplarjs/xpath/groups/serialization` | `serializationFunctions` | [`serialize`](#serialization)                                                          |

Map and array constructors, lookups with `?`, inline functions and the arrow operator are part of the language and need
no group.

## Core

| Kind               | Functions                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strings            | `string` `string-length` `normalize-space` `concat` `string-join` `substring` `substring-before` `substring-after` `contains` `starts-with` `ends-with` `contains-token` `upper-case` `lower-case` `translate` `compare` `codepoint-equal` `codepoints-to-string` `string-to-codepoints` `normalize-unicode` `collation-key` |
| URIs               | `encode-for-uri` `iri-to-uri` `escape-html-uri` `resolve-uri`                                                                                                                                                                                                                                                                |
| Numbers            | `number` `abs` `ceiling` `floor` `round` `round-half-to-even`                                                                                                                                                                                                                                                                |
| Mathematics        | `math:pi` `math:exp` `math:exp10` `math:log` `math:log10` `math:sqrt` `math:pow` `math:sin` `math:cos` `math:tan` `math:asin` `math:acos` `math:atan` `math:atan2`                                                                                                                                                           |
| Booleans           | `true` `false` `boolean` `not`                                                                                                                                                                                                                                                                                               |
| Sequences          | `empty` `exists` `count` `head` `tail` `reverse` `unordered` `insert-before` `remove` `subsequence` `distinct-values` `index-of` `deep-equal` `zero-or-one` `one-or-more` `exactly-one`                                                                                                                                      |
| Aggregates         | `sum` `avg` `max` `min`                                                                                                                                                                                                                                                                                                      |
| Nodes              | `name` `local-name` `namespace-uri` `node-name` `root` `path` `has-children` `data` `nilled` `base-uri` `document-uri` `lang` `generate-id` `innermost` `outermost`                                                                                                                                                          |
| IDs                | `id` `element-with-id` `idref`                                                                                                                                                                                                                                                                                               |
| Context            | `position` `last` `static-base-uri` `default-collation` `default-language` `environment-variable` `available-environment-variables`                                                                                                                                                                                          |
| Qualified names    | `QName` `resolve-QName` `prefix-from-QName` `local-name-from-QName` `namespace-uri-from-QName` `namespace-uri-for-prefix` `in-scope-prefixes`                                                                                                                                                                                |
| Errors and tracing | `error` `trace`                                                                                                                                                                                                                                                                                                              |
| XQuery and XSLT    | `load-xquery-module` `transform` (both [always raise an error](#not-available-or-limited))                                                                                                                                                                                                                                   |

Constructor functions such as `xs:integer('5')` and `xs:date('2024-01-01')` are core too, for every built-in atomic
type. See [Getting results](/guide/xpath/results) and [Regular expressions and collations](/guide/xpath/text).

## date-time

| Kind                     | Functions                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Components of a dateTime | `year-from-dateTime` `month-from-dateTime` `day-from-dateTime` `hours-from-dateTime` `minutes-from-dateTime` `seconds-from-dateTime` `timezone-from-dateTime` |
| Components of a date     | `year-from-date` `month-from-date` `day-from-date` `timezone-from-date`                                                                                       |
| Components of a time     | `hours-from-time` `minutes-from-time` `seconds-from-time` `timezone-from-time`                                                                                |
| Components of a duration | `years-from-duration` `months-from-duration` `days-from-duration` `hours-from-duration` `minutes-from-duration` `seconds-from-duration`                       |
| Timezones                | `adjust-dateTime-to-timezone` `adjust-date-to-timezone` `adjust-time-to-timezone` `implicit-timezone`                                                         |
| Current date and time    | `current-dateTime` `current-date` `current-time`                                                                                                              |
| Construction and parsing | `dateTime` `parse-ietf-date`                                                                                                                                  |

See [Dates, times and durations](/guide/xpath/dates).

## formatting

`format-integer` `format-number` `format-dateTime` `format-date` `format-time`

See [Dates, times and durations](/guide/xpath/dates).

## regex

`matches` `replace` `tokenize` `analyze-string`

See [Regular expressions and collations](/guide/xpath/text).

## higher-order

| Kind            | Functions                                                           |
| --------------- | ------------------------------------------------------------------- |
| Over a sequence | `for-each` `filter` `fold-left` `fold-right` `for-each-pair` `sort` |
| Function items  | `function-lookup` `function-name` `function-arity` `apply`          |
| Random numbers  | `random-number-generator`                                           |

See [Maps, arrays, JSON and functions](/guide/xpath/maps-arrays).

## maps

`map:merge` `map:size` `map:keys` `map:contains` `map:get` `map:find` `map:put` `map:entry` `map:remove`
`map:for-each`

See [Maps, arrays, JSON and functions](/guide/xpath/maps-arrays).

## arrays

| Kind         | Functions                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| Access       | `array:size` `array:get` `array:head` `array:tail` `array:subarray` `array:flatten`                     |
| Modification | `array:put` `array:append` `array:remove` `array:insert-before` `array:reverse` `array:join`            |
| Higher-order | `array:for-each` `array:filter` `array:fold-left` `array:fold-right` `array:for-each-pair` `array:sort` |

See [Maps, arrays, JSON and functions](/guide/xpath/maps-arrays).

## json

`parse-json` `json-to-xml` `xml-to-json`

`json-doc` reads a resource, so it is in [resources](#resources). See
[Maps, arrays, JSON and functions](/guide/xpath/maps-arrays).

## resources

| Kind          | Functions                                                       |
| ------------- | --------------------------------------------------------------- |
| XML documents | `doc` `doc-available` `parse-xml` `parse-xml-fragment`          |
| Text          | `unparsed-text` `unparsed-text-lines` `unparsed-text-available` |
| JSON          | `json-doc`                                                      |
| Collections   | `collection` `uri-collection`                                   |

These functions read nothing unless the evaluation is given a resolver. See
[Reading documents and collections](/guide/xpath/resources).

## serialization

`serialize`

See [Serializing results](/guide/xpath/serialize).

## Functions that take a collation

A _collation_ is a named set of rules for comparing and ordering strings, identified by a URI. Each of these functions
takes a collation URI as an optional last argument, and uses the default collation without one. `sort` and `array:sort`
take it as their second argument.

| Kind               | Functions                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Comparing          | `compare` `deep-equal`                                                                     |
| Substring matching | `contains` `starts-with` `ends-with` `substring-before` `substring-after` `contains-token` |
| Value matching     | `distinct-values` `index-of`                                                               |
| Ordering           | `max` `min` `sort` `array:sort`                                                            |
| Keys               | `collation-key`                                                                            |

Operators such as `=` and `lt` always use the default collation, which is the codepoint collation unless the compiler's
`defaultCollation` option names another. See
[Regular expressions and collations](/guide/xpath/text#compare-and-sort-with-a-collation).

## Not available or limited

| Function or feature                                                                                            | What happens instead                                                               |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `environment-variable`, `available-environment-variables`                                                      | Report no variables, so an expression cannot read the process environment          |
| `load-xquery-module`                                                                                           | Raises `FOQM0006`: there is no XQuery processor                                    |
| `transform`                                                                                                    | Raises `FOXT0004`: there is no XSLT processor                                      |
| `json-to-xml` with the `validate` option                                                                       | Raises `FOJS0004`: validation requires schema support                              |
| `parse-json` and `json-to-xml` with the `liberal` option                                                       | The option is accepted, but only strict JSON is parsed                             |
| `format-number` with a named decimal format                                                                    | Raises `FODF1280`: only the default decimal format exists                          |
| `format-date`, `format-dateTime`, `format-time`: a calendar other than `AD` or `ISO`                           | Writes the Gregorian date after a `[Calendar: AD]` marker                          |
| `format-date`, `format-dateTime`, `format-time`: a place                                                       | The place is ignored; timezones are written as offsets, never as names             |
| `format-date`, `format-dateTime`, `format-time`: a language the runtime lacks, or number words outside English | Writes English after a `[Language: en]` marker                                     |
| `format-integer` with words or ordinals                                                                        | Always English                                                                     |
| `collation-key` with a Unicode (UCA) collation                                                                 | Raises `FOCH0004`; the codepoint and HTML case-insensitive collations produce keys |
| A collation other than codepoint, HTML case-insensitive or Unicode (UCA)                                       | Raises `FOCH0002`                                                                  |
| `function-lookup` in the lean entry                                                                            | Finds a function only when its group has been added                                |
| A group inside a repeated group in a regular expression                                                        | Is reset on each repetition: `replace('ab', '((a)\|b)+', '[$2]')` returns `[]`     |
| `schema-element()` and `schema-attribute()` tests                                                              | Raise `XPST0008`: schemas are not supported                                        |

## Language support

| Part of XPath 3.1                                                        | Supported                                                       |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| The whole XPath 3.1 grammar                                              | Yes; anything else raises `XPST0003`                            |
| All axes, including `namespace::`                                        | Yes                                                             |
| Maps, arrays, `?` lookups, inline functions, `=>`, `!`, `\|\|` and `let` | Yes                                                             |
| Function items and higher-order functions                                | Yes                                                             |
| Types from a schema                                                      | No: elements are `xs:untyped` and attributes `xs:untypedAtomic` |
| XPath 1.0 compatibility mode                                             | No                                                              |
