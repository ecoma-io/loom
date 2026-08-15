/**
 * Drops the keys whose value is `undefined`, so a `v-bind` passes only the
 * props that were actually set.
 *
 * Two rules collide to make this necessary, and neither is avoidable.
 *
 * Vue treats a prop that is absent and a prop explicitly set to `undefined` as
 * the same thing — both resolve to the child's default. TypeScript, under
 * `exactOptionalPropertyTypes`, does not: passing `undefined` to a `foo?: T` is
 * an error, because the flag exists precisely to tell "missing" apart from
 * "present and undefined". A Vue template always emits every key it binds, so
 * forwarding an optional prop straight through (`:open="open"`) hands a child's
 * `open?: boolean` an explicit `undefined` and fails to compile, while behaving
 * correctly at run time.
 *
 * That distinction is not academic for the components underneath. Reka reads
 * `undefined` as "no value supplied — manage this yourself", and any concrete
 * value, `false` included, as "the host owns this". So a control whose
 * `modelValue` is coerced to `false` on its way through stops being
 * uncontrolled and becomes permanently, silently off: it still emits its update
 * event, and its rendered state never moves. That failure has no error and no
 * warning; it looks like a component that ignores clicks.
 *
 * A cast (`open as boolean`) silences the compiler and is the reason to prefer
 * this: it states that a value is there when the whole point is that one may
 * not be. Omitting the key says what is true.
 */
export function optional<T extends Record<string, unknown>>(
  values: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  const set: Record<string, unknown> = {};
  for (const key of Object.keys(values)) {
    if (values[key] !== undefined) set[key] = values[key];
  }
  return set as { [K in keyof T]?: Exclude<T[K], undefined> };
}
