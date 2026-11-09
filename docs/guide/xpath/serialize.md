# Serializing results

The XPath function `serialize()` converts nodes and values to a string of XML, HTML, JSON or plain text. Use it when an
expression should return markup or JSON as a string instead of nodes or maps.

```ts twoslash
const first = compiler.compile('serialize(//book[1])');

first.evaluateString(doc);
// '<book id="b1"><title>Dune</title><price>12.50</price></book>'
```

The examples on this page use a catalog with no whitespace between its elements, so that the output shows exactly what
`serialize` adds:

```xml
<catalog><book id="b1"><title>Dune</title><price>12.50</price></book><book id="b2"><title>Emma &amp; friends</title><price>8.00</price></book></catalog>
```

`serialize(value)` writes XML. The optional second argument holds _serialization parameters_ that control the output:
`serialize(value, map { "indent": true() })`.

## Choose an output method

The `method` parameter selects the output format. There are six methods.

### `xml`

The default. Nodes are written as XML, with markup characters escaped. The XML declaration is omitted unless
`omit-xml-declaration` is `false()`.

```ts twoslash
compiler.compile('serialize(//book[2]/title)').evaluateString(doc);
// '<title>Emma &amp; friends</title>'
```

### `html`

Writes HTML syntax: void elements such as `br` have no end tag, boolean attributes such as `disabled` are written by
name alone, and the content of `script` and `style` is not escaped. For this document:

```xml
<html><head><title>Books</title></head><body><p>Dune<br/>Emma</p><input disabled="disabled"/></body></html>
```

```ts twoslash
declare const page: import('@exemplarjs/xdm').XdmNode;
// ---cut---
compiler.compile('serialize(/, map { "method": "html" })').evaluateString(page);
```

```text
<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>Books</title></head><body><p>Dune<br>Emma</p><input disabled></body></html>
```

A `<!DOCTYPE html>` is written before an `html` root element, and a `meta` element declaring the encoding is added to
`head`. Set `"include-content-type": false()` to omit the `meta` element.

### `xhtml`

Writes HTML that is also well-formed XML: `<br />` with a space, attributes in full, and an end tag for every element
that may have content.

```ts twoslash
declare const page: import('@exemplarjs/xdm').XdmNode;
// ---cut---
compiler.compile('serialize(//p, map { "method": "xhtml" })').evaluateString(page);
// '<p>Dune<br />Emma</p>'
```

### `text`

Writes only the string value of each item, with no markup and no escaping.

```ts twoslash
compiler.compile('serialize(//book[2]/title, map { "method": "text" })').evaluateString(doc);
// 'Emma & friends'
```

### `json`

Writes a map as a JSON object, an array as a JSON array, and numbers, strings and booleans as their JSON equivalents.
The empty sequence is written as `null`.

```ts twoslash
const json = compiler.compile(`
  serialize(
    map { "id": "b1", "price": 12.5, "tags": ["classic", "desert"], "isbn": () },
    map { "method": "json" }
  )
`);

json.evaluateString();
// '{"id":"b1","price":12.5,"tags":["classic","desert"],"isbn":null}'
```

A JSON text is one value, so the input must be a single item: wrap several in an array with `array { … }`. A node inside
the data is written as a string containing its XML serialization. Values with no JSON representation raise an
`XPathException`:

| Code       | Cause                                          |
| ---------- | ---------------------------------------------- |
| `SERE0020` | A number that is `NaN` or infinite             |
| `SERE0021` | A function                                     |
| `SERE0022` | Two map keys that serialize to the same string |
| `SERE0023` | More than one item                             |

### `adaptive`

Writes each item on its own line, in a form close to XPath's own syntax. It accepts any value, which makes it the method
for logging and debugging.

```ts twoslash
const show = compiler.compile(`
  serialize(
    (42, 1e0, "Dune", true(), xs:date("2024-01-31"), map { "a": [1, 2] }, //book[1]/title, //book[1]/@id),
    map { "method": "adaptive" }
  )
`);

show.evaluateString(doc);
```

```text
42
1.0e0
"Dune"
true()
xs:date("2024-01-31")
map{"a":[1,2]}
<title>Dune</title>
id="b1"
```

## Set parameters

Parameters are passed in a map. Each has a fixed type: `xs:boolean` for flags, written `true()` and `false()`, and
`xs:string` for most others. A value of the wrong type, such as `"indent": "yes"`, raises an `XPathException` with the
code `XPTY0004`.

```ts twoslash
const pretty = compiler.compile(`
  serialize(/, map { "indent": true(), "omit-xml-declaration": false() })
`);

pretty.evaluateString(doc);
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="b1">
    <title>Dune</title>
    <price>12.50</price>
  </book>
  <book id="b2">
    <title>Emma &amp; friends</title>
    <price>8.00</price>
  </book>
</catalog>
```

The most commonly used parameters are:

| Parameter                          | Value         | Effect                                                                                                    |
| ---------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| `method`                           | A string      | `"xml"` (the default), `"html"`, `"xhtml"`, `"text"`, `"json"` or `"adaptive"`                            |
| `indent`                           | A boolean     | Adds line breaks and indentation, for JSON too. Puts the declaration and a DOCTYPE on lines of their own  |
| `omit-xml-declaration`             | A boolean     | `false()` writes `<?xml version="1.0" encoding="UTF-8"?>` first                                           |
| `encoding`                         | A string      | The encoding the declaration names. Characters it cannot hold are written as references such as `&#8212;` |
| `version`                          | A string      | The XML version in the declaration: `"1.0"` or `"1.1"`                                                    |
| `standalone`                       | A boolean     | Adds `standalone="yes"` or `"no"` to the declaration                                                      |
| `doctype-system`, `doctype-public` | Strings       | Writes a `<!DOCTYPE …>` with these identifiers                                                            |
| `cdata-section-elements`           | Element names | Writes the text of these elements in `<![CDATA[ … ]]>` sections                                           |
| `suppress-indentation`             | Element names | With `indent`, leaves the content of these elements as it is                                              |
| `item-separator`                   | A string      | Written between items, in place of the default                                                            |
| `use-character-maps`               | A map         | Replaces single characters with strings, written without escaping                                         |
| `normalization-form`               | A string      | Unicode normalization of the output: `"NFC"`, `"NFD"`, `"NFKC"` or `"NFKD"`                               |
| `include-content-type`             | A boolean     | For `html` and `xhtml`: `false()` leaves out the `meta` element                                           |
| `html-version`                     | A number      | For `html`: `5` (the default) or `4`                                                                      |
| `json-node-output-method`          | A string      | For `json`: how a node inside the data is written. `"xml"` by default                                     |

Element names are given as `xs:QName` values: `map { "cdata-section-elements": xs:QName("title") }`. For several elements, pass a sequence.

Four behaviours are worth knowing:

- **`indent` adds whitespace only where there is none.** Once an element has a text node of its own, even a line break
  between two children, the rest of its content is written unchanged. A document that was already indented when it was
  parsed is therefore serialized as it was.
- **`encoding` does not produce bytes.** The result of `serialize` is always a string. The parameter sets the encoding
  that the declaration names and determines which characters are written as character references, so that the string can
  then be encoded in that encoding.
- **Several items** are written in order. Nothing is written between nodes; adjacent atomic values such as strings and
  numbers are separated by a space, or by the `item-separator` if one is set.

  ```ts twoslash
  compiler.compile('serialize(//title, map { "method": "text", "item-separator": ", " })').evaluateString(doc);
  // 'Dune, Emma & friends'
  ```

- **An unknown parameter name is ignored**, so check the spelling when a parameter has no effect. An unknown `method`
  raises `SEPM0016`, and an encoding that is not supported raises `SESU0007`.

## Pass parameters from JavaScript

A plain JavaScript object passed as a [variable](/guide/xpath/variables) becomes a map, so the parameters can be
supplied from application code instead of being written in the expression.

```ts twoslash
const write = compiler.compile('serialize(//book[1], $parameters)', {
  variables: { parameters: 'map(*)' },
});

write.evaluateString(doc, { variables: { parameters: { indent: true } } });
```

```xml
<book id="b1">
  <title>Dune</title>
  <price>12.50</price>
</book>
```

### Parameters as an element

`serialize` also accepts the parameters as an XML element, which is useful when output settings are kept in a file. The
element is `serialization-parameters` in the namespace `http://www.w3.org/2010/xslt-xquery-serialization`, with a child
for each parameter and its value in a `value` attribute. Boolean parameters are written `yes` and `no`.

```xml
<output:serialization-parameters xmlns:output="http://www.w3.org/2010/xslt-xquery-serialization">
  <output:indent value="yes"/>
  <output:omit-xml-declaration value="no"/>
</output:serialization-parameters>
```

```ts twoslash
declare const settings: import('@exemplarjs/xdm').XdmNode;
// ---cut---
const write = compiler.compile('serialize(//book[1], $settings/*)', {
  variables: { settings: 'document-node()' },
});

write.evaluateString(doc, { variables: { settings } });
```

Pass the element, not its document node: `$settings/*` here. Validation is stricter in this form: an unknown parameter
raises `SEPM0017`, and a duplicate raises `SEPM0019`.

## What cannot be serialized

The `xml`, `html`, `xhtml` and `text` methods write nodes and atomic values. They raise an `XPathException` with the
code `SENR0001` for:

- a standalone attribute node, such as `//book/@id`, because an attribute has no serialized form outside its element's
  start tag. Serialize its value instead: `//book/@id/string()`;
- a map or a function. Use the `json` or `adaptive` method.

An array is flattened, and its members are written in order.

## When to use a writer instead

`serialize` builds the whole result as one string in memory, which suits a fragment, a response body or a log line. Use
the [stream writer](/guide/writing/) instead when:

- the output is large, or is streamed to a file or the network as it is produced;
- the output must be bytes in a particular encoding, not a string;
- the document is generated from data, element by element, and there are no nodes to serialize;
- the task is to copy a document while changing parts of it; see [Copying and changing
  documents](/guide/writing/copying).

## Next steps

- [Maps, arrays, JSON and functions](/guide/xpath/maps-arrays): building the maps and arrays that the `json` method
  writes.
- [Writing XML](/guide/writing/): the stream writer.
- [Writer options](/reference/writer-options): the writer's own settings.
