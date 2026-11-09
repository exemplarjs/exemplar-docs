# Standards and conformance

The standards exemplar implements, the parts it omits, how conformance is tested, and where its behaviour differs from
the standards or from the JDK.

## Standards implemented

| Standard                                                      | Edition or version                    | Where it applies                                    | Guide                                                        |
| ------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| XML                                                           | 1.0 fifth edition, 1.1 second edition | Every reader                                        | [Getting started](/guide/getting-started)                    |
| Namespaces in XML                                             | 1.0 third edition, 1.1 second edition | Every reader and writer                             | [Namespaces](/guide/namespaces)                              |
| XML Base                                                      | Second edition                        | Base URIs in readers, trees, resolvers and XInclude | [Resolvers and access](/guide/external/resolvers)            |
| `xml:id`                                                      | 1.0                                   | Every reader                                        | [DTDs and entities](/guide/external/dtd#find-elements-by-id) |
| DTD validation                                                | As XML 1.0 and 1.1 define it          | `@exemplarjs/validation`                            | [Validating against a DTD](/guide/external/validation)       |
| XInclude                                                      | 1.0 second edition                    | `@exemplarjs/xinclude`                              | [XInclude](/guide/external/xinclude)                         |
| XPointer framework, `element()` scheme and shorthand pointers | 1.0                                   | The `xpointer` attribute in XInclude                | [XInclude](/guide/external/xinclude)                         |
| OASIS XML Catalogs                                            | 1.1                                   | `@exemplarjs/catalog`                               | [Catalogs](/guide/external/catalogs)                         |
| DOM Core                                                      | Level 3                               | `@exemplarjs/dom`                                   | [Building and reading a DOM](/guide/dom/)                    |
| Canonical XML                                                 | 1.0 and 1.1                           | `@exemplarjs/canonical`                             | [Canonical XML](/guide/writing/canonical)                    |
| Exclusive XML Canonicalization                                | 1.0                                   | `@exemplarjs/canonical`                             | [Canonical XML](/guide/writing/canonical)                    |
| XQuery and XPath Data Model                                   | 3.1                                   | `@exemplarjs/xdm`                                   | [The XDM tree](/guide/xpath/tree)                            |
| XPath                                                         | 3.1                                   | `@exemplarjs/xpath`                                 | [Getting started with XPath](/guide/xpath/)                  |
| XPath and XQuery Functions and Operators                      | 3.1                                   | The [XPath functions](/reference/xpath-functions)   | [Getting started with XPath](/guide/xpath/)                  |
| XSLT and XQuery Serialization                                 | 3.1                                   | `serialize` in XPath                                | [Serializing results](/guide/xpath/serialize)                |

[Coming from Java](/reference/java) maps the names of Java's XML APIs to exemplar's.

## Not implemented

- XML Schema, RELAX NG and Schematron validation. In an XDM tree every element is `xs:untyped` and every attribute
  `xs:untypedAtomic`.
- XSLT and XQuery. The XPath functions `transform` and `load-xquery-module` raise an error.
- XPath 1.0 compatibility mode.
- XPointer schemes other than `element()`, such as `xpointer()`.
- The `<?oasis-xml-catalog?>` processing instruction.
- DOM mutation events, and the newer browser DOM additions such as `append()` and `children`. `remove()` is implemented.
- DOM Level 3 configuration parameters that require a schema: `datatype-normalization`, `validate` and
  `validate-if-schema`.
- Canonicalizing a document subset selected by an XPath expression, and canonicalizing XML 1.1 documents.
- The parts of the XPath function library listed under
  [Not available or limited](/reference/xpath-functions#not-available-or-limited).

## How a document with a DTD is treated

| Reader                                             | What it does                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Without a validator, the default                   | Parses the internal DTD subset, applies its attribute defaults and entity declarations, and does not validate |
| With `dtdValidator()`                              | Also reports each validity error to the error handler                                                         |
| Either, when an external DTD or entity is not read | Continues with the declarations already read                                                                  |
| `canonicalize`                                     | Fails with `C14N_UNREAD` when it cannot read the DTD or an entity                                             |

See [DTDs and entities](/guide/external/dtd).

## How conformance is tested

| Test                                                              | Covers                      |
| ----------------------------------------------------------------- | --------------------------- |
| The packages' own tests, on Node and in Chromium, Firefox, WebKit | Every package               |
| W3C XML Conformance Test Suite, on Node                           | Reading                     |
| W3C XInclude, `xml:id` and DOM test suites                        | XInclude, `xml:id`, the DOM |
| The examples in the Canonical XML recommendations                 | Canonical XML               |

## Known differences from the standards

| Area                       | Difference                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `upper-case`, `lower-case` | Use the runtime's Unicode case data, character by character, with no context rules such as the Greek final sigma                                |
| Regular expressions        | A back-reference under the `i` flag compares by JavaScript's case folding, which differs for a few characters                                   |
| Regular expressions        | A group inside a repeated group is reset on each repetition                                                                                     |
| Unicode collations         | Are implemented with the runtime's `Intl.Collator`, so ordering follows the runtime's collation data; options it cannot honour are approximated |
| `parse-json`               | Parses strict JSON only, regardless of the `liberal` option                                                                                     |

## Known differences from the JDK

| Area                                                     | The JDK                                                                                                        | exemplar                                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Names                                                    | Checks XML 1.0 names by the older, narrower character classes                                                  | Checks by the fifth edition, which allows more characters                        |
| Locations                                                | Reports where an event ends                                                                                    | Reports where it starts                                                          |
| External access                                          | Allows every protocol unless restricted                                                                        | Allows none unless it is listed; a resolver or catalog then supplies the content |
| Catalogs: delegation                                     | Uses only the delegated catalog with the longest match, and continues to other catalogs when it finds no match | Searches every matching delegated catalog, and stops when none of them matches   |
| Catalogs: `prefer` on a group                            | Cannot override the catalog's own `prefer="system"`                                                            | Can override it                                                                  |
| Catalogs: other namespaces                               | Ignores every later entry after an element in another namespace                                                | Ignores only that element and its content                                        |
| Catalogs: relative `xml:base`                            | Rejects it                                                                                                     | Resolves it                                                                      |
| Catalogs: unknown elements, entries missing an attribute | Fails                                                                                                          | Ignores them                                                                     |
| Catalogs: relative references                            | Tries them only as written                                                                                     | Tries them as written, then made absolute                                        |
| Writer: empty elements                                   | Writes `<a></a>` after `writeStartElement` and `writeEndElement`                                               | Writes `<a/>`                                                                    |

See [Coming from Java](/reference/java#differences-you-will-notice) for the differences in the API itself.
