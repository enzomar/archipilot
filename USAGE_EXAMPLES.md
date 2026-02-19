# archipilot — Usage Examples & Recipes

Practical examples for every command, organized by workflow. Copy-paste these into Copilot Chat to get started immediately.

---

## Quick Start (First 5 Minutes)

```
@architect /new Payment-Platform-Architecture
@architect /status
@architect /todo
@architect /review
```

---

## Daily Workflows

### Morning Stand-up: "What needs attention today?"

```
@architect /status How many decisions are still open?
@architect /todo What should we focus on this sprint?
@architect /todo Which open decisions are blocking work packages?
```

### Record a Decision from a Meeting

```
@architect /adr Use PostgreSQL for transactional data
@architect /adr Adopt an API Gateway as the single entry point for all external traffic
@architect /adr Self-host the LLM instead of using a cloud API
@architect /adr Defer MCP integration to Phase 5
```

Follow up with AI-driven analysis:

```
@architect /decide AD-05 Use PostgreSQL — evaluate against our NFRs
```

### Quick Impact Check Before a Change

```
@architect /impact AD-02
@architect /impact R-05
@architect /analyze What happens if we drop the API Gateway and use direct service-to-service calls?
```

---

## Architecture Review & Governance

### `/review` — Automated Architecture Review

Assess quality, completeness, and TOGAF compliance of your vault documents.

```
@architect /review
@architect /review C1_Application_Architecture
@architect /review Check all Phase B deliverables for completeness
@architect /review Which files have the most TBD placeholders?
@architect /review Assess traceability from business drivers to decisions
```

**What it does:**
1. Evaluates each file against 7 dimensions: completeness, TOGAF compliance, cross-references, metadata quality, content quality, governance alignment, traceability
2. Produces a **scorecard** (1–5 stars per dimension) for each file
3. Lists **specific findings** and **recommended actions**
4. Ends with an overall vault maturity summary

> 💡 Run `/review` weekly to track improvement over time. Run it on specific files before stakeholder reviews.

### `/gate` — Phase Gate Checklist

Evaluate whether a TOGAF ADM phase has met its exit criteria and is ready to proceed.

```
@architect /gate Phase A
@architect /gate Assess all phases for gate readiness
@architect /gate Is Phase B ready to proceed? List all blockers.
@architect /gate What needs to happen before we can exit Phase C?
@architect /gate Compare Phase D readiness vs Phase E prerequisites
```

**What it does:**
1. Checks all required deliverables for the phase are present and non-draft
2. Evaluates quality gates: status ≥ "review", owner assigned, version > 0.1.0
3. Verifies prerequisite phases are complete
4. Lists blocking decisions, risks, or open questions
5. Produces a **GO / NO-GO recommendation** with specific blockers

> 💡 Run `/gate` before architecture review boards. Attach the output to your governance report.

---

## `/status` — Pre-computed Dashboard

Get an instant, structured vault dashboard — no AI needed for the numbers.

```
@architect /status
@architect /status How many decisions are still open?
@architect /status Which documents are still in draft?
@architect /status Show me a summary of all risks by severity
@architect /status What percentage of requirements have been addressed?
```

**What it does:**
1. Computes document maturity breakdown (draft / review / approved counts)
2. Shows key metrics with traffic-light indicators (🔴🟡✅)
3. Displays open items by TOGAF ADM phase
4. Detects broken WikiLinks across the vault
5. If you ask a follow-up question, the AI analyzes the dashboard data

The dashboard includes:
- Document maturity counts
- Open decisions, risks, questions
- Risks without owners
- Broken WikiLinks
- TBD ownership items
- Phase-by-phase distribution

---

## Analysis & Decision Support

### Free-Form Questions

```
@architect What is the current state of our AI vendor strategy?
@architect Summarize all open decisions and their impact
@architect Which components depend on the API Gateway?
@architect What are the main risks if we choose Option C for AD-01?
@architect Explain the data flow between the Conversational Interface and the Rule Engine
```

### `/analyze` — Impact Analysis (Read-Only)

```
@architect /analyze What happens if we drop the API Gateway?
@architect /analyze Impact of moving from single-vendor to multi-vendor LLM strategy
@architect /analyze Assess the effect of adding a real-time event bus to the integration layer
@architect /analyze How does removing DEP-03 (Rule Engine) affect our scenarios?
```

### `/decide` — Decision Support with Structured Reasoning

```
@architect /decide Help me resolve AD-01 — Feature vs Enterprise Service vs AI Platform
@architect /decide Should we build or buy the Context Aggregation Engine?
@architect /decide Evaluate self-hosted LLM vs cloud API given our data residency constraints
@architect /decide Is MCP mature enough to adopt now, or should we wait?
```

---

## Updating the Vault

### `/update` — Modify Vault Documents

**Add entries:**
```
@architect /update Add risk R-06: "Regulatory change" — probability Low, impact High
@architect /update Add decision AD-04: "Event-Driven vs Request-Response" with options Kafka, REST, Hybrid
@architect /update Add FR-06: "AI provides multi-language support" priority Should, source Scenario 1
```

**Update entries:**
```
@architect /update Mark AD-01 as decided: Option B (Enterprise Service)
@architect /update Update risk R-04 probability from Medium to High
@architect /update Set the owner of Q-07 to "Security Team" with target date 2026-03-15
```

**Remove entries:**
```
@architect /update Remove DEP-06 (MCP Strategy) — moved to separate initiative
@architect /update Remove risk R-05 — change management program approved
```

**Dry-run mode (preview without writing):**
```
@architect /update Add risk R-06: "Regulatory change" --dry-run
@architect /update Mark AD-01 as decided: Option B --preview
```

---

## Diagrams & Exports

### `/diagram` — Context Diagram for Active File

Open any vault `.md` file, then:

```
@architect /diagram
```

Generates a Mermaid flowchart showing all `[[WikiLinks]]` from the active file.

### `/graph` — Full Vault Dependency Graph

```
@architect /graph
```

Saves `Vault-Graph.mermaid` in your vault root with every file as a node and every WikiLink as an edge.

### `/c4` — C4 Model Diagrams

```
@architect /c4 Generate a System Context diagram for the AI Assistant
@architect /c4 Create a Container diagram showing all components
@architect /c4 Component diagram for the Context Aggregation Engine
```

### `/timeline` — Gantt Timeline

```
@architect /timeline Generate a Gantt chart from F1_Architecture_Roadmap
@architect /timeline Show the critical path for Phase 2 delivery
@architect /timeline What does the timeline look like if Phase 1 slips by 4 weeks?
```

### `/sizing` — Capacity & Cost Analysis

```
@architect /sizing Estimate compute for 500 concurrent agents
@architect /sizing Compare cost of self-hosted vs cloud LLM
@architect /sizing Update X4_Sizing_Catalogue with Phase 2 estimates
```

### `/archimate` — ArchiMate Export

```
@architect /archimate
@architect /archimate Focus on cross-layer traceability gaps
@architect /archimate --no-analysis
```

### `/drawio` — Draw.io Architecture Diagrams

```
@architect /drawio
@architect /drawio Analyze migration classification accuracy
@architect /drawio --no-analysis
```

---

## TODO & Health Monitoring

### `/todo` — TOGAF Action Items

```
@architect /todo
@architect /todo What should we focus on this sprint?
@architect /todo Which open decisions are blocking work packages?
@architect /todo --no-analysis
```

The extractor scans for:
- Open decisions, risks, questions
- Pending work packages & milestones
- Open requirements (FR + NFR)
- Incomplete compliance checks
- Pending change requests
- Draft documents
- Unassigned ownership (TBD)
- Broken WikiLinks (new!)
- Metadata gaps, capability gaps, scenario gaps
- Contract gaps, traceability gaps
- Orphaned entities (no incoming/outgoing links)

### `/impact` — Cross-Vault Impact Chain

```
@architect /impact AD-02
@architect /impact R-05
@architect /impact WP-03
@architect /impact Q-12
```

Scans every file and section for references to the given ID, showing the full impact chain.

---

## Vault Management

### `/switch` — Change Active Vault

```
@architect /switch
@architect /switch Change to the Payment-Platform vault
```

### `/new` — Scaffold a New Vault

```
@architect /new Payment-Platform-Architecture
@architect /new Customer-360-Initiative
```

Creates 27 TOGAF ADM-aligned template files with YAML front matter.

---

## Sidebar Features

Click the **AP** icon in the Activity Bar for three views:

### Vault Explorer
- Browse files by TOGAF ADM phase
- Click to open, analyze, or preview any file

### Quick Actions
One-click shortcuts for all major commands:

| Group | Actions |
|-------|---------|
| **Architecture** | Analyze, Status, Decide, Update, TODO, Impact, ADR, Review, Gate |
| **Diagrams & Export** | C4, Timeline, Sizing, ArchiMate, Draw.io, Context Diagram, Vault Graph |
| **Management** | New Vault, Switch Vault |

### Architecture Health
Live linter showing:
- Overall health score
- Phase readiness percentages
- Open decisions, risks, questions by category
- Broken WikiLinks
- Orphaned entities
- Draft documents, unassigned ownership

---

## Recipes for Common Scenarios

### Preparing for an Architecture Review Board

```
@architect /gate Assess all phases for readiness
@architect /review
@architect /todo Which items are blocking governance sign-off?
@architect /status
@architect /archimate
```

### Onboarding a New Team Member

```
@architect /status
@architect What is the high-level vision for this architecture?
@architect /graph
@architect Explain the key decisions made so far and their rationale
```

### Sprint Planning

```
@architect /todo What should we focus on this sprint?
@architect /todo Which open decisions are blocking work packages?
@architect /timeline Show the critical path for Phase 2
@architect /sizing Estimate compute for the next milestone
```

### Post-Decision Housekeeping

```
@architect /adr Use PostgreSQL for transactional data
@architect /update Mark AD-05 as decided: PostgreSQL. Rationale: meets NFRs for latency and ACID compliance
@architect /impact AD-05
@architect /review X1_ADR_Decision_Log
```

### End-of-Week Health Check

```
@architect /status
@architect /todo --no-analysis
@architect /review Which files changed this week?
@architect /gate Is Phase B ready to proceed?
```
