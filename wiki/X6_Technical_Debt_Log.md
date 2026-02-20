# X6 — Technical Debt Log

> **Best for:** Large-scale or long-term technical debt tracking.

## Purpose

A dedicated, cross-phase register for tracking, prioritising, and resolving technical debt across the architecture.

## Advantages

- Provides a focused, centralized location for managing technical debts.
- Allows for detailed tracking of resolution plans, priorities, and timelines.
- Scales well for complex architectures with significant technical debt.
- Links each debt item to the **affected application** (→ `C3_Application_Portfolio_Catalog.md`), **related risks** (→ `X2_Risk_Issue_Register.md`), and **open questions** (→ `X3_Open_Questions.md`).

## Limitations

- Adds a new artifact to the repository, requiring additional governance and maintenance.
- May duplicate information already tracked in other artifacts.

## Template Columns

| Column | Description |
|--------|-------------|
| **ID** | Unique identifier (TD-01, TD-02, …) |
| **Title** | Short name for the debt item |
| **Description** | What the debt is and why it was incurred |
| **Family** | **Corporate** (external) · **Application** (cross-component) · **Component** (localised) |
| **Criticality** | **Breaker** (will stop running) · **Blocker** (cannot update) · **Builder** (slows updates) |
| **T-Shirt** | **XS** (<50 pd) · **S** (50–100 pd) · **M** (100 pd–1 py) · **L** (1–5 py) · **XL** (5+ py) |
| **Application** | APP-xx reference from `C3_Application_Portfolio_Catalog.md` |
| **Related Risk** | R-xx reference from `X2_Risk_Issue_Register.md` |
| **Related Question** | Q-xx reference from `X3_Open_Questions.md` |
| **ADM Phase** | TOGAF phase where the debt was identified |
| **Owner** | Responsible person or team |
| **Target Resolution** | Expected resolution quarter/date |
| **Status** | Open / In Progress / Resolved |

## Cross-References

Each debt item should be linked to at least one of:

- **Application** (`C3`) — Which system/component carries the debt
- **Risk** (`X2`) — If the debt creates or amplifies an architectural risk
- **Open Question** (`X3`) — If the debt arises from an unresolved question
- **Decision** (`X1`) — If a decision was made to accept the debt (or to resolve it)