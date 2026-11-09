# Error codes

Every error code, grouped by prefix, with the condition that raises it. [Errors and locations](/guide/errors) covers
catching errors and reading their locations.

The codes of the XML packages are the values of `ErrorCode` from `@exemplarjs/xml`. Each member's value is its own name,
so `error.code === 'WF_TAG'` and `error.code === ErrorCode.WF_TAG` are equivalent.

## How each family is reported

Each code is reported at one of three severities: fatal error, recoverable error or warning.
[Errors and locations](/guide/errors#which-problems-stop-reading) describes them.

| Family                | Codes                                                                         | Kind                                                       |
| --------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Not well-formed       | `WF_*`                                                                        | Fatal error                                                |
| Namespaces            | `NS_*`                                                                        | Fatal error                                                |
| Encoding              | `ENCODING_*`                                                                  | Fatal error, except the two marked below                   |
| Limits                | `LIMIT_*`                                                                     | Fatal error                                                |
| Access and resolution | `DOCTYPE_DISALLOWED`, `ACCESS_REFUSED`, `RESOLVER_FAILED`, `RESOLVER_MISSING` | Fatal error, except `ACCESS_REFUSED`, which is recoverable |
| DTD declarations      | `DTD_DUPLICATE_*`                                                             | Warning                                                    |
| Validity              | `VC_*`                                                                        | Recoverable error                                          |
| `xml:id`              | `XMLID_*`                                                                     | Warning                                                    |
| Catalogs              | `CATALOG_*`                                                                   | Fatal error                                                |
| XInclude              | `XINCLUDE_*`                                                                  | Fatal error                                                |
| Canonical XML         | `C14N_*`                                                                      | `canonicalize` throws an `XMLError`                        |
| Writer                | `WRITE_*`                                                                     | The write throws a `WriterError`                           |
| XPath                 | `XPST*`, `XPTY*`, `XPDY*`, `FO*` and others                                   | An `XPathException` is thrown                              |

A fatal error is passed to the error handler's `fatalError` and then thrown as an `XMLError`. A recoverable error is
passed to the handler's `error`, or thrown when the handler has no `error` function, which is the default. A warning is
passed to `warning` and is never thrown.

An error's `message` combines its code, its `description` and its location, as in
`WF_END_TAG_MISMATCH: Expected </title> (file:///data/books.xml 3:30)`.

## Not well-formed: the document

| Code                           | Meaning                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `WF_EMPTY_DOCUMENT`            | The document has no root element                                                         |
| `WF_XML_DECLARATION`           | The XML declaration is malformed                                                         |
| `WF_XML_DECLARATION_MISPLACED` | The XML declaration is not at the start of the document                                  |
| `WF_DOCTYPE`                   | The DOCTYPE is malformed                                                                 |
| `WF_DOCTYPE_MISPLACED`         | A DOCTYPE comes after the root element, or there is a second DOCTYPE                     |
| `WF_CONTENT_OUTSIDE_ROOT`      | Text, CDATA or a reference comes before or after the root element                        |
| `WF_SECOND_ROOT`               | There is a second root element                                                           |
| `WF_UNEXPECTED_END`            | The input ends inside an unterminated construct, such as a tag or a comment              |
| `WF_INVALID_CHARACTER`         | A character that the document's XML version does not permit, such as a control character |
| `WF_LINE_END_IN_DECLARATION`   | An XML 1.1 line-end character (U+0085 or U+2028) inside an XML or text declaration       |

## Not well-formed: markup

| Code                     | Meaning                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `WF_NAME`                | A name is missing where one is expected, such as after `<`                           |
| `WF_MARKUP`              | `<!` does not begin a comment, CDATA section or DOCTYPE                              |
| `WF_TAG`                 | A start or end tag is malformed                                                      |
| `WF_END_TAG_MISMATCH`    | An end tag does not match the open element, or has no start tag                      |
| `WF_UNCLOSED_ELEMENT`    | An element is still open at the end of the document                                  |
| `WF_ATTRIBUTE`           | An attribute is malformed: no `=`, or a value without quotes                         |
| `WF_DUPLICATE_ATTRIBUTE` | An attribute appears twice in one start tag                                          |
| `WF_LT_IN_ATTRIBUTE`     | `<` appears in an attribute value, literally or through an entity's replacement text |
| `WF_COMMENT`             | `--` appears inside a comment                                                        |
| `WF_PI`                  | A processing instruction is malformed                                                |
| `WF_PI_TARGET_XML`       | A processing instruction's target is `xml` in a different letter case, such as `XML` |
| `WF_CDATA_END_IN_TEXT`   | `]]>` appears in text outside a CDATA section                                        |

## Not well-formed: references and entities

| Code                              | Meaning                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `WF_REFERENCE`                    | A reference is malformed, such as `&` without a name or `;`                                            |
| `WF_CHARACTER_REFERENCE`          | A character reference is malformed, or names a character that is not allowed                           |
| `WF_UNDECLARED_ENTITY`            | A reference names an entity that is not declared                                                       |
| `WF_RECURSIVE_ENTITY`             | An entity refers to itself, directly or through others                                                 |
| `WF_UNPARSED_ENTITY`              | A reference names an unparsed entity, one declared with `NDATA`                                        |
| `WF_EXTERNAL_ENTITY_IN_ATTRIBUTE` | An attribute value refers to an external entity                                                        |
| `WF_ENTITY_CONTENT`               | An entity's replacement text is not balanced: it closes an element it did not open, or leaves one open |
| `WF_ENTITY_VERSION`               | An XML 1.1 external entity is used in an XML 1.0 document                                              |

Two related codes are recoverable errors:

| Code                         | Meaning                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `VC_ENTITY_DECLARED`         | A reference names an undeclared entity, in a document whose DTD may declare it elsewhere           |
| `UNREAD_ENTITY_IN_ATTRIBUTE` | An attribute value refers to an entity that may be declared in a part of the DTD that was not read |

## Not well-formed: the DTD

| Code                         | Meaning                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `WF_DECLARATION`             | A declaration in the DTD is malformed                                                     |
| `WF_PE_IN_INTERNAL_SUBSET`   | A parameter-entity reference appears inside a declaration in the internal DTD subset      |
| `WF_PE_BETWEEN_DECLARATIONS` | A parameter entity referenced between declarations does not contain complete declarations |
| `WF_CONDITIONAL_SECTION`     | A conditional section is malformed, or appears in the internal DTD subset                 |
| `WF_TEXT_DECLARATION`        | The text declaration at the start of an external entity is malformed                      |

See [DTDs and entities](/guide/external/dtd).

## Namespaces

| Code                     | Meaning                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `NS_QNAME`               | A name has more than one colon, or a colon at either end                |
| `NS_COLON`               | A colon appears in a name that may not have one, such as an entity name |
| `NS_UNBOUND_PREFIX`      | A prefix has no namespace declaration in scope                          |
| `NS_RESERVED`            | The reserved `xml` or `xmlns` prefixes or namespaces are misused        |
| `NS_UNDECLARED_PREFIX`   | `xmlns:p=""` in an XML 1.0 document, which cannot undeclare a prefix    |
| `NS_DUPLICATE_ATTRIBUTE` | Two attributes have the same namespace URI and local name               |

These are raised only with `namespaceAware` on, the default. See [Namespaces](/guide/namespaces).

## Encoding

| Code                         | Meaning                                                                                                                  | Kind              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| `ENCODING_UNSUPPORTED`       | No decoder is registered for the document's encoding                                                                     | Fatal error       |
| `ENCODING_INVALID_BYTES`     | The document contains a byte sequence that is invalid in its encoding                                                    | Fatal error       |
| `ENCODING_MISMATCH`          | The encoding named in the XML declaration contradicts the byte-order mark or the initial bytes                           | Fatal error       |
| `ENCODING_UNDECLARED`        | The document is in UTF-16 or another encoding that must be declared, and has neither a byte-order mark nor a declaration | Fatal error       |
| `ENCODING_UTF16_WITHOUT_BOM` | The document is declared as `UTF-16` but has no byte-order mark                                                          | Recoverable error |
| `ENCODING_CONFLICT`          | The encoding supplied with the source differs from the declared encoding and overrides it                                | Warning           |

See [Encodings](/guide/production/encodings).

## Limits

| Code                          | Meaning                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `LIMIT_ENTITY_EXPANSIONS`     | More entity expansions than `limits.entityExpansions`                            |
| `LIMIT_TOTAL_ENTITY_SIZE`     | Entity expansions produce more characters in total than `limits.totalEntitySize` |
| `LIMIT_GENERAL_ENTITY_SIZE`   | One entity is longer than `limits.generalEntitySize`                             |
| `LIMIT_PARAMETER_ENTITY_SIZE` | One parameter entity is longer than `limits.parameterEntitySize`                 |
| `LIMIT_ENTITY_REPLACEMENT`    | More events are produced inside entities than `limits.entityReferenceNodes`      |
| `LIMIT_ELEMENT_DEPTH`         | Elements are nested deeper than `limits.elementDepth`                            |
| `LIMIT_ATTRIBUTES`            | An element has more attributes than `limits.attributesPerElement`                |
| `LIMIT_NAME_LENGTH`           | A name is longer than `limits.nameLength`                                        |

See [Limits](/reference/limits) for the defaults and [Untrusted input](/guide/production/security#tighten-a-limit).

## Access and resolution

| Code                 | Meaning                                                                                                                                   | Kind              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `DOCTYPE_DISALLOWED` | The document has a DOCTYPE and `disallowDoctype` is on                                                                                    | Fatal error       |
| `ACCESS_REFUSED`     | An external resource that a resolver or catalog could supply has a protocol not listed in `accessExternalDTD` or `accessExternalEntities` | Recoverable error |
| `RESOLVER_FAILED`    | Reserved for custom resolvers: thrown in a `ResolutionError` when the resolver cannot supply the requested resource                       | Fatal error       |
| `RESOLVER_MISSING`   | The access lists permit an external resource, but the factory has no resolver and no catalog                                              | Fatal error       |

See [Resolvers and access](/guide/external/resolvers#what-happens-when-access-is-refused).

## DTD declarations

| Code                      | Meaning                                                                                | Kind    |
| ------------------------- | -------------------------------------------------------------------------------------- | ------- |
| `DTD_DUPLICATE_ENTITY`    | A DTD declares an entity a second time; the first declaration is used                  | Warning |
| `DTD_DUPLICATE_ATTRIBUTE` | A DTD declares an attribute of an element a second time; the first declaration is used | Warning |

See [DTDs and entities](/guide/external/dtd).

## Validity

Reported only when a validator is set. Each is a recoverable error. See
[Validating against a DTD](/guide/external/validation).

### The document

| Code                     | Meaning                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `VC_ROOT_ELEMENT`        | There is no DOCTYPE, or the root element's name differs from the name the DOCTYPE declares       |
| `VC_ELEMENT_VALID`       | An element does not match its declared content, or is not declared                               |
| `VC_ATTRIBUTE_TYPE`      | An attribute is not declared for its element, or its value does not conform to its declared type |
| `VC_REQUIRED_ATTRIBUTE`  | A required attribute is missing                                                                  |
| `VC_FIXED_DEFAULT`       | An attribute declared with a fixed value is given a different one                                |
| `VC_ENUMERATION`         | An attribute's value is not one of its enumerated values                                         |
| `VC_ID`                  | An ID value is used more than once in the document                                               |
| `VC_IDREF`               | An IDREF value matches no ID in the document                                                     |
| `VC_ENTITY_NAME`         | An attribute of type `ENTITY` or `ENTITIES` does not name a declared unparsed entity             |
| `VC_NAME_TOKEN`          | An attribute of type `NMTOKEN` or `NMTOKENS` has a value that is not a valid name token          |
| `VC_NOTATION_ATTRIBUTES` | A `NOTATION` attribute's value or declaration names an undeclared notation                       |
| `VC_NAMESPACE_COLON`     | An ID, IDREF, ENTITY or NOTATION value contains a colon                                          |
| `VC_STANDALONE`          | A document that declares `standalone="yes"` depends on external declarations                     |

### The DTD

| Code                     | Meaning                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `VC_UNIQUE_ELEMENT_TYPE` | An element is declared more than once                                     |
| `VC_NO_DUPLICATE_TYPES`  | An element name appears twice in one mixed-content declaration            |
| `VC_PE_NESTING`          | A declaration or group starts in one parameter entity and ends in another |
| `VC_ONE_ID`              | An element has more than one ID attribute declared                        |
| `VC_ID_DEFAULT`          | An ID attribute is declared with a default value                          |
| `VC_ONE_NOTATION`        | An element has more than one `NOTATION` attribute declared                |
| `VC_NOTATION_EMPTY`      | A `NOTATION` attribute is declared for an element declared empty          |
| `VC_DUPLICATE_TOKENS`    | A token appears twice in one attribute's enumeration                      |
| `VC_DEFAULT_SYNTAX`      | An attribute's declared default does not conform to its type              |
| `VC_NOTATION_DECLARED`   | An unparsed entity names a notation that is not declared                  |
| `VC_UNIQUE_NOTATION`     | A notation is declared more than once                                     |

## `xml:id`

Reported without a validator. Each is a warning. See [DTDs and entities](/guide/external/dtd#find-elements-by-id).

| Code              | Meaning                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `XMLID_NAME`      | An `xml:id` value is not an NCName, a valid name without a colon      |
| `XMLID_TYPE`      | The DTD declares `xml:id` with a type other than ID                   |
| `XMLID_DUPLICATE` | An ID value is used twice, and at least one of the two is an `xml:id` |

## Normalization

| Code                   | Meaning                                                                               | Kind    |
| ---------------------- | ------------------------------------------------------------------------------------- | ------- |
| `NOT_FULLY_NORMALIZED` | The text of an XML 1.1 document is not fully normalized, with `checkNormalization` on | Warning |

## Catalogs

| Code                 | Meaning                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `CATALOG_NO_MATCH`   | No catalog entry matches a reference, and the catalog's `resolution` setting is `'strict'` |
| `CATALOG_UNREADABLE` | A catalog file listed in `files` cannot be found or read                                   |
| `CATALOG_CIRCULAR`   | A catalog file references itself, directly or through other catalogs                       |

See [Catalogs](/guide/external/catalogs).

## XInclude

| Code                   | Meaning                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `XINCLUDE_RESOURCE`    | A resource to include cannot be read, and there is no fallback                             |
| `XINCLUDE_POINTER`     | An `xpointer` is malformed or identifies nothing, and there is no fallback                 |
| `XINCLUDE_LOOP`        | A document includes itself, directly or through others                                     |
| `XINCLUDE_ATTRIBUTE`   | An attribute of `xi:include` is missing, not allowed or malformed                          |
| `XINCLUDE_STRUCTURE`   | `xi:include` or `xi:fallback` appears where it is not allowed                              |
| `XINCLUDE_ROOT`        | The root element is replaced by content other than exactly one element                     |
| `XINCLUDE_TEXT`        | Included text contains a character that XML does not permit                                |
| `XINCLUDE_DECLARATION` | Two included documents declare an unparsed entity or notation of the same name differently |

See [XInclude](/guide/external/xinclude).

## Canonical XML

`canonicalize` throws an `XMLError` with one of these codes.

| Code                      | Meaning                                                                         |
| ------------------------- | ------------------------------------------------------------------------------- |
| `C14N_UNREAD`             | The document's DTD or an entity was not read, so the result would be incomplete |
| `C14N_RELATIVE_NAMESPACE` | The document has a relative namespace URI                                       |
| `C14N_VERSION`            | The document is XML 1.1                                                         |

See [Canonical XML](/guide/writing/canonical).

## Writer

A write method throws a `WriterError` with one of these codes. Most are raised only while the writer's
`checkWellFormedness` is on, the default. `WRITE_ENCODING` is raised regardless, as are `WRITE_STATE` and
`WRITE_UNBOUND_PREFIX` for a write that cannot be performed at all, such as an end tag with no open element. See
[Writing XML](/guide/writing/#well-formedness-checks).

| Code                        | Meaning                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WRITE_NAME`                | A name is not valid, or a namespace declaration or entity reference is not allowed there                                                              |
| `WRITE_CHARACTER`           | A character that the XML version does not permit                                                                                                      |
| `WRITE_COMMENT`             | A comment contains `--` or ends with `-`                                                                                                              |
| `WRITE_PI`                  | A processing instruction has a target that is not allowed, or data that contains `?>`                                                                 |
| `WRITE_CDATA`               | A CDATA section contains `]]>`                                                                                                                        |
| `WRITE_STATE`               | The write is not valid in the writer's current state, such as an XML declaration after content or an end tag whose name differs from the open element |
| `WRITE_DUPLICATE_ATTRIBUTE` | An attribute, or a prefix's declaration, is written twice on one element                                                                              |
| `WRITE_UNBOUND_PREFIX`      | A name is in a namespace with no bound prefix, or in no namespace while a default namespace is in scope and `xmlns=""` has not been written           |
| `WRITE_ENCODING`            | A character that the output encoding cannot represent, in a name or comment; or a declared encoding that differs from the output encoding             |

## XPath

XPath errors are thrown as an `XPathException`, whose `code` is one of the standard XPath codes. exemplar adds no codes
of its own. The prefix of a code identifies the kind of error:

| Codes   | Kind                | Raised                       |
| ------- | ------------------- | ---------------------------- |
| `XPST…` | Static error        | At compilation               |
| `XPTY…` | Type error          | At compilation or evaluation |
| `XPDY…` | Dynamic error       | At evaluation                |
| `FO…`   | Function error      | At evaluation                |
| `SE…`   | Serialization error | When `serialize` runs        |
| `XQ…`   | Shared with XQuery  | At compilation or evaluation |

The most common codes:

| Code       | Meaning                                          |
| ---------- | ------------------------------------------------ |
| `XPST0003` | The expression has a syntax error                |
| `XPST0008` | A variable is not declared                       |
| `XPST0017` | No function has that name and arity              |
| `XPTY0004` | A value has the wrong type                       |
| `XPDY0002` | The expression needs a context item and has none |
| `FORG0001` | A value cannot be cast to the requested type     |
| `FODC0002` | A document cannot be read                        |
| `FOER0000` | `error()` was called without a code              |

The tree and value classes of `@exemplarjs/xdm` throw an `XdmError` with the same standard codes when used directly,
such as `FORG0001` from a failed cast. `XPathErrorCode`, exported by both `@exemplarjs/xpath` and `@exemplarjs/xdm`,
names the codes: `XPathErrorCode.UNDECLARED_NAME` is `'XPST0008'`. See
[Getting started with XPath](/guide/xpath/#handle-errors).

## Other errors

API misuse throws one of these errors, which carry no code. See
[Errors and locations](/guide/errors#errors-in-your-own-code).

| Error                      | When                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `InvalidArgumentError`     | An option or argument value is not one the API accepts, such as an unknown output encoding                               |
| `IllegalStateError`        | A method is called in a state that does not permit it, such as `elementText()` when the current event is not a start tag |
| `RangeError`               | A position is out of range, or a number exceeds the range of the requested type                                          |
| `AsyncReaderRequiredError` | A synchronous reader encounters a resolver or source that returns its result asynchronously                              |
| `PromiseNotAwaitedError`   | A synchronous XPath evaluation encounters a resolver that returns a promise                                              |
| `DOMException`             | A DOM operation is not allowed, with the standard DOM error names                                                        |
