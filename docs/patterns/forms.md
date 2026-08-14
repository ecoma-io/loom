# Forms

Loom's form primitives — Field, Fieldset, every input control — compose into
complete forms through a small set of building blocks that handle labelling,
validation wiring, and responsive layout automatically. A form in Loom is not
one monolithic component; it is Field + Fieldset + FormLayout + FormActions,
and the host owns the submission logic.

## The composition

```
FormLayout
├── header slot        ← PageHeader or plain heading
├── default slot
│   FormSection        ← Labeled group of fields
│   ├── Fieldset       ← Shared hint/error for related controls
│   │   └── Field      ← Label, control, message per row
│   │       └── *Field  ← TextField, Select, Checkbox, etc.
├── actions slot
│   FormActions        ← Submit / cancel button row
```

Each layer does exactly one thing:

| Layer         | Responsibility                                            |
| ------------- | --------------------------------------------------------- |
| `FormLayout`  | Width cap and responsive centering                        |
| `FormSection` | A titled group with optional description                  |
| `Fieldset`    | Shared validation state and hint for related controls     |
| `Field`       | One label–control–message row with automatic a11y wiring  |
| `FormActions` | Aligned submit/cancel row, responsive on narrow viewports |

## Wiring a form

```vue
<script setup lang="ts">
import {
  FormLayout,
  FormSection,
  FormActions,
  Field,
  Fieldset,
  TextField,
  Select,
  Checkbox,
  Button,
} from "@ecoma-io/loom";
</script>

<template>
  <FormLayout>
    <template #header>
      <h1>Create account</h1>
    </template>

    <FormSection title="Personal information">
      <Field label="Full name" name="name" required>
        <TextField v-model="name" />
      </Field>
      <Field label="Email" name="email" hint="Used for sign-in">
        <TextField v-model="email" type="email" />
      </Field>
    </FormSection>

    <FormSection title="Preferences">
      <Fieldset legend="Notifications" hint="Control what you receive">
        <Field label="Email updates" name="emailUpdates">
          <Checkbox v-model="emailUpdates" />
        </Field>
        <Field label="Region" name="region">
          <Select v-model="region" :options="regions" />
        </Field>
      </Fieldset>
    </FormSection>

    <template #actions>
      <FormActions>
        <Button variant="primary" type="submit">Create account</Button>
        <Button variant="ghost" @click="cancel">Cancel</Button>
      </FormActions>
    </template>
  </FormLayout>
</template>
```

## Field wires the control automatically

A Field in the slot gets three things without the host writing them:

1. **`id`** — the label's `for` and the control's `id` agree
2. **`aria-describedby`** — points at the hint or the error, whichever is
   showing
3. **`aria-required` and `aria-invalid`** — set from the `required` and
   `error` props

A Loom input control in the slot picks these up by injection; a plain
`<input>` does not, and must receive them through `v-bind="fieldProps"` from
the slot prop.

## When to use Fieldset vs Field

- **Field** — one control, one label, one message. The common case.
- **Fieldset** — several controls sharing one validation state or hint. "Enter
  both a street and a city" is the group's error, not the street field's.

RadioGroup and SegmentedControl already own their grouping — wrap those in a
Field, not a Fieldset.

## Form width

Forms are narrower than prose. A comfortable reading line length is already
wider than the labels and inputs a form needs, so `FormLayout` caps the width:

- `sm` — login, OTP, short confirmation forms
- `md` — standard forms (default)
- `lg` — wider forms with longer inputs
- `xl` — forms with side-by-side fields

## The host owns submission

Loom provides the structure and the accessibility wiring. What happens when the
user clicks "Submit" is the host's responsibility — a REST call, a GraphQL
mutation, a router navigation. `FormActions` is a layout, not a form element;
the host wraps the whole form in its own `<form>` or handles submission
imperatively.
