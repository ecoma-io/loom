<script setup lang="ts">
import { ref } from "vue";
import OtpInput from "./OtpInput.vue";

const code = ref("");
const confirmed = ref("");
const pin = ref("");
const backup = ref("");
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span id="otp-demo-code" class="text-xs text-muted-foreground">
        six-digit code — fills as you type, and reports itself once when the last cell takes a digit
      </span>
      <OtpInput v-model="code" aria-labelledby="otp-demo-code" @complete="confirmed = $event" />
      <p class="text-xs text-muted-foreground">
        Entered: <span class="tabular">{{ code || "—" }}</span> · confirmed:
        <span class="tabular">{{ confirmed || "—" }}</span>
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <span id="otp-demo-pin" class="text-xs text-muted-foreground">
        four-digit PIN, masked — for a code typed where someone can see the screen
      </span>
      <OtpInput v-model="pin" :length="4" mask aria-labelledby="otp-demo-pin" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="otp-demo-backup" class="text-xs text-muted-foreground">
        alphanumeric backup code — the text type takes any character, not only digits
      </span>
      <OtpInput v-model="backup" :length="8" type="text" aria-labelledby="otp-demo-backup" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="otp-demo-invalid" class="text-xs text-muted-foreground">
        invalid — the code was rejected, and the cells keep what was typed so it can be corrected
      </span>
      <OtpInput
        :model-value="'482'"
        :length="6"
        invalid
        aria-labelledby="otp-demo-invalid"
        aria-describedby="otp-demo-invalid-error"
      />
      <span id="otp-demo-invalid-error" class="text-xs text-destructive-text">
        That code has expired. Ask for a new one.
      </span>
    </div>

    <div class="flex flex-col gap-2">
      <span id="otp-demo-disabled" class="text-xs text-muted-foreground">
        disabled — while the code is being verified
      </span>
      <OtpInput :model-value="'4839'" :length="4" disabled aria-labelledby="otp-demo-disabled" />
    </div>
  </div>
</template>
