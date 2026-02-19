# archipilot Demo 2 — From Zero to ArchiMate

**Scenario:** A solution architect joining a new project with no existing documentation.  
**Story:** "Day 1 on a new project. Nothing written down yet. Let's build a full architecture from scratch — and export it to ArchiMate in one session."  
**Duration:** ~8 minutes  
**Vault:** None — you start with an empty workspace.

---

## Before You Start

1. Open VS Code at an **empty folder**:
   ```bash
   mkdir ~/Desktop/CloudRetail-Architecture
   code ~/Desktop/CloudRetail-Architecture
   ```
2. Make sure **Copilot Chat** is open (`Cmd+Shift+I`)
3. Have **Archi** ([archimatetool.com](https://www.archimatetool.com/)) installed and ready to open (free)
4. Optional: have [Markdown Mermaid](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) installed

---

## Scene 1 — The Blank Page Problem (0:00–0:30)

**What to show:** Empty VS Code window. Explorer panel shows nothing.

**Narration:**
> *"Blank page. New project. Architecture in people's heads. This is where most EA efforts stall — getting from nothing to something structured. Let's fix that in under 8 minutes."*

---

## Scene 2 — Scaffold the Vault (0:30–1:15)

**What to type:**
```
@architect /new CloudRetail-Architecture
```

**What to expect:**
- Explorer panel fills with 27 TOGAF-aligned files
- `00_Architecture_Repository.md` opens automatically
- archipilot confirms: "Vault created. Start with A1_Architecture_Vision.md — define your scope, drivers, and two or three key business goals."

**Narration:**
> *"One command — 27 structured documents, ready to fill. Every TOGAF phase. Don't worry about the naming — A1 is Vision, B1 is Business, C1 is Applications, all the way through to Roadmap and Governance. This is your architecture notebook."*

> ⏸️ **Pause** — scroll slowly through Explorer so viewers see the file list.

---

## Scene 3 — Define the Architecture (1:15–2:30)

**What to do:** Open `A1_Architecture_Vision.md` and **type directly into the file** while narrating. Keep it fast — you don't need to fill everything, just enough to show intent.

**Type into A1_Architecture_Vision.md:**
```markdown
## Business Drivers
- BD-01: Migrate from legacy on-prem e-commerce to cloud-native platform
- BD-02: Support 10x Black Friday traffic spikes without pre-provisioning
- BD-03: Real-time personalisation and recommendation engine
- BD-04: Reduce infrastructure costs by 35% in 18 months

## Constraints
- CON-01: All customer PII must remain in EU (GDPR)
- CON-02: Existing ERP (SAP) must be retained — no replacement in scope

## Target: cloud-native on AWS, microservices, event-driven
```

**Then open `C1_Application_Architecture.md` and type:**
```markdown
## Baseline (As-Is)
- Monolithic Magento 2 platform on-premises
- MySQL single instance
- Manual deployments (FTP)

## Target (To-Be)
- API Gateway (AWS API Gateway)
- Product Catalogue Service (Node.js)
- Order Management Service (Java/Spring)
- Recommendation Engine (Python/ML)
- Customer Identity (Cognito)
- Event Bus (Kafka MSK)
- Frontend (Next.js on CloudFront)
- Database: DynamoDB (catalogue) + Aurora (orders)

## Dependencies
- [[D1_Technology_Architecture]] for infrastructure detail
- [[X1_ADR_Decision_Log]] for technology decisions
```

**Then open `X1_ADR_Decision_Log.md` and type:**
```markdown
## AD-01 — API Gateway
**Status:** ✅ Decided
**Decision:** AWS API Gateway — fully managed, native integration, WAF support
**Rationale:** Team has AWS expertise; no multi-cloud requirement.

## AD-02 — Database Strategy
**Status:** ✅ Decided
**Decision:** DynamoDB for catalogue (high read throughput), Aurora PostgreSQL for orders (transactional)
**Rationale:** Workload profiles differ significantly — no single database fits both.

## AD-03 — Recommendation Engine
**Status:** 🔴 Open
**Options:** Build ML pipeline in-house vs use AWS Personalize vs third-party (Dynamic Yield)
**Decision:** Pending — awaiting data science team assessment
```

**Then open `X2_Risk_Issue_Register.md` and type:**
```markdown
## R-01 — Migration Continuity
**Probability:** Medium | **Impact:** High | **Status:** Open
The legacy Magento platform must stay live during migration. Any downtime risks merchant revenue loss.
**Mitigation:** Blue-green deployment with canary traffic routing.

## R-02 — ML Model Cold Start
**Probability:** Low | **Impact:** Medium | **Status:** Open
Recommendation Engine has no training data before go-live.
**Mitigation:** Seed with collaborative filtering on synthetic data; switch to real-time model after 30 days.
```

**Narration (while typing):**
> *"Fill in what you know — business drivers, constraints, target components. This is plain Markdown, no special syntax. WikiLinks connect files together. Give archipilot enough context and it will do the heavy lifting."*

---

## Scene 4 — Let archipilot Fill the Gaps (2:30–3:15)

**What to type:**
```
@architect What architecture decisions are still open and what should I resolve first?
```

**What to expect:** archipilot reads the vault and responds:
- AD-03 (Recommendation Engine) is the only open decision
- Suggests resolving it before the Phase E design because it affects E1 (Building Blocks) and F1 (Roadmap)
- Offers to run `/decide AD-03` for structured analysis

**Then type:**
```
@architect /decide AD-03 — evaluate Build in-house vs AWS Personalize vs Dynamic Yield for a B2C e-commerce recommendation engine with a small data science team
```

**What to expect:** Structured analysis:
- Build in-house: full control, 6-9 month build time, needs ML ops capability
- AWS Personalize: managed, fast time-to-value, €800-2000/month, limited customisation
- Dynamic Yield: best UX tooling, €15k+/month, SaaS lock-in
- Recommendation: **AWS Personalize** for Phase 1 — matches team size, budget, timeline; migrate to custom model in Phase 2 if needed

**Type:**
```
@architect /update Record decision AD-03: adopt AWS Personalize for Phase 1 recommendations. Rationale: managed service, fast time-to-value, team does not have ML ops capacity. Revisit custom model in Phase 2.
```

**Show the diff preview and click Apply.**

**Narration:**
> *"archipilot reads the full context — team size, constraints, open decisions — and gives you grounded analysis, not generic advice. Then one command updates the decision log with full governance."*

---

## Scene 5 — Generate the Architecture Diagrams (3:15–4:00)

**What to type:**
```
@architect /diagram
```
*(with C1_Application_Architecture.md open)*

**What to expect:**
- Mermaid `flowchart LR` diagram generated from the WikiLinks and components in C1
- Inserted at the bottom of the file under `## Context Diagram`
- Chat shows a preview

**Then type:**
```
@architect /c4
```

**What to expect:**
- C4 Context diagram in Mermaid
- Shows CloudRetail system, users (customers, merchants), and external systems (SAP ERP, payment gateway, AWS Personalize)

**Narration:**
> *"/diagram generates a context diagram directly from what you've written — no diagramming tool needed. /c4 gives you the standard C4 model, grounding your architecture in a universally understood notation."*

---

## Scene 6 — Check Vault Quality (4:00–4:30)

**What to type:**
```
@architect /status
```

**What to expect:**
- A1: Approved, B1: Draft, C1: Draft, D1: Empty, X1: Active (1 open decision)
- Missing: D1 Technology Architecture (empty), E1 Solutions Building Blocks (empty)
- archipilot flags: "D1 is empty — Technology Architecture is needed before Phase D gate"

**Then type:**
```
@architect /todo
```

**What to expect:**
- Fill D1 Technology Architecture (empty, Phase D gate at risk)
- R-01 Migration continuity — no mitigation implementation started
- R-02 ML cold start — no mitigation started
- FR (requirements) not yet captured — R1 is empty

**Narration:**
> *"/todo tells you exactly what to work on next. We've built the core, but Technology Architecture is empty and requirements aren't captured yet. Let's let archipilot help with those."*

---

## Scene 7 — Update Documents with Governance (4:30–5:00)

**What to type:**
```
@architect /update Add to D1_Technology_Architecture: Target stack — AWS EKS for container orchestration, Kafka MSK for event bus, API Gateway (AWS), CloudFront + S3 for frontend, Aurora PostgreSQL for orders, DynamoDB for catalogue, Cognito for identity. Primary region: eu-west-1. DR: eu-central-1.
```

**What to expect:**
- Diff preview showing D1 content added
- Click Apply All

**Narration:**
> *"Instead of opening each file and typing manually, just tell archipilot what to add. Diff preview, confirm, done. With governance."*

---

## Scene 8 — Export to ArchiMate (5:00–6:30)

**What to type:**
```
@architect /archimate
```

**What to expect:**
- archipilot scans all vault files
- Extracts: Business Layer (processes from B1), Application Layer (components from C1), Technology Layer (from D1), Motivation Layer (principles, drivers, requirements, decisions)
- Generates relationships: from Mermaid diagrams, dependency tables, WikiLinks
- Exports to `exports/archimate/CloudRetail-ArchiMate.xml`
- Chat summary:
  - Business Layer: 4 elements
  - Application Layer: 9 elements (API Gateway, Product Catalogue, Order Mgmt, Recommendation, Cognito, Kafka, Frontend, DynamoDB, Aurora)
  - Technology Layer: 7 elements (EKS, CloudFront, S3, MSK, RDS, DynamoDB nodes, Cognito)
  - Motivation: 4 drivers, 2 principles, 3 risks, 3 decisions
  - 5 auto-generated views

**Narration:**
> *"Now the centerpiece — /archimate. It reads the entire vault and generates a standards-compliant ArchiMate 3.2 model. Every component, every relationship, every business driver — mapped to the correct ArchiMate layer and element type."*

> ⏸️ **Pause** — show the XML file in Explorer, then open it.

---

## Scene 9 — Open in Archi (6:30–7:15)

**What to do:**
1. Open **Archi** (archimatetool.com — free)
2. File → Import → Open Exchange File
3. Navigate to `exports/archimate/CloudRetail-ArchiMate.xml`
4. Show the imported model in the **Model Tree**:
   - Business Layer folder
   - Application Layer folder
   - Technology Layer folder
   - Motivation folder
5. Open the **Full Layered View** — show all layers with relationships
6. Open the **Application View** — focus on services

**Narration:**
> *"Import directly into Archi — free, open-source, the standard tool for ArchiMate. In under 7 minutes, from an empty folder, we have a full layered architecture model. Business drivers connected to application components connected to technology. This would have taken days in traditional tools."*

> ⏸️ **Pause on the Archi diagram** — this is the money shot.

---

## Scene 10 — Bonus: Draw.io for Stakeholders (7:15–7:45)

**What to type:**
```
@architect /drawio
```

**What to expect:**
- Three `.drawio` files in `exports/drawio/`
- As-Is: Magento monolith in red (to be removed)
- Target: all cloud components in green
- Migration: color-coded overlay

**Open in VS Code** with the Draw.io extension — show the three tabs.

**Narration:**
> *"And if your stakeholders prefer Draw.io over ArchiMate — one more command. As-Is, Target, and Migration diagrams, ready for Confluence, PowerPoint, or your next board presentation."*

---

## Scene 11 — Wrap Up (7:45–8:00)

**What to show:** Side by side — VS Code with the vault on the left, Archi with the full model on the right.

**Narration:**
> *"From empty folder to full ArchiMate model in 8 minutes. All documents version-controlled in Git. All decisions governed. All diagrams generated. That's archipilot — your architecture Copilot, inside VS Code. Free, open source, TOGAF-aligned. Link in the description."*

---

## Tips for This Demo

| Tip | Detail |
|-----|--------|
| **Pre-type the vault content** | Scenes 3 is the slowest — consider pre-typing most of it and just showing the final result |
| **Speed up Scene 3 in post-production** | 2x speed with a caption "5 minutes of writing" works well |
| **The Archi moment is the highlight** | Spend time on Scene 9 — linger on the layered diagram. That's the "wow" moment. |
| **Keep Archi open before recording** | Import the XML during a practice run so you know the exact clicks |
| **Show the XML briefly** | 5 seconds showing the raw XML before opening Archi shows it's a real standard |
| **Alternative to Archi** | If Archi crashes or looks bad, show the XML in VS Code and pivot to the Draw.io export |

---

## Fallback: Archi Not Available

If Archi isn't working on the day, use this instead after `/archimate`:

```
@architect /analyze Does the exported ArchiMate model have full cross-layer traceability from business drivers to technology components?
```

This triggers a rich analysis of the model in chat, which is also compelling for the audience.

---

## Suggested Video Description

> **From blank folder to full ArchiMate model in 8 minutes** — archipilot for VS Code.
>
> In this demo I start with nothing and build a cloud retail architecture from scratch using archipilot — TOGAF-aligned Enterprise Architecture copilot inside VS Code Copilot Chat.
>
> Commands shown:
> `/new` → `/decide` → `/update` → `/diagram` → `/c4` → `/status` → `/todo` → `/archimate` → `/drawio`
>
> The ArchiMate export is importable by Archi (free), BiZZdesign, Sparx EA, and ADOIT.
>
> 🔗 Install: https://marketplace.visualstudio.com/items?itemName=enzomar.archipilot  
> 🌐 Website: https://enzomar.github.io/archipilot/  
> ⭐ GitHub: https://github.com/enzomar/archipilot

---

## Suggested Tags

`enterprise architecture` `TOGAF` `archipilot` `VS Code extension` `GitHub Copilot` `ArchiMate` `Draw.io` `solution architecture` `software architecture` `EA tools` `architecture documentation`
