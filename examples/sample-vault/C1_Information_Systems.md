---
type: information-systems
status: draft
version: 0.1.0
last_updated: 2024-01-15
---

# Information Systems Architecture

## Application Portfolio

| Application | Domain | Status | Tech Stack |
|-------------|--------|--------|------------|
| customer-api | Customer Mgmt | Production | Node.js / PostgreSQL |
| order-service | Fulfilment | Production | Java / Kafka |
| billing-engine | Finance | Migration | Python / Stripe API |
| analytics-dash | Reporting | Beta | React / ClickHouse |

## Data Entities

### Core Entities
- **Customer** – id, name, email, tier, created_at
- **Order** – id, customer_id, items[], status, total
- **Invoice** – id, order_id, amount, due_date, paid

### Data Flow
Customer → Order → Invoice → Payment → Ledger

## Integration Patterns

- Synchronous: REST APIs between customer-api ↔ order-service
- Asynchronous: Kafka events for order-service → billing-engine
- Batch: Nightly ETL from billing-engine → analytics-dash

## Open Questions

### Data Governance
- Who owns the master customer record?
- What is the data retention policy for completed orders?
