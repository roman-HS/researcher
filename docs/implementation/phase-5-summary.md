# Phase 5 Summary — Workflow Builder UI

Handoff note for Phase 6+. Stories 5.1.1–5.4.5 complete.

## Completed

- **Workflows home** — `/workflows` list (table, empty state, loading/error), create dialog, edit link, duplicate, and archive actions via server actions.
- **Builder route** — `/workflows/[workflowId]` loads draft definition server-side; archived or draft-less workflows render `NonEditableDraft`.
- **React Flow canvas** — Custom tool nodes, pan/zoom, fit-to-view, delete selected step (with connected-edge guard), linear connection rules (one incoming/outgoing edge per node).
- **Builder state** — Zustand store with canonical `WorkflowDefinition`, dirty tracking, `beforeunload` + leave/back confirmation.
- **Sidebar** — Tool palette (catalog grouped by category, click-to-insert) and animated step inspector rail.
- **Validation UX** — Debounced client validation panel, node status badges, publish eligibility header, server error merge on failed save/publish.
- **Lifecycle controls** — Explicit save draft, publish (confirm when warnings), overflow menu duplicate/archive (list + builder).

Primary UI paths: `src/components/app/workflows/`, `src/stores/workflow-builder-store.tsx`, `src/lib/workflows/validate-definition.ts`.

## Builder capabilities delivered

| Area | Behavior |
|---|---|
| List | Active workflows only; name, description, status, version badges, updated time |
| Create | Name + optional description → new empty draft → builder |
| Canvas | Move nodes, connect linearly, delete steps, select for inspector |
| Insert tool | Registry defaults, positioned node, auto-select, marks dirty |
| Inspector shell | Step label, optional notes, tool metadata, config region |
| Save | Explicit button; clears dirty on success; stays on builder |
| Publish | Blocked while dirty/saving; requires saved draft; reloads post-publish draft state in UI |
| Duplicate | Server saved definition (draft preferred); list one-click; builder confirms when dirty |
| Archive | Confirm dialog; list removes row; builder redirects to `/workflows` |

## Tool inspector forms completed

All eight V1 registry tools have dedicated inspector components registered in `workflow-tool-config-inspector-shell.tsx`:

| Inspector key | Tool | Notes |
|---|---|---|
| `listingSearch` | Listing Search | ZIP or city/state, min/max price filters |
| `propertyDetail` | Property Detail | Max properties; upstream artefact guidance |
| `fetchComparables` | Fetch Comparables | Max comparables |
| `estimateRent` | Estimate Rent | Provider-capability disclaimer |
| `calculateMetrics` | Calculate Metrics | Underwriting assumptions (down payment, rate, term, opex fields) |
| `scoreProperties` | Score Properties | Weights/thresholds + reset defaults |
| `aggregateArea` | Aggregate Area | Grouping, sample size, metric selection |
| `generateSummary` | Generate Summary | Title, sections, top property count |

Inspectors validate against tool Zod schemas inline and patch node config through the builder store. Config fields use constant values only (`WorkflowConfigValueField`); workflow-input binding picker is not exposed in the UI yet.

## UX limitations and deferred builder features

- **No autosave** — saving is explicit (roadmap recommendation kept).
- **No workflow rename/description edit in builder** — metadata shown read-only in header; patch draft API supports name/description but UI does not.
- **No workflow inputs panel** — `WorkflowCreateRuntimeInputDialog` exists but is unused; users cannot bind config fields to runtime inputs through the UI.
- **No drag-from-palette, minimap, or auto-layout.**
- **No archived-workflow list filter** — default list is `status=active` only.
- **No publish note / change log UI.**
- **Tool/provider fields** — inspector fields follow placeholder schemas; Phase 6 may require hiding or relabeling fields after RapidAPI contract confirmation.

## Execution must not assume

Phase 7 run/compile logic should treat the builder as an authoring surface only:

- **Server publish is authoritative** — only published versions are runnable; never execute draft JSON from client state without a successful publish on the server.
- **Saved draft ≠ canvas state** — users may navigate away with unsaved edits; duplicate and publish always use persisted server drafts.
- **Linear pipeline required at publish** — the canvas allows free-form edges, but publish validation requires a single root-to-terminal path covering all nodes (see Phase 4 graph rules).
- **Draft saves may contain warnings** — a workflow saved from the builder can still fail publish until publish-profile errors are fixed.
- **Runtime input bindings in JSON** — the contract supports `workflowInput` bindings, but the current UI only writes constants; do not assume users configured bindings interactively.
- **Tool configs match live provider behavior** — configs are schema-valid but provider adapters are still placeholders until Phase 6.
- **Archived workflows are not editable** — archiving removes the active draft from detail responses; direct builder URLs show a non-editable state.

## UI validation vs server validation

Shared orchestration lives in `validateWorkflowDefinition` (same function on client and server), but **profiles differ**:

| Check | Draft profile (save) | Publish profile (client panel + publish) |
|---|---|---|
| Tool/config/binding issues | Warnings | Errors |
| Graph topology (cycles, branches, disconnected nodes) | Warnings | Errors |
| Linear pipeline (≥2 nodes, single path) | Warnings | Errors |
| `upstream_artefact_missing` | Not emitted | Warning (non-blocking) |

**Builder-specific mismatches to remember:**

1. **Validation panel uses publish profile** — graph/layout issues appear as blocking errors in the panel even though draft save may succeed (save button gates on draft-profile `valid`, which treats those graph issues as warnings).
2. **Publish button uses client publish-profile errors** — blocked when panel errors exist; server publish re-validates and may return additional/different issues surfaced in the panel after failure.
3. **Save button disabled on definition parse errors only** — `definition_parse_error` blocks save; other draft-profile warnings do not disable save.
4. **Inspector inline errors** — per-field Zod feedback in tool forms is immediate and may appear before the global validation panel updates (200ms debounce).

## Resolved in Phase 5

- **List layout** — Table (not card grid).
- **Duplicate source** — Server default: saved draft if present, else latest published; builder/list do not expose a source picker.
- **Unsaved-change protection** — Enabled (`beforeunload`, back link, duplicate/archive confirm when dirty).
- **Builder URL** — `/workflows/:workflowId` resolves current editable draft (no version id in URL).
- **Publish after save** — Publish disabled until draft is saved (`isDirty` guard).

## Deferred beyond Phase 5

- **Provider-backed tool execution** — Phase 6 executors and confirmed RapidAPI contracts.
- **Run engine and run UI** — Phases 7–8.
- **Runtime input editor and binding picker** — needed before parameterised run forms are user-friendly.
- **Workflow metadata editing in builder, autosave, archived-workflow browsing, unarchive** — not in V1 unless added later.
