<script setup lang="ts">
import { Breadcrumb } from "@ecoma-io/loom";

const siteTrail = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Loom" },
];

const settingsTrail = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Settings", href: "/settings" },
  { label: "Profile" },
];
</script>

<template>
  <div class="flex flex-col gap-8">
    <div>
      <p class="mb-2 text-sm font-medium text-foreground">Default (slash separator)</p>
      <Breadcrumb :items="siteTrail" />
    </div>

    <div>
      <p class="mb-2 text-sm font-medium text-foreground">Chevron separator</p>
      <Breadcrumb :items="settingsTrail" separator="chevron" />
    </div>

    <div>
      <p class="mb-2 text-sm font-medium text-foreground">Arrow separator</p>
      <Breadcrumb :items="siteTrail" separator="→" />
    </div>
  </div>
</template>
