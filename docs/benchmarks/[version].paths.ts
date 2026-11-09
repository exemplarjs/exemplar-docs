import { releases, reportContent } from './releases.ts';

/** One page per released version's benchmark report. */
export default {
  paths() {
    return releases().map((version) => ({ params: { version }, content: reportContent(version) }));
  },
};
