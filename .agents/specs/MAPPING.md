# Spec Migration Mapping: Basalt → Vellum

This document records the migration of SDLC Platform specs from basalt to vellum.

## Mapping Table

| Basalt Spec | Vellum Spec | Title | Slice |
|-------------|-------------|-------|-------|
| `034-sdlc-platform` | `001-vellum-platform` | Programme Spec (platform contracts) | - |
| `036-sdlc-core` | `002-vellum-core` | Slice 1: Enforceable core | 1 |
| `037-sdlc-orchestration` | `003-vellum-orchestration` | Slice 2: Control | 2 |
| `038-sdlc-governance` | `004-vellum-governance` | Slice 3: Assurance | 3 |
| `039-sdlc-insight` | `005-vellum-insight` | Slice 4: Measurement | 4 |

## Reference Updates

All cross-references were updated as follows:

| Old Reference | New Reference |
|---------------|---------------|
| `034` | `001` |
| `036` | `002` |
| `037` | `003` |
| `038` | `004` |
| `039` | `005` |
| `034-sdlc-platform` | `001-vellum-platform` |
| `036-sdlc-core` | `002-vellum-core` |
| `037-sdlc-orchestration` | `003-vellum-orchestration` |
| `038-sdlc-governance` | `004-vellum-governance` |
| `039-sdlc-insight` | `005-vellum-insight` |
| `[`036-...`]` | `[`002-...`]` |
| `034:N.M` | `001:N.M` |
| `036:N.M` | `002:N.M` |
| `037:N.M` | `003:N.M` |
| `038:N.M` | `004:N.M` |
| `039:N.M` | `005:N.M` |

## Files Migrated

Each spec migrated `requirements.md` only. 

**Excluded per plan:**
- `tasks.md`
- `STATUS` files
- `VERIFICATION_REPORT` files

## Migration Statistics

| Spec | Lines | Requirements | Criteria |
|------|-------|--------------|----------|
| 001-vellum-platform | 772 | 0 (programme) | 0 (moved to children) |
| 002-vellum-core | 644 | 23 | 229 |
| 003-vellum-orchestration | 655 | 20 | 233 |
| 004-vellum-governance | 405 | 15 | 117 |
| 005-vellum-insight | 102 | 1 | 5 |
| **Total** | **2,578** | **59** | **584** |

## Source Location

- Source: `/Users/akouta/Projects/basalt/.agents/specs/`
- Target: `/Users/akouta/Projects/vellum/.agents/specs/`

## Migration Date

Migrated: 2026-09-26
