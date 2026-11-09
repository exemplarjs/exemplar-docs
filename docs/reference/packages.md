# Packages and runtimes

Every package and entry point, with its exports, its peer dependencies and the runtimes it supports.
[Getting started](/guide/getting-started#install) shows the install commands.

## Packages

| Package                     | What it has                                                                                  | Needs beside it                                            | Guide                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| `@exemplarjs/xml`           | `XMLInputFactory`, the cursor and event readers, the error classes and the built-in decoders | Nothing                                                    | [Getting started](/guide/getting-started)              |
| `@exemplarjs/sax`           | The SAX parser, its handler types and `XMLFilterImpl`                                        | `@exemplarjs/xml`                                          | [Handling events with SAX](/guide/sax/)                |
| `@exemplarjs/dom`           | The DOM tree, `DocumentBuilder`, `DOMParser` and `XMLSerializer`                             | `@exemplarjs/xml`, `@exemplarjs/writer`                    | [Building and reading a DOM](/guide/dom/)              |
| `@exemplarjs/xdm`           | The XDM tree that XPath evaluates over, `XdmDocumentBuilder` and the value classes           | `@exemplarjs/xml`                                          | [The XDM tree](/guide/xpath/tree)                      |
| `@exemplarjs/xpath`         | The XPath 3.1 compiler                                                                       | `@exemplarjs/xml`, `@exemplarjs/xdm`, `@exemplarjs/writer` | [Getting started with XPath](/guide/xpath/)            |
| `@exemplarjs/writer`        | The stream and event writers, and the sinks they write to                                    | `@exemplarjs/xml`                                          | [Writing XML](/guide/writing/)                         |
| `@exemplarjs/validation`    | `dtdValidator()`, for the `validator` option                                                 | `@exemplarjs/xml`                                          | [Validating against a DTD](/guide/external/validation) |
| `@exemplarjs/xinclude`      | `xincludeProcessor()`, for the `xinclude` option                                             | `@exemplarjs/xml`                                          | [XInclude](/guide/external/xinclude)                   |
| `@exemplarjs/catalog`       | `catalogResolver()`, for the `catalog` option                                                | `@exemplarjs/xml`                                          | [Catalogs](/guide/external/catalogs)                   |
| `@exemplarjs/canonical`     | `canonicalize()` and `canonicalizeAsync()`                                                   | `@exemplarjs/xml`                                          | [Canonical XML](/guide/writing/canonical)              |
| `@exemplarjs/encodings-cjk` | `cjkDecoders`, for Japanese, Chinese and Korean encodings                                    | `@exemplarjs/xml`                                          | [Encodings](/guide/production/encodings)               |

## Entry points

Some packages have several entry points, so that unused code is never loaded.

| Import                                  | What it has                                                                                                                                                                                                                           | Guide                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `@exemplarjs/xml`                       | `XMLInputFactory`, `EventType`, `XMLError`, `ErrorCode`, `InvalidArgumentError`, `IllegalStateError`, `AsyncReaderRequiredError`, `ResolutionError`, `QName`, `XMLEventFactory`, `DEFAULT_LIMITS`, `XML_NAMESPACE`, `XMLNS_NAMESPACE` | [Factories and sources](/guide/sources)                     |
| `@exemplarjs/xml/filters`               | `createFilteredReader`, `createDelegatedReader`, `StreamReaderDelegate`                                                                                                                                                               | [Dropping content with filters](/guide/cursor/filters)      |
| `@exemplarjs/xml/resolvers`             | `fetchResolver`                                                                                                                                                                                                                       | [Resolvers and access](/guide/external/resolvers)           |
| `@exemplarjs/xml/resolvers/file`        | `fileResolver`                                                                                                                                                                                                                        | [Resolvers and access](/guide/external/resolvers)           |
| `@exemplarjs/xpath`                     | `XPathCompiler` with every function, `XPathException`, `XPathErrorCode`, `PromiseNotAwaitedError`, `collectionMap`                                                                                                                    | [Getting started with XPath](/guide/xpath/)                 |
| `@exemplarjs/xpath/lean`                | `XPathCompiler` with the core functions only, and the other names of `@exemplarjs/xpath`                                                                                                                                              | [Smaller bundles](/guide/xpath/bundles)                     |
| `@exemplarjs/xpath/groups/<name>`       | One function group for the lean compiler; see [XPath functions](/reference/xpath-functions#the-groups)                                                                                                                                | [Smaller bundles](/guide/xpath/bundles)                     |
| `@exemplarjs/xpath/resolvers/directory` | `directoryCollections`                                                                                                                                                                                                                | [Reading documents and collections](/guide/xpath/resources) |

`InvalidArgumentError` and `IllegalStateError` are also exported by each package that throws them, so they can be
imported from the package already in use. `Decimal`, with `Decimal.from(text)` and `Decimal.parse(text)`, is exported by
`@exemplarjs/xdm`.

The `internal` entry points of `@exemplarjs/xml`, `@exemplarjs/xdm` and `@exemplarjs/xpath` are reserved for the other
exemplar packages and may change in any release.

## Runtimes

Everything runs on Node, Deno, Bun and modern browsers, and uses only web-standard APIs, with these exceptions.

| Import                                        | Runs on         | Why                                                        |
| --------------------------------------------- | --------------- | ---------------------------------------------------------- |
| `@exemplarjs/xml/resolvers/file`              | Node, Deno, Bun | Reads files                                                |
| `@exemplarjs/xpath/resolvers/directory`       | Node, Deno, Bun | Lists a directory                                          |
| `@exemplarjs/catalog` with its default `read` | Node, Deno, Bun | Reads catalog files; supply a `read` function in a browser |

The packages are ES modules with TypeScript declarations included.

Every package is declared free of side effects, so a bundler removes the modules an application does not import.
[Smaller bundles](/guide/xpath/bundles) covers the XPath function groups.

## Versions

All packages are released together under one version number. Each declares the others it uses as peer dependencies, so
an application installs a single copy of each.

::: warning
Install every `@exemplarjs` package at the same version. The packages share internals, and two different versions of
`@exemplarjs/xml` in one application do not work together.
:::
