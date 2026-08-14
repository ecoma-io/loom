# Changelog

## [0.2.0](https://github.com/ecoma-io/loom/compare/v0.1.1...v0.2.0) (2026-08-14)


### Features

* **blocks:** add platform awareness to TitleBar, WindowControls and DesktopAppShell (Phase 7) ([#60](https://github.com/ecoma-io/loom/issues/60)) ([7d69572](https://github.com/ecoma-io/loom/commit/7d69572d35a2907e14928af89044837b27e8ff55))
* **blocks:** add six new blocks for Phase 6 ([#57](https://github.com/ecoma-io/loom/issues/57)) ([82c9892](https://github.com/ecoma-io/loom/commit/82c9892f46dd586c7bb224b431776e1f36f5f705))
* **ci:** shard e2e suite across 4 parallel runners ([#62](https://github.com/ecoma-io/loom/issues/62)) ([3dab785](https://github.com/ecoma-io/loom/commit/3dab785d24a11443b1a56b92a38f1ffbac37a39d))
* **composition:** add eight layout composition primitives ([#54](https://github.com/ecoma-io/loom/issues/54)) ([993e42d](https://github.com/ecoma-io/loom/commit/993e42d8802a40c8e1f9b30501a79c235a248739))
* **docs:** add cross-platform and responsive design foundations pages (Phase 8) ([#59](https://github.com/ecoma-io/loom/issues/59)) ([f83b67b](https://github.com/ecoma-io/loom/commit/f83b67bd9ebf42f65cddcfe81290d5aeba16f319))
* **layouts:** add eight responsive layout components for Phase 5 ([#56](https://github.com/ecoma-io/loom/issues/56)) ([515b84b](https://github.com/ecoma-io/loom/commit/515b84b9d885f676ea418e10598def14512c1194))
* **lib:** warn in dev mode when a Field's readonly is silently ignored ([#51](https://github.com/ecoma-io/loom/issues/51)) ([491e363](https://github.com/ecoma-io/loom/commit/491e36302e12f8f4286a18175e6a64af91b9a134))
* **primitives:** add leading and trailing slots to Textarea ([#52](https://github.com/ecoma-io/loom/issues/52)) ([af4d2c9](https://github.com/ecoma-io/loom/commit/af4d2c9a1e5bddd5b34053570200f3f1b945502f))
* **primitives:** add seven new primitives (Phase 4) ([#55](https://github.com/ecoma-io/loom/issues/55)) ([02b7ce4](https://github.com/ecoma-io/loom/commit/02b7ce4983e961cc0c21682257640cafad37a5cd))
* **primitives:** add seven new primitives for Phase 4 ([02b7ce4](https://github.com/ecoma-io/loom/commit/02b7ce4983e961cc0c21682257640cafad37a5cd))
* **primitives:** add twenty-three primitives, the Field context and the localisation seam ([#25](https://github.com/ecoma-io/loom/issues/25)) ([0f2ae8f](https://github.com/ecoma-io/loom/commit/0f2ae8f128e6937068b30d879444ad2c3046d7f6))
* **primitives:** give group controls in Field an accessible name ([#49](https://github.com/ecoma-io/loom/issues/49)) ([14dd58a](https://github.com/ecoma-io/loom/commit/14dd58a20f764f57aa980e34aa41384be9e3c6b9)), closes [#32](https://github.com/ecoma-io/loom/issues/32)
* **styles:** add dark mode, theme switching API, and remove Ecoma semantics ([#53](https://github.com/ecoma-io/loom/issues/53)) ([743bfd7](https://github.com/ecoma-io/loom/commit/743bfd74f50d7665a68a0dda851562a418efe107))


### Bug Fixes

* **a11y:** localise aria-valuetext for month and dayPeriod segments ([#50](https://github.com/ecoma-io/loom/issues/50)) ([1967d51](https://github.com/ecoma-io/loom/commit/1967d51d9a589b368ad5d298e2b68492ca2fd3f7))
* **ci:** pin the Node patch so the ESLint cache key stops drifting ([#44](https://github.com/ecoma-io/loom/issues/44)) ([18b2475](https://github.com/ecoma-io/loom/commit/18b24750c1c1acdfacb0c381ca3a05747e458314))
* **lib:** resolve .vue module types from .ts files in ESLint ([#47](https://github.com/ecoma-io/loom/issues/47)) ([2f0ee32](https://github.com/ecoma-io/loom/commit/2f0ee3226bb0b1f1810c8fcbc78e5775b08eb115))
* **primitives:** make dismissible=false decline the swipe-dismiss gesture ([#31](https://github.com/ecoma-io/loom/issues/31)) ([#46](https://github.com/ecoma-io/loom/issues/46)) ([57e9e7a](https://github.com/ecoma-io/loom/commit/57e9e7aae45e6f82cd612f382e210605089690ef))
* **primitives:** paint a disabled Rating in measured greys, not an alpha ([#39](https://github.com/ecoma-io/loom/issues/39)) ([1e609aa](https://github.com/ecoma-io/loom/commit/1e609aa7a049762e83e201e18ab3243fc0413adf))
* **primitives:** paint a disabled Slider in measured greys, not an alpha ([#41](https://github.com/ecoma-io/loom/issues/41)) ([b317f61](https://github.com/ecoma-io/loom/commit/b317f61edfb827b3014a0b2560657b3127d269ff))


### Refactoring

* **lib:** share the counter vocabulary between TextField and Textarea ([#48](https://github.com/ecoma-io/loom/issues/48)) ([e946e3a](https://github.com/ecoma-io/loom/commit/e946e3afb13564699360d8bb581d8e8ea06f0897))

## [0.1.1](https://github.com/ecoma-io/loom/compare/v0.1.0...v0.1.1) (2026-08-06)


### Bug Fixes

* **ci:** give the manual deploy a credential it can actually read ([#24](https://github.com/ecoma-io/loom/issues/24)) ([ad434b6](https://github.com/ecoma-io/loom/commit/ad434b64820066c1be4067cc01b048ec3575e9e1))
* **ci:** give the verification a Node version and time to see the publish ([#22](https://github.com/ecoma-io/loom/issues/22)) ([a758880](https://github.com/ecoma-io/loom/commit/a7588802cc2f50fda865d8f5622e513609e467eb))

## 0.1.0 (2026-08-06)


### Features

* establish the component foundation ([#2](https://github.com/ecoma-io/loom/issues/2)) ([ca0f300](https://github.com/ecoma-io/loom/commit/ca0f300cb91d68917732aa60a6b7b9bfe08389ac))
* port the eight composition blocks ([#4](https://github.com/ecoma-io/loom/issues/4)) ([af6cbc8](https://github.com/ecoma-io/loom/commit/af6cbc88ce088c6ffe25ce0fef09260fb766b98c))
* port the remaining twenty-six primitives ([#3](https://github.com/ecoma-io/loom/issues/3)) ([992051b](https://github.com/ecoma-io/loom/commit/992051b9f9d1135b4077630aa38f5a26ed56fe0b))
* release the package and the documentation site from main ([#5](https://github.com/ecoma-io/loom/issues/5)) ([13a1509](https://github.com/ecoma-io/loom/commit/13a1509b70cc236d7d9fed706121da02273b770a))


### Bug Fixes

* **ci:** let Release Please own its changelog's format ([#20](https://github.com/ecoma-io/loom/issues/20)) ([4614d78](https://github.com/ecoma-io/loom/commit/4614d78fca5ee0152e57028990680dc010cf9287))
* **ci:** open the Release PR with the App so its checks can run ([#21](https://github.com/ecoma-io/loom/issues/21)) ([c1da2d4](https://github.com/ecoma-io/loom/commit/c1da2d425fe9a3537fd1bdea3b97d121137b89b3))
* **ci:** title Release PRs with a scope the enum admits ([#19](https://github.com/ecoma-io/loom/issues/19)) ([6fd0e4e](https://github.com/ecoma-io/loom/commit/6fd0e4ee0d278793f5d99b211d5bd57ad3075734))
* **deps:** hold nine advisories forward in two transitive chains ([#16](https://github.com/ecoma-io/loom/issues/16)) ([fed6883](https://github.com/ecoma-io/loom/commit/fed688370f3b16714b789ee2debf418f4ed0e2ae))


### Documentation

* give an agent the repository facts no single file reveals ([#13](https://github.com/ecoma-io/loom/issues/13)) ([28bbe2d](https://github.com/ecoma-io/loom/commit/28bbe2dd871b4d99ceef66af75f4c3fdc66c8c05))
* the nine foundations, an end-to-end suite, and the two defects it found ([#8](https://github.com/ecoma-io/loom/issues/8)) ([5715975](https://github.com/ecoma-io/loom/commit/5715975e1df4285f4f2dea7bd7116a2976e81c4a))
