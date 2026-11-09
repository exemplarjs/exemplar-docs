# Catalogs

A _catalog_ is an XML file, in the OASIS XML Catalogs format, that maps the identifiers documents use for external
resources to the URIs that are read instead. Use one when documents reference their [DTD](/guide/external/dtd) by URL
and it should be read from a local copy.

This document identifies its DTD by both a
[public identifier](/guide/external/dtd#when-the-dtd-is-in-a-separate-file) and a system identifier, here an HTTPS
URL.

```xml
<!DOCTYPE catalog PUBLIC "-//Example//DTD Bookshop 1.0//EN" "https://shop.example/dtd/catalog.dtd">
<catalog>
  <book id="b1"><title>Dune</title></book>
</catalog>
```

Fetching that URL for every document makes parsing depend on the network and on whatever a third-party server
returns. A catalog file maps both identifiers to a local file:

```xml
<catalog xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog">
  <public publicId="-//Example//DTD Bookshop 1.0//EN" uri="catalog.dtd"/>
  <system systemId="https://shop.example/dtd/catalog.dtd" uri="catalog.dtd"/>
</catalog>
```

With the catalog file set on a factory, the DTD is read from `/opt/schemas/catalog.dtd`, the file next to the
catalog:

```ts twoslash
import { catalogResolver } from '@exemplarjs/catalog';
import { DocumentBuilder } from '@exemplarjs/dom';
import { XMLInputFactory } from '@exemplarjs/xml';

const xml = new XMLInputFactory({
  accessExternalDTD: ['file'],
  catalog: catalogResolver({ files: ['file:///opt/schemas/catalog.xml'] }),
});

const document = new DocumentBuilder(xml).parse(source);
```

Nothing is fetched from `shop.example`.

## Set a catalog up

The catalog resolver is a separate package:

::: code-group

```bash [npm]
npm install @exemplarjs/catalog
```

```bash [pnpm]
pnpm add @exemplarjs/catalog
```

```bash [yarn]
yarn add @exemplarjs/catalog
```

:::

Call `catalogResolver` with the catalog files to search, in order, and pass the result as the factory's `catalog`
option. Each file is given as an absolute URI, such as `file:///opt/schemas/catalog.xml`; a bare path throws an
`InvalidArgumentError`, as does an invalid `prefer` or `resolution` value.

Inside a catalog file, a relative `uri` is resolved against the catalog file's own URI, so a catalog and the files it
maps to can be kept in one directory and moved together.

Many published DTDs, such as DocBook's, ship with a catalog file.

## Write the catalog file

A catalog can map every kind of external reference. Each kind has its own entry:

| Entry in the catalog file        | Matches                                  | Used for                                     |
| -------------------------------- | ---------------------------------------- | -------------------------------------------- |
| `<public publicId="…" uri="…"/>` | A public identifier                      | DTDs and entities                            |
| `<system systemId="…" uri="…"/>` | The system identifier of a DTD or entity | DTDs and entities                            |
| `<uri name="…" uri="…"/>`        | Any other URI                            | [XInclude](/guide/external/xinclude) targets |

If a DTD or entity matches no `public` or `system` entry, the `uri` entries are tried as well, and the reverse holds
for an XInclude target. One entry per URI is enough.

## The access lists apply to the mapped address

A catalog does not bypass the [access lists](/guide/external/resolvers#why-there-are-two-steps). They are checked
against the URI the catalog maps _to_, because that is the URI that is read.

The example therefore needs `'file'` and not `'https'`: the document references `https://shop.example/…`, but
exemplar opens a local file. If the list does not allow it, the error names the URI that was refused:

```text
ACCESS_REFUSED: Reading file:///opt/schemas/catalog.dtd is not allowed: the access list does not name 'file' (1:1)
```

DTDs are checked against `accessExternalDTD`, and entities and XInclude targets against `accessExternalEntities`.

## Use a catalog with your own resolver

A factory can have both a catalog and a custom [resolver](/guide/external/resolvers). They are called in this order:

1. The resolver is called with the reference as the document writes it.
2. If it declines, the catalog is searched.
3. If the catalog maps the reference to another URI, the resolver is called again with that URI.
4. If it declines again, the catalog reads the mapped URI itself.

Because of step 3, a resolver that can read a given kind of URI is also used for the URIs the catalog maps to. Local
files need no resolver: the catalog reads them.

## Decide what happens to an unknown identifier

The `resolution` setting determines what happens when no catalog entry matches a reference.

| `resolution` | A DTD or entity with no catalog entry                                     | Use it when                                             |
| ------------ | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| `'strict'`   | The document fails with the code `CATALOG_NO_MATCH`. This is the default. | Every document must use an approved DTD                 |
| `'continue'` | Parsing continues as if there were no catalog: the content is skipped     | The catalog supplies local copies but restricts nothing |
| `'ignore'`   | The content is read as if it were empty                                   | Unknown content should count as read and empty          |

```ts twoslash
import { catalogResolver } from '@exemplarjs/catalog';
// ---cut---
const lenient = catalogResolver({
  files: ['file:///opt/schemas/catalog.xml'],
  resolution: 'continue',
});
```

Under `'strict'` the error names the identifier that was not found:

```text
CATALOG_NO_MATCH: No catalog entry matches system id https://other.example/unknown.dtd (1:1)
```

`'continue'` and `'ignore'` differ in how entities are reported:

- For an [external entity](/guide/external/dtd#when-the-dtd-is-in-a-separate-file) with no catalog entry, a reference
  to it is reported as an `ENTITY_REFERENCE` event under `'continue'`, and produces no event under `'ignore'`.
- For a DTD with no catalog entry, a reference to an entity it may have declared is reported as an `ENTITY_REFERENCE`
  event under `'continue'`. Under `'ignore'` the DTD counts as read and declares nothing, so the same reference is an
  error with the code `VC_ENTITY_DECLARED`.

An XInclude target with no catalog entry fails the document under `'strict'`, whether or not the include has a
fallback. Under `'continue'` and `'ignore'` it counts as missing, so the fallback is used if there is one.

::: warning
A catalog file in `files` that cannot be found or read fails the first lookup with `CATALOG_UNREADABLE`, naming the
file, so a mistyped URI is reported immediately. A catalog file that another catalog references is treated
differently: when it cannot be read it is skipped, and the search continues.
:::

::: tip Coming from Java
`javax.xml.catalog` skips a catalog file it cannot read, whichever way it was named.
:::

## Run where there is no file system

On Node, Deno and Bun, the catalog reads `file:` URIs itself. In a browser, or any other runtime without a file
system, pass a `read` function. It is called with a URI, both for catalog files and for the resources they map to,
and returns the content or `undefined`.

```ts twoslash
import { catalogResolver } from '@exemplarjs/catalog';
import { XMLInputFactory } from '@exemplarjs/xml';
declare const bundled: Map<string, Uint8Array>;
// ---cut---
const catalog = catalogResolver({
  files: ['memory:/catalog.xml'],
  read(uri) {
    const bytes = bundled.get(uri);
    return bytes && { systemId: uri, bytes };
  },
});

const xml = new XMLInputFactory({ accessExternalDTD: ['memory'], catalog });
```

The access list names whatever protocol the URIs use, here `'memory'`.

`read` is synchronous, so load the content it serves before parsing any document.

## Match many identifiers at once

One entry per identifier is enough for most catalogs. For larger collections the catalog format has entries that
rewrite a URI prefix, match a URI suffix, and split a catalog across files.

::: details Entries and rules for larger catalogs

**Map a whole directory.** A rewrite entry replaces a URI prefix, so one entry covers every file below it:

```xml
<rewriteSystem systemIdStartString="https://shop.example/dtd/" rewritePrefix="dtd/"/>
<rewriteURI uriStartString="https://shop.example/chapters/" rewritePrefix="chapters/"/>
```

**Match the end of a URI.** A suffix entry matches whichever host the document names:

```xml
<systemSuffix systemIdSuffix="/catalog.dtd" uri="dtd/catalog.dtd"/>
<uriSuffix uriSuffix="/one.xml" uri="chapters/one.xml"/>
```

**Split a catalog across files.** `nextCatalog` names another catalog file to search when this one has no match.
`delegatePublic`, `delegateSystem` and `delegateURI` send every identifier with a given prefix to another catalog
file, and search only that file.

```xml
<nextCatalog catalog="more/catalog.xml"/>
<delegatePublic publicIdStartString="-//OASIS//" catalog="oasis/catalog.xml"/>
```

**Choose between public and system identifiers.** When a document gives both and they match different entries, the
`system` entry wins. The `prefer` setting, on `catalogResolver` or as a `prefer` attribute in the file, decides whether
`public` entries are considered at all when the document also gives a system identifier. The default, `'public'`,
considers them; `'system'` does not.

**Which entry wins.** In one file, an exact `system` entry beats a rewrite, a rewrite beats a suffix, and those beat
delegation; `public` entries come after. Of several rewrites or suffixes that match, the longest wins.

**Groups and base URIs.** `<group>` wraps entries to give them a common `prefer` or `xml:base`.

**Loading.** Catalog files are read when they are first needed. Pass `defer: false` to read them all when the
resolver is created; `catalogResolver` then throws a `ResolutionError` if one named in `files` cannot be read. A
catalog file that leads back to itself fails the document with `CATALOG_CIRCULAR`.

:::

::: tip Coming from Java
`catalogResolver` takes the settings of `javax.xml.catalog`: `files`, `prefer`, `defer`, and `resolve` under the name
`resolution`. The resolver can also be passed as an `entityResolver` or `uriResolver`, like the resolver
`CatalogManager.catalogResolver` returns; used that way it reads the mapped URIs itself and checks no access list.
:::

## Next steps

- [Validating against a DTD](/guide/external/validation) validates against the DTD a catalog supplies.
- [XInclude](/guide/external/xinclude) reads included documents through the catalog too.
- [Resolvers and access](/guide/external/resolvers) covers access lists and custom resolvers.
