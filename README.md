# exemplar-docs

The documentation site for [exemplar](https://github.com/exemplarjs/exemplar), built with
[VitePress](https://vitepress.dev).

## Working on it

With [exemplar](https://github.com/exemplarjs/exemplar) checked out beside this repository, its packages are linked from
there (`.pnpmfile.mjs`); otherwise the latest published release is used.

```bash
pnpm install
pnpm dev
```

`pnpm build` builds the site into `docs/.vitepress/dist`, and fails on a sample that does not compile or a dead link.

## Checks

A pull request here checks format, lint, types and the site's links; `EXEMPLAR_DOCS_SKIP_SAMPLES=true pnpm build` builds without type-checking the samples. Type-checking the samples needs exemplar's build, so it runs in [exemplar's workflows](https://github.com/exemplarjs/exemplar/tree/main/.github/workflows): each exemplar pull request builds this site, on the branch named like it or else on `main`.

## Layout

| Path                           | What it holds                                                              |
| ------------------------------ | -------------------------------------------------------------------------- |
| `docs/guide/`                  | The guide: the introduction pages, then a folder per group in the sidebar  |
| `docs/reference/`              | Lookup tables: options, limits, error codes, XPath functions and the like  |
| `docs/benchmarks/`             | The benchmarks index, and one page per release's report                    |
| `docs/public/benchmarks/`      | Each release's benchmark report, as exemplar-tests writes it               |
| `docs/.vitepress/config.ts`    | Navigation, sidebar and the sample checks                                  |
| `docs/.vitepress/samples.d.ts` | What every sample may use without setting it up: `xml`, `source` and so on |

## Code samples

Every sample marked `ts twoslash` is type-checked against exemplar's packages when the site builds, and its names show
their types on hover. Lines above a `// ---cut---` line are checked but not shown, for the imports and setup a sample
needs:

````md
```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
const reader = xml.createStreamReader(source);
```
````

## Benchmark reports

exemplar's release workflow benchmarks each release, through exemplar-tests, and opens a pull request here that adds the report folder,
`tools/bench/reports/` as it is, at `docs/public/benchmarks/<version>/`: `bench.md`, `bench.json` and `charts/`. Each
version gets a page at `/benchmarks/<version>`, rendered from its `bench.md`, and the newest is linked from
`/benchmarks/`.
