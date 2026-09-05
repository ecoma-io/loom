# Changelog

## [0.5.0](https://github.com/ecoma-io/loom/compare/v0.4.0...v0.5.0) (2026-09-05)


### ⚠ BREAKING CHANGES

* **composition:** Split and SplitLayout no longer accept collapseAt and the SplitLayoutCollapseAt type is no longer exported. Rendering is unchanged — delete the attribute from call sites.

### Features

* **a11y:** adopt five disabled WCAG rules into the runtime tiers ([#128](https://github.com/ecoma-io/loom/issues/128)) ([e89265f](https://github.com/ecoma-io/loom/commit/e89265fcae1e7037fb8444b6c07a587b5b6df44f))
* **a11y:** announce destructive toasts through an assertive region ([#109](https://github.com/ecoma-io/loom/issues/109)) ([d69f103](https://github.com/ecoma-io/loom/commit/d69f1032cb2d836c92c6f7deca325638cb8e436b)), closes [#91](https://github.com/ecoma-io/loom/issues/91)
* **a11y:** split the WCAG gate into a browserless semantic tier and a browser residual ([#122](https://github.com/ecoma-io/loom/issues/122)) ([7884045](https://github.com/ecoma-io/loom/commit/78840450b824150a0646546262fe79d95fd8a9fb))
* add Showcase [#1](https://github.com/ecoma-io/loom/issues/1) — the invite-teammates flow ([#224](https://github.com/ecoma-io/loom/issues/224)) ([a581c5e](https://github.com/ecoma-io/loom/commit/a581c5eb89a77dfb1b45fd7816a438f37d62ca7a)), closes [#220](https://github.com/ecoma-io/loom/issues/220)
* add Showcase [#2](https://github.com/ecoma-io/loom/issues/2) — the inbox triage composition ([#229](https://github.com/ecoma-io/loom/issues/229)) ([1478b3a](https://github.com/ecoma-io/loom/commit/1478b3ae0975d7d57402897bccc0da7caa6863c5))
* add the Workspace settings page template ([#223](https://github.com/ecoma-io/loom/issues/223)) ([b79c61b](https://github.com/ecoma-io/loom/commit/b79c61b1b1cc9b957ebf45f1a36d0d2b82736418))
* **blocks:** add ErrorSummary — focusable form error summary (GOV.UK pattern) ([#156](https://github.com/ecoma-io/loom/issues/156)) ([7399db1](https://github.com/ecoma-io/loom/commit/7399db10c41178f67550f8264b734992d481c56e)), closes [#155](https://github.com/ecoma-io/loom/issues/155)
* browser quality gates for templates — axe, keyboard, responsive ([#214](https://github.com/ecoma-io/loom/issues/214)) ([754a8a0](https://github.com/ecoma-io/loom/commit/754a8a05b46f7bc23afe4bb19d9af05d44e6e383))
* **e2e:** drop the browser leg for spec-less component changes at PR level ([#123](https://github.com/ecoma-io/loom/issues/123)) ([e907b94](https://github.com/ecoma-io/loom/commit/e907b94b8962f90709e03e24e5a2abac5d723f72))
* **e2e:** rebalance root shards from the post-split page cost ([#125](https://github.com/ecoma-io/loom/issues/125)) ([5e18ecb](https://github.com/ecoma-io/loom/commit/5e18ecbe09aa78f7d4d064bbf0f99e38c960da00))
* **primitives:** add Calendar primitive — browsable temporal surface ([e037f80](https://github.com/ecoma-io/loom/commit/e037f8055fdc62f380992b9008ed20a44133bae0))
* **primitives:** add Calendar primitive ([#132](https://github.com/ecoma-io/loom/issues/132)) ([e037f80](https://github.com/ecoma-io/loom/commit/e037f8055fdc62f380992b9008ed20a44133bae0))
* **primitives:** add Command — keyboard-driven command search with grouped results ([#134](https://github.com/ecoma-io/loom/issues/134)) ([7752991](https://github.com/ecoma-io/loom/commit/77529916453932fdcf32dbf528ae2a73b10d8691))
* **primitives:** add CopyButton — clipboard copy with announced feedback ([#152](https://github.com/ecoma-io/loom/issues/152)) ([b7ca018](https://github.com/ecoma-io/loom/commit/b7ca0186c335c25369f17679c7a72035d56751ce))
* **primitives:** add DataGrid — interactive grid with row selection and sortable columns ([#142](https://github.com/ecoma-io/loom/issues/142)) ([a821fd1](https://github.com/ecoma-io/loom/commit/a821fd1c8337a2763983014b984a6627d7aa0b9b))
* **primitives:** add LiveRegion — shared announce seam for assistive tech ([#148](https://github.com/ecoma-io/loom/issues/148)) ([638f4dc](https://github.com/ecoma-io/loom/commit/638f4dc8efc70d9a536177b603aae22e75f45244))
* **primitives:** add Meter — scalar capacity gauge (role meter) ([#154](https://github.com/ecoma-io/loom/issues/154)) ([6f8c197](https://github.com/ecoma-io/loom/commit/6f8c197b99f8793aadf961cdcf88c36c341d35f1))
* **primitives:** add NavigationMenu — WAI-ARIA navigation menu with dropdown panels ([#133](https://github.com/ecoma-io/loom/issues/133)) ([91a9a1b](https://github.com/ecoma-io/loom/commit/91a9a1b087da62971a224814d1eba162bd75b098))
* **primitives:** add SkipLink — bypass-blocks navigation (WCAG 2.4.1) ([#137](https://github.com/ecoma-io/loom/issues/137)) ([1e85ad1](https://github.com/ecoma-io/loom/commit/1e85ad11337615dfee21e7de6b81350e08973a53)), closes [#136](https://github.com/ecoma-io/loom/issues/136)
* **primitives:** add ToggleGroup — pressed-state buttons, single or multiple ([#150](https://github.com/ecoma-io/loom/issues/150)) ([c2c9d79](https://github.com/ecoma-io/loom/commit/c2c9d790f8a8ab8bf872e2e5e6e95d385e8e97e3))
* **primitives:** add Toolbar — grouped controls with roving tabindex ([#147](https://github.com/ecoma-io/loom/issues/147)) ([786ff31](https://github.com/ecoma-io/loom/commit/786ff317d2291813e4a5f5cb89ac82e220a66b72)), closes [#145](https://github.com/ecoma-io/loom/issues/145)
* **primitives:** add TreeView — hierarchical tree with keyboard navigation ([#138](https://github.com/ecoma-io/loom/issues/138)) ([270e52b](https://github.com/ecoma-io/loom/commit/270e52b5d821a0e3709ae687bed1d99a0600e433)), closes [#135](https://github.com/ecoma-io/loom/issues/135)
* **primitives:** add VisuallyHidden — screen-reader-only content primitive ([#144](https://github.com/ecoma-io/loom/issues/144)) ([f5a00c6](https://github.com/ecoma-io/loom/commit/f5a00c6fbd7aa4c41a46cf3179f9a1ec1d357823)), closes [#143](https://github.com/ecoma-io/loom/issues/143)
* **primitives:** unify Dialog and Drawer size scales ([#110](https://github.com/ecoma-io/loom/issues/110)) ([97087ae](https://github.com/ecoma-io/loom/commit/97087ae01ab592089a2b05ed4e1fcd413cae4e1a)), closes [#92](https://github.com/ecoma-io/loom/issues/92)
* template browser harness with smoke tests and e2e-plan template scenario ([#212](https://github.com/ecoma-io/loom/issues/212)) ([36b84df](https://github.com/ecoma-io/loom/commit/36b84dfa586f378b202359b3e293a853a9ae4c34))


### Bug Fixes

* **a11y:** document and enforce the HoverCard non-interactive content contract ([#108](https://github.com/ecoma-io/loom/issues/108)) ([1b4e213](https://github.com/ecoma-io/loom/commit/1b4e213ced8a90a7f3dcca0c814577df98541bb5))
* **a11y:** make the partition self-audit real and true up its docblocks ([#124](https://github.com/ecoma-io/loom/issues/124)) ([7fd04d1](https://github.com/ecoma-io/loom/commit/7fd04d16458108d8551b4089be5733109dd9bcd7))
* **a11y:** mirror Switch in RTL, floor SegmentedControl targets, assert reduce-motion exits ([#114](https://github.com/ecoma-io/loom/issues/114)) ([1067f0b](https://github.com/ecoma-io/loom/commit/1067f0bc4c866700265418a3636b49cf6f8326e2)), closes [#94](https://github.com/ecoma-io/loom/issues/94)
* **composition:** order right-side panels so the wrapped stack matches the docs ([#171](https://github.com/ecoma-io/loom/issues/171)) ([c462bfc](https://github.com/ecoma-io/loom/commit/c462bfc87af82d9a19823b481ec08d4186cb8a3a))
* **composition:** remove the never-read collapseAt prop from Split and SplitLayout ([#130](https://github.com/ecoma-io/loom/issues/130)) ([c2f39c1](https://github.com/ecoma-io/loom/commit/c2f39c19e781847ac8a8c411ca5456586773008f)), closes [#119](https://github.com/ecoma-io/loom/issues/119)
* **composition:** step aside for caret keys aimed at a nested editable ([#193](https://github.com/ecoma-io/loom/issues/193)) ([b3fb794](https://github.com/ecoma-io/loom/commit/b3fb7943b64ea0b21650b6dada7a8f14f3307040))
* **docs:** drop the phantom #header slot and correct the sort cycle prose ([#172](https://github.com/ecoma-io/loom/issues/172)) ([346a915](https://github.com/ecoma-io/loom/commit/346a91598f92c46f1d0a04107b27ded6e65214ee))
* **docs:** metric-card trend tokens point at the -text rung ([#175](https://github.com/ecoma-io/loom/issues/175)) ([26f3ef2](https://github.com/ecoma-io/loom/commit/26f3ef257e0b2129bdc4acb6903438ab2b7b5f3a))
* name the slugs the sidebar reading order ranks, and un-drift two comments ([#222](https://github.com/ecoma-io/loom/issues/222)) ([d7f61c8](https://github.com/ecoma-io/loom/commit/d7f61c8bd5759597ba8993d8e8b556d3106ec328))
* **primitives:** add Menubar typeahead ([#195](https://github.com/ecoma-io/loom/issues/195)) ([8b890c6](https://github.com/ecoma-io/loom/commit/8b890c6abe1b6183ba430a80a33b978087e0dd19))
* **primitives:** cycle TreeView typeahead on a repeated character ([#169](https://github.com/ecoma-io/loom/issues/169)) ([9161af2](https://github.com/ecoma-io/loom/commit/9161af256fef3fad7973fb9ca0320435dab68f48))
* **primitives:** cycle typeahead on a repeated character without extending the prefix ([9161af2](https://github.com/ecoma-io/loom/commit/9161af256fef3fad7973fb9ca0320435dab68f48))
* **primitives:** default Avatar accentLabel to 'Accent' ([#189](https://github.com/ecoma-io/loom/issues/189)) ([1d1d7f6](https://github.com/ecoma-io/loom/commit/1d1d7f65175fd58c6515ef734b360bc1956d7cd9))
* **primitives:** keep Calendar's status region silent until the first user selection ([#180](https://github.com/ecoma-io/loom/issues/180)) ([e66bcee](https://github.com/ecoma-io/loom/commit/e66bcee6e939ede499efda1ead4aaa9faaddd3b5))
* **primitives:** keep DataGrid's single Tab stop at every row count ([#190](https://github.com/ecoma-io/loom/issues/190)) ([7d5c1fd](https://github.com/ecoma-io/loom/commit/7d5c1fdb0874270fc317c82a68747f16254b6ca3))
* **primitives:** keep DateRangePicker's status region silent until the user picks ([#192](https://github.com/ecoma-io/loom/issues/192)) ([776fbb6](https://github.com/ecoma-io/loom/commit/776fbb6376d7cb322568bdaeb3e8b1194c15769a))
* **primitives:** keep the DataGrid's active cell and focus inside the matrix when rows shrink ([#174](https://github.com/ecoma-io/loom/issues/174)) ([84ccfd1](https://github.com/ecoma-io/loom/commit/84ccfd1c3d8bc0400434e9deace3fd1fde4e9f89))
* **primitives:** let a caller's aria-labelledby name the date pickers' segment group ([#129](https://github.com/ecoma-io/loom/issues/129)) ([3443540](https://github.com/ecoma-io/loom/commit/34435409ae708f82d408010008b42332e91822f4)), closes [#116](https://github.com/ecoma-io/loom/issues/116)
* **primitives:** match Alert's live region to its tone ([#179](https://github.com/ecoma-io/loom/issues/179)) ([d6e5d8d](https://github.com/ecoma-io/loom/commit/d6e5d8d1bd1d7b2dc5e308ab7fdadb7e782d9725))
* **primitives:** never let a disabled TreeView row hold the entry stop ([#191](https://github.com/ecoma-io/loom/issues/191)) ([a376d14](https://github.com/ecoma-io/loom/commit/a376d14618d7843936db3d602865ecafb09b8050))
* **primitives:** reset Command highlight when the controlled query changes ([#170](https://github.com/ecoma-io/loom/issues/170)) ([95cbb51](https://github.com/ecoma-io/loom/commit/95cbb512940bd93e9a4b9be0f35a43b5ae382464))
* **primitives:** route Command through the labels seam and make Escape reversible ([#173](https://github.com/ecoma-io/loom/issues/173)) ([c019971](https://github.com/ecoma-io/loom/commit/c0199716b4a26562aa49e72ca85daadf35b3ac88))
* re-pin moon's toolchain to .node-version and packageManager after [#215](https://github.com/ecoma-io/loom/issues/215) ([#231](https://github.com/ecoma-io/loom/issues/231)) ([17e8108](https://github.com/ecoma-io/loom/commit/17e81080d1789dd4a4ba9eef6dbe393c42dead40)), closes [#230](https://github.com/ecoma-io/loom/issues/230)
* untrack 23 session task-output files committed under home/ ([#221](https://github.com/ecoma-io/loom/issues/221)) ([c9877d8](https://github.com/ecoma-io/loom/commit/c9877d8c6addc7842e4b4fc4556ae4d763cccbae)), closes [#217](https://github.com/ecoma-io/loom/issues/217)


### Documentation

* add the SaaS shell production template ([#208](https://github.com/ecoma-io/loom/issues/208)) ([fb7e19a](https://github.com/ecoma-io/loom/commit/fb7e19afba35e8cb20f4f36d06b1b992f53629da))
* define the Template Contract and add the starter template ([#205](https://github.com/ecoma-io/loom/issues/205)) ([0dbf085](https://github.com/ecoma-io/loom/commit/0dbf085b17e7961b1de2260399e2bf667f7ae6e6))
* drop no-op attrs from Command usage example ([#181](https://github.com/ecoma-io/loom/issues/181)) ([d895ba6](https://github.com/ecoma-io/loom/commit/d895ba6e8c3d95cdea4ead4ae66cdab1efda4ace))
* keep a11y claims to what the code actually does ([#194](https://github.com/ecoma-io/loom/issues/194)) ([2373f4b](https://github.com/ecoma-io/loom/commit/2373f4be6f2897b19335cfebb782fbeaebcb1e95))
* **layouts:** state the collapsed story the CSS actually delivers ([#131](https://github.com/ecoma-io/loom/issues/131)) ([15ba005](https://github.com/ecoma-io/loom/commit/15ba005ba9bb4ca97a9ddd76fe825dfdf31a507c))
* scaffold the Templates and Showcase layers of the documentation journey ([#203](https://github.com/ecoma-io/loom/issues/203)) ([fb9757c](https://github.com/ecoma-io/loom/commit/fb9757c35373f393966e7e87b16f78de643ce014))
* state the tree-view empty-children convention explicitly ([#141](https://github.com/ecoma-io/loom/issues/141)) ([5f04a45](https://github.com/ecoma-io/loom/commit/5f04a4538764f33fe4ff34745ba50fb041ba4bd7))


### Refactoring

* **primitives:** extract shared date segment aria-label helpers ([#107](https://github.com/ecoma-io/loom/issues/107)) ([9a3420c](https://github.com/ecoma-io/loom/commit/9a3420c9e1e30e1202d8d484f8ede7a7a854c5ae)), closes [#89](https://github.com/ecoma-io/loom/issues/89)
* realign Component/Pattern/Showcase/Template/Application semantics ([#218](https://github.com/ecoma-io/loom/issues/218)) ([d2dbbd2](https://github.com/ecoma-io/loom/commit/d2dbbd2b119f387513973ef53d4bc2bc5ccebe2d))

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
