# The Architecture Documentation Model

Every architecture document has exactly one role, and the roles are not
interchangeable. This page is the map of which document plays which role —
read it before any other architecture document, because each document's
preamble names its own role and expects you to know the difference between a
law and a measurement.

## The roles, defined once

| Role                            | Definition                                                                                                                                               | Documents                                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Normative law**               | What Loom is, what it must never become, the artifact hierarchy, the dependency laws and the amendment rule. Identity changes rarely and on purpose.     | [Constitution](./constitution.md)                                                                                                       |
| **Normative classification**    | What the canonical artifact kinds are, what each may own, must not own, may depend on, and how it is tested. This document classifies; it moves nothing. | [Artifact model](./artifact-model.md)                                                                                                   |
| **Normative quality contracts** | What every artifact is held to regardless of kind, in three categories (invariant / quality contract / implementation guideline).                        | [Interface contract](./interface-contract.md)                                                                                           |
| **Current-state contract**      | How the repository is allowed to be structured today, and which checks keep it that way. Mechanics, not identity.                                        | [Contract](./contract.md)                                                                                                               |
| **Empirical record**            | What the Phase 1 audit observed with evidence. Reports reality; never overrides a normative document.                                                    | [Audit](./audit.md) · [Gap analysis](./gap-analysis.md) · [Artifact matrix](./artifact-matrix.md)                                       |
| **Program tracking**            | The evolution program's plan and the work-item status of record.                                                                                         | [Evolution plan](./evolution-plan.md) · [Evolution ledger](./evolution-ledger.md) · [#240](https://github.com/ecoma-io/loom/issues/240) |
| **History**                     | The pre-migration repository shape, preserved as history, not guidance.                                                                                  | [Baseline](./baseline.md)                                                                                                               |

## The rules that make the model hold

1. **The audit never overrides a normative document.** It is a measurement,
   not a decision. Where a measurement contradicts a law, the contradiction
   is recorded in the gap analysis — never silently resolved by changing
   implementation. Where the measurement itself is wrong, it is corrected
   where the wrong claim lives and the correction is recorded in the gap
   analysis beside the gap it corrects — Phase 1's `./theme` exports-map
   correction (S6) is the worked example. The one exception is enforcement
   status, whose single home is the audit (rule 3): a normative document's
   status table defers to the audit's row, and to nothing else the audit
   says.
2. **Normative documents change through their own amendment paths.** The
   constitution's §§1–8 and §§11–12 via the amendment rule; §9–10 when a
   principle changes; the artifact model and interface contract by arguing
   the change in the document that owns the classification or contract. The
   current-state contract follows mechanics and changes whenever mechanics
   change.
3. **Every status claim has one home.** Enforcement statuses live in the
   audit, whose rows speak as of its audit date; the interface contract's
   table is the preliminary view that must not contradict the audit (see the
   interface contract's own status section). Where the two disagreed, Phase
   0.5 adopted the audit's row. When a later-merged PR changes a contract's
   enforcement, the landing supersedes the audit's frozen row — the ledger
   records the supersession and the interface contract's table updates in
   the same PR; the audit text itself is never edited after landing.
4. **Reading order.** A fresh contributor or agent reads: this map →
   constitution → artifact model → interface contract → contract → audit →
   gap analysis → artifact matrix → evolution docs. Skipping to the current
   contract first risks treating mechanics as identity.

## How a conflict is handled

When the intended architecture (normative documents) and observed reality
(audit) disagree, the disagreement is **recorded, not silently resolved**:

1. The audit (or a re-audit) states the finding with evidence.
2. The gap analysis carries the action with a phase assignment.
3. The migration or gate that resolves it lands as its own PR and updates
   the row.

The one thing the model forbids: silently resolving a contradiction by
changing implementation without a written record. A conflict that cannot
survive being written down is not a decision — it is a pending one
([constitution](./constitution.md) §10).
