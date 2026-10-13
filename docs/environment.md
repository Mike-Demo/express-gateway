# Development Environment

All modernization work for this project was performed on a dedicated cloud
development machine provisioned for the hackathon.

## Infrastructure

| Item | Detail |
|---|---|
| Provider | IBM Cloud VPC |
| Region / Zone | us-south / us-south-1 |
| Instance | `bob-windows` — Windows Server 2022 |
| Profile | bx2-4x16 (4 vCPU, 16 GB RAM) |
| Access | RDP (port 3389) |
| Provisioned | 2026-10-09 |

Instance ID and floating IP are intentionally omitted here; see the IBM Cloud
console.

## Software

| Component | Detail |
|---|---|
| OS | Windows Server 2022 (license bundled in the IBM hourly charge) |
| Node.js | 24.21.0 LTS (via Chocolatey at first boot) |
| Git | via Chocolatey at first boot |
| VS Code | via Chocolatey at first boot |
| IBM Bob IDE | 2.0.2+ |

## Purpose

IBM Bob IDE is the hackathon's core required tool, so a Windows environment
was provisioned to run the full modernization pipeline (discovery → baseline →
plan → upgrade → docs → PR) with Bob as a central part of the workflow.

## Cost & teardown

The VSI runs on the account's IBM Cloud credits and will be decommissioned
after the hackathon submission deadline (2026-10-18) so it stops consuming
credits.
