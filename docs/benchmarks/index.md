<script setup lang="ts">
import { data as releases } from './releases.data.ts';
</script>

# Benchmarks

Every release of exemplar is benchmarked against the other JavaScript XML libraries on one fixed machine, on real-world
and synthetic documents, covering reading, streaming, tree building, XPath and writing. Each report states the
machine and runtime used and the proportion of each dataset that every library parsed correctly.

<p v-if="releases.length > 0">
  The latest report is for <a :href="`./${releases[0]}`">exemplar {{ releases[0] }}</a>.
</p>
<p v-else>No release has been benchmarked yet.</p>

<ul v-if="releases.length > 1">
  <li v-for="version in releases.slice(1)" :key="version"><a :href="`./${version}`">exemplar {{ version }}</a></li>
</ul>
