import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Where exemplar-tests' release job puts each release's report: `<version>/bench.md`, `bench.json` and `charts/`. */
export const REPORTS = path.resolve('docs/public/benchmarks');

/** Where links in a report to exemplar-tests' own documents point. */
const TESTS_REPOSITORY = 'https://github.com/io-timeout/exemplar-tests/blob/main';

/** The released versions that have a report, newest first. */
export function releases(): string[] {
  if (!existsSync(REPORTS)) return [];
  const versions = readdirSync(REPORTS).filter((name) => existsSync(path.join(REPORTS, name, 'bench.md')));
  return versions.toSorted(byVersionDescending);
}

/** A release's report as page content, titled with its version, its chart links made absolute. */
export function reportContent(version: string): string {
  const text = readFileSync(path.join(REPORTS, version, 'bench.md'), 'utf8');
  return text
    .replace(/^# .*\n/, `# Benchmarks: exemplar ${version}\n`)
    .replaceAll('](charts/', `](/benchmarks/${version}/charts/`)
    .replaceAll(/\]\((?:\.\.\/)+(docs\/[^)]+)\)/g, `](${TESTS_REPOSITORY}/$1)`);
}

/** Orders `1.10.0` after `1.9.0`; a pre-release sorts before its release. */
function byVersionDescending(a: string, b: string): number {
  const [aCore = '', aPre] = a.split('-', 2);
  const [bCore = '', bPre] = b.split('-', 2);
  const aParts = aCore.split('.').map(Number);
  const bParts = bCore.split('.').map(Number);
  for (let index = 0; index < Math.max(aParts.length, bParts.length); index++) {
    const difference = (bParts[index] ?? 0) - (aParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  if (aPre === bPre) return 0;
  if (aPre === undefined) return -1;
  if (bPre === undefined) return 1;
  return bPre.localeCompare(aPre);
}
