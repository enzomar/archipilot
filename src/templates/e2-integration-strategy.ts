import type { TemplateBuilder } from './types.js';

export const buildE2IntegrationStrategy: TemplateBuilder = (d, _projectName, yaml) => ({
  name: 'E2_Integration_Strategy.md',
  content: `${yaml({
    type: 'integration-strategy',
    togaf_phase: 'E',
    artifact_type: 'deliverable',
    version: '0.1.0',
    status: 'draft',
    created: d,
    last_modified: d,
    owner: 'TBD',
    reviewers: [],
  })}

# Integration Strategy

> Phase E — Integration patterns, protocols, and external system mapping.

## Integration Principles

- 

## Integration Catalog

| Source | Target | Pattern | Protocol | Data Format | Frequency |
|--------|--------|---------|----------|-------------|-----------|
| | | Sync / Async / Event | REST / gRPC / MQ | JSON / Avro | Real-time / Batch |

## Pattern Legend
- **Sync** — Synchronous request/response (caller waits for result)
- **Async** — Asynchronous fire-and-forget or callback-based
- **Event** — Event-driven via pub/sub or streaming (e.g. Kafka, EventBridge)
- **Batch** — Scheduled bulk data transfer (ETL/ELT)

## Protocol Legend
- **REST** — RESTful HTTP/HTTPS APIs
- **gRPC** — High-performance RPC with Protocol Buffers
- **GraphQL** — Query language for flexible data retrieval
- **MQ** — Message queue (RabbitMQ, SQS, JMS)
- **SOAP** — XML-based web services (legacy)
- **SFTP** — Secure file transfer

## Frequency Legend
- **Real-time** — Sub-second delivery
- **Near-real-time** — Seconds to minutes latency
- **Batch** — Scheduled (hourly, daily, weekly)
- **On-demand** — Triggered by user or system event

## Integration Models

### Model 1 — (Description)

### Model 2 — (Description)

## External System Dependencies

| System | Owner | API Version | SLA | Contract |
|--------|-------|-------------|-----|----------|
| | | | | |

## Open Questions

- 
`,
});
