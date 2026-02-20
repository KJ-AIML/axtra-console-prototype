# QA Criteria V2 (Versioned Hierarchy)

QA Criteria V2 introduces a versioned parent/sub-criteria model with immutable publishes and safer legacy compatibility behavior.

---

## Overview

This refactor keeps QA configuration auditable and stable over time:

- `qa_configs` defines a logical rubric
- `qa_config_versions` stores immutable snapshots
- `qa_criteria_nodes` stores 2-level hierarchy (`level=0` parent, `level=1` sub-criteria)
- `qa_reviews` + `qa_review_scores` unify AI/Human review storage

Published versions are read-only. Edits happen in draft versions and are published after validation.

---

## Scoring Rules

- Parent criteria are structural, not directly scorable
- Sub-criteria are scorable (`scale` or `binary`)
- Binary sub-criteria must use `max_score = 1`
- Publish validation enforces:
  - each parent has at least one child
  - child weights under a parent sum to `100`

---

## API (V2)

### Config/version APIs

- `GET /api/qa/configs/:configId/versions`
- `GET /api/qa/configs/:configId/versions/:versionId`
- `POST /api/qa/configs/:configId/versions`
- `POST /api/qa/configs/:configId/versions/:versionId/publish`
- `POST /api/qa/configs/:configId/versions/:versionId/criteria`

### Review APIs

- `POST /api/qa/reviews`
- `POST /api/qa/ai/analyze`
- `GET /api/qa/:callId`

---

## Legacy Compatibility Endpoints

Legacy UI still uses:

- `GET /api/qa/criteria`
- `GET /api/qa/criteria/hierarchy`
- `POST /api/qa/criteria`
- `DELETE /api/qa/criteria/:id`
- `POST /api/qa/weights/:configId`

Compatibility behavior added:

- stable external IDs use node `code`
- fresh draft is created from latest published before legacy save/delete
- top-level legacy criteria auto-provision a leaf child when needed
- deleting a parent soft-disables its children
- guard prevents deleting the last parent/sub-criteria

---

## Bulk Save (Persistence Fix)

To prevent lost updates from multiple per-item saves, legacy config page now uses:

- `POST /api/qa/criteria/bulk`

Payload:

```json
{
  "criteria": [
    {
      "id": "criterion_id",
      "name": "Opening & Greeting",
      "description": "First impression",
      "ai_prompt": "How AI should score this",
      "scoring_type": "scale",
      "max_score": 5,
      "weight": 0,
      "is_required": false,
      "sort_order": 0,
      "parent_criteria_id": "optional_parent_id"
    }
  ],
  "removed_ids": ["optional_removed_criterion_id"]
}
```

Why this was needed:

- per-item `POST /api/qa/criteria` could overwrite previous edits because each call produced its own draft/publish cycle
- bulk save applies all edits/deletes in one draft, then publishes once

---

## Known Constraints

- hierarchy depth is fixed to 2 levels
- weight unit is integer percent
- a parent must never be published without at least one child
- legacy endpoints are for compatibility only; new feature work should use V2 APIs

---

## Troubleshooting

### Symptom: save succeeds but reload does not show latest edits

Check:

1. UI is calling `POST /api/qa/criteria/bulk` (not many single-item posts)
2. API returns `success: true`
3. Criteria reload uses both:
   - `GET /api/qa/criteria`
   - `GET /api/qa/criteria/hierarchy`

### Symptom: `Parent 'X' must have sub-criteria`

This means draft structure is invalid before publish. Ensure each parent has at least one active child.

