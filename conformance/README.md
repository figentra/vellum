# Conformance Tests

This directory holds negative and near-miss fixtures for some of the diagnostic codes the
Vellum engine generates. No test in this repository reads them yet.

The target is that each diagnostic code has:
- At least one negative test case (will fail)
- At least one near-miss test case (will pass)

## Structure

```
conformance/
├── diagnostics/
│   ├── <code>/
│   │   ├── negative/fixture.yaml    # must fail
│   │   └── near-miss/fixture.yaml   # must pass (edge case)
└── README.md
```

Present today: negative cases for E0001, E0002, E0003, E0004, E0012, E0040, E0054 and E0060,
and near-miss cases for E0001, E0054 and E0060 only. Per-assistant prompt-contract tests do not
exist yet.

## Purpose

Conformance tests prove:
1. Every diagnostic fire correctly on invalid input
2. Invalid diagnostics don't fire on valid input
3. Each assistant's prompt contract is honored
