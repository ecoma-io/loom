<script setup lang="ts">
// Every import here is a published specifier — that is the whole point of a
// template. An internal `@ecoma-io/loom-*` import would fail the dev server
// (this template's Vite config aliases only the named published specifiers)
// and redden `archkeep check` (the layer-templates row judges the resolved
// target). If the surface cannot express something, file the gap rather than
// reach past it.
//
// useTheme rides the root specifier deliberately: the `/theme` subpath is also
// published, but in-tree its tsconfig alias lands on the core package, and the
// layer-templates row judges the resolved project, not the specifier a
// consumer writes — importing it here would redden the row for a reach the
// template does not make.
import { AppShell, Button, Card, Stack, useTheme } from "@ecoma-io/loom";

const { resolvedTheme, toggleTheme } = useTheme();
</script>

<template>
  <AppShell sidebar-aria-label="Starter navigation">
    <template #sidebar>
      <nav aria-label="Starter" class="flex flex-col gap-2 p-4">
        <a href="#welcome">Welcome</a>
        <a href="#next">What to change first</a>
      </nav>
    </template>
    <template #header>
      <header class="flex items-center justify-between px-4 py-3">
        <p class="font-medium">Loom starter</p>
        <Button variant="ghost" @click="toggleTheme"> {{ resolvedTheme }} theme </Button>
      </header>
    </template>
    <main id="welcome" class="py-8">
      <Stack gap="lg" class="max-w-2xl">
        <h1 class="text-2xl font-semibold">Welcome to your Loom app</h1>
        <p class="text-muted-foreground">
          This page is itself the demo: a runnable consumer of the published package, held to the
          Template Contract. Replace it with your application.
        </p>
        <Card id="next" title="What to change first">
          <p class="text-muted-foreground">
            Copy the directory, swap the workspace dependency for the released version, delete the
            alias block and the extra <code>@source</code>
            rule, and it is a real project.
          </p>
        </Card>
      </Stack>
    </main>
  </AppShell>
</template>
