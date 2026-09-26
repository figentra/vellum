# Architecture Decision Records

This directory records architecture decisions for the Vellum repository.

## What ADRs Document Here

In Vellum, ADRs document **package-internal decisions** — choices about:

- Package boundaries and responsibilities
- Dependency flow between packages
- Public API contracts
- Turborepo task pipelines
- Naming and versioning conventions

Each ADR captures the context, decision, and consequences of choices that affect how packages interact or how the monorepo is structured.

## Numbering

ADRs are numbered sequentially starting at **001**. The template lives at `000-template.md`.

## Cross-References

Vellum operates alongside two related repositories:

| Repository | Scope | ADR Numbering |
|------------|-------|---------------|
| **figentra** | Platform-wide decisions | Starts at 0001 |
| **basalt** | Platform-wide decisions (shared index) | Starts at 0001 |
| **vellum** | Vellum-internal decisions | Starts at 001 |

When a Vellum decision depends on or references a platform-wide decision from figentra or basalt, cite the external ADR by its full identifier (e.g., "see basalt ADR-0015").

## Index

| Number | Title | Date |
|--------|-------|------|
| 001 | Repository Structure and Turborepo Boundaries | 2026-09-26 |

## Reading and Writing ADRs

- **New ADRs**: Copy `000-template.md`, fill in the sections, and add it to the index
- **Superseding**: If an ADR is replaced, update its status to "Superseded by ADR-XXX" and create a replacement
- **Amending**: For minor clarifications, add an "Amendments" section rather than creating a new ADR
