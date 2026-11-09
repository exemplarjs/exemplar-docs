# Limits

The limits the readers enforce on a document, with their defaults and the error code each raises. They bound the memory
and time a document can consume, however small its input. [Untrusted input](/guide/production/security)
describes the attacks they guard against.

## Reader limits

An _entity_ is named replacement text declared in a DTD. The reader substitutes it for each reference to it, such as
`&name;`, and each substitution is one _expansion_.

| Limit                  | Default | What it counts                                                                  | Error when exceeded           |
| ---------------------- | ------- | ------------------------------------------------------------------------------- | ----------------------------- |
| `entityExpansions`     | 2,500   | Entity expansions in one document                                               | `LIMIT_ENTITY_EXPANSIONS`     |
| `totalEntitySize`      | 100,000 | Total characters produced by all entity expansions in one document              | `LIMIT_TOTAL_ENTITY_SIZE`     |
| `generalEntitySize`    | 100,000 | Characters in one general entity, referenced from content or an attribute value | `LIMIT_GENERAL_ENTITY_SIZE`   |
| `parameterEntitySize`  | 15,000  | Characters in one parameter entity, referenced from within the DTD              | `LIMIT_PARAMETER_ENTITY_SIZE` |
| `entityReferenceNodes` | 100,000 | Events produced inside entity replacement text                                  | `LIMIT_ENTITY_REPLACEMENT`    |
| `attributesPerElement` | 200     | Attributes on one element                                                       | `LIMIT_ATTRIBUTES`            |
| `elementDepth`         | 100     | Nesting depth of elements                                                       | `LIMIT_ELEMENT_DEPTH`         |
| `nameLength`           | 1,000   | Characters in one name                                                          | `LIMIT_NAME_LENGTH`           |

Exceeding a limit throws an `XMLError` with the code shown and ends the document. Document size and the length of
character data are not limited.

## Change a limit

Set `limits` on the factory. Omitted limits keep their defaults, which are also exported as `DEFAULT_LIMITS`.

```ts twoslash
import { DEFAULT_LIMITS, XMLInputFactory } from '@exemplarjs/xml';

const factory = new XMLInputFactory({
  limits: { elementDepth: 500, entityExpansions: 10_000 },
});

console.log(DEFAULT_LIMITS.elementDepth); // 100
console.log(factory.options.limits.elementDepth); // 500
console.log(factory.options.limits.nameLength); // 1000
```

::: tip Coming from Java
The defaults are those of JDK 24. [Coming from Java](/reference/java#limits) maps each limit to its `jdk.xml` property.
:::

## Fixed limits in XPath

These limits are fixed and not configurable.

| What is limited                                                                  | Limit      | Error when exceeded |
| -------------------------------------------------------------------------------- | ---------- | ------------------- |
| Integers materialized by a range expression such as `1 to 20000000`              | 10 million | `XPDY0130`          |
| Nesting of objects and arrays read by `parse-json`, `json-doc` and `json-to-xml` | 1,000 deep | `FOJS0001`          |
| Arity of a function item                                                         | 1,048,576  | `FOAR0002`          |

A comparison against a range, such as `$x = (1 to 100000000)`, does not materialize the integers and is not limited.
