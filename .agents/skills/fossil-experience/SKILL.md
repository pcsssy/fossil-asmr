---
name: fossil-experience
description: Build or review this workspace's Fossil ASMR excavation experience, including local rock damage, specimen visuals, audio feedback and mobile quality. Apply only to this Fossil ASMR project, not sibling apps.
---

# Fossil ASMR experience

Read `AGENTS.md` in this project root, then the task-relevant document in `harness/`. Resolve these paths from the project root, including when invoked from `app/`.

For visual changes, read `harness/design-direction.md`. Start with the rock and specimen composition and its light/material relationship. Keep one obvious primary action and the lower thumb area clear. Capture the actual rendered result before claiming visual quality.

For excavation or sound changes, read `harness/engineering.md` and `harness/quality-gates.md`. Local damage must persist at the input position. Couple visuals and sound to the same input event without waiting for a React rerender. Use controlled random variation; make test seeds reproducible.

For assets, read `harness/asset-register.json`. Record provenance and provisional status before integration. Generated specimens are visual reconstructions, not authenticated scientific specimen photographs. Synthetic sound remains provisional until listening review and recorded sample replacement are assessed.

For content/probabilities, run `py -3 scripts/check_harness.py --strict-catalog` from the project root. The supplied list and requested rarity totals disagree. Preserve the source; document any reclassification in `harness/decisions.md`. Never hide incomplete assets behind a claim of 50 finished specimens.

Finish each meaningful change by updating `harness/status.md` with implemented behavior, commands and outcomes, evidence paths, limitations and the next bounded task. Distinguish browser checks, listening checks, phone WebView checks and console acceptance.
