import { readFileSync } from 'node:fs';
import { transformerTwoslash } from '@shikijs/vitepress-twoslash';
import { defineConfig } from 'vitepress';

/** Declarations every code sample may use without setting them up, such as a factory or a source. */
const SAMPLE_GLOBALS = readFileSync(new URL('samples.d.ts', import.meta.url), 'utf8');

/** Set to build without type-checking the samples, as when exemplar's packages are not built. */
const SKIP_SAMPLES = process.env.EXEMPLAR_DOCS_SKIP_SAMPLES === 'true';

export default defineConfig({
  title: 'exemplar',
  description: 'Conformant, fast XML for JavaScript: readers, DOM, XDM, XPath 3.1, writers and more.',
  cleanUrls: true,
  // The benchmark reports are rendered through `benchmarks/[version].md`, not as pages of their own.
  srcExclude: ['public/**'],
  lastUpdated: true,
  markdown: {
    codeTransformers: SKIP_SAMPLES
      ? []
      : [
          // Samples marked `twoslash` are type-checked against exemplar's packages; an error fails the build.
          transformerTwoslash({
            twoslashOptions: {
              compilerOptions: { moduleDetection: 3, types: ['node'] },
              extraFiles: { 'samples.d.ts': SAMPLE_GLOBALS },
            },
          }),
        ],
    languages: ['js', 'ts', 'xml', 'json', 'bash'],
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/options' },
      { text: 'Benchmarks', link: '/benchmarks/' },
    ],
    // Each page's sections, two levels deep, under "On this page".
    outline: { level: [2, 3], label: 'On this page' },
    sidebar: {
      '/reference/': [
        {
          text: 'Options',
          items: [
            { text: 'Reader options', link: '/reference/options' },
            { text: 'Writer options', link: '/reference/writer-options' },
            { text: 'Limits', link: '/reference/limits' },
          ],
        },
        {
          text: 'Lookups',
          items: [
            { text: 'Error codes', link: '/reference/error-codes' },
            { text: 'XPath functions', link: '/reference/xpath-functions' },
            { text: 'Coming from Java', link: '/reference/java' },
          ],
        },
        {
          text: 'About',
          items: [
            { text: 'Packages and runtimes', link: '/reference/packages' },
            { text: 'Standards and conformance', link: '/reference/conformance' },
          ],
        },
      ],
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Choosing how to read', link: '/guide/choosing-an-api' },
            { text: 'Factories and sources', link: '/guide/sources' },
            { text: 'Namespaces', link: '/guide/namespaces' },
            { text: 'Errors and locations', link: '/guide/errors' },
            { text: 'Pipelines', link: '/guide/pipelines' },
          ],
        },
        {
          text: 'The cursor',
          items: [
            { text: 'Reading with the cursor', link: '/guide/cursor/' },
            { text: 'Large files and streams', link: '/guide/cursor/streams' },
            { text: 'One record at a time', link: '/guide/cursor/records' },
            { text: 'Dropping content with filters', link: '/guide/cursor/filters' },
            { text: 'Changing content with delegates', link: '/guide/cursor/delegates' },
          ],
        },
        {
          text: 'Event objects',
          items: [
            { text: 'Reading event objects', link: '/guide/events/' },
            { text: 'Changing events with a generator', link: '/guide/events/generators' },
          ],
        },
        {
          text: 'SAX',
          items: [
            { text: 'Handling events with SAX', link: '/guide/sax/' },
            { text: 'SAX filters', link: '/guide/sax/filters' },
          ],
        },
        {
          text: 'The DOM',
          items: [
            { text: 'Building and reading a DOM', link: '/guide/dom/' },
            { text: 'Changing and saving a DOM', link: '/guide/dom/saving' },
          ],
        },
        {
          text: 'Writing',
          items: [
            { text: 'Writing XML', link: '/guide/writing/' },
            { text: 'Copying and changing documents', link: '/guide/writing/copying' },
            { text: 'Canonical XML', link: '/guide/writing/canonical' },
          ],
        },
        {
          text: 'XPath',
          items: [
            { text: 'Getting started with XPath', link: '/guide/xpath/' },
            { text: 'Getting results', link: '/guide/xpath/results' },
            { text: 'Passing variables', link: '/guide/xpath/variables' },
            { text: 'The XDM tree', link: '/guide/xpath/tree' },
          ],
        },
        {
          text: 'XPath in depth',
          items: [
            { text: 'Reading documents and collections', link: '/guide/xpath/resources' },
            { text: 'Maps, arrays, JSON and functions', link: '/guide/xpath/maps-arrays' },
            { text: 'Dates, times and durations', link: '/guide/xpath/dates' },
            { text: 'Regular expressions and collations', link: '/guide/xpath/text' },
            { text: 'Serializing results', link: '/guide/xpath/serialize' },
            { text: 'Smaller bundles', link: '/guide/xpath/bundles' },
          ],
        },
        {
          text: 'DTDs and external content',
          items: [
            { text: 'DTDs and entities', link: '/guide/external/dtd' },
            { text: 'Resolvers and access', link: '/guide/external/resolvers' },
            { text: 'Catalogs', link: '/guide/external/catalogs' },
            { text: 'Validating against a DTD', link: '/guide/external/validation' },
            { text: 'XInclude', link: '/guide/external/xinclude' },
          ],
        },
        {
          text: 'In production',
          items: [
            { text: 'Untrusted input', link: '/guide/production/security' },
            { text: 'Encodings', link: '/guide/production/encodings' },
          ],
        },
      ],
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/io-timeout/exemplar' }],
    footer: { message: 'Released under the Apache License 2.0.' },
  },
});
