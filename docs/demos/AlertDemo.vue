<script setup lang="ts">
import { ref } from "vue";
import { Alert, Button } from "@ecoma-io/loom";

const quotaOpen = ref(true);
const syncOpen = ref(true);
</script>

<template>
  <div class="flex flex-col gap-3">
    <Alert
      variant="info"
      title="Scheduled maintenance"
      description="Reports refresh nightly at 02:00 UTC."
    />

    <Alert variant="success" title="Deployment complete">
      Build <code>#4821</code> is live on every region.
    </Alert>

    <Alert variant="warning" title="Approaching quota">
      <p>90% of this month's render minutes are used.</p>
      <ul class="ml-4 list-disc">
        <li>Rendering: 9,000 / 10,000 min</li>
        <li>Storage: 210 / 500 GB</li>
      </ul>
    </Alert>

    <Alert v-model:open="syncOpen" variant="destructive" title="Sync failed" dismissible>
      The workspace could not be reached for 20 minutes. Retry from Settings, or read the
      <a href="#" class="underline">incident report</a>.
    </Alert>

    <Alert v-model:open="quotaOpen" variant="neutral" dismissible title="Draft saved a moment ago">
      <Button variant="subtle" size="sm">Undo</Button>
    </Alert>

    <!-- A very long single line: the body column wraps, the icon and the close control hold their ground. -->
    <Alert variant="warning" title="Connection unstable">
      The link to the print farm has dropped and re-established four times in the last five minutes;
      jobs queued during the drops will resume automatically, but anything submitted while the link
      is down stays pending until the farm acknowledges it.
    </Alert>
  </div>
</template>
