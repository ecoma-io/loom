# Changelog

## [0.4.0](https://github.com/ecoma-io/loom/compare/v0.3.0...v0.4.0) (2026-08-23)


### Features

* **ci:** cache moon's toolchain tree across CI runs ([#81](https://github.com/ecoma-io/loom/issues/81)) ([54c39fe](https://github.com/ecoma-io/loom/commit/54c39fe78c12e9ce7206835ee31c7a096bf4b8f8))
* **ci:** cache vue-tsc's incremental buildinfo across CI runs ([#77](https://github.com/ecoma-io/loom/issues/77)) ([172814c](https://github.com/ecoma-io/loom/commit/172814c0243c178018b6c0857d876ef00a8c592c))
* **ci:** persist moon's task cache across CI runs ([#76](https://github.com/ecoma-io/loom/issues/76)) ([59a5d30](https://github.com/ecoma-io/loom/commit/59a5d30ab6409f45002380d876f649f02105eb5b))
* **ci:** replay the docs build out of moon's output cache ([#79](https://github.com/ecoma-io/loom/issues/79)) ([bfe4902](https://github.com/ecoma-io/loom/commit/bfe49029f7266e8435c96adc6bcfe76d899d0a86))
* **ci:** run the merge queue's whole-repo unit suite through moon ([#80](https://github.com/ecoma-io/loom/issues/80)) ([12134b2](https://github.com/ecoma-io/loom/commit/12134b2e3c917a2b0160625e76afddcefcdf233f))
* **ci:** size the root E2E shard split by the pages it sweeps ([#78](https://github.com/ecoma-io/loom/issues/78)) ([975ff64](https://github.com/ecoma-io/loom/commit/975ff64e597f19a710cedd40a788bc28c64a5416))
* **docs:** differentiate the menu family and give AppHeader its safe-area inset ([#100](https://github.com/ecoma-io/loom/issues/100)) ([c763704](https://github.com/ecoma-io/loom/commit/c76370457b004932efa5473a199cfffb58fea633))
* **docs:** differentiate the menu family; give AppHeader its safe-area inset ([c763704](https://github.com/ecoma-io/loom/commit/c76370457b004932efa5473a199cfffb58fea633))
* **primitives:** add Alert and Card ([#97](https://github.com/ecoma-io/loom/issues/97)) ([0c15a2c](https://github.com/ecoma-io/loom/commit/0c15a2cb526ab156c7ca4d5795b818e8e029554a))
* **primitives:** add Collapse and Carousel ([#98](https://github.com/ecoma-io/loom/issues/98)) ([9978f77](https://github.com/ecoma-io/loom/commit/9978f77decfa5a1f38f08fa5f2d4855f1659dda0))
* **primitives:** add Kbd; harden MetricCard; rule Status out via Indicator ([#101](https://github.com/ecoma-io/loom/issues/101)) ([ea95c71](https://github.com/ecoma-io/loom/commit/ea95c71c3527b77e08fd6b5a4e073ff37ce5ca28))
* **primitives:** add Kbd; teach MetricCard to load and describe; rule Status out loud ([ea95c71](https://github.com/ecoma-io/loom/commit/ea95c71c3527b77e08fd6b5a4e073ff37ce5ca28))
* **primitives:** add Table and List ([#99](https://github.com/ecoma-io/loom/issues/99)) ([7b4d43a](https://github.com/ecoma-io/loom/commit/7b4d43a29ea6e4bafc392c78b793cbc2d92813f4))
* **primitives:** add Timeline; rule Steps out via Stepper ([#102](https://github.com/ecoma-io/loom/issues/102)) ([668fe33](https://github.com/ecoma-io/loom/commit/668fe330dcc8e64a1b809c9a39279002d672efaf))
* **workspace:** architecture baseline — contract, enforcement, public boundary ([#74](https://github.com/ecoma-io/loom/issues/74)) ([128399a](https://github.com/ecoma-io/loom/commit/128399a0d4d82279acd9193a51f1d90f241d4e6b))
* **workspace:** enforce the layer graph with Lattice ([#86](https://github.com/ecoma-io/loom/issues/86)) ([96c441c](https://github.com/ecoma-io/loom/commit/96c441c2538084d1887b70f4af9a94e96f9a7c0e))
* **workspace:** give playwright/ a Moon project of its own ([#96](https://github.com/ecoma-io/loom/issues/96)) ([48b2215](https://github.com/ecoma-io/loom/commit/48b2215cebbdbc80e3029b524f1663e2984030eb))
* **workspace:** ship the Lattice agent skills to every host ([#95](https://github.com/ecoma-io/loom/issues/95)) ([9e9c9db](https://github.com/ecoma-io/loom/commit/9e9c9db965d68457f95f25f2c50e6619f09d651b))


### Bug Fixes

* **docs:** every demo imports the published entry point ([#82](https://github.com/ecoma-io/loom/issues/82)) ([4b03b0d](https://github.com/ecoma-io/loom/commit/4b03b0d3544148c31b01f4d5fc3b7643383289ca))
* harden audited correctness, accessibility and motion defects across the surface ([#88](https://github.com/ecoma-io/loom/issues/88)) ([98f8c86](https://github.com/ecoma-io/loom/commit/98f8c8659b6ae5ec84db382235dc3919c584b7e2))
* **styles:** stop shipping theme-core's contrast test inside dist ([#84](https://github.com/ecoma-io/loom/issues/84)) ([8051034](https://github.com/ecoma-io/loom/commit/80510349042492ca1f9150007f931f85195c2275))
* **workspace:** declare the core testing subpath in the paths table ([#85](https://github.com/ecoma-io/loom/issues/85)) ([7a0dc6a](https://github.com/ecoma-io/loom/commit/7a0dc6a93f29373bc255bb4c82065f35181b0027))

## [0.3.0](https://github.com/ecoma-io/loom/compare/v0.2.0...v0.3.0) (2026-08-19)


### Features

* **a11y:** add WCAG 2.2 e2e tests and extend dark-mode coverage ([#61](https://github.com/ecoma-io/loom/issues/61)) ([99a7fee](https://github.com/ecoma-io/loom/commit/99a7feeefff030938449b81a8f094fe8a74b19b6))
* **ci:** affected test/e2e matrix — small changes pay small costs ([#66](https://github.com/ecoma-io/loom/issues/66)) ([12e8638](https://github.com/ecoma-io/loom/commit/12e863821b7792ae6242212c7c0560f72a24f307))
* **ci:** ci benchmark evidence and adversarial audit ([#69](https://github.com/ecoma-io/loom/issues/69)) ([c22132e](https://github.com/ecoma-io/loom/commit/c22132ebc290a640a934c05b47df43a705ebf3ce))
* **ci:** make Moon the affected source of truth and bound the e2e matrix ([#67](https://github.com/ecoma-io/loom/issues/67)) ([d6f404f](https://github.com/ecoma-io/loom/commit/d6f404fdcb918c57ff558a633f71685e59fd70e6))
* **workspace:** complete Moonrepo package migration ([#65](https://github.com/ecoma-io/loom/issues/65)) ([7dac08f](https://github.com/ecoma-io/loom/commit/7dac08f25b48ad12b138ec8a3a23afd27daf02c6))
* **workspace:** migrate components into Moonrepo packages ([#64](https://github.com/ecoma-io/loom/issues/64)) ([1319304](https://github.com/ecoma-io/loom/commit/1319304f22d2c7e6b2e62d3897106b84081e5243))


### Bug Fixes

* **ci:** hash dependency sources in test tasks, cap moon concurrency ([#68](https://github.com/ecoma-io/loom/issues/68)) ([351fb81](https://github.com/ecoma-io/loom/commit/351fb811570b4a0723b359e70c541e8bfbb4548d))

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
