# Encodings

exemplar detects the encoding of any document passed as bytes, and UTF-8 needs no configuration. This page covers the
other cases: legacy encodings, a charset supplied by HTTP, and the errors raised when the bytes and the declared
encoding disagree.

This document is in ISO-8859-1 and names that encoding in its XML declaration:

```ts twoslash
// <?xml version="1.0" encoding="ISO-8859-1"?><title>Café</title>
declare const latin1Bytes: Uint8Array;
// ---cut---
const reader = xml.createStreamReader(latin1Bytes);
reader.nextTag();
reader.elementText(); // 'Café'
reader.encoding(); // 'iso-8859-1': the encoding the bytes were read in
reader.declaredEncoding(); // 'ISO-8859-1': the name as the first line gives it
```

`encoding()` returns the name in lower case, and `utf-8` for a document that declares no encoding.
`declaredEncoding()` returns `undefined` for such a document.

A document passed as a string is already decoded, so none of this applies to it: its `encoding` declaration is
ignored, and `encoding()` returns `undefined`. If the string begins with a byte-order mark (U+FEFF) that the decoder
left in place, the reader skips it.

## How the encoding is worked out

exemplar checks four sources in this order and uses the first that determines the encoding:

1. **A byte-order mark.** A UTF-8, UTF-16 or UTF-32 byte-order mark at the start of the bytes is decisive.
2. **An encoding supplied from outside the document**, such as the charset of an HTTP response.
   [Tell the reader the encoding](#tell-the-reader-the-encoding) shows how.
3. **The XML declaration**, which can name the encoding: `<?xml version="1.0" encoding="ISO-8859-1"?>`. The first
   bytes are enough to read the declaration before the encoding is known.
4. **Otherwise, UTF-8.**

The result applies to the whole document. An external DTD or entity goes through the same steps on its own bytes, so
the files of one document may be in different encodings.

## Encodings that are built in

These need no additional package. Names are case-insensitive, and common aliases are recognized, such as `latin1` for
`ISO-8859-1`.

| Family             | Encodings                                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unicode            | `UTF-8`, `UTF-16`, `UTF-16LE`, `UTF-16BE`, `UTF-32`, `UTF-32LE`, `UTF-32BE`                                                                                    |
| ASCII              | `US-ASCII`                                                                                                                                                     |
| ISO 8859           | `ISO-8859-1` to `ISO-8859-11` and `ISO-8859-13` to `ISO-8859-16`                                                                                               |
| Windows code pages | `windows-874` and `windows-1250` to `windows-1258`                                                                                                             |
| Cyrillic           | `KOI8-R`, `KOI8-U`                                                                                                                                             |
| Macintosh          | `macintosh`                                                                                                                                                    |
| Chinese            | `GB18030`                                                                                                                                                      |
| EBCDIC             | `IBM037`, `IBM273`, `IBM277`, `IBM278`, `IBM280`, `IBM284`, `IBM285`, `IBM297`, `IBM500`, `IBM871`, `IBM875`, `IBM1026`, `IBM1047`, and `IBM1140` to `IBM1149` |

## Add Japanese, Chinese and Korean encodings

The CJK encodings need large tables, so they are in a separate package:

::: code-group

```bash [npm]
npm install @exemplarjs/encodings-cjk
```

```bash [pnpm]
pnpm add @exemplarjs/encodings-cjk
```

```bash [yarn]
yarn add @exemplarjs/encodings-cjk
```

:::

Pass its decoders to the factory:

```ts twoslash
import { cjkDecoders } from '@exemplarjs/encodings-cjk';
import { XMLInputFactory } from '@exemplarjs/xml';

const xml = new XMLInputFactory({ decoders: cjkDecoders });
```

| Language | Encodings added                                     |
| -------- | --------------------------------------------------- |
| Japanese | `Shift_JIS`, `windows-31j`, `EUC-JP`, `ISO-2022-JP` |
| Chinese  | `GBK`, `GB2312`, `Big5`, `Big5-HKSCS`               |
| Korean   | `EUC-KR`                                            |

Each encoding's table is unpacked the first time a document in that encoding is read.

## Register your own decoder

To support any other encoding, register a decoder under the name that documents declare. A decoder is any object with
the `decode(bytes, { stream })` method of the standard `TextDecoder`, so a `TextDecoder` qualifies. The registered
value is a function that creates a decoder, because each document needs its own instance.

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';

const xml = new XMLInputFactory({
  decoders: {
    'x-legacy': () => new TextDecoder('windows-1252', { fatal: true }),
  },
});
```

A document that begins `<?xml version="1.0" encoding="x-legacy"?>` is then decoded with it. The name is
case-insensitive.

Pass `{ fatal: true }` to a `TextDecoder`. Without it, invalid bytes are silently replaced with `�`, and data is lost
without an error.

To combine these with the CJK decoders, spread both into one object: `{ ...cjkDecoders, 'x-legacy': () => … }`. A
decoder registered under a built-in name replaces the built-in one.

## Tell the reader the encoding

The encoding may be specified outside the document, most often by the `Content-Type` header of an HTTP response:
`Content-Type: application/xml; charset=ISO-8859-1`. Pass it as `encoding` on the source.

```ts twoslash
const response = await fetch('https://shop.example/books.xml');
const charset = /charset=([^;]+)/i.exec(response.headers.get('content-type') ?? '')?.[1]?.trim();

const reader = xml.createAsyncStreamReader({
  systemId: response.url,
  stream: response.body!,
  encoding: charset, // undefined when the header names no charset
});
```

An encoding passed this way takes precedence over the declared one. If the two differ, the passed encoding is used
and is what `encoding()` returns, while `declaredEncoding()` still returns the document's own. A warning with the
code `ENCODING_CONFLICT` is reported to the [error handler](/guide/errors#handle-errors-yourself), if it has a
`warning` function.

A [resolver](/guide/external/resolvers#what-to-return) can report an encoding for the content it returns in the same
way, and the built-in `fetchResolver` passes on the charset of each response.

## Fix encoding errors

An encoding error is fatal, with one exception noted below, because text decoded in the wrong encoding is not the
text that was written.

| Cause                                             | Code                         | Message                                                                      |
| ------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| The document names an encoding with no decoder    | `ENCODING_UNSUPPORTED`       | `The encoding shift_jis is not supported`                                    |
| The bytes are not legal in the encoding           | `ENCODING_INVALID_BYTES`     | `The bytes are not legal utf-8`                                              |
| The declared encoding contradicts the first bytes | `ENCODING_MISMATCH`          | `The document is in UTF-8 but declares ISO-8859-1`                           |
| UTF-16 with no byte-order mark and no declaration | `ENCODING_UNDECLARED`        | `A document in utf-16le without a byte-order mark must declare its encoding` |
| Declared as `UTF-16` with no byte-order mark      | `ENCODING_UTF16_WITHOUT_BOM` | `A document declared as UTF-16 must begin with a byte-order mark`            |

The usual causes:

- **`ENCODING_UNSUPPORTED`** for a Japanese, Chinese or Korean encoding means the CJK decoders are not registered.
- **`ENCODING_INVALID_BYTES` in UTF-8** is nearly always a document saved in a legacy encoding, such as
  windows-1252, that either declares no encoding or wrongly declares UTF-8. The error's line and column locate the
  first character that cannot be decoded, typically an accented letter. If the real encoding is known, pass it as
  `encoding` on the source.
- **`ENCODING_MISMATCH`** means the declaration is certainly wrong: for example a UTF-8 byte-order mark on a document
  that declares ISO-8859-1.
- **UTF-16 without a byte-order mark** cannot be reliably distinguished from other encodings. A document declared as
  `UTF-16LE` or `UTF-16BE` needs no mark, since the name gives the byte order. One declared as plain `UTF-16` should
  have a mark. That last case, `ENCODING_UTF16_WITHOUT_BOM`, is the one error here that an
  [error handler](/guide/errors#which-problems-stop-reading) can let pass: the document is then decoded in the byte
  order its first bytes indicate.

## Write in an encoding

A writer has the reverse choice: which encoding to produce, and how to handle characters that encoding cannot
represent. [Writing XML](/guide/writing/#choose-an-encoding) covers it.

## Next steps

- [Factories and sources](/guide/sources) lists the kinds of source and the fields a source can carry.
- [Errors and locations](/guide/errors) explains the error handler and error fields.
- [Packages and runtimes](/reference/packages) describes `@exemplarjs/encodings-cjk` and the other packages.
