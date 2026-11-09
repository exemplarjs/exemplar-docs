# Reader options

The options that control parsing, with their types and defaults.

Options are passed to the `XMLInputFactory` constructor and apply to every reader, parser and tree builder created from
that factory. A factory is immutable: `withOptions` returns a copy.

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';

const factory = new XMLInputFactory({ coalescing: true, limits: { elementDepth: 500 } });

// A copy with one option changed. The original factory is untouched.
const strict = factory.withOptions({ disallowDoctype: true });
```

## Factory options

### Namespaces

| Option              | Type      | Default | What it does                                                               |
| ------------------- | --------- | ------- | -------------------------------------------------------------------------- |
| `namespaceAware`    | `boolean` | `true`  | Resolves prefixes to namespace URIs and enforces the namespace constraints |
| `namespacePrefixes` | `boolean` | `false` | Also reports `xmlns` declarations as attributes                            |

See [Namespaces](/guide/namespaces).

### Text and events

| Option                   | Type      | Default | What it does                                                                                           |
| ------------------------ | --------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `coalescing`             | `boolean` | `false` | Merges adjacent text and CDATA sections into one `CHARACTERS` event                                    |
| `reportPrologWhitespace` | `boolean` | `false` | Reports whitespace outside the root element, as `SPACE` events                                         |
| `reportEntityBoundaries` | `boolean` | `false` | Reports `START_ENTITY` and `END_ENTITY` events around each expanded entity                             |
| `copyStrings`            | `boolean` | `false` | Copies strings instead of slicing the input, so a retained string does not keep input chunks in memory |

See [Reading with the cursor](/guide/cursor/#read-text) and
[Large files and streams](/guide/cursor/streams#keep-strings-without-keeping-the-input).

### DTDs and entities

| Option                    | Type                     | Default | What it does                                                                   |
| ------------------------- | ------------------------ | ------- | ------------------------------------------------------------------------------ |
| `replaceEntityReferences` | `boolean`                | `true`  | Expands entity references; `false` reports each as an `ENTITY_REFERENCE` event |
| `entities`                | `Record<string, string>` | `{}`    | Predeclared entities: a map from entity name to replacement text               |
| `supportExternalEntities` | `boolean`                | `true`  | `false` disables reading of external parsed entities                           |
| `disallowDoctype`         | `boolean`                | `false` | Rejects any document that contains a `<!DOCTYPE>`, with `DOCTYPE_DISALLOWED`   |
| `validator`               | `Validator`              | none    | Validates the document against its DTD; created by `dtdValidator()`            |

See [DTDs and entities](/guide/external/dtd), [Validating against a DTD](/guide/external/validation) and
[Untrusted input](/guide/production/security#refuse-dtds).

### Reading outside the document

An external resource is read only when an access list permits its protocol and a resolver or catalog supplies it.

| Option                   | Type                  | Default | What it does                                                               |
| ------------------------ | --------------------- | ------- | -------------------------------------------------------------------------- |
| `accessExternalDTD`      | `string[]` or `'all'` | `[]`    | Protocols permitted for an external DTD, such as `['file']`                |
| `accessExternalEntities` | `string[]` or `'all'` | `[]`    | Protocols permitted for external entities and XInclude targets             |
| `entityResolver`         | `EntityResolver`      | none    | Resolves external DTDs and entities                                        |
| `uriResolver`            | `URIResolver`         | none    | Resolves XInclude targets; consulted before `entityResolver`               |
| `catalog`                | `CatalogProcessor`    | none    | Remaps external references to local copies; created by `catalogResolver()` |
| `xinclude`               | `XIncludeProcessor`   | none    | Enables XInclude processing; created by `xincludeProcessor()`              |

See [Resolvers and access](/guide/external/resolvers), [Catalogs](/guide/external/catalogs) and
[XInclude](/guide/external/xinclude).

### Checks, errors and limits

| Option                | Type              | Default  | What it does                                                                         |
| --------------------- | ----------------- | -------- | ------------------------------------------------------------------------------------ |
| `checkWellFormedness` | `boolean`         | `true`   | `false` disables the end-tag and duplicate-attribute checks                          |
| `checkNormalization`  | `boolean`         | `false`  | Reports one warning when XML 1.1 text is not fully normalized                        |
| `errorHandler`        | `ErrorHandler`    | `{}`     | Receives `warning`, `error` and `fatalError` calls                                   |
| `limits`              | `Partial<Limits>` | defaults | Overrides individual [limits](/reference/limits); omitted limits keep their defaults |

See [Errors and locations](/guide/errors#handle-errors-yourself) and [Untrusted input](/guide/production/security).

### Encodings

| Option     | Type                             | Default | What it does                                           |
| ---------- | -------------------------------- | ------- | ------------------------------------------------------ |
| `decoders` | `Record<string, DecoderFactory>` | `{}`    | Registers or replaces decoders, keyed by encoding name |

See [Encodings](/guide/production/encodings#register-your-own-decoder).

## Source settings

A source is a string, a `Uint8Array`, a stream, or a source object: an object that supplies the content in one of the
first four fields below and may set per-document settings in the others.

| Field      | Type                                  | What it does                                                                                             |
| ---------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `text`     | `string`                              | The document as a string                                                                                 |
| `bytes`    | `Uint8Array`                          | The document as bytes; the encoding is detected                                                          |
| `chunks`   | `Iterable<Uint8Array>`                | The document as an iterable of byte chunks, for a synchronous reader                                     |
| `stream`   | `ReadableStream` or an async iterable | The document as a byte stream, for an asynchronous reader                                                |
| `systemId` | `string`                              | The document's system identifier, its URI: reported in locations and used to resolve relative references |
| `baseURI`  | `string`                              | The base URI for relative references, when it differs from `systemId`                                    |
| `publicId` | `string`                              | The document's public identifier                                                                         |
| `encoding` | `string`                              | An encoding supplied by the caller; overrides the encoding the document declares                         |

See [Factories and sources](/guide/sources#the-kinds-of-source).

## SAX parser and DOM builder options

`new SAXParser(factory, options)` and `new DocumentBuilder(factory, options)` each add options of their own to the
factory's. The factory's options control parsing; these control how the result is reported or built.
`XdmDocumentBuilder` adds none.

| Option                             | On                | Default  | What it does                                                                                      |
| ---------------------------------- | ----------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `resolveDTDURIs`                   | `SAXParser`       | `true`   | Reports system identifiers in DTD declarations as absolute URIs                                   |
| `xmlnsURIs`                        | `SAXParser`       | `false`  | Reports `xmlns` attributes in the `xmlns` namespace, not in no namespace                          |
| `ignoringComments`                 | `DocumentBuilder` | `false`  | Omits comments from the tree                                                                      |
| `ignoringElementContentWhitespace` | `DocumentBuilder` | `false`  | Omits whitespace in elements that the DTD declares with element content                           |
| `missingAttribute`                 | `DocumentBuilder` | `'null'` | The value `getAttribute` returns for a missing attribute: `'null'` for `null`, `'empty'` for `''` |

See [Handling events with SAX](/guide/sax/#set-the-parser-s-options) and
[Building and reading a DOM](/guide/dom/#choose-what-the-tree-holds).

## Catalog, XInclude and resolver settings

The settings accepted by the functions that create the values of the `catalog`, `xinclude`, `entityResolver` and
`uriResolver` options.

### `catalogResolver`

From `@exemplarjs/catalog`. See [Catalogs](/guide/external/catalogs).

| Setting      | Type                                   | Default     | What it does                                                                                                             |
| ------------ | -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `files`      | `string[]`                             | required    | The catalog files to search, in order, as absolute URIs                                                                  |
| `resolution` | `'strict'`, `'continue'` or `'ignore'` | `'strict'`  | When no entry matches: fail with `CATALOG_NO_MATCH`, continue as if there were no catalog, or read the resource as empty |
| `prefer`     | `'public'` or `'system'`               | `'public'`  | Whether `public` entries apply when a system identifier is also given                                                    |
| `defer`      | `boolean`                              | `true`      | Loads delegated and next catalogs only when they are needed                                                              |
| `read`       | `CatalogReader`                        | local files | Reads catalog files and the resources they map to                                                                        |

### `xincludeProcessor`

From `@exemplarjs/xinclude`. See [XInclude](/guide/external/xinclude#what-is-added-to-included-content).

| Setting         | Type      | Default | What it does                                                     |
| --------------- | --------- | ------- | ---------------------------------------------------------------- |
| `fixupBaseURIs` | `boolean` | `true`  | Adds `xml:base` to included elements                             |
| `fixupLanguage` | `boolean` | `true`  | Adds `xml:lang` to included elements, where the language differs |

### `fileResolver` and `fetchResolver`

See [Resolvers and access](/guide/external/resolvers).

| Function        | Import                           | Setting | Default        | What it does                                   |
| --------------- | -------------------------------- | ------- | -------------- | ---------------------------------------------- |
| `fileResolver`  | `@exemplarjs/xml/resolvers/file` | `root`  | required       | The root directory; nothing outside it is read |
| `fetchResolver` | `@exemplarjs/xml/resolvers`      | `fetch` | global `fetch` | The `fetch` implementation to call             |

### `directoryCollections`

From `@exemplarjs/xpath/resolvers/directory`. See
[Reading documents and collections](/guide/xpath/resources#a-directory-as-a-collection).

| Setting  | Type     | Default    | What it does                                                                                  |
| -------- | -------- | ---------- | --------------------------------------------------------------------------------------------- |
| `root`   | `string` | required   | The root directory; its subdirectories can be collections, and nothing outside it is listed   |
| `select` | `string` | every file | File-name pattern selecting the members of a collection: `*`, `?` and `(a\|b)`, as in `*.xml` |
