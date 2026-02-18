---
type: technology-architecture
status: draft
version: 0.1.0
last_updated: 2024-01-15
---

# Technology Architecture

## Platform Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Compute | AWS ECS Fargate | Container orchestration |
| Database | PostgreSQL 15, ClickHouse | OLTP + OLAP |
| Messaging | Apache Kafka | Event streaming |
| CDN | CloudFront | Static asset delivery |
| CI/CD | GitHub Actions | Build & deploy pipeline |
| Monitoring | Datadog | APM, logs, metrics |

## Network Topology

- VPC with 3 AZs (us-east-1a/b/c)
- Public subnet → ALB → Private subnet → ECS tasks
- Database in isolated subnet, VPC endpoints for AWS services

## Standards & Constraints

- All services containerised (Docker)
- TLS 1.3 for all external traffic
- Secrets via AWS Secrets Manager — no env-var secrets
- Infrastructure as Code: Terraform

## Technology Radar

| Hold | Assess | Trial | Adopt |
|------|--------|-------|-------|
| MongoDB | GraphQL Federation | Deno | TypeScript |
| Jenkins | Pulumi | OpenTelemetry | PostgreSQL |

## Open Questions

### Infrastructure
- Should we migrate to EKS for better scaling control?
- What is the disaster-recovery RTO/RPO target?
