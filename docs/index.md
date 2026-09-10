---
layout: home

hero:
  name: Loom
  text: An Application Interface System for Vue
  tagline: Primitives, tokens, composition and responsive layouts — accessible by construction, desktop-aware by design.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Components
      link: /components/button
    - theme: alt
      text: Patterns
      link: /patterns/forms
    - theme: alt
      text: Showcase
      link: /showcase/
    - theme: alt
      text: Templates
      link: /templates/
    - theme: alt
      text: View on GitHub
      link: https://github.com/ecoma-io/loom

features:
  - title: Responsive by design
    details: Composition primitives and layouts that collapse intrinsically, without a media query per breakpoint. Content is bounded at readable widths on ultrawide monitors.
  - title: Accessible by construction
    details: Focus rings are a promise rather than a default. Busy states announce themselves, hidden layers are hidden from assistive technology too, and the suite fails the build on a WCAG 2.1 AA violation.
  - title: Ready-made layouts
    details: AppShell, Centered, Dashboard, DesktopAppShell, FormLayout, MasterDetail, Reading, Settings, SplitLayout — composed from primitives, responsive from mobile to ultrawide, and opinionated so you don't assemble them from scratch.
    link: /layouts/app-shell
    linkText: Browse layouts
  - title: Tokens, not hex codes
    details: One theme layer in Tailwind's CSS-first syntax. Colour, radius, easing, duration, shadow, type scale and breakpoints are declared once and consumed as utilities.
  - title: The host decides the platform
    details: Window chrome, safe-area insets and PWA overlays are boundary conditions the host passes in, not behaviours Loom sniffs at runtime. Cross-platform is a design constraint, not the product category.
  - title: Documented from source
    details: The API tables on this site are generated from the components themselves, and every example is the demo's real file. Neither can drift from the code it describes.
---
