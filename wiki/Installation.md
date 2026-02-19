# Installation

## Prerequisites

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| **VS Code** | 1.93+ | Download from [code.visualstudio.com](https://code.visualstudio.com/) |
| **GitHub Copilot** | Active subscription | Required — archipilot is a Copilot Chat Participant |

## Install from Marketplace

1. Open VS Code
2. Go to the **Extensions** panel (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for **"archipilot"**
4. Click **Install**

Or install from the command line:

```
code --install-extension enzomar.archipilot
```

Or visit the [VS Code Marketplace listing](https://marketplace.visualstudio.com/items?itemName=enzomar.archipilot) directly.

## Verify Installation

1. Open **Copilot Chat** (`Cmd+Shift+I` / `Ctrl+Shift+I`)
2. Type `@architect /status`
3. You should see a response from the archipilot participant

If no vault is detected, the agent will prompt you to create one:

```
@architect /new My-First-Architecture
```

## Activity Bar

After installing, you'll see the **archipilot** icon in the Activity Bar (left sidebar). This opens:

- **Vault Explorer** — browse vault files by ADM phase
- **Quick Actions** — one-click access to common commands
- **Architecture Health** — live metrics on vault completeness

## Next Steps

- [[Quick-Start]] — Get productive in 5 minutes
- [[Your-First-Vault]] — Understand the vault structure
- [[Commands-Overview]] — Full command reference
