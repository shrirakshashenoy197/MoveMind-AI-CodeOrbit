# MoveMind AI — CodeOrbit

**Move smarter. Understand your route.** MoveMind AI is a ChronoForge 2026 prototype for community-reported road hazards, explainable risk estimates, route trade-offs, and a deterministic tool-using Urban Response Agent.

## Proposal workflow

The proposal's workflow is **Report → Assess → Plan → Recommend**. People report hazards; the risk engine assesses them; the Urban Response Agent prepares a response plan; and the app recommends trade-offs. **The commuter makes the final route decision.**

The provisional risk weights remain **severity 50%, nearby report frequency 30%, and recency 20%**. These are prototype heuristics, not an official safety rating or scientifically validated model.

## Requirements

- Node.js 20+ recommended
- npm
- Internet access for OpenStreetMap tiles

## Run locally

From the extracted `movemind-ai` project root:

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). During development, Vite proxies `/api` requests to Express on port 4000.

## Commands

```bash
npm install
npm test
npm run build
npm run build && npm start
```

- `npm run dev` — run frontend and backend together.
- `npm test` — run automated backend unit and API tests using Node's built-in test runner.
- `npm run build` — build the Vite frontend into `client/dist`.
- `npm run build && npm start` — build the frontend, then start Express. If `client/dist` exists, Express serves the frontend and falls back to `index.html` for non-API routes.

## Implemented workflow and features

- Responsive dark mobility dashboard and interactive Leaflet map centred on Mangalore.
- Hazard reporting with server-side validation and a same-category duplicate warning.
- Explainable hazard risk scoring using the proposal's 50/30/20 weights.
- Three illustrative candidate route geometries sharing one origin and destination; distances are summed from geometry, and travel times assume an illustrative average speed of 20 km/h.
- Route association by point-to-line-segment distance and a 350 m corridor.
- Same-category reports within 35 m are grouped into one route incident. The representative incident is used for route score and incident count; repeated reports are shown separately.
- Urban Response Agent workflow with the five proposal steps: Observe, Select tools, Assess, Compare, Recommend. Tool order is fixed and rule-based; there is no LLM tool selection.
- What-If Lab scenarios; the repair scenario excludes the report from hypothetical calculations and does not assign it a zero-risk score.
- Inspection priorities, report insights, CSV export, route comparison history, and demo reset.
- JSON-file persistence in `server/data/db.json` for local demonstrations. This is not a production multi-user database.

## Risk model

Each factor is normalized to 0–100:

- **Severity (50%)**: Low = 25, Medium = 60, High = 100.
- **Nearby report frequency (30%)**: independent same-category reports within 500 m, mapped using a prototype heuristic.
- **Recency (20%)**: exponential decay; the recency influence halves every seven days.
- **Score**: `0.50 × severity + 0.30 × frequency + 0.20 × recency`, rounded to one decimal and bounded to 0–100.

Route risk combines distinct incident scores and a capped multi-incident adjustment. Reports likely to describe the same incident (same category and within 35 m) do not each increase route incident count or score. Their count is exposed separately. If a route has no matched reports, the result is **Insufficient data, not safe**.

New hazard submissions are restricted to the approximate Mangalore-area bounding box: latitude 12.6–13.3 and longitude 74.6–75.3.

## Urban Response Agent

The proposal's five visible steps are:

1. **Observe** — read the saved reports.
2. **Select tools** — the tool sequence is fixed and rule-based; no LLM selects tools.
3. **Assess** — calculate hazard and route risk estimates.
4. **Compare** — compare route distance, illustrative time, and known hazards.
5. **Recommend** — return priorities and explain trade-offs for the commuter.

The API also returns the executed tool log. This prototype does not use an LLM or autonomously contact authorities.

## Automated tests

Automated tests are implemented with `node:test` for:

- 50/30/20 risk-weight calculation, recency, risk categories and nearby-report grouping.
- Route duplicate grouping, route geometry distance, shared route endpoints and no-report insufficient-data handling.
- Mangalore-area coordinate validation.
- API endpoints: `POST /api/hazards` (valid, invalid, duplicate warning), `PATCH /api/hazards/:id/status`, `POST /api/routes/compare`, `POST /api/agent/analyze`, `POST /api/simulate`, and `GET /api/export.csv` formula-injection protection.
- Repair simulation does not change the saved report.

Only mark a check as **Manually tested** when a person has actually run through that check. Automated tests are separate and run with `npm test`.

## API overview

- `GET /api/health`
- `GET /api/hazards`
- `POST /api/hazards`
- `PATCH /api/hazards/:id/status`
- `GET /api/dashboard`
- `GET /api/routes`
- `POST /api/routes/compare`
- `GET /api/routes/history`
- `POST /api/agent/analyze`
- `POST /api/simulate`
- `POST /api/demo/reset`
- `GET /api/export.csv`

## Deployment option A: one host (simplest)

Deploy the whole repository to one Node.js host that supports a build command and a persistent disk if you need JSON-file data to persist.

- Build command: `npm install && npm run build`
- Start command: `npm start`
- The root start script runs Express. Express serves `client/dist` when it exists and uses the built `index.html` as a fallback for non-`/api` paths.
- Set `PORT` if the host requires it.
- Set `MOVEMIND_DATA_DIR` to a durable directory if your host provides persistent storage. Without durable storage, JSON data may be lost on redeploy/restart.

## Deployment option B: separate frontend and API

**API service (Express):** deploy the repository with root directory `server` only if your host can install/run that workspace independently; otherwise deploy from the repository root with `npm install` as build/install and `npm start` as start. Configure the host's port as required. Set `CLIENT_ORIGIN` to the deployed frontend origin if you want to restrict CORS to that origin. The current API enables CORS for browser-based separated deployment.

**Frontend (Vercel):** set root directory to `client`, framework to Vite, build command `npm run build`, and output directory `dist`. Add an environment variable:

```text
VITE_API_BASE=https://YOUR-DEPLOYED-API-HOST
```

Use the real HTTPS origin of your API, without a trailing slash. Rebuild/redeploy the frontend after setting it. Leave `VITE_API_BASE` unset for same-origin hosting and local Vite proxy development.

If deployed separately, the frontend calls the API host using `VITE_API_BASE`; CORS must allow the frontend origin. A free host's filesystem may be ephemeral, so do not treat `server/data/db.json` as durable production storage unless persistent disk is configured.

## Demo script (3–5 minutes)

1. Start on Overview and explain the reported-hazard route choice problem.
2. Open Hazard Map and inspect a labelled sample record and its provisional score.
3. Submit a report using a Mangalore-area map location.
4. Compare the three illustrative candidate routes and explain risk, distance, time, and report coverage.
5. Run Urban Response Agent and show the five workflow steps and executed tool log.
6. In What-If Lab, simulate repairing a hazard; compare routes before and after without changing saved reports.
7. Explain limitations: reports can be incomplete, stale, duplicated or inaccurate; route geometry and time are illustrative; there is no live traffic, official municipal verification, safety guarantee, or emergency dispatch.

## Important disclosures and limitations

> In this prototype, status changes are not authenticated; verification is a manual label, not an official check.

- The commuter makes the final route decision; recommendations do not decide automatically.
- Risk weights and thresholds are provisional and have not been scientifically validated.
- Demo route geometry, distance, and duration are illustrative and not guaranteed navigable directions or live traffic estimates.
- No live traffic integration, official municipal data integration, image-based hazard detection, or emergency dispatch is included.
- JSON-file storage is intended for a local hackathon demo, not concurrent production use.
- OpenStreetMap tiles require connectivity and are subject to provider usage policies.

 ## Live Demo

- Frontend Website: https://move-mind-ai-code-orbit.vercel.app/
- Backend Server: https://movemind-ai-codeorbit.onrender.com/

## Project Overview

MoveMind AI is an urban mobility intelligence platform that helps users report road hazards, assess route risks, compare routes, and explore AI-inspired urban response recommendations.

## Technology Stack

- Frontend: React, Vite
- Backend: Node.js, Express.js
- Deployment: Vercel (Frontend) and Render (Backend)

## Team

**CodeOrbit** · ChronoForge 2026 · Agentic AI · Cities of the Future  
Team members: Shriraksha Shenoy and Sanjana TR  
Institution: Canara Engineering College, Mangalore
