# Writer options

The options that control serialization, the output encodings supported, and the destinations a writer accepts.

Options are passed to the `XMLOutputFactory` constructor and apply to every writer created from that factory.

```ts twoslash
import { StringSink, XMLOutputFactory } from '@exemplarjs/writer';

const output = new XMLOutputFactory({ indent: '  ', omitXMLDeclaration: true });
const sink = new StringSink();
const writer = output.createStreamWriter(sink);
```

## Factory options

### Layout

| Option                | Type       | Default | What it does                                                                                                                      |
| --------------------- | ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `indent`              | `string`   | none    | Indents each nesting level with this string, such as two spaces, and writes the XML declaration and the DOCTYPE on separate lines |
| `suppressIndentation` | `string[]` | `[]`    | Elements whose content is written without indentation whitespace                                                                  |

See [Writing XML](/guide/writing/#indent-the-output).

### The XML declaration and DOCTYPE

| Option               | Type               | Default   | What it does                                                                          |
| -------------------- | ------------------ | --------- | ------------------------------------------------------------------------------------- |
| `omitXMLDeclaration` | `boolean`          | `false`   | Omits the XML declaration that `writeStartDocument` otherwise writes                  |
| `version`            | `'1.0'` or `'1.1'` | `'1.0'`   | The XML version written in the declaration, unless `writeStartDocument` is passed one |
| `encoding`           | `string`           | `'UTF-8'` | The [encoding](#output-encodings) of byte output, also written in the declaration     |
| `doctypeSystem`      | `string`           | none      | Writes a `<!DOCTYPE>` with this system identifier before the root element             |
| `doctypePublic`      | `string`           | none      | The public identifier of that DOCTYPE; requires `doctypeSystem`                       |

See [Writing XML](/guide/writing/#write-empty-elements-comments-and-other-content).

### Text and escaping

| Option                 | Type                         | Default       | What it does                                                                                                         |
| ---------------------- | ---------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `escaping`             | `'roundTrip'` or `'minimal'` | `'roundTrip'` | `'roundTrip'` escapes every character that parsing would otherwise alter; `'minimal'` escapes only what XML requires |
| `cdataSectionElements` | `string[]`                   | `[]`          | Elements whose text is written as CDATA sections                                                                     |
| `characterMap`         | `Record<string, string>`     | `{}`          | Maps characters to replacement strings, which are written unescaped                                                  |

`cdataSectionElements` and `suppressIndentation` identify elements by qualified name as written, such as `'svg:text'`,
or by namespace URI and local name, as in `'{http://www.w3.org/2000/svg}text'`.

See [Writing XML](/guide/writing/#escaping-text-and-attribute-values).

### Namespaces

| Option             | Type      | Default | What it does                                                               |
| ------------------ | --------- | ------- | -------------------------------------------------------------------------- |
| `repairNamespaces` | `boolean` | `false` | Writes the namespace declarations that element and attribute names require |
| `namespaceAware`   | `boolean` | `true`  | `false` writes names verbatim and does not track namespace bindings        |

See [Writing XML](/guide/writing/#write-namespaces).

### Checks

| Option                | Type      | Default | What it does                                                                     |
| --------------------- | --------- | ------- | -------------------------------------------------------------------------------- |
| `checkWellFormedness` | `boolean` | `true`  | Throws a `WriterError` on a write that would produce XML that is not well-formed |

See [Writing XML](/guide/writing/#well-formedness-checks). The errors are listed under
[Writer](/reference/error-codes#writer) in the error codes.

## Per-writer options

`createStreamWriter`, `createEventWriter` and `createSAXHandler` each take a destination and one optional setting.

| Option     | Type     | Default                  | What it does                                     |
| ---------- | -------- | ------------------------ | ------------------------------------------------ |
| `encoding` | `string` | the factory's `encoding` | Overrides the factory's encoding for this writer |

```ts twoslash
import { BytesSink, XMLOutputFactory } from '@exemplarjs/writer';
const output = new XMLOutputFactory();
// ---cut---
const sink = new BytesSink();
const writer = output.createStreamWriter(sink, { encoding: 'ISO-8859-1' });
```

## Output encodings

| Encoding               | What is written                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `UTF-8`                | UTF-8, without a byte-order mark                                                          |
| `UTF-16`               | Big-endian UTF-16, with a byte-order mark                                                 |
| `UTF-16BE`, `UTF-16LE` | UTF-16 in that byte order, without a byte-order mark                                      |
| Single-byte encodings  | Every single-byte encoding the reader can decode, such as `ISO-8859-1` and `windows-1252` |

A character that the encoding cannot represent is written as a character reference in text and attribute values;
elsewhere, such as in a name or a comment, it raises `WRITE_ENCODING`. Requesting an encoding that has no encoder throws
an `InvalidArgumentError` when the writer is created. See [Writing XML](/guide/writing/#choose-an-encoding).

## Destinations

A writer accepts any of these destinations.

| Destination                        | Receives                                | Get the result with                                |
| ---------------------------------- | --------------------------------------- | -------------------------------------------------- |
| `new StringSink()`                 | Text                                    | `sink.toString()`                                  |
| `new BytesSink()`                  | Bytes in the writer's encoding          | `sink.toBytes()`                                   |
| A web `WritableStream<Uint8Array>` | Bytes, in chunks as they are written    | `await writer.close()`, which waits for the stream |
| A custom text sink                 | Text chunks through `write(chunk)`      | Defined by the sink                                |
| A custom byte sink                 | Byte chunks through `writeBytes(chunk)` | Defined by the sink                                |

A custom sink may also implement `close()` and `drain()`, which resolves when the sink can accept more output. The
writer's `drain()` awaits the sink's. See [Writing XML](/guide/writing/#choose-where-the-output-goes).
