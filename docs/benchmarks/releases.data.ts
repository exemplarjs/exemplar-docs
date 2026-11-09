import { defineLoader } from 'vitepress';
import { releases } from './releases.ts';

declare const data: string[];
export { data };

/** The released versions with a benchmark report, newest first. */
export default defineLoader({
  watch: ['../public/benchmarks/*/bench.md'],
  load: () => releases(),
});
