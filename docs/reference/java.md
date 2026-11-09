# Coming from Java

For developers who know Java's XML APIs (JAXP, StAX, SAX and the DOM), this page maps each Java class, method and
setting to its exemplar equivalent and lists the differences in behaviour.

The structure is the same: `XMLInputFactory` holds the configuration, creates the cursor and the event reader, and is
passed to the SAX parser and the tree builders.

::: code-group

```java [Java]
XMLInputFactory factory = XMLInputFactory.newFactory();
factory.setProperty(XMLInputFactory.IS_COALESCING, true);
XMLStreamReader reader = factory.createXMLStreamReader(new StringReader(source));
while (reader.hasNext()) {
  if (reader.next() == XMLStreamConstants.START_ELEMENT) {
    System.out.println(reader.getLocalName() + " " + reader.getAttributeValue(null, "id"));
  }
}
```

```ts twoslash [exemplar]
import { EventType, XMLInputFactory } from '@exemplarjs/xml';

const factory = new XMLInputFactory({ coalescing: true });
const reader = factory.createStreamReader(source);
while (reader.hasNext()) {
  if (reader.next() === EventType.START_ELEMENT) {
    console.log(reader.localName(), reader.attribute('id'));
  }
}
```

:::

## Classes

### Reading

| Java                                        | exemplar                                                                       | Guide                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `XMLInputFactory`                           | `XMLInputFactory` from `@exemplarjs/xml`                                       | [Factories and sources](/guide/sources)                           |
| `XMLStreamReader`                           | `factory.createStreamReader(source)`                                           | [Reading with the cursor](/guide/cursor/)                         |
| A non-blocking `XMLStreamReader` (Aalto)    | `factory.createAsyncStreamReader(stream)`                                      | [Large files and streams](/guide/cursor/streams)                  |
| `XMLStreamConstants`                        | `EventType`                                                                    | [Reading with the cursor](/guide/cursor/)                         |
| `StreamFilter`, `createFilteredReader`      | `createFilteredReader(reader, ...filters)` from `@exemplarjs/xml/filters`      | [Dropping content with filters](/guide/cursor/filters)            |
| `StreamReaderDelegate`                      | `StreamReaderDelegate`, `createDelegatedReader` from `@exemplarjs/xml/filters` | [Changing content with delegates](/guide/cursor/delegates)        |
| `XMLEventReader`                            | `factory.createEventReader(source)`                                            | [Reading event objects](/guide/events/)                           |
| `XMLEvent`, `StartElement`, `Characters`, … | `XMLEvent`, `StartElementEvent`, `CharactersEvent`, …                          | [Reading event objects](/guide/events/)                           |
| `XMLEventFactory`                           | `XMLEventFactory`                                                              | [Changing events with a generator](/guide/events/generators)      |
| `EventFilter`, `createFilteredReader`       | `createFilteredReader(eventReader, ...filters)` from `@exemplarjs/xml/filters` | [Reading event objects](/guide/events/#drop-events-with-a-filter) |
| `EventReaderDelegate`                       | A generator function over the events                                           | [Changing events with a generator](/guide/events/generators)      |
| `javax.xml.namespace.QName`                 | `QName` from `@exemplarjs/xml`                                                 | [Namespaces](/guide/namespaces)                                   |
| `InputSource`, `StreamSource`               | A source object such as `{ bytes, systemId, encoding }`                        | [Factories and sources](/guide/sources)                           |

### SAX

| Java                                                                            | exemplar                                                 | Guide                                   |
| ------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------- |
| `SAXParserFactory`, `SAXParser`, `XMLReader`                                    | `new SAXParser(factory, options)` from `@exemplarjs/sax` | [Handling events with SAX](/guide/sax/) |
| `ContentHandler`, `LexicalHandler`, `DTDHandler`, `DeclHandler`, `ErrorHandler` | One handler object implementing the callbacks required   | [Handling events with SAX](/guide/sax/) |
| `DefaultHandler`, `DefaultHandler2`                                             | A plain object; every method is optional                 | [Handling events with SAX](/guide/sax/) |
| `Attributes`, `AttributesImpl`                                                  | `Attributes`, `AttributesImpl`                           | [Handling events with SAX](/guide/sax/) |
| `Locator`                                                                       | `Locator`, passed to `setDocumentLocator`                | [Handling events with SAX](/guide/sax/) |
| `XMLFilterImpl`                                                                 | `XMLFilterImpl`                                          | [SAX filters](/guide/sax/filters)       |

### Trees

| Java                                         | exemplar                                                       | Guide                                          |
| -------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| `DocumentBuilderFactory`, `DocumentBuilder`  | `new DocumentBuilder(factory, options)` from `@exemplarjs/dom` | [Building and reading a DOM](/guide/dom/)      |
| `org.w3c.dom.Document`, `Element`, `Node`, … | The same names from `@exemplarjs/dom`                          | [Building and reading a DOM](/guide/dom/)      |
| `DOMImplementationRegistry`                  | `DOMImplementationRegistry`                                    | [Building and reading a DOM](/guide/dom/)      |
| `LSSerializer`, an identity `Transformer`    | `writer.writeNode(node)`, or `XMLSerializer`                   | [Changing and saving a DOM](/guide/dom/saving) |
| `DOMResult`                                  | `builder.createSAXHandler()` at the end of a filter chain      | [SAX filters](/guide/sax/filters)              |

### Writing

| Java                                                | exemplar                                          | Guide                                                    |
| --------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `XMLOutputFactory`                                  | `XMLOutputFactory` from `@exemplarjs/writer`      | [Writing XML](/guide/writing/)                           |
| `XMLStreamWriter`                                   | `output.createStreamWriter(destination)`          | [Writing XML](/guide/writing/)                           |
| `XMLEventWriter`                                    | `output.createEventWriter(destination)`           | [Copying and changing documents](/guide/writing/copying) |
| `StringWriter`, `ByteArrayOutputStream`             | `StringSink`, `BytesSink`                         | [Writing XML](/guide/writing/)                           |
| `OutputStream`                                      | A web `WritableStream<Uint8Array>`                | [Writing XML](/guide/writing/)                           |
| An identity `Transformer` from a reader to a result | `writer.copy(reader)`, `writer.copyAsync(reader)` | [Copying and changing documents](/guide/writing/copying) |
| `TransformerHandler` writing SAX events             | `output.createSAXHandler(destination)`            | [SAX filters](/guide/sax/filters)                        |

### Resolvers, catalogs and validation

| Java                                               | exemplar                                                                           | Guide                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `EntityResolver`, `EntityResolver2`, `XMLResolver` | The `entityResolver` option                                                        | [Resolvers and access](/guide/external/resolvers)             |
| `URIResolver`                                      | The `uriResolver` option                                                           | [Resolvers and access](/guide/external/resolvers)             |
| `CatalogManager.catalogResolver(features, files)`  | `catalogResolver({ files, prefer, defer, resolution })` from `@exemplarjs/catalog` | [Catalogs](/guide/external/catalogs)                          |
| `ErrorHandler`, `XMLReporter`                      | The `errorHandler` option                                                          | [Errors and locations](/guide/errors)                         |
| `SAXParseException`, `XMLStreamException`          | `XMLError`                                                                         | [Errors and locations](/guide/errors)                         |
| `IllegalArgumentException`                         | `InvalidArgumentError` from `@exemplarjs/xml`                                      | [Errors and locations](/guide/errors#errors-in-your-own-code) |
| `IllegalStateException`                            | `IllegalStateError` from `@exemplarjs/xml`                                         | [Errors and locations](/guide/errors#errors-in-your-own-code) |
| `setValidating(true)`                              | The `validator` option, with `dtdValidator()` from `@exemplarjs/validation`        | [Validating against a DTD](/guide/external/validation)        |
| `setXIncludeAware(true)`                           | The `xinclude` option, with `xincludeProcessor()` from `@exemplarjs/xinclude`      | [XInclude](/guide/external/xinclude)                          |
| XML Schema validation (`javax.xml.validation`)     | Not available                                                                      | [Standards and conformance](/reference/conformance)           |

### XPath and values

`javax.xml.xpath` is XPath 1.0 over the DOM. exemplar implements XPath 3.1 over the XDM tree, not the DOM, so the
classes do not correspond one to one.

| Java                                         | exemplar                                                               | Guide                                            |
| -------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| `XPathFactory`, `XPath`                      | `new XPathCompiler(options)` from `@exemplarjs/xpath`                  | [Getting started with XPath](/guide/xpath/)      |
| `XPathExpression`                            | `XPathExecutable`, from `compiler.compile(expression)`                 | [Getting started with XPath](/guide/xpath/)      |
| `evaluate(node, XPathConstants.NODESET)`     | `selectNodes(node)`                                                    | [Getting results](/guide/xpath/results)          |
| `XPathConstants.STRING`, `NUMBER`, `BOOLEAN` | `evaluateString`, `evaluateNumber`, `evaluateBoolean`                  | [Getting results](/guide/xpath/results)          |
| `NamespaceContext`                           | The compiler's `namespaces` option                                     | [Getting started with XPath](/guide/xpath/)      |
| `XPathVariableResolver`                      | Variables declared in `compile` and bound at evaluation                | [Passing variables](/guide/xpath/variables)      |
| The DOM tree as the query target             | `new XdmDocumentBuilder(factory).parse(source)` from `@exemplarjs/xdm` | [The XDM tree](/guide/xpath/tree)                |
| `javax.xml.datatype.XMLGregorianCalendar`    | `XMLGregorianCalendar` from `@exemplarjs/xdm`                          | [Dates, times and durations](/guide/xpath/dates) |
| `javax.xml.datatype.Duration`                | `Duration` from `@exemplarjs/xdm`                                      | [Dates, times and durations](/guide/xpath/dates) |
| `BigDecimal`, `new BigDecimal(text)`         | `Decimal` from `@exemplarjs/xdm`, `Decimal.from(text)`                 | [Getting results](/guide/xpath/results)          |

## Method names

Accessors drop Java's `get` prefix; other methods keep their names.

### The cursor

| StAX `XMLStreamReader`                                                                                 | exemplar                                                                                   |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `next()`, `hasNext()`, `nextTag()`, `close()`                                                          | The same                                                                                   |
| `getEventType()`                                                                                       | `eventType()`                                                                              |
| `getLocalName()`, `getPrefix()`, `getNamespaceURI()`                                                   | `localName()`, `prefix()`, `namespaceURI()`                                                |
| `getName()`, a `QName`                                                                                 | `name()`, the qualified name as a string, such as `'dc:title'`                             |
| `getText()`, `getElementText()`                                                                        | `text()`, `elementText()`                                                                  |
| `isWhiteSpace()`                                                                                       | `isWhitespace()`                                                                           |
| `getAttributeValue(namespaceURI, localName)`                                                           | `attribute(localName, namespaceURI?)`                                                      |
| `getAttributeCount()`, `getAttributeValue(i)`                                                          | `attributeCount()`, `attributeValue(i)`                                                    |
| `getAttributeLocalName(i)`, `getAttributePrefix(i)`, `getAttributeNamespace(i)`, `getAttributeType(i)` | `attributeLocalName(i)`, `attributePrefix(i)`, `attributeNamespace(i)`, `attributeType(i)` |
| `getAttributeName(i)`, a `QName`                                                                       | `attributeName(i)`, the qualified name as a string                                         |
| `isAttributeSpecified(i)`                                                                              | The same                                                                                   |
| `getNamespaceCount()`, `getNamespacePrefix(i)`, `getNamespaceURI(i)`                                   | `namespaceCount()`, `namespacePrefix(i)`, `namespaceURI(i)`                                |
| `getPITarget()`, `getPIData()`                                                                         | `piTarget()`, `piData()`                                                                   |
| `getVersion()`, `getCharacterEncodingScheme()`, `isStandalone()`                                       | `version()`, `declaredEncoding()`, `standalone()`                                          |
| `getEncoding()`                                                                                        | `encoding()`, the decoder's lower-case name such as `utf-8`; `undefined` for a string      |
| `getLocation()`                                                                                        | `location()`                                                                               |
| `isStartElement()`, `isEndElement()`, `isCharacters()`                                                 | Compare `eventType()` with `EventType`                                                     |
| `require(…)`, `getTextCharacters(…)`, `getProperty(…)`                                                 | None                                                                                       |
| None                                                                                                   | `skipElement()`, which advances from a start tag to its matching end tag                   |

::: warning
`attribute(localName, namespaceURI?)` takes the local name first, the opposite of StAX's
`getAttributeValue(namespaceURI, localName)`. It returns `undefined`, not `null`, when the attribute is absent.
:::

### Event objects

| StAX                                              | exemplar                                                    |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `nextEvent()`, `peek()`, `hasNext()`, `nextTag()` | The same; the reader is also iterable with `for…of`         |
| `getElementText()`                                | `elementText()`                                             |
| `event.getEventType()`, `event.isStartElement()`  | `event.type`, compared with `EventType`                     |
| `event.asStartElement().getName()`                | `event.name`, after narrowing on `event.type`               |
| `startElement.getAttributeByName(qname)`          | `event.attribute(localName, namespaceURI?)`                 |
| `startElement.getAttributes()`, `getNamespaces()` | `event.attributes`, `event.namespaces`                      |
| `characters.getData()`                            | `event.text`                                                |
| `event.getLocation()`                             | `event.location`                                            |
| `eventWriter.add(event)`, `add(eventReader)`      | `eventWriter.add(event)`, `add(events)`, `addAsync(events)` |

### SAX

| SAX                                                                                   | exemplar                                                              |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `reader.setContentHandler(h)`, then `reader.parse(src)`                               | `parser.parse(source, handler)`, `parser.parseAsync(source, handler)` |
| `startElement(uri, localName, qName, attributes)` and the other callbacks             | The same names and argument order                                     |
| `characters(char[], start, length)`                                                   | `characters(text)`                                                    |
| `attributes.getValue(uri, localName)`, `getValue(qName)`, `getValue(i)`               | `attributes.value(uri, localName)`, `value(qName)`, `value(i)`        |
| `attributes.getLength()`, `getLocalName(i)`, `getQName(i)`, `getURI(i)`, `getType(i)` | `attributes.length`, `localName(i)`, `qName(i)`, `uri(i)`, `type(i)`  |

### The stream writer

| StAX `XMLStreamWriter`                                                                                                                                                                                                                                        | exemplar                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `writeStartDocument`, `writeStartElement`, `writeEmptyElement`, `writeNamespace`, `writeDefaultNamespace`, `writeCharacters`, `writeCData`, `writeComment`, `writeProcessingInstruction`, `writeEntityRef`, `writeDTD`, `writeEndElement`, `writeEndDocument` | The same names and argument orders                                                           |
| `writeAttribute(localName, value)`, `writeAttribute(namespaceURI, localName, value)`                                                                                                                                                                          | The same                                                                                     |
| `writeAttribute(prefix, namespaceURI, localName, value)`                                                                                                                                                                                                      | `writeAttribute(prefix, localName, namespaceURI, value)`, the order `writeStartElement` uses |
| `setPrefix`, `setDefaultNamespace`, `flush`                                                                                                                                                                                                                   | The same                                                                                     |
| `getPrefix(uri)`                                                                                                                                                                                                                                              | `prefixOf(uri)`                                                                              |
| `getNamespaceContext().getNamespaceURI(prefix)`                                                                                                                                                                                                               | `namespaceOf(prefix)`                                                                        |
| `close()`                                                                                                                                                                                                                                                     | `await writer.close()`                                                                       |
| None                                                                                                                                                                                                                                                          | `writeStartElement(qname)`, `writeAttribute(qname, value)`, taking a `QName`                 |
| None                                                                                                                                                                                                                                                          | `writeEndElement(name)`, which checks the name against the open element                      |
| None                                                                                                                                                                                                                                                          | `writeNode(node)`, `copy(reader)`, `copyAsync(reader)`, `drain()`                            |

## Reader settings

Settings are typed options on the factory, not feature URIs or property strings.
[Reader options](/reference/options) describes each one.

| Java                                                                    | exemplar option                                                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| StAX `IS_NAMESPACE_AWARE`, JAXP `setNamespaceAware`, SAX `namespaces`   | `namespaceAware`                                                                                |
| SAX `namespace-prefixes`                                                | `namespacePrefixes`                                                                             |
| StAX `IS_VALIDATING`, JAXP `setValidating(true)`, SAX `validation`      | `validator`                                                                                     |
| StAX `IS_COALESCING`, JAXP `setCoalescing`                              | `coalescing`                                                                                    |
| StAX `IS_REPLACING_ENTITY_REFERENCES`, JAXP `setExpandEntityReferences` | `replaceEntityReferences`                                                                       |
| StAX `IS_SUPPORTING_EXTERNAL_ENTITIES`, SAX `external-general-entities` | `supportExternalEntities`                                                                       |
| `XMLConstants.ACCESS_EXTERNAL_DTD`                                      | `accessExternalDTD`; `accessExternalEntities` for entities used in content and XInclude targets |
| Xerces `disallow-doctype-decl`                                          | `disallowDoctype`                                                                               |
| JAXP `setXIncludeAware(true)`                                           | `xinclude`                                                                                      |
| SAX `EntityResolver2`, StAX `XMLResolver`                               | `entityResolver`                                                                                |
| JAXP `URIResolver`                                                      | `uriResolver`                                                                                   |
| `CatalogManager.catalogResolver`                                        | `catalog`                                                                                       |
| SAX `ErrorHandler`, StAX `XMLReporter`                                  | `errorHandler`                                                                                  |
| `Charset` providers                                                     | `decoders`                                                                                      |
| The `jdk.xml` limits                                                    | `limits`; see [below](#limits)                                                                  |
| DOM `check-character-normalization`                                     | `checkNormalization`                                                                            |
| SAX `LexicalHandler.startEntity` and `endEntity`; StAX has none         | `reportEntityBoundaries`                                                                        |
| Woodstox `P_REPORT_PROLOG_WHITESPACE`                                   | `reportPrologWhitespace`                                                                        |
| Woodstox `P_CUSTOM_INTERNAL_ENTITIES`                                   | `entities`                                                                                      |
| SAX `resolve-dtd-uris`                                                  | `resolveDTDURIs`, on `SAXParser`                                                                |
| SAX `xmlns-uris`                                                        | `xmlnsURIs`, on `SAXParser`                                                                     |
| JAXP `setIgnoringComments`                                              | `ignoringComments`, on `DocumentBuilder`                                                        |
| JAXP `setIgnoringElementContentWhitespace`                              | `ignoringElementContentWhitespace`, on `DocumentBuilder`                                        |
| None                                                                    | `checkWellFormedness`, `copyStrings`; `missingAttribute`, on `DocumentBuilder`                  |

## Writer settings

[Writer options](/reference/writer-options) describes each one.

| Java                                                     | exemplar option                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| StAX `IS_REPAIRING_NAMESPACES`                           | `repairNamespaces`                                                                         |
| `OutputKeys.INDENT`                                      | `indent`, set to the indent string                                                         |
| `OutputKeys.OMIT_XML_DECLARATION`                        | `omitXMLDeclaration`                                                                       |
| `OutputKeys.VERSION`                                     | `version`                                                                                  |
| `OutputKeys.ENCODING`                                    | `encoding`                                                                                 |
| `OutputKeys.DOCTYPE_PUBLIC`, `OutputKeys.DOCTYPE_SYSTEM` | `doctypePublic`, `doctypeSystem`                                                           |
| `OutputKeys.CDATA_SECTION_ELEMENTS`                      | `cdataSectionElements`                                                                     |
| None                                                     | `escaping`, `checkWellFormedness`, `namespaceAware`, `suppressIndentation`, `characterMap` |

## Limits

The defaults are those of JDK 24. [Limits](/reference/limits) defines what each counts.

| JDK property                          | exemplar limit         |
| ------------------------------------- | ---------------------- |
| `jdk.xml.entityExpansionLimit`        | `entityExpansions`     |
| `jdk.xml.totalEntitySizeLimit`        | `totalEntitySize`      |
| `jdk.xml.maxGeneralEntitySizeLimit`   | `generalEntitySize`    |
| `jdk.xml.maxParameterEntitySizeLimit` | `parameterEntitySize`  |
| `jdk.xml.entityReplacementLimit`      | `entityReferenceNodes` |
| `jdk.xml.elementAttributeLimit`       | `attributesPerElement` |
| `jdk.xml.maxElementDepth`             | `elementDepth`         |
| `jdk.xml.maxXMLNameLimit`             | `nameLength`           |

## Catalog settings

| `javax.xml.catalog` feature | `catalogResolver` setting |
| --------------------------- | ------------------------- |
| `javax.xml.catalog.files`   | `files`                   |
| `javax.xml.catalog.prefer`  | `prefer`                  |
| `javax.xml.catalog.defer`   | `defer`                   |
| `javax.xml.catalog.resolve` | `resolution`              |

## Differences you will notice

- **Factories are immutable.** Every option is passed to the constructor; `factory.withOptions(options)` returns a copy
  with those options changed.
- **Nothing external is read by default.** `accessExternalDTD` and `accessExternalEntities` default to empty, so an
  external DTD or entity is read only when its protocol is listed and a resolver or catalog supplies it.
- **Recoverable errors are thrown by default.** Without an `error` function in the error handler, a validity error is
  thrown and parsing stops.
- **Reading a stream does not block.** An asynchronous cursor returns `EventType.NEED_INPUT` from `next()` when it needs
  more input, and `await reader.fill()` supplies it. See [Large files and streams](/guide/cursor/streams).
- **Two more event types.** With `reportEntityBoundaries` on, the cursor reports `START_ENTITY` and `END_ENTITY`. A
  `switch` over event types should tolerate unknown types.
- **Attribute lookup takes the local name first:** `attribute(localName, namespaceURI?)`.
- **The writer's four-argument `writeAttribute` takes the local name before the namespace:**
  `writeAttribute(prefix, localName, namespaceURI, value)`, the same order as `writeStartElement`.
- **`getAttribute` on a DOM element returns `null` for a missing attribute,** as browsers do. Construct the builder with
  `{ missingAttribute: 'empty' }` for Java's empty string.
- **`name()` is a string.** The cursor's `name()` and `attributeName(i)` return the qualified name as written. Event
  objects carry a `QName`.
- **Several filters in one call.** `createFilteredReader(reader, filterA, filterB)` applies the filters in order, and
  `createDelegatedReader(reader, new A(), new B())` chains the delegates.
- **A SAX handler is one object.** Content, lexical, DTD, declaration and error callbacks are all methods of the same
  handler, which is passed to `parse`.
- **Builders also accept a reader.** `DocumentBuilder.parse(reader)`, `XdmDocumentBuilder.parse(reader)` and
  `SAXParser.parse(reader, handler)` start at the reader's current position. See
  [One record at a time](/guide/cursor/records).
- **Locations report where an event starts,** not where it ends as the JDK's do. Lines and columns count from 1, and
  columns count UTF-16 code units, as JavaScript strings do.
- **`hasNext()` is false once a reader has failed,** so a loop over a malformed document terminates after the error.
- **The writer writes `<a/>` for an element with no content,** whether it was written with `writeEmptyElement` or with
  `writeStartElement` followed immediately by `writeEndElement`.
- **The writer escapes more by default,** so that the output round-trips: parsing it returns exactly the text written.
  Set `escaping: 'minimal'` for less.
- **Closing a writer is asynchronous** when the destination is a stream: `await writer.close()`.
- **Names follow the current edition of XML 1.0,** which allows more characters in names than the JDK's parser accepts.
- **An enumerated attribute's type is reported as `NMTOKEN`,** as SAX reports it.
