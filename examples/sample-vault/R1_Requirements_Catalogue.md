---
type: requirements
status: draft
version: 0.1.0
last_updated: 2024-01-15
---

# Requirements Catalogue

## Functional Requirements

| ID | Requirement | Priority | Source | Status |
|----|-------------|----------|--------|--------|
| FR-001 | System shall process orders within 2 seconds | High | Product | Open |
| FR-002 | Customers can view order history for 24 months | Medium | Compliance | Open |
| FR-003 | Admin can override billing calculations | Low | Finance | Open |

## Non-Functional Requirements

| ID | Category | Requirement | Target |
|----|----------|-------------|--------|
| NFR-001 | Performance | API p99 latency < 500ms | 500ms |
| NFR-002 | Availability | 99.9% uptime SLA | 99.9% |
| NFR-003 | Security | SOC 2 Type II compliance | Q3 2024 |
| NFR-004 | Scalability | Support 10k concurrent users | 10,000 |

## Constraints

- Budget cap: $50k/month cloud spend
- Must integrate with existing SAP ERP (read-only)
- GDPR compliance required for EU customers
