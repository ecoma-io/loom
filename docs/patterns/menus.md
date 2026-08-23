# Menus

Loom ships three menu surfaces plus one select — they look alike and answer
to the same keyboard grammar, which is exactly why the choice between them
is worth writing down. Picking by look-alike is how a right-click action
ends up behind a button.

## The decision

| The user…                                                       | Reach for      |
| --------------------------------------------------------------- | -------------- |
| Clicks a visible button, then picks from a command list         | `DropdownMenu` |
| Right-clicks a thing in place                                   | `ContextMenu`  |
| Works a persistent strip of app-wide menus (File · Edit · View) | `Menubar`      |
| Is choosing the **value of a field**                            | `Select`       |

Two questions settle almost every case:

1. **Is the list a value?** Then it is a `Select` inside a Field, no matter
   how much it looks like a menu — the field's validation, labelling and
   form wiring all hang off that distinction.
2. **Where does the interaction start?** A button → DropdownMenu. The
   element itself, in place → ContextMenu. A permanent strip at the top of
   the window → Menubar.

## What they share

DropdownMenu and ContextMenu are Reka menus wearing Loom's treatment:
arrow keys walk enabled rows (separators and headings are chrome, never
stops), Home/End jump, typeahead jumps to a label, Escape closes back to
the trigger, disabled rows are inert but announced. Because both ride one
root family, that grammar cannot drift between them — a fix lands in both
at once.

Menubar speaks most of the same grammar by hand (it predates the family's
arrival and is documented as such); it has no typeahead yet. Direction is
forwarded everywhere: each menu takes `dir="ltr" | "rtl"` — the Reka pair
mirror traversal from it, Menubar mirrors its own arrows and binds the
attribute onto its strip. Reduced motion collapses the shared rise/fall
pair; nothing needs per-menu overrides.

Not yet covered by direction forwarding: `Select` and `Combobox` (tracked
separately).

## Where each draws its line

- **DropdownMenu** opens _from_ a trigger you can see and Tab to. If the
  first thing a keyboard user asks is "where did this come from?", it is
  this one.
- **ContextMenu** has no trigger element — it belongs to whatever was
  right-clicked, so its accessible entry point is that element's own
  context. It never appears in the Tab order on its own.
- **Menubar** is always present, always in the Tab order as a strip, and
  switches menus on hover once one is open. It exists for application
  chrome; a page with one dropdown does not become better with a menubar.
- **Submenus**: none of the wrappers expose nested menus yet. When a design
  reaches for one, first ask whether the child items deserve their own
  dialog or section — nesting is the last resort, and it will land as a
  shared extension rather than per-component forks.
