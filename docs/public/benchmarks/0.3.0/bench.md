# Benchmarks

2026-11-21 · AMD Ryzen 9 7900 12-Core Processor, 4 cores, 8 GB, linux x64 · Node 24.13.1, V8 13.6.233.17-node.40 · commit 2ae27f9 · best of 3 rounds

[At a glance](#at-a-glance) · [How much each library checks](#how-much-each-library-checks) · [Datasets](#datasets) · [FreeBSD docs](#freebsd-docs) · [FreeBSD docs (simplified)](#freebsd-docs-simplified) · [PostgreSQL book](#postgresql-book) · [OpenStack manuals](#openstack-manuals) · [XMark](#xmark) · [Expat recordsets](#expat-recordsets) · [DocBook DTD with entity sets](#docbook-dtd-with-entity-sets) · [Synthetic, 100 K elements](#synthetic-100-k-elements) · [Synthetic, 1 M elements](#synthetic-1-m-elements)

## At a glance

Speeds are in MB of input per second, from the best of 3 rounds, over the documents each library read correctly. A library that read only part of a dataset correctly is timed on that part, so its speed and exemplar's cover different documents. ‡ marks a library that read at least half of the data, by size, but not all of it; in the charts its bars are orange from 95% and red below. FAILED marks one that read less than half, whose speed would say little about the dataset. exemplar's bars are always blue, and – marks a workload the library does not have.

In each workload, a library:

- `walk` parses and visits every event, reading nothing.
- `read` reads every element name, attribute and text.
- `stream` reads the same from a file in 64 KB chunks.
- `small` reads documents of 2–20 KB, which shows the cost per document.
- `tree` builds the library's own tree.
- `xdm` builds an XDM tree, the data model XPath, XQuery and XSLT run on.
- `xpath` runs a set of XPath queries over each document, parsed beforehand: the XMark queries on XMark, general ones elsewhere.
- `axes` times tree walks along every axis one by one, over the document parsed beforehand: XMark's names only.
- `compile` compiles each of the dataset's XPath queries 200 times, every copy made unique so that no cache answers, and runs it over a one-element document; shown in expressions compiled per second.
- `write` serializes events it read beforehand.
- `dtd` reads a one-element document with its large DTD, counting the DTD with the document.

### Reading, MB/s

![Reading speed](charts/read.svg)

| Dataset | exemplar | htmlparser2 | sax | saxen | saxes | stax-xml |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [FreeBSD docs](#freebsd-docs) | 154.9 | FAILED | FAILED | FAILED | FAILED | FAILED |
| [FreeBSD docs (simplified)](#freebsd-docs-simplified) | 322.1 | 178.7 | 54.1 | 264.1 | 157.2 | 181.8 ‡ |
| [PostgreSQL book](#postgresql-book) | 292.7 | 136.4 | 51.4 | 237.0 | 129.7 | 161.4 |
| [OpenStack manuals](#openstack-manuals) | 219.3 | 128.8 ‡ | 45.0 ‡ | 209.7 ‡ | 111.2 | 121.2 ‡ |
| [XMark](#xmark) | 376.6 | 154.0 | 69.4 | 306.1 | 147.5 | 215.1 |
| [Expat recordsets](#expat-recordsets) | 133.9 | 77.3 | 27.8 | 78.5 | 73.2 | 102.4 |
| [Synthetic, 100 K elements](#synthetic-100-k-elements) | 182.0 | 98.0 | 43.4 | 118.3 | 73.0 | 109.6 |
| [Synthetic, 1 M elements](#synthetic-1-m-elements) | 219.1 | 98.2 | 44.1 | 129.3 | 76.2 | 122.7 |

### Streaming from a file, MB/s

![Streaming speed](charts/stream.svg)

| Dataset | exemplar | htmlparser2 | sax | saxen | saxes | stax-xml |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [FreeBSD docs](#freebsd-docs) | 87.7 | FAILED | FAILED | FAILED | FAILED | FAILED |
| [FreeBSD docs (simplified)](#freebsd-docs-simplified) | 177.5 | 111.8 | 43.9 ‡ | 98.4 | 102.9 | 82.5 ‡ |
| [PostgreSQL book](#postgresql-book) | 164.8 | 117.3 | 50.9 | 133.6 | 110.3 | 88.3 |
| [OpenStack manuals](#openstack-manuals) | 108.0 | 36.3 ‡ | 22.1 ‡ | 34.0 ‡ | 34.6 | 33.3 ‡ |
| [XMark](#xmark) | 256.8 | 141.3 | 68.4 | 209.7 | 133.6 | 119.9 |
| [Expat recordsets](#expat-recordsets) | 103.9 | 74.7 | 27.9 | 62.7 | 69.1 | 89.2 |
| [Synthetic, 100 K elements](#synthetic-100-k-elements) | 130.0 | 90.5 | 42.1 | 92.2 | 64.2 | 66.0 |
| [Synthetic, 1 M elements](#synthetic-1-m-elements) | 141.5 | 91.7 | 43.7 | 101.2 | 68.8 | 81.1 |

### Building trees, MB/s

![Tree building speed](charts/tree.svg)

| Dataset | exemplar | fast-xml-parser | libxmljs2 | saxon-js-2 | saxon-js-3 | txml | @xmldom/xmldom |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [FreeBSD docs](#freebsd-docs) | 87.4 | FAILED | 85.4 ‡ | FAILED | FAILED | FAILED | FAILED |
| [FreeBSD docs (simplified)](#freebsd-docs-simplified) | 168.6 | 40.0 ‡ | 167.0 | 31.9 | 31.8 | FAILED | 22.1 |
| [PostgreSQL book](#postgresql-book) | 134.9 | FAILED | 275.3 | 29.7 | 28.5 | FAILED | 19.4 |
| [OpenStack manuals](#openstack-manuals) | 124.9 | FAILED | 214.8 | 27.9 | 27.1 | FAILED | 21.5 |
| [XMark](#xmark) | 173.9 | 41.6 | 351.4 | 37.3 | 37.2 | 148.1 | 23.0 |
| [Expat recordsets](#expat-recordsets) | 86.2 | FAILED | 126.1 | 23.1 | 23.1 | 88.2 | 37.2 |
| [Synthetic, 100 K elements](#synthetic-100-k-elements) | 99.2 | 25.0 | 182.8 | 26.2 | 25.7 | 88.6 | 16.2 |
| [Synthetic, 1 M elements](#synthetic-1-m-elements) | 99.2 | 26.5 | 183.8 | 25.7 | 25.6 | 91.6 | 15.9 |

### Building XDM trees, MB/s

![XDM tree building speed](charts/xdm.svg)

| Dataset | exemplar | saxon-js-2 | saxon-js-3 |
| --- | ---: | ---: | ---: |
| [FreeBSD docs](#freebsd-docs) | 94.5 | FAILED | FAILED |
| [FreeBSD docs (simplified)](#freebsd-docs-simplified) | 164.2 | 31.9 | 31.9 |
| [PostgreSQL book](#postgresql-book) | 150.3 | 29.0 | 29.0 |
| [OpenStack manuals](#openstack-manuals) | 108.5 | 28.0 | 27.2 |
| [XMark](#xmark) | 200.2 | 37.1 | 36.2 |
| [Expat recordsets](#expat-recordsets) | 74.9 | 23.0 | 22.8 |
| [Synthetic, 100 K elements](#synthetic-100-k-elements) | 90.5 | 26.0 | 26.2 |
| [Synthetic, 1 M elements](#synthetic-1-m-elements) | 103.8 | 25.7 | 25.3 |

### Querying with XPath, MB/s

![XPath query speed](charts/xpath.svg)

| Dataset | exemplar | saxon-js-2 | saxon-js-3 |
| --- | ---: | ---: | ---: |
| [FreeBSD docs](#freebsd-docs) | 67.2 | FAILED | FAILED |
| [FreeBSD docs (simplified)](#freebsd-docs-simplified) | 69.7 | 6.4 | 6.4 |
| [PostgreSQL book](#postgresql-book) | 53.2 | 5.1 | 5.1 |
| [OpenStack manuals](#openstack-manuals) | 44.3 | 6.0 | 5.7 |
| [XMark](#xmark) | 233.5 | 7.4 | 7.7 |
| [Expat recordsets](#expat-recordsets) | 628.8 | 43.2 | 42.9 |
| [Synthetic, 100 K elements](#synthetic-100-k-elements) | 43.3 | 3.9 | 3.9 |
| [Synthetic, 1 M elements](#synthetic-1-m-elements) | 48.8 | 3.9 | 3.9 |

### Compiling XPath, expressions per second

![XPath compilation speed](charts/compile.svg)

| Dataset | exemplar | saxon-js-2 | saxon-js-3 |
| --- | ---: | ---: | ---: |
| [OpenStack manuals](#openstack-manuals) | 110127 | 54081 | 52564 |
| [XMark](#xmark) | 79008 | 27799 | 27727 |

### Reading DTDs, MB/s

![DTD reading speed](charts/dtd.svg)

| Dataset | exemplar | libxmljs2 |
| --- | ---: | ---: |
| [DocBook DTD with entity sets](#docbook-dtd-with-entity-sets) | 144.4 | 81.4 |

### Memory the trees hold

MB still in use once every document's tree has been built and kept: heap, native memory V8 is told of, and native memory a library reports itself. ‡ and FAILED mean the same as for speeds: a library that failed some documents holds fewer trees.

![Memory the trees hold](charts/memory.svg)

| Dataset | exemplar | fast-xml-parser | libxmljs2 | saxon-js-2 | saxon-js-3 | txml | @xmldom/xmldom |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [FreeBSD docs](#freebsd-docs) | 242 | FAILED | 280 ‡ | FAILED | FAILED | FAILED | FAILED |
| [FreeBSD docs (simplified)](#freebsd-docs-simplified) | 449 | 459 ‡ | 556 | 963 | 963 | FAILED | 1559 |
| [PostgreSQL book](#postgresql-book) | 67 | FAILED | 73 | 133 | 133 | FAILED | 224 |
| [OpenStack manuals](#openstack-manuals) | 37 | FAILED | 59 | 74 | 74 | FAILED | 123 |
| [XMark](#xmark) | 629 | 666 | 730 | 1151 | 1151 | 538 | 2081 |
| [Expat recordsets](#expat-recordsets) | 604 | FAILED | 641 | 490 | 490 | 247 | 743 |
| [Synthetic, 100 K elements](#synthetic-100-k-elements) | 59 | 40 | 61 | 82 | 82 | 33 | 143 |
| [Synthetic, 1 M elements](#synthetic-1-m-elements) | 591 | 395 | 614 | 813 | 813 | 330 | 1435 |

### Memory the XDM trees hold

MB still in use once every document's tree has been built and kept: heap, native memory V8 is told of, and native memory a library reports itself. ‡ and FAILED mean the same as for speeds: a library that failed some documents holds fewer trees.

![Memory the XDM trees hold](charts/memory-xdm.svg)

| Dataset | exemplar | saxon-js-2 | saxon-js-3 |
| --- | ---: | ---: | ---: |
| [FreeBSD docs](#freebsd-docs) | 90 | FAILED | FAILED |
| [FreeBSD docs (simplified)](#freebsd-docs-simplified) | 200 | 963 | 963 |
| [PostgreSQL book](#postgresql-book) | 31 | 133 | 133 |
| [OpenStack manuals](#openstack-manuals) | 16 | 74 | 74 |
| [XMark](#xmark) | 209 | 1151 | 1151 |
| [Expat recordsets](#expat-recordsets) | 139 | 490 | 490 |
| [Synthetic, 100 K elements](#synthetic-100-k-elements) | 18 | 82 | 82 |
| [Synthetic, 1 M elements](#synthetic-1-m-elements) | 172 | 813 | 813 |

## How much each library checks

A library that checks less of XML can be faster. From the conformance reports: "Rejects malformed" is the share of the not-well-formed test documents a library rejects, and "Correct data" the share of the expected outputs it matches.

![How much each library checks](charts/checking.svg)

| Library | Rejects malformed | Correct data |
| --- | ---: | ---: |
| exemplar | 99.7% | 100.0% |
| fast-xml-parser | 41.0% | 68.5% |
| htmlparser2 | 12.7% | 53.1% |
| libxmljs2 | 94.5% | 91.0% |
| sax | 48.6% | 62.5% |
| saxen | 30.9% | 52.1% |
| saxes | 70.3% | 91.4% |
| saxon-js-2 | 47.7% | 89.6% |
| saxon-js-3 | 47.7% | 89.6% |
| stax-xml | 70.2% | 61.0% |
| txml | 14.0% | 49.3% |
| @xmldom/xmldom | 84.7% | 89.7% |

## Datasets

Preparing a dataset checks every document with the JDK's Xerces and keeps only those it accepts.

| Dataset | Documents | MB | Left out in preparation | Version | Licence |
| --- | ---: | ---: | ---: | --- | --- |
| [FreeBSD docs](#freebsd-docs) | 1,830 | 40.7 | 734 | release/12.2.0 (6525fd04), LF turned into CRLF | FreeBSD Documentation License |
| [FreeBSD docs (simplified)](#freebsd-docs-simplified) | 1,715 | 92.6 | 38 | release/12.2.0 (6525fd04), entities resolved and DOCTYPE removed by xmllint | FreeBSD Documentation License |
| [PostgreSQL book](#postgresql-book) | 1 | 12.2 | 0 | REL_18_0, assembled into one document by xmllint | PostgreSQL Licence |
| [OpenStack manuals](#openstack-manuals) | 966 | 6.5 | 50 | juno-eol (304d14ff) | Apache-2.0, CC BY 3.0 and CC BY-SA 3.0, by book |
| [XMark](#xmark) | 1 | 116.5 | 0 | xmlgen from CWI, factor 1 | Unclear; generated locally and never redistributed |
| [Expat recordsets](#expat-recordsets) | 2 | 66.0 | 0 | libexpat b8fedbbf | MIT |
| [DocBook DTD with entity sets](#docbook-dtd-with-entity-sets) | 20 | 46.2 | 0 | release/12.2.0 (6525fd04); xmlcharent 0.3 | FreeBSD Documentation License; xmlcharent under its OASIS notice |
| [Synthetic, 100 K elements](#synthetic-100-k-elements) | 1 | 6.2 | 0 | seed 1 | generated |
| [Synthetic, 1 M elements](#synthetic-1-m-elements) | 1 | 61.7 | 0 | seed 1 | generated |

## FreeBSD docs

- The FreeBSD documentation as published at release 12.2.0, with its LF line endings turned into CRLF, so that reading normalizes them.
- Internal subsets, eight encodings including Japanese in EUC-JP, and documents of every size.
- Read standalone, as every dataset is: no library reads the external DocBook and FreeBSD DTDs, so references to the entities they declare, such as `&os;`, are not expanded.
- Where such a reference makes a document malformed, preparation leaves the document out; where an unread part of the DTD could declare it, the reference is skipped, as the XML specification allows.

1,830 documents, 40.7 MB. Speeds are in MB/s, except `compile`, in expressions per second.

| Library | Reads correctly | `walk` | `read` | `stream` | `small` | `tree` | `xdm` | `xpath` | `write` | Tree MB | XDM MB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| exemplar | 100% | 196.3 | 154.9 | 87.7 | 95.7 | 87.4 | 94.5 | 67.2 | 135.3 | 242 | 90 |
| fast-xml-parser | 11% | – | – | – | – | FAILED | – | – | – | FAILED | – |
| htmlparser2 | <1% | FAILED | FAILED | FAILED | FAILED | – | – | – | – | – | – |
| libxmljs2 | 84% | – | – | – | – | 85.4 ‡ | – | – | – | 280 ‡ | – |
| sax | <1% | FAILED | FAILED | FAILED | FAILED | – | – | – | – | – | – |
| saxen | <1% | FAILED | FAILED | FAILED | FAILED | – | – | – | – | – | – |
| saxes | 37% | FAILED | FAILED | FAILED | FAILED | – | – | – | – | – | – |
| saxon-js-2 | 14% | – | – | – | – | FAILED | FAILED | FAILED | – | FAILED | FAILED |
| saxon-js-3 | 14% | – | – | – | – | FAILED | FAILED | FAILED | – | FAILED | FAILED |
| stax-xml | <1% | FAILED | FAILED | FAILED | FAILED | – | – | – | FAILED | – | – |
| txml | <1% | – | – | – | – | FAILED | – | – | – | FAILED | – |
| @xmldom/xmldom | 37% | – | – | – | – | FAILED | – | – | – | FAILED | – |

<details><summary>Raw measurements</summary>

Times here cover every document the workload reads, including those a library throws on or reads wrongly.

| Library | Workload | Best ms | Median ms | Noise | Threw on | Wrong output | Count differs | ns/event | Retained MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| exemplar 0.3.0 | walk | 208 | 208 | 8.4% | 0 of 1,830 | 0 | n/a | 129 | n/a |
| htmlparser2 12.0.0 | walk | 243 | 249 | 4.0% | 0 of 1,830 | 877 | n/a | 151 | n/a |
| sax 1.6.1 | walk | 384 | 387 | 1.2% | 1,556 of 1,830 | 196 | n/a | 239 | n/a |
| saxen 11.2.0 | walk | 95 | 98 | 5.3% | 0 of 1,830 | 877 | n/a | 59 | n/a |
| saxes 6.0.0 | walk | 137 | 137 | 4.0% | 1,571 of 1,830 | 0 | n/a | 85 | n/a |
| stax-xml 1.1.2 | walk | 121 | 125 | 3.2% | 1,571 of 1,830 | 189 | n/a | 76 | n/a |
| exemplar 0.3.0 | read | 263 | 269 | 3.7% | 0 of 1,830 | 0 | 0 | 163 | n/a |
| htmlparser2 12.0.0 | read | 270 | 273 | 2.1% | 0 of 1,830 | 877 | 1,807 | 168 | n/a |
| sax 1.6.1 | read | 399 | 405 | 1.7% | 1,556 of 1,830 | 196 | 268 | 248 | n/a |
| saxen 11.2.0 | read | 181 | 182 | 0.8% | 0 of 1,830 | 877 | 1,807 | 113 | n/a |
| saxes 6.0.0 | read | 163 | 163 | 0.1% | 1,571 of 1,830 | 0 | 0 | 101 | n/a |
| stax-xml 1.1.2 | read | 138 | 138 | 0.8% | 1,571 of 1,830 | 189 | 253 | 86 | n/a |
| exemplar 0.3.0 | tree | 465 | 470 | 1.1% | 0 of 1,830 | 0 | n/a | 289 | 242 |
| fast-xml-parser 5.11.2 | tree | 722 | 729 | 3.6% | 128 of 1,830 | 436 | n/a | 449 | 189 |
| libxmljs2 0.37.0 | tree | 431 | 434 | 1.2% | 512 of 1,830 | 7 | n/a | 268 | 280 |
| saxon-js-2 2.7.0 | tree | 343 | 356 | 5.7% | 1,578 of 1,830 | 0 | n/a | 213 | 84 |
| saxon-js-3 3.0.0-beta2 | tree | 397 | 397 | 1.8% | 1,578 of 1,830 | 0 | n/a | 247 | 84 |
| txml 6.0.3 | tree | 91 | 92 | 2.1% | 259 of 1,830 | 711 | n/a | 56 | 84 |
| @xmldom/xmldom 0.9.12 | tree | 997 | 1004 | 1.0% | 1,571 of 1,830 | 0 | n/a | 620 | 343 |
| exemplar 0.3.0 | xdm | 431 | 434 | 2.7% | 0 of 1,830 | 0 | n/a | 268 | 90 |
| saxon-js-2 2.7.0 | xdm | 355 | 355 | 1.8% | 1,578 of 1,830 | 0 | n/a | 221 | 84 |
| saxon-js-3 3.0.0-beta2 | xdm | 384 | 393 | 2.8% | 1,578 of 1,830 | 0 | n/a | 239 | 84 |
| exemplar 0.3.0 | xpath | 605 | 607 | 2.1% | 0 of 1,830 | 0 | 0 | 376 | n/a |
| saxon-js-2 2.7.0 | xpath | 1061 | 1069 | 1.6% | 1,578 of 1,830 | 0 | 0 | 660 | n/a |
| saxon-js-3 3.0.0-beta2 | xpath | 1052 | 1057 | 2.9% | 1,578 of 1,830 | 0 | 0 | 654 | n/a |
| exemplar 0.3.0 | stream | 464 | 465 | 1.8% | 0 of 1,830 | 0 | 0 | 289 | n/a |
| htmlparser2 12.0.0 | stream | 416 | 438 | 5.4% | 947 of 1,830 | 877 | 866 | 259 | n/a |
| sax 1.6.1 | stream | 595 | 595 | 3.3% | 1,628 of 1,830 | 196 | 196 | 370 | n/a |
| saxen 11.2.0 | stream | 402 | 413 | 7.4% | 947 of 1,830 | 877 | 866 | 250 | n/a |
| saxes 6.0.0 | stream | 353 | 358 | 4.9% | 1,635 of 1,830 | 0 | 0 | 220 | n/a |
| stax-xml 1.1.2 | stream | 346 | 350 | 1.3% | 1,635 of 1,830 | 189 | 189 | 215 | n/a |
| exemplar 0.3.0 | small | 74 | 75 | 1.2% | 0 of 991 | 0 | 0 | 46 | n/a |
| htmlparser2 12.0.0 | small | 61 | 61 | 4.7% | 0 of 991 | 877 | 990 | 38 | n/a |
| sax 1.6.1 | small | 38 | 46 | 21.4% | 903 of 991 | 196 | 87 | 24 | n/a |
| saxen 11.2.0 | small | 40 | 47 | 38.1% | 0 of 991 | 877 | 990 | 25 | n/a |
| saxes 6.0.0 | small | 27 | 27 | 12.9% | 905 of 991 | 0 | 0 | 17 | n/a |
| stax-xml 1.1.2 | small | 27 | 27 | 2.0% | 905 of 991 | 189 | 85 | 17 | n/a |
| exemplar 0.3.0 | write | 301 | 306 | 2.7% | 0 of 1,830 | 0 | n/a | 187 | n/a |
| stax-xml 1.1.2 | write | 233 | 236 | 5.2% | 1,711 of 1,830 | 189 | n/a | 145 | n/a |

fast-xml-parser first differs in ` bn_BD.UTF-8/articles/new-users/article.xml `: ` at 27353: got "&amp;nbsp; Associates, 1993,&#10;      I", expected " Associates, 1993,&#10;      ISBN 0-9371" `

htmlparser2 first differs in ` bn_BD.UTF-8/articles/explaining-bsd/article.xml `: ` at 107: got "3;&#10;  <info><title>BSD কি, কেন,&#13;&", expected "0;  <info><title>BSD কি, কেন,&#10;      " `

libxmljs2 first differs in ` de_DE.ISO8859-1/htdocs/art.xml `: rejects it

sax first differs in ` bn_BD.UTF-8/articles/explaining-bsd/article.xml `: ` at 107: got "3;&#10;  <info><title>BSD কি, কেন,&#13;&", expected "0;  <info><title>BSD কি, কেন,&#10;      " `

saxen first differs in ` bn_BD.UTF-8/articles/explaining-bsd/article.xml `: ` at 107: got "3;&#10;  <info><title>BSD কি, কেন,&#13;&", expected "0;  <info><title>BSD কি, কেন,&#10;      " `

saxes first differs in ` bn_BD.UTF-8/articles/new-users/article.xml `: rejects it

saxon-js-2 first differs in ` bn_BD.UTF-8/articles/new-users/article.xml `: rejects it

saxon-js-3 first differs in ` bn_BD.UTF-8/articles/new-users/article.xml `: rejects it

stax-xml first differs in ` bn_BD.UTF-8/articles/explaining-bsd/article.xml `: ` at 107: got "3;&#10;  <info><title>BSD কি, কেন,&#13;&", expected "0;  <info><title>BSD কি, কেন,&#10;      " `

txml first differs in ` bn_BD.UTF-8/articles/explaining-bsd/article.xml `: rejects it

@xmldom/xmldom first differs in ` bn_BD.UTF-8/articles/new-users/article.xml `: rejects it

</details>

## FreeBSD docs (simplified)

- The FreeBSD docs documents rewritten by xmllint as plain XML, so that every library can read the same content. As published, they need DTDs that most libraries cannot read, so those libraries fail on most documents.
- xmllint first checks each document with its DTDs, read through the DocBook and FreeBSD catalogs, and replaces every entity with its text.
- The DOCTYPE, with its internal subset, is removed.
- Every document is re-encoded as UTF-8, the Japanese ones in EUC-JP included.
- Each namespace is declared once, where it comes into force, rather than on every element, as the DTDs' attribute defaults would give it.
- Line endings are LF, as reading normalizes them.
- Left out, and counted in preparation: documents xmllint finds malformed when read with their DTDs, or that use entities no DTD declares, or that need a DTD the archive does not hold, and documents with references Xerces cannot resolve once the DOCTYPE is gone. Documents without a DOCTYPE are not rewritten: most are parts of books that other documents include.

1,715 documents, 92.6 MB. Speeds are in MB/s, except `compile`, in expressions per second.

| Library | Reads correctly | `walk` | `read` | `stream` | `small` | `tree` | `xdm` | `xpath` | `write` | Tree MB | XDM MB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| exemplar | 100% | 394.4 | 322.1 | 177.5 | 266.5 | 168.6 | 164.2 | 69.7 | 144.9 | 449 | 200 |
| fast-xml-parser | 76% | – | – | – | – | 40.0 ‡ | – | – | – | 459 ‡ | – |
| htmlparser2 | 100% | 191.0 | 178.7 | 111.8 | 124.6 | – | – | – | – | – | – |
| libxmljs2 | 100% | – | – | – | – | 167.0 | – | – | – | 556 | – |
| sax | 100% | 57.1 | 54.1 | 43.9 ‡ | 51.0 | – | – | – | – | – | – |
| saxen | 100% | 422.6 | 264.1 | 98.4 | 206.3 | – | – | – | – | – | – |
| saxes | 100% | 191.8 | 157.2 | 102.9 | 108.1 | – | – | – | – | – | – |
| saxon-js-2 | 100% | – | – | – | – | 31.9 | 31.9 | 6.4 | – | 963 | 963 |
| saxon-js-3 | 100% | – | – | – | – | 31.8 | 31.9 | 6.4 | – | 963 | 963 |
| stax-xml | 76% | 221.8 ‡ | 181.8 ‡ | 82.5 ‡ | 118.0 ‡ | – | – | – | 91.7 ‡ | – | – |
| txml | 17% | – | – | – | – | FAILED | – | – | – | FAILED | – |
| @xmldom/xmldom | 100% | – | – | – | – | 22.1 | – | – | – | 1559 | – |

<details><summary>Raw measurements</summary>

Times here cover every document the workload reads, including those a library throws on or reads wrongly.

| Library | Workload | Best ms | Median ms | Noise | Threw on | Wrong output | Count differs | ns/event | Retained MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| exemplar 0.3.0 | walk | 235 | 236 | 2.3% | 0 of 1,715 | 0 | n/a | 65 | n/a |
| htmlparser2 12.0.0 | walk | 485 | 486 | 0.3% | 0 of 1,715 | 0 | n/a | 133 | n/a |
| sax 1.6.1 | walk | 1622 | 1644 | 2.3% | 0 of 1,715 | 0 | n/a | 446 | n/a |
| saxen 11.2.0 | walk | 219 | 225 | 3.1% | 0 of 1,715 | 0 | n/a | 60 | n/a |
| saxes 6.0.0 | walk | 483 | 487 | 2.9% | 0 of 1,715 | 0 | n/a | 133 | n/a |
| stax-xml 1.1.2 | walk | 421 | 425 | 3.0% | 0 of 1,715 | 44 | n/a | 116 | n/a |
| exemplar 0.3.0 | read | 288 | 291 | 1.1% | 0 of 1,715 | 0 | 0 | 79 | n/a |
| htmlparser2 12.0.0 | read | 519 | 523 | 0.9% | 0 of 1,715 | 0 | 0 | 143 | n/a |
| sax 1.6.1 | read | 1714 | 1730 | 1.3% | 0 of 1,715 | 0 | 0 | 471 | n/a |
| saxen 11.2.0 | read | 351 | 355 | 1.6% | 0 of 1,715 | 0 | 0 | 97 | n/a |
| saxes 6.0.0 | read | 590 | 606 | 5.7% | 0 of 1,715 | 0 | 0 | 162 | n/a |
| stax-xml 1.1.2 | read | 512 | 518 | 4.1% | 0 of 1,715 | 44 | 44 | 141 | n/a |
| exemplar 0.3.0 | tree | 550 | 558 | 3.0% | 0 of 1,715 | 0 | n/a | 151 | 449 |
| fast-xml-parser 5.11.2 | tree | 2243 | 2275 | 2.3% | 4 of 1,715 | 43 | n/a | 617 | 459 |
| libxmljs2 0.37.0 | tree | 555 | 556 | 0.7% | 0 of 1,715 | 0 | n/a | 153 | 556 |
| saxon-js-2 2.7.0 | tree | 2908 | 2954 | 1.8% | 0 of 1,715 | 0 | n/a | 800 | 963 |
| saxon-js-3 3.0.0-beta2 | tree | 2910 | 2913 | 2.3% | 0 of 1,715 | 0 | n/a | 800 | 963 |
| txml 6.0.3 | tree | 84 | 86 | 2.2% | 262 of 1,715 | 4 | n/a | 23 | 77 |
| @xmldom/xmldom 0.9.12 | tree | 4184 | 4187 | 0.1% | 0 of 1,715 | 0 | n/a | 1151 | 1559 |
| exemplar 0.3.0 | xdm | 564 | 573 | 2.0% | 0 of 1,715 | 0 | n/a | 155 | 200 |
| saxon-js-2 2.7.0 | xdm | 2903 | 2917 | 1.4% | 0 of 1,715 | 0 | n/a | 798 | 963 |
| saxon-js-3 3.0.0-beta2 | xdm | 2906 | 2914 | 1.6% | 0 of 1,715 | 0 | n/a | 799 | 963 |
| exemplar 0.3.0 | xpath | 1329 | 1330 | 2.6% | 0 of 1,715 | 0 | 0 | 365 | n/a |
| saxon-js-2 2.7.0 | xpath | 14374 | 14409 | 1.4% | 0 of 1,715 | 0 | 0 | 3953 | n/a |
| saxon-js-3 3.0.0-beta2 | xpath | 14421 | 14572 | 2.4% | 0 of 1,715 | 0 | 0 | 3966 | n/a |
| exemplar 0.3.0 | stream | 522 | 523 | 1.6% | 0 of 1,715 | 0 | 0 | 144 | n/a |
| htmlparser2 12.0.0 | stream | 830 | 847 | 6.3% | 0 of 1,715 | 0 | 0 | 228 | n/a |
| sax 1.6.1 | stream | 2064 | 2074 | 0.6% | 1 of 1,715 | 0 | 0 | 568 | n/a |
| saxen 11.2.0 | stream | 942 | 951 | 1.5% | 0 of 1,715 | 0 | 0 | 259 | n/a |
| saxes 6.0.0 | stream | 901 | 911 | 3.3% | 0 of 1,715 | 0 | 0 | 248 | n/a |
| stax-xml 1.1.2 | stream | 1062 | 1080 | 4.3% | 0 of 1,715 | 44 | 44 | 292 | n/a |
| exemplar 0.3.0 | small | 24 | 24 | 8.8% | 0 of 867 | 0 | 0 | 7 | n/a |
| htmlparser2 12.0.0 | small | 51 | 51 | 8.6% | 0 of 867 | 0 | 0 | 14 | n/a |
| sax 1.6.1 | small | 124 | 127 | 2.5% | 0 of 867 | 0 | 0 | 34 | n/a |
| saxen 11.2.0 | small | 31 | 33 | 13.6% | 0 of 867 | 0 | 0 | 8 | n/a |
| saxes 6.0.0 | small | 59 | 59 | 0.4% | 0 of 867 | 0 | 0 | 16 | n/a |
| stax-xml 1.1.2 | small | 54 | 56 | 4.4% | 0 of 867 | 44 | 14 | 15 | n/a |
| exemplar 0.3.0 | write | 640 | 653 | 3.1% | 0 of 1,715 | 0 | n/a | 176 | n/a |
| stax-xml 1.1.2 | write | 1055 | 1062 | 1.3% | 0 of 1,715 | 44 | n/a | 290 | n/a |

fast-xml-parser first differs in ` de_DE.ISO8859-1/books/handbook/book.xml `: rejects it

stax-xml first differs in ` de_DE.ISO8859-1/books/handbook/book.xml `: ` at 836236: got "?>&#10;&#10;  <sect1 xml:id=\"linuxemu-ad", expected "\n  ?>&#10;&#10;  <sect1 xml:id=\"linuxemu" `

txml first differs in ` bn_BD.UTF-8/articles/explaining-bsd/article.xml `: rejects it

</details>

## PostgreSQL book

1 document, 12.2 MB. Speeds are in MB/s, except `compile`, in expressions per second.

| Library | Reads correctly | `walk` | `read` | `stream` | `tree` | `xdm` | `xpath` | `write` | Tree MB | XDM MB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| exemplar | 100% | 380.8 | 292.7 | 164.8 | 134.9 | 150.3 | 53.2 | 141.4 | 67 | 31 |
| fast-xml-parser | 0% | – | – | – | FAILED | – | – | – | FAILED | – |
| htmlparser2 | 100% | 142.5 | 136.4 | 117.3 | – | – | – | – | – | – |
| libxmljs2 | 100% | – | – | – | 275.3 | – | – | – | 73 | – |
| sax | 100% | 54.7 | 51.4 | 50.9 | – | – | – | – | – | – |
| saxen | 100% | 360.0 | 237.0 | 133.6 | – | – | – | – | – | – |
| saxes | 100% | 159.7 | 129.7 | 110.3 | – | – | – | – | – | – |
| saxon-js-2 | 100% | – | – | – | 29.7 | 29.0 | 5.1 | – | 133 | 133 |
| saxon-js-3 | 100% | – | – | – | 28.5 | 29.0 | 5.1 | – | 133 | 133 |
| stax-xml | 100% | 196.3 | 161.4 | 88.3 | – | – | – | 66.6 | – | – |
| txml | 0% | – | – | – | FAILED | – | – | – | FAILED | – |
| @xmldom/xmldom | 100% | – | – | – | 19.4 | – | – | – | 224 | – |

<details><summary>Raw measurements</summary>

Times here cover every document the workload reads, including those a library throws on or reads wrongly.

| Library | Workload | Best ms | Median ms | Noise | Threw on | Wrong output | Count differs | ns/event | Retained MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| exemplar 0.3.0 | walk | 32 | 32 | 2.0% | 0 of 1 | 0 | n/a | 61 | n/a |
| htmlparser2 12.0.0 | walk | 85 | 86 | 1.1% | 0 of 1 | 0 | n/a | 162 | n/a |
| sax 1.6.1 | walk | 222 | 225 | 12.8% | 0 of 1 | 0 | n/a | 423 | n/a |
| saxen 11.2.0 | walk | 34 | 34 | 5.7% | 0 of 1 | 0 | n/a | 64 | n/a |
| saxes 6.0.0 | walk | 76 | 76 | 0.7% | 0 of 1 | 0 | n/a | 145 | n/a |
| stax-xml 1.1.2 | walk | 62 | 62 | 0.5% | 0 of 1 | 0 | n/a | 118 | n/a |
| exemplar 0.3.0 | read | 42 | 43 | 3.7% | 0 of 1 | 0 | 0 | 79 | n/a |
| htmlparser2 12.0.0 | read | 89 | 90 | 0.8% | 0 of 1 | 0 | 0 | 170 | n/a |
| sax 1.6.1 | read | 236 | 240 | 1.7% | 0 of 1 | 0 | 0 | 450 | n/a |
| saxen 11.2.0 | read | 51 | 52 | 2.9% | 0 of 1 | 0 | 0 | 98 | n/a |
| saxes 6.0.0 | read | 94 | 94 | 0.3% | 0 of 1 | 0 | 0 | 178 | n/a |
| stax-xml 1.1.2 | read | 75 | 76 | 2.2% | 0 of 1 | 0 | 0 | 143 | n/a |
| exemplar 0.3.0 | tree | 90 | 90 | 2.1% | 0 of 1 | 0 | n/a | 172 | 67 |
| fast-xml-parser 5.11.2 | tree | 5 | 5 | 0.2% | 1 of 1 | 0 | n/a | n/a | n/a |
| libxmljs2 0.37.0 | tree | 44 | 45 | 3.4% | 0 of 1 | 0 | n/a | 84 | 73 |
| saxon-js-2 2.7.0 | tree | 410 | 435 | 7.5% | 0 of 1 | 0 | n/a | 780 | 133 |
| saxon-js-3 3.0.0-beta2 | tree | 428 | 433 | 1.8% | 0 of 1 | 0 | n/a | 813 | 133 |
| txml 6.0.3 | tree | 1 | 1 | 15.2% | 1 of 1 | 0 | n/a | n/a | n/a |
| @xmldom/xmldom 0.9.12 | tree | 628 | 632 | 0.8% | 0 of 1 | 0 | n/a | 1195 | 224 |
| exemplar 0.3.0 | xdm | 81 | 82 | 6.3% | 0 of 1 | 0 | n/a | 154 | 31 |
| saxon-js-2 2.7.0 | xdm | 420 | 429 | 2.9% | 0 of 1 | 0 | n/a | 799 | 133 |
| saxon-js-3 3.0.0-beta2 | xdm | 420 | 428 | 6.0% | 0 of 1 | 0 | n/a | 799 | 133 |
| exemplar 0.3.0 | xpath | 229 | 231 | 9.6% | 0 of 1 | 0 | 0 | 435 | n/a |
| saxon-js-2 2.7.0 | xpath | 2396 | 2406 | 0.7% | 0 of 1 | 0 | 0 | 4559 | n/a |
| saxon-js-3 3.0.0-beta2 | xpath | 2405 | 2429 | 1.5% | 0 of 1 | 0 | 0 | 4576 | n/a |
| exemplar 0.3.0 | stream | 74 | 75 | 2.5% | 0 of 1 | 0 | 0 | 140 | n/a |
| htmlparser2 12.0.0 | stream | 104 | 106 | 4.5% | 0 of 1 | 0 | 0 | 197 | n/a |
| sax 1.6.1 | stream | 239 | 242 | 5.4% | 0 of 1 | 0 | 0 | 455 | n/a |
| saxen 11.2.0 | stream | 91 | 96 | 8.2% | 0 of 1 | 0 | 0 | 173 | n/a |
| saxes 6.0.0 | stream | 110 | 112 | 2.8% | 0 of 1 | 0 | 0 | 210 | n/a |
| stax-xml 1.1.2 | stream | 138 | 138 | 2.8% | 0 of 1 | 0 | 0 | 262 | n/a |
| exemplar 0.3.0 | write | 86 | 86 | 2.7% | 0 of 1 | 0 | n/a | 164 | n/a |
| stax-xml 1.1.2 | write | 183 | 186 | 2.1% | 0 of 1 | 0 | n/a | 347 | n/a |

fast-xml-parser first differs in ` doc/src/sgml/postgres.sgml `: rejects it

txml first differs in ` doc/src/sgml/postgres.sgml `: rejects it

</details>

## OpenStack manuals

966 documents, 6.5 MB. Speeds are in MB/s, except `compile`, in expressions per second.

| Library | Reads correctly | `walk` | `read` | `stream` | `small` | `tree` | `xdm` | `xpath` | `compile` | `write` | Tree MB | XDM MB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| exemplar | 100% | 283.1 | 219.3 | 108.0 | 213.7 | 124.9 | 108.5 | 44.3 | 110127 | 98.1 | 37 | 16 |
| fast-xml-parser | 44% | – | – | – | – | FAILED | – | – | – | – | FAILED | – |
| htmlparser2 | 98% | 134.3 ‡ | 128.8 ‡ | 36.3 ‡ | 100.1 ‡ | – | – | – | – | – | – | – |
| libxmljs2 | 100% | – | – | – | – | 214.8 | – | – | – | – | 59 | – |
| sax | 98% | 47.0 ‡ | 45.0 ‡ | 22.1 ‡ | 43.6 ‡ | – | – | – | – | – | – | – |
| saxen | 97% | 309.0 ‡ | 209.7 ‡ | 34.0 ‡ | 170.2 ‡ | – | – | – | – | – | – | – |
| saxes | 100% | 134.2 | 111.2 | 34.6 | 94.2 | – | – | – | – | – | – | – |
| saxon-js-2 | 100% | – | – | – | – | 27.9 | 28.0 | 6.0 | 54081 | – | 74 | 74 |
| saxon-js-3 | 100% | – | – | – | – | 27.1 | 27.2 | 5.7 | 52564 | – | 74 | 74 |
| stax-xml | 98% | 148.0 ‡ | 121.2 ‡ | 33.3 ‡ | 135.3 ‡ | – | – | – | – | 79.8 ‡ | – | – |
| txml | 30% | – | – | – | – | FAILED | – | – | – | – | FAILED | – |
| @xmldom/xmldom | 100% | – | – | – | – | 21.5 | – | – | – | – | 123 | – |

<details><summary>Raw measurements</summary>

Times here cover every document the workload reads, including those a library throws on or reads wrongly.

| Library | Workload | Best ms | Median ms | Noise | Threw on | Wrong output | Count differs | ns/event | Retained MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| exemplar 0.3.0 | walk | 23 | 23 | 3.8% | 0 of 966 | 0 | n/a | 92 | n/a |
| htmlparser2 12.0.0 | walk | 49 | 50 | 7.0% | 0 of 966 | 5 | n/a | 193 | n/a |
| sax 1.6.1 | walk | 138 | 138 | 3.9% | 0 of 966 | 5 | n/a | 549 | n/a |
| saxen 11.2.0 | walk | 21 | 22 | 9.1% | 0 of 966 | 9 | n/a | 85 | n/a |
| saxes 6.0.0 | walk | 48 | 49 | 0.7% | 0 of 966 | 0 | n/a | 192 | n/a |
| stax-xml 1.1.2 | walk | 44 | 45 | 2.5% | 0 of 966 | 5 | n/a | 176 | n/a |
| exemplar 0.3.0 | read | 30 | 30 | 12.1% | 0 of 966 | 0 | 0 | 118 | n/a |
| htmlparser2 12.0.0 | read | 50 | 53 | 10.2% | 0 of 966 | 5 | 0 | 200 | n/a |
| sax 1.6.1 | read | 144 | 145 | 1.6% | 0 of 966 | 5 | 0 | 573 | n/a |
| saxen 11.2.0 | read | 31 | 31 | 6.9% | 0 of 966 | 9 | 4 | 124 | n/a |
| saxes 6.0.0 | read | 58 | 59 | 1.4% | 0 of 966 | 0 | 0 | 232 | n/a |
| stax-xml 1.1.2 | read | 54 | 56 | 12.9% | 0 of 966 | 5 | 0 | 214 | n/a |
| exemplar 0.3.0 | tree | 52 | 53 | 3.5% | 0 of 966 | 0 | n/a | 207 | 37 |
| fast-xml-parser 5.11.2 | tree | 173 | 176 | 1.8% | 25 of 966 | 176 | n/a | 689 | 42 |
| libxmljs2 0.37.0 | tree | 30 | 31 | 1.0% | 0 of 966 | 0 | n/a | 121 | 59 |
| saxon-js-2 2.7.0 | tree | 238 | 241 | 1.9% | 0 of 966 | 0 | n/a | 945 | 74 |
| saxon-js-3 3.0.0-beta2 | tree | 239 | 242 | 2.0% | 0 of 966 | 0 | n/a | 951 | 74 |
| txml 6.0.3 | tree | 35 | 40 | 29.1% | 203 of 966 | 96 | n/a | 139 | 27 |
| @xmldom/xmldom 0.9.12 | tree | 302 | 307 | 1.8% | 0 of 966 | 0 | n/a | 1201 | 123 |
| exemplar 0.3.0 | xdm | 60 | 60 | 1.5% | 0 of 966 | 0 | n/a | 238 | 16 |
| saxon-js-2 2.7.0 | xdm | 238 | 239 | 1.2% | 0 of 966 | 0 | n/a | 947 | 74 |
| saxon-js-3 3.0.0-beta2 | xdm | 238 | 240 | 3.5% | 0 of 966 | 0 | n/a | 948 | 74 |
| exemplar 0.3.0 | xpath | 147 | 155 | 21.0% | 0 of 966 | 0 | 0 | 583 | n/a |
| saxon-js-2 2.7.0 | xpath | 1087 | 1113 | 4.4% | 0 of 966 | 0 | 0 | 4324 | n/a |
| saxon-js-3 3.0.0-beta2 | xpath | 1134 | 1141 | 1.0% | 0 of 966 | 0 | 0 | 4511 | n/a |
| exemplar 0.3.0 | compile | 20 | 20 | 17.5% | 0 of 1 | 0 | n/a | 79 | n/a |
| saxon-js-2 2.7.0 | compile | 41 | 41 | 4.9% | 0 of 1 | 0 | n/a | 162 | n/a |
| saxon-js-3 3.0.0-beta2 | compile | 42 | 43 | 7.4% | 0 of 1 | 0 | n/a | 167 | n/a |
| exemplar 0.3.0 | stream | 60 | 61 | 11.0% | 0 of 966 | 0 | 0 | 239 | n/a |
| htmlparser2 12.0.0 | stream | 177 | 181 | 7.1% | 0 of 966 | 5 | 0 | 705 | n/a |
| sax 1.6.1 | stream | 292 | 293 | 1.3% | 0 of 966 | 5 | 0 | 1163 | n/a |
| saxen 11.2.0 | stream | 188 | 200 | 7.0% | 0 of 966 | 9 | 4 | 746 | n/a |
| saxes 6.0.0 | stream | 188 | 200 | 14.2% | 0 of 966 | 0 | 0 | 746 | n/a |
| stax-xml 1.1.2 | stream | 194 | 198 | 7.8% | 0 of 966 | 5 | 0 | 771 | n/a |
| exemplar 0.3.0 | small | 14 | 14 | 2.0% | 0 of 504 | 0 | 0 | 57 | n/a |
| htmlparser2 12.0.0 | small | 30 | 32 | 9.4% | 0 of 504 | 5 | 0 | 121 | n/a |
| sax 1.6.1 | small | 70 | 71 | 4.1% | 0 of 504 | 5 | 0 | 278 | n/a |
| saxen 11.2.0 | small | 18 | 18 | 3.9% | 0 of 504 | 9 | 2 | 72 | n/a |
| saxes 6.0.0 | small | 32 | 33 | 5.3% | 0 of 504 | 0 | 0 | 129 | n/a |
| stax-xml 1.1.2 | small | 23 | 23 | 14.6% | 0 of 504 | 5 | 0 | 90 | n/a |
| exemplar 0.3.0 | write | 66 | 67 | 5.0% | 0 of 966 | 0 | n/a | 263 | n/a |
| stax-xml 1.1.2 | write | 82 | 83 | 2.4% | 0 of 966 | 5 | n/a | 325 | n/a |

fast-xml-parser first differs in ` doc/admin-guide-cloud/bk-admin-guide-cloud.xml `: ` at 258: got "?>&#10;    <titleabbrev>Cloud Administra", expected "title.font.size=\"28px\" subtitle.font.siz" `

htmlparser2 first differs in ` doc/admin-guide-cloud/networking/section_networking-adv-config.xml `: ` at 24253: got "&#10;                        service\">ne", expected "                         service\">neutro" `

sax first differs in ` doc/admin-guide-cloud/networking/section_networking-adv-config.xml `: ` at 24253: got "&#10;                        service\">ne", expected "                         service\">neutro" `

saxen first differs in ` doc/admin-guide-cloud/networking/section_networking-adv-config.xml `: ` at 24253: got "&#10;                        service\">ne", expected "                         service\">neutro" `

stax-xml first differs in ` doc/admin-guide-cloud/networking/section_networking-adv-config.xml `: ` at 24253: got "&#10;                        service\">ne", expected "                         service\">neutro" `

txml first differs in ` doc/admin-guide-cloud/bk-admin-guide-cloud.xml `: ` at 258: got "?>&#10;    <titleabbrev>Cloud Administra", expected "title.font.size=\"28px\" subtitle.font.siz" `

</details>

## XMark

1 document, 116.5 MB. Speeds are in MB/s, except `compile`, in expressions per second.

| Library | Reads correctly | `walk` | `read` | `stream` | `tree` | `xdm` | `xpath` | `axes` | `compile` | `write` | Tree MB | XDM MB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| exemplar | 100% | 440.0 | 376.6 | 256.8 | 173.9 | 200.2 | 233.5 | 49.9 | 79008 | 212.9 | 629 | 209 |
| fast-xml-parser | 100% | – | – | – | 41.6 | – | – | – | – | – | 666 | – |
| htmlparser2 | 100% | 167.9 | 154.0 | 141.3 | – | – | – | – | – | – | – | – |
| libxmljs2 | 100% | – | – | – | 351.4 | – | – | – | – | – | 730 | – |
| sax | 100% | 74.6 | 69.4 | 68.4 | – | – | – | – | – | – | – | – |
| saxen | 100% | 487.7 | 306.1 | 209.7 | – | – | – | – | – | – | – | – |
| saxes | 100% | 186.7 | 147.5 | 133.6 | – | – | – | – | – | – | – | – |
| saxon-js-2 | 100% | – | – | – | 37.3 | 37.1 | 7.4 | 1.4 | 27799 | – | 1151 | 1151 |
| saxon-js-3 | 100% | – | – | – | 37.2 | 36.2 | 7.7 | 1.3 | 27727 | – | 1151 | 1151 |
| stax-xml | 100% | 252.5 | 215.1 | 119.9 | – | – | – | – | – | 69.3 | – | – |
| txml | 100% | – | – | – | 148.1 | – | – | – | – | – | 538 | – |
| @xmldom/xmldom | 100% | – | – | – | 23.0 | – | – | – | – | – | 2081 | – |

### Tree walks, one by one

Each query's best time over the rounds, in ms, and in brackets how many times exemplar's it is.

| Axis | Query | exemplar | saxon-js-2 | saxon-js-3 |
| --- | --- | ---: | ---: | ---: |
| child | ` /site/people/person ` | 2.0 | 17.4 (8.8×) | 17.3 (8.7×) |
| child | ` /site/*/*/* ` | 22.6 | 180.8 (8.0×) | 182.1 (8.1×) |
| child | ` //person/* ` | 16.5 | 1023.3 (62.2×) | 1021.4 (62.0×) |
| descendant | ` //bidder ` | 11.3 | 964.4 (85.2×) | 988.3 (87.3×) |
| descendant | ` //* ` | 79.9 | 927.6 (11.6×) | 935.5 (11.7×) |
| descendant | ` //text() ` | 114.5 | 947.5 (8.3×) | 955.6 (8.3×) |
| descendant | ` //node() ` | 276.2 | 1207.2 (4.4×) | 1239.6 (4.5×) |
| descendant | ` /site/descendant::keyword ` | 12.7 | 1007.1 (79.4×) | 1012.1 (79.8×) |
| descendant | ` //open_auction//bidder ` | 18.0 | 1324.7 (73.8×) | 1322.0 (73.6×) |
| descendant-or-self | ` //item/descendant-or-self::* ` | 31.5 | 1310.2 (41.6×) | 1307.7 (41.5×) |
| position after // | ` //bidder[1] ` | 14.3 | 1523.4 (106.9×) | 1557.8 (109.3×) |
| position after // | ` //bidder[last()] ` | 15.4 | 1590.6 (103.4×) | 1574.0 (102.3×) |
| position after // | ` //bidder[position() > 2] ` | 21.5 | 2003.4 (93.1×) | 2035.6 (94.6×) |
| position after // | ` //bidder[2] ` | 12.0 | 1518.3 (126.8×) | 1545.6 (129.0×) |
| position after // | ` //bidder[position() = last() - 1] ` | 21.5 | 2017.0 (93.8×) | 2098.1 (97.5×) |
| position after // | ` //*[1] ` | 37.2 | 1654.4 (44.5×) | 1681.7 (45.3×) |
| position on a step | ` //open_auction/bidder[1] ` | 12.5 | 968.9 (77.4×) | 963.9 (77.0×) |
| position on a step | ` //open_auction/bidder[last()] ` | 15.4 | 973.1 (63.2×) | 981.6 (63.7×) |
| position of a path | ` (//bidder)[1] \| (//bidder)[last()] ` | 17.3 | 1481.3 (85.4×) | 1487.8 (85.8×) |
| attribute | ` //@* ` | 9.2 | 1601.3 (173.2×) | 1649.2 (178.3×) |
| attribute | ` //person/@id ` | 12.6 | 992.3 (78.7×) | 989.1 (78.5×) |
| attribute | ` //*[@id] ` | 78.5 | 2101.8 (26.8×) | 2154.0 (27.4×) |
| attribute | ` //bidder/personref/@person ` | 17.8 | 1074.3 (60.4×) | 1066.5 (60.0×) |
| parent | ` //bidder/.. ` | 14.9 | 974.1 (65.4×) | 1005.1 (67.5×) |
| parent | ` //keyword/parent::* ` | 18.8 | 1115.5 (59.3×) | 1128.9 (60.1×) |
| ancestor | ` //keyword/ancestor::* ` | 44.0 | 1438.8 (32.7×) | 1448.6 (33.0×) |
| ancestor | ` //keyword/ancestor::item ` | 19.5 | 1047.9 (53.9×) | 1059.5 (54.5×) |
| ancestor-or-self | ` //keyword/ancestor-or-self::* ` | 47.6 | 1597.8 (33.6×) | 1599.6 (33.6×) |
| ancestor in a predicate | ` //*[ancestor::*[3]] ` | 231.1 | 3688.4 (16.0×) | 3786.8 (16.4×) |
| following-sibling | ` //bidder/following-sibling::bidder ` | 39.4 | 1134.1 (28.8×) | 1161.2 (29.4×) |
| following-sibling | ` //bidder/following-sibling::*[1] ` | 15.5 | 1000.4 (64.6×) | 1012.6 (65.4×) |
| preceding-sibling | ` //bidder/preceding-sibling::* ` | 31.9 | 1114.8 (35.0×) | 1136.7 (35.7×) |
| preceding-sibling | ` //bidder/preceding-sibling::bidder[1] ` | 17.9 | 1017.7 (56.9×) | 1019.4 (57.0×) |
| following | ` /site/regions/following::* ` | 56.1 | 866.8 (15.4×) | 864.9 (15.4×) |
| following | ` (//person)[1]/following::* ` | 55.5 | 939.8 (16.9×) | 935.3 (16.8×) |
| preceding | ` (//closed_auction)[last()]/preceding::* ` | 129.6 | 2744.2 (21.2×) | 2707.7 (20.9×) |
| preceding | ` //closed_auction[1]/preceding::keyword ` | 25.7 | 2926.9 (114.1×) | 2940.6 (114.6×) |
| self | ` //*/self::bidder ` | 98.1 | 1220.0 (12.4×) | 1264.7 (12.9×) |
| namespace | ` //person/namespace::* ` | 16.3 | 990.4 (60.9×) | 1001.6 (61.6×) |
| predicate | ` //person[profile/@income > 50000] ` | 22.8 | 2014.9 (88.2×) | 2133.8 (93.4×) |
| predicate | ` //*[count(*) > 5] ` | 161.8 | 2328.7 (14.4×) | 2384.2 (14.7×) |
| predicate | ` //item[location = 'United States'] ` | 19.4 | 1998.5 (103.2×) | 2145.0 (110.7×) |
| union | ` //bidder \| //person ` | 28.2 | 1957.7 (69.5×) | 1975.8 (70.2×) |
| union | ` (//bidder, //person)/.. ` | 32.3 | 1967.2 (61.0×) | 1992.0 (61.7×) |
| string value | ` sum(//closed_auction/price) ` | 14.3 | 977.9 (68.5×) | 993.5 (69.6×) |
| string value | ` string-length(string-join(//person/name, ' ')) ` | 16.1 | 1024.3 (63.5×) | 1051.2 (65.2×) |
| existence | ` exists(//keyword) ` | 0.1 | 0.2 (1.9×) | 0.2 (1.9×) |
| existence | ` empty(//person[profile/@income > 1000000]) ` | 20.4 | 1993.7 (97.8×) | 2122.3 (104.1×) |
| existence | ` boolean(//item[location = 'United States']) ` | 0.1 | 2016.5 (15894.4×) | 2108.1 (16616.3×) |
| existence | ` not(//closed_auction[price > 1000000]) ` | 16.2 | 1999.5 (123.6×) | 2134.3 (131.9×) |
| first items | ` head(//bidder) ` | 5.8 | 525.4 (90.9×) | 548.2 (94.8×) |
| first items | ` (//item[quantity > 1])[1] ` | 0.1 | 2025.4 (25762.5×) | 2144.2 (27274.2×) |
| first items | ` (//keyword)[3] ` | 0.0 | 0.2 (10.6×) | 0.2 (10.6×) |
| first items | ` exactly-one(/site/regions) ` | 0.0 | 0.1 (3.1×) | 0.1 (3.2×) |
| count of a path | ` count(//open_auction/bidder) ` | 12.6 | 994.3 (79.0×) | 1018.9 (81.0×) |
| count of a path | ` count(//keyword/ancestor::*) ` | 39.3 | 1447.2 (36.8×) | 1477.2 (37.6×) |
| count of a path | ` count(//person//@*) ` | 12.3 | 1222.1 (99.4×) | 1261.0 (102.5×) |
| quantifier | ` some $person in //person satisfies $person/@id = 'person0' ` | 3.9 | 360.6 (93.0×) | 374.2 (96.5×) |
| quantifier | ` every $bidder in //bidder satisfies $bidder/increase ` | 17.0 | 1007.0 (59.3×) | 1049.0 (61.8×) |
| position after // | ` //keyword[2] ` | 15.5 | 1591.2 (102.4×) | 1625.6 (104.6×) |
| position after // | ` //*:keyword[1] ` | 39.9 | 1668.6 (41.8×) | 1696.6 (42.5×) |
| predicate | ` //person[homepage] ` | 12.4 | 1981.5 (160.3×) | 2085.6 (168.8×) |
| attribute | ` //@id[starts-with(., 'person1')] ` | 16.2 | 1813.6 (111.6×) | 1993.3 (122.7×) |
| long path | ` /site/closed_auctions/closed_auction/annotation/description/parlist/listitem/parlist/listitem/text/emph/keyword ` | 3.2 | 48.2 (15.0×) | 48.3 (15.0×) |

<details><summary>Raw measurements</summary>

Times here cover every document the workload reads, including those a library throws on or reads wrongly.

| Library | Workload | Best ms | Median ms | Noise | Threw on | Wrong output | Count differs | ns/event | Retained MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| exemplar 0.3.0 | walk | 265 | 269 | 29.6% | 0 of 1 | 0 | n/a | 63 | n/a |
| htmlparser2 12.0.0 | walk | 694 | 697 | 0.6% | 0 of 1 | 0 | n/a | 165 | n/a |
| sax 1.6.1 | walk | 1562 | 1576 | 2.2% | 0 of 1 | 0 | n/a | 372 | n/a |
| saxen 11.2.0 | walk | 239 | 241 | 1.0% | 0 of 1 | 0 | n/a | 57 | n/a |
| saxes 6.0.0 | walk | 624 | 630 | 26.1% | 0 of 1 | 0 | n/a | 149 | n/a |
| stax-xml 1.1.2 | walk | 461 | 462 | 5.5% | 0 of 1 | 0 | n/a | 110 | n/a |
| exemplar 0.3.0 | read | 309 | 310 | 1.0% | 0 of 1 | 0 | 0 | 74 | n/a |
| htmlparser2 12.0.0 | read | 757 | 766 | 3.2% | 0 of 1 | 0 | 0 | 180 | n/a |
| sax 1.6.1 | read | 1678 | 1816 | 11.4% | 0 of 1 | 0 | 0 | 399 | n/a |
| saxen 11.2.0 | read | 381 | 386 | 2.4% | 0 of 1 | 0 | 0 | 91 | n/a |
| saxes 6.0.0 | read | 790 | 793 | 4.7% | 0 of 1 | 0 | 0 | 188 | n/a |
| stax-xml 1.1.2 | read | 542 | 593 | 9.5% | 0 of 1 | 0 | 0 | 129 | n/a |
| exemplar 0.3.0 | tree | 670 | 671 | 2.9% | 0 of 1 | 0 | n/a | 159 | 629 |
| fast-xml-parser 5.11.2 | tree | 2800 | 3151 | 14.2% | 0 of 1 | 0 | n/a | 667 | 666 |
| libxmljs2 0.37.0 | tree | 332 | 336 | 1.4% | 0 of 1 | 0 | n/a | 79 | 730 |
| saxon-js-2 2.7.0 | tree | 3126 | 3151 | 0.8% | 0 of 1 | 0 | n/a | 744 | 1151 |
| saxon-js-3 3.0.0-beta2 | tree | 3136 | 3197 | 2.9% | 0 of 1 | 0 | n/a | 747 | 1151 |
| txml 6.0.3 | tree | 787 | 791 | 3.0% | 0 of 1 | 0 | n/a | 187 | 538 |
| @xmldom/xmldom 0.9.12 | tree | 5061 | 5066 | 0.2% | 0 of 1 | 0 | n/a | 1205 | 2081 |
| exemplar 0.3.0 | xdm | 582 | 584 | 1.3% | 0 of 1 | 0 | n/a | 139 | 209 |
| saxon-js-2 2.7.0 | xdm | 3140 | 3149 | 0.5% | 0 of 1 | 0 | n/a | 747 | 1151 |
| saxon-js-3 3.0.0-beta2 | xdm | 3222 | 3226 | 2.4% | 0 of 1 | 0 | n/a | 767 | 1151 |
| exemplar 0.3.0 | xpath | 499 | 512 | 3.7% | 0 of 1 | 0 | 0 | 119 | n/a |
| saxon-js-2 2.7.0 | xpath | 15704 | 15951 | 6.8% | 0 of 1 | 0 | 0 | 3738 | n/a |
| saxon-js-3 3.0.0-beta2 | xpath | 15155 | 15410 | 2.2% | 0 of 1 | 0 | 0 | 3608 | n/a |
| exemplar 0.3.0 | axes | 2337 | 2346 | 0.5% | 0 of 1 | 0 | 0 | 556 | n/a |
| saxon-js-2 2.7.0 | axes | 85444 | 86739 | 2.8% | 0 of 1 | 0 | 0 | 20340 | n/a |
| saxon-js-3 3.0.0-beta2 | axes | 87676 | 88673 | 3.9% | 0 of 1 | 0 | 0 | 20871 | n/a |
| exemplar 0.3.0 | compile | 35 | 36 | 2.1% | 0 of 1 | 0 | n/a | 8 | n/a |
| saxon-js-2 2.7.0 | compile | 101 | 104 | 3.3% | 0 of 1 | 0 | n/a | 24 | n/a |
| saxon-js-3 3.0.0-beta2 | compile | 101 | 103 | 10.4% | 0 of 1 | 0 | n/a | 24 | n/a |
| exemplar 0.3.0 | stream | 454 | 472 | 6.6% | 0 of 1 | 0 | 0 | 108 | n/a |
| htmlparser2 12.0.0 | stream | 825 | 841 | 3.7% | 0 of 1 | 0 | 0 | 196 | n/a |
| sax 1.6.1 | stream | 1704 | 1718 | 2.4% | 0 of 1 | 0 | 0 | 406 | n/a |
| saxen 11.2.0 | stream | 556 | 563 | 2.0% | 0 of 1 | 0 | 0 | 132 | n/a |
| saxes 6.0.0 | stream | 872 | 885 | 3.2% | 0 of 1 | 0 | 0 | 208 | n/a |
| stax-xml 1.1.2 | stream | 971 | 977 | 6.2% | 0 of 1 | 0 | 0 | 231 | n/a |
| exemplar 0.3.0 | write | 547 | 548 | 0.8% | 0 of 1 | 0 | n/a | 130 | n/a |
| stax-xml 1.1.2 | write | 1682 | 1690 | 12.1% | 0 of 1 | 0 | n/a | 400 | n/a |

</details>

## Expat recordsets

2 documents, 66.0 MB. Speeds are in MB/s, except `compile`, in expressions per second.

| Library | Reads correctly | `walk` | `read` | `stream` | `tree` | `xdm` | `xpath` | `write` | Tree MB | XDM MB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| exemplar | 100% | 154.3 | 133.9 | 103.9 | 86.2 | 74.9 | 628.8 | 124.9 | 604 | 139 |
| fast-xml-parser | 0% | – | – | – | FAILED | – | – | – | FAILED | – |
| htmlparser2 | 100% | 110.0 | 77.3 | 74.7 | – | – | – | – | – | – |
| libxmljs2 | 100% | – | – | – | 126.1 | – | – | – | 641 | – |
| sax | 100% | 31.1 | 27.8 | 27.9 | – | – | – | – | – | – |
| saxen | 100% | 656.5 | 78.5 | 62.7 | – | – | – | – | – | – |
| saxes | 100% | 100.4 | 73.2 | 69.1 | – | – | – | – | – | – |
| saxon-js-2 | 100% | – | – | – | 23.1 | 23.0 | 43.2 | – | 490 | 490 |
| saxon-js-3 | 100% | – | – | – | 23.1 | 22.8 | 42.9 | – | 490 | 490 |
| stax-xml | 100% | 139.0 | 102.4 | 89.2 | – | – | – | 49.6 | – | – |
| txml | 100% | – | – | – | 88.2 | – | – | – | 247 | – |
| @xmldom/xmldom | 100% | – | – | – | 37.2 | – | – | – | 743 | – |

<details><summary>Raw measurements</summary>

Times here cover every document the workload reads, including those a library throws on or reads wrongly.

| Library | Workload | Best ms | Median ms | Noise | Threw on | Wrong output | Count differs | ns/event | Retained MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| exemplar 0.3.0 | walk | 428 | 439 | 4.4% | 0 of 2 | 0 | n/a | 4271 | n/a |
| htmlparser2 12.0.0 | walk | 600 | 600 | 0.1% | 0 of 2 | 0 | n/a | 5993 | n/a |
| sax 1.6.1 | walk | 2120 | 2123 | 0.5% | 0 of 2 | 0 | n/a | 21181 | n/a |
| saxen 11.2.0 | walk | 101 | 101 | 1.1% | 0 of 2 | 0 | n/a | 1004 | n/a |
| saxes 6.0.0 | walk | 657 | 658 | 0.5% | 0 of 2 | 0 | n/a | 6566 | n/a |
| stax-xml 1.1.2 | walk | 475 | 481 | 1.5% | 0 of 2 | 0 | n/a | 4743 | n/a |
| exemplar 0.3.0 | read | 493 | 494 | 1.2% | 0 of 2 | 0 | 0 | 4922 | n/a |
| htmlparser2 12.0.0 | read | 854 | 865 | 2.4% | 0 of 2 | 0 | 0 | 8528 | n/a |
| sax 1.6.1 | read | 2373 | 2388 | 2.0% | 0 of 2 | 0 | 0 | 23708 | n/a |
| saxen 11.2.0 | read | 841 | 844 | 1.4% | 0 of 2 | 0 | 0 | 8399 | n/a |
| saxes 6.0.0 | read | 901 | 904 | 0.4% | 0 of 2 | 0 | 0 | 9001 | n/a |
| stax-xml 1.1.2 | read | 644 | 645 | 1.8% | 0 of 2 | 0 | 0 | 6434 | n/a |
| exemplar 0.3.0 | tree | 765 | 782 | 7.8% | 0 of 2 | 0 | n/a | 7645 | 604 |
| fast-xml-parser 5.11.2 | tree | 1275 | 1282 | 0.9% | 0 of 2 | 2 | n/a | 12738 | 310 |
| libxmljs2 0.37.0 | tree | 523 | 606 | 16.0% | 0 of 2 | 0 | n/a | 5227 | 641 |
| saxon-js-2 2.7.0 | tree | 2861 | 2866 | 0.6% | 0 of 2 | 0 | n/a | 28577 | 490 |
| saxon-js-3 3.0.0-beta2 | tree | 2859 | 2868 | 1.7% | 0 of 2 | 0 | n/a | 28556 | 490 |
| txml 6.0.3 | tree | 748 | 752 | 2.9% | 0 of 2 | 0 | n/a | 7476 | 247 |
| @xmldom/xmldom 0.9.12 | tree | 1774 | 1787 | 1.1% | 0 of 2 | 0 | n/a | 17725 | 743 |
| exemplar 0.3.0 | xdm | 881 | 886 | 5.1% | 0 of 2 | 0 | n/a | 8802 | 139 |
| saxon-js-2 2.7.0 | xdm | 2865 | 2889 | 1.5% | 0 of 2 | 0 | n/a | 28618 | 490 |
| saxon-js-3 3.0.0-beta2 | xdm | 2888 | 2949 | 2.9% | 0 of 2 | 0 | n/a | 28849 | 490 |
| exemplar 0.3.0 | xpath | 105 | 122 | 18.1% | 0 of 2 | 0 | 0 | 1048 | n/a |
| saxon-js-2 2.7.0 | xpath | 1526 | 1558 | 4.6% | 0 of 2 | 0 | 0 | 15244 | n/a |
| saxon-js-3 3.0.0-beta2 | xpath | 1539 | 1578 | 5.0% | 0 of 2 | 0 | 0 | 15373 | n/a |
| exemplar 0.3.0 | stream | 635 | 640 | 0.9% | 0 of 2 | 0 | 0 | 6345 | n/a |
| htmlparser2 12.0.0 | stream | 883 | 888 | 1.0% | 0 of 2 | 0 | 0 | 8820 | n/a |
| sax 1.6.1 | stream | 2366 | 2392 | 1.6% | 0 of 2 | 0 | 0 | 23639 | n/a |
| saxen 11.2.0 | stream | 1053 | 1067 | 2.5% | 0 of 2 | 0 | 0 | 10518 | n/a |
| saxes 6.0.0 | stream | 955 | 959 | 0.5% | 0 of 2 | 0 | 0 | 9542 | n/a |
| stax-xml 1.1.2 | stream | 739 | 741 | 2.5% | 0 of 2 | 0 | 0 | 7387 | n/a |
| exemplar 0.3.0 | write | 528 | 531 | 1.9% | 0 of 2 | 0 | n/a | 5275 | n/a |
| stax-xml 1.1.2 | write | 1330 | 1341 | 1.0% | 0 of 2 | 0 | n/a | 13287 | n/a |

fast-xml-parser first differs in ` ns_att_test.xml `: ` at 24694: got "&amp;#x27;ANA\" tb3:SALESPERSONNAME=\"JANI", expected "'ANA\" tb3:SALESPERSONNAME=\"JANICE CARROL" `

</details>

## DocBook DTD with entity sets

- Twenty copies of a one-element document whose DTD is large and real: DocBook 5.0, with FreeBSD's author and manual-page entity sets and the 19 ISO character entity sets of xmlcharent, 2.3 MB of declarations read from files. Nearly all the time goes to the DTD, so the `dtd` workload alone reads it, and the copies give V8 the parses it needs to optimize.
- The element takes its namespace from DocBook's attribute defaults and holds an author's name and three characters, so a library that does not read the DTD expands nothing and counts differently.
- Speeds count the DTD files with each copy, as the bytes each parse reads.

20 documents, 46.2 MB. Speeds are in MB/s, except `compile`, in expressions per second.

| Library | Reads correctly | `dtd` |
| --- | ---: | ---: |
| exemplar | 100% | 144.4 |
| libxmljs2 | 100% | 81.4 |

<details><summary>Raw measurements</summary>

Times here cover every document the workload reads, including those a library throws on or reads wrongly.

| Library | Workload | Best ms | Median ms | Noise | Threw on | Wrong output | Count differs | ns/event | Retained MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| exemplar 0.3.0 | dtd | 320 | 322 | 0.8% | 0 of 20 | 0 | 0 | 3202748 | n/a |
| libxmljs2 0.37.0 | dtd | 568 | 569 | 0.2% | 0 of 20 | 0 | 0 | 5681576 | n/a |

</details>

## Synthetic, 100 K elements

1 document, 6.2 MB. Speeds are in MB/s, except `compile`, in expressions per second.

| Library | Reads correctly | `walk` | `read` | `stream` | `tree` | `xdm` | `xpath` | `write` | Tree MB | XDM MB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| exemplar | 100% | 266.2 | 182.0 | 130.0 | 99.2 | 90.5 | 43.3 | 101.1 | 59 | 18 |
| fast-xml-parser | 100% | – | – | – | 25.0 | – | – | – | 40 | – |
| htmlparser2 | 100% | 107.9 | 98.0 | 90.5 | – | – | – | – | – | – |
| libxmljs2 | 100% | – | – | – | 182.8 | – | – | – | 61 | – |
| sax | 100% | 48.3 | 43.4 | 42.1 | – | – | – | – | – | – |
| saxen | 100% | 264.3 | 118.3 | 92.2 | – | – | – | – | – | – |
| saxes | 100% | 104.7 | 73.0 | 64.2 | – | – | – | – | – | – |
| saxon-js-2 | 100% | – | – | – | 26.2 | 26.0 | 3.9 | – | 82 | 82 |
| saxon-js-3 | 100% | – | – | – | 25.7 | 26.2 | 3.9 | – | 82 | 82 |
| stax-xml | 100% | 153.8 | 109.6 | 66.0 | – | – | – | 47.7 | – | – |
| txml | 100% | – | – | – | 88.6 | – | – | – | 33 | – |
| @xmldom/xmldom | 100% | – | – | – | 16.2 | – | – | – | 143 | – |

<details><summary>Raw measurements</summary>

Times here cover every document the workload reads, including those a library throws on or reads wrongly.

| Library | Workload | Best ms | Median ms | Noise | Threw on | Wrong output | Count differs | ns/event | Retained MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| exemplar 0.3.0 | walk | 23 | 23 | 0.2% | 0 of 1 | 0 | n/a | 89 | n/a |
| htmlparser2 12.0.0 | walk | 57 | 57 | 0.6% | 0 of 1 | 0 | n/a | 220 | n/a |
| sax 1.6.1 | walk | 128 | 129 | 1.5% | 0 of 1 | 0 | n/a | 491 | n/a |
| saxen 11.2.0 | walk | 23 | 24 | 1.6% | 0 of 1 | 0 | n/a | 90 | n/a |
| saxes 6.0.0 | walk | 59 | 60 | 3.8% | 0 of 1 | 0 | n/a | 226 | n/a |
| stax-xml 1.1.2 | walk | 40 | 40 | 1.5% | 0 of 1 | 0 | n/a | 154 | n/a |
| exemplar 0.3.0 | read | 34 | 35 | 2.9% | 0 of 1 | 0 | 0 | 130 | n/a |
| htmlparser2 12.0.0 | read | 63 | 64 | 6.9% | 0 of 1 | 0 | 0 | 242 | n/a |
| sax 1.6.1 | read | 142 | 143 | 1.2% | 0 of 1 | 0 | 0 | 546 | n/a |
| saxen 11.2.0 | read | 52 | 53 | 0.8% | 0 of 1 | 0 | 0 | 200 | n/a |
| saxes 6.0.0 | read | 84 | 85 | 1.4% | 0 of 1 | 0 | 0 | 325 | n/a |
| stax-xml 1.1.2 | read | 56 | 57 | 4.2% | 0 of 1 | 0 | 0 | 216 | n/a |
| exemplar 0.3.0 | tree | 62 | 63 | 22.6% | 0 of 1 | 0 | n/a | 239 | 59 |
| fast-xml-parser 5.11.2 | tree | 246 | 251 | 3.8% | 0 of 1 | 0 | n/a | 946 | 40 |
| libxmljs2 0.37.0 | tree | 34 | 34 | 8.0% | 0 of 1 | 0 | n/a | 130 | 61 |
| saxon-js-2 2.7.0 | tree | 235 | 237 | 3.0% | 0 of 1 | 0 | n/a | 903 | 82 |
| saxon-js-3 3.0.0-beta2 | tree | 240 | 240 | 3.8% | 0 of 1 | 0 | n/a | 921 | 82 |
| txml 6.0.3 | tree | 70 | 70 | 0.7% | 0 of 1 | 0 | n/a | 267 | 33 |
| @xmldom/xmldom 0.9.12 | tree | 382 | 386 | 3.3% | 0 of 1 | 0 | n/a | 1467 | 143 |
| exemplar 0.3.0 | xdm | 68 | 69 | 3.1% | 0 of 1 | 0 | n/a | 262 | 18 |
| saxon-js-2 2.7.0 | xdm | 237 | 239 | 0.7% | 0 of 1 | 0 | n/a | 912 | 82 |
| saxon-js-3 3.0.0-beta2 | xdm | 236 | 237 | 7.2% | 0 of 1 | 0 | n/a | 906 | 82 |
| exemplar 0.3.0 | xpath | 142 | 154 | 9.7% | 0 of 1 | 0 | 0 | 547 | n/a |
| saxon-js-2 2.7.0 | xpath | 1590 | 1591 | 1.0% | 0 of 1 | 0 | 0 | 6113 | n/a |
| saxon-js-3 3.0.0-beta2 | xpath | 1583 | 1590 | 0.7% | 0 of 1 | 0 | 0 | 6085 | n/a |
| exemplar 0.3.0 | stream | 47 | 48 | 2.2% | 0 of 1 | 0 | 0 | 182 | n/a |
| htmlparser2 12.0.0 | stream | 68 | 73 | 9.1% | 0 of 1 | 0 | 0 | 262 | n/a |
| sax 1.6.1 | stream | 146 | 151 | 3.5% | 0 of 1 | 0 | 0 | 563 | n/a |
| saxen 11.2.0 | stream | 67 | 67 | 4.1% | 0 of 1 | 0 | 0 | 257 | n/a |
| saxes 6.0.0 | stream | 96 | 97 | 1.9% | 0 of 1 | 0 | 0 | 369 | n/a |
| stax-xml 1.1.2 | stream | 93 | 95 | 2.6% | 0 of 1 | 0 | 0 | 359 | n/a |
| exemplar 0.3.0 | write | 61 | 62 | 6.0% | 0 of 1 | 0 | n/a | 235 | n/a |
| stax-xml 1.1.2 | write | 129 | 130 | 3.4% | 0 of 1 | 0 | n/a | 497 | n/a |

</details>

## Synthetic, 1 M elements

1 document, 61.7 MB. Speeds are in MB/s, except `compile`, in expressions per second.

| Library | Reads correctly | `walk` | `read` | `stream` | `tree` | `xdm` | `xpath` | `write` | Tree MB | XDM MB |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| exemplar | 100% | 306.5 | 219.1 | 141.5 | 99.2 | 103.8 | 48.8 | 117.7 | 591 | 172 |
| fast-xml-parser | 100% | – | – | – | 26.5 | – | – | – | 395 | – |
| htmlparser2 | 100% | 119.5 | 98.2 | 91.7 | – | – | – | – | – | – |
| libxmljs2 | 100% | – | – | – | 183.8 | – | – | – | 614 | – |
| sax | 100% | 48.0 | 44.1 | 43.7 | – | – | – | – | – | – |
| saxen | 100% | 338.2 | 129.3 | 101.2 | – | – | – | – | – | – |
| saxes | 100% | 107.7 | 76.2 | 68.8 | – | – | – | – | – | – |
| saxon-js-2 | 100% | – | – | – | 25.7 | 25.7 | 3.9 | – | 813 | 813 |
| saxon-js-3 | 100% | – | – | – | 25.6 | 25.3 | 3.9 | – | 813 | 813 |
| stax-xml | 100% | 185.7 | 122.7 | 81.1 | – | – | – | 47.2 | – | – |
| txml | 100% | – | – | – | 91.6 | – | – | – | 330 | – |
| @xmldom/xmldom | 100% | – | – | – | 15.9 | – | – | – | 1435 | – |

<details><summary>Raw measurements</summary>

Times here cover every document the workload reads, including those a library throws on or reads wrongly.

| Library | Workload | Best ms | Median ms | Noise | Threw on | Wrong output | Count differs | ns/event | Retained MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| exemplar 0.3.0 | walk | 201 | 203 | 8.2% | 0 of 1 | 0 | n/a | 77 | n/a |
| htmlparser2 12.0.0 | walk | 516 | 523 | 2.6% | 0 of 1 | 0 | n/a | 199 | n/a |
| sax 1.6.1 | walk | 1284 | 1313 | 2.6% | 0 of 1 | 0 | n/a | 494 | n/a |
| saxen 11.2.0 | walk | 182 | 185 | 5.2% | 0 of 1 | 0 | n/a | 70 | n/a |
| saxes 6.0.0 | walk | 573 | 573 | 0.4% | 0 of 1 | 0 | n/a | 220 | n/a |
| stax-xml 1.1.2 | walk | 332 | 336 | 3.4% | 0 of 1 | 0 | n/a | 128 | n/a |
| exemplar 0.3.0 | read | 281 | 283 | 6.4% | 0 of 1 | 0 | 0 | 108 | n/a |
| htmlparser2 12.0.0 | read | 628 | 633 | 1.5% | 0 of 1 | 0 | 0 | 242 | n/a |
| sax 1.6.1 | read | 1399 | 1410 | 1.5% | 0 of 1 | 0 | 0 | 538 | n/a |
| saxen 11.2.0 | read | 477 | 477 | 0.7% | 0 of 1 | 0 | 0 | 183 | n/a |
| saxes 6.0.0 | read | 809 | 812 | 1.6% | 0 of 1 | 0 | 0 | 311 | n/a |
| stax-xml 1.1.2 | read | 503 | 506 | 1.4% | 0 of 1 | 0 | 0 | 193 | n/a |
| exemplar 0.3.0 | tree | 622 | 631 | 4.4% | 0 of 1 | 0 | n/a | 239 | 591 |
| fast-xml-parser 5.11.2 | tree | 2328 | 2355 | 1.3% | 0 of 1 | 0 | n/a | 895 | 395 |
| libxmljs2 0.37.0 | tree | 336 | 338 | 1.1% | 0 of 1 | 0 | n/a | 129 | 614 |
| saxon-js-2 2.7.0 | tree | 2400 | 2424 | 4.0% | 0 of 1 | 0 | n/a | 923 | 813 |
| saxon-js-3 3.0.0-beta2 | tree | 2405 | 2441 | 2.5% | 0 of 1 | 0 | n/a | 925 | 813 |
| txml 6.0.3 | tree | 673 | 690 | 2.5% | 0 of 1 | 0 | n/a | 259 | 330 |
| @xmldom/xmldom 0.9.12 | tree | 3867 | 3888 | 0.6% | 0 of 1 | 0 | n/a | 1487 | 1435 |
| exemplar 0.3.0 | xdm | 594 | 607 | 4.0% | 0 of 1 | 0 | n/a | 229 | 172 |
| saxon-js-2 2.7.0 | xdm | 2404 | 2412 | 1.7% | 0 of 1 | 0 | n/a | 924 | 813 |
| saxon-js-3 3.0.0-beta2 | xdm | 2437 | 2447 | 1.3% | 0 of 1 | 0 | n/a | 937 | 813 |
| exemplar 0.3.0 | xpath | 1265 | 1271 | 4.4% | 0 of 1 | 0 | 0 | 486 | n/a |
| saxon-js-2 2.7.0 | xpath | 15631 | 15741 | 1.4% | 0 of 1 | 0 | 0 | 6011 | n/a |
| saxon-js-3 3.0.0-beta2 | xpath | 15793 | 15796 | 1.1% | 0 of 1 | 0 | 0 | 6073 | n/a |
| exemplar 0.3.0 | stream | 436 | 445 | 11.0% | 0 of 1 | 0 | 0 | 168 | n/a |
| htmlparser2 12.0.0 | stream | 672 | 689 | 3.4% | 0 of 1 | 0 | 0 | 259 | n/a |
| sax 1.6.1 | stream | 1411 | 1448 | 3.3% | 0 of 1 | 0 | 0 | 543 | n/a |
| saxen 11.2.0 | stream | 609 | 619 | 3.1% | 0 of 1 | 0 | 0 | 234 | n/a |
| saxes 6.0.0 | stream | 896 | 900 | 1.9% | 0 of 1 | 0 | 0 | 345 | n/a |
| stax-xml 1.1.2 | stream | 760 | 791 | 6.4% | 0 of 1 | 0 | 0 | 292 | n/a |
| exemplar 0.3.0 | write | 524 | 528 | 0.8% | 0 of 1 | 0 | n/a | 201 | n/a |
| stax-xml 1.1.2 | write | 1307 | 1318 | 2.8% | 0 of 1 | 0 | n/a | 503 | n/a |

</details>

## How this was measured

- **Correct output only.** Before anything is timed, each library's output for every document is compared with exemplar's, which the differential tests check against libxml2. When reading, streaming and reading DTDs, what each library counts in a document while timed must also equal exemplar's count. A library is timed only on the documents it reads correctly.
- **Coverage.** A library that reads only part of a dataset correctly is timed on that part. From half of the data, by size, its speed is shown with ‡, and its bars are orange from 95% and red below. Under half, it is shown as FAILED: a part chosen by what the library can read says little about the dataset.
- **Rounds.** Every round runs in a fresh process after a warm-up pass, and the best of 3 rounds is reported.
- **No DTDs, but in `dtd`.** Every library, exemplar included, reads each document standalone: without its external DTD or external entities, which most of the libraries cannot read. Entities an internal subset declares are expanded. The `dtd` workload alone reads the DTD and entities each document refers to, from the files beside it.
- **Prepared data.** Each dataset holds only the documents the JDK's Xerces accepts, read as the benchmarks read them.
- **The full method** is in [benchmarking.md](../../../docs/benchmarking.md).
