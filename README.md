# Shiftmate: Alexa+ shop-floor copilot

Shiftmate is an evidence-first shop-floor assistant backed by a self-hosted **Model Context Protocol (MCP) server over Streamable HTTP**. A shift lead can ask about output, quality, line health, batch traceability, shift handoff, or open work; the browser discovers and calls the server’s tools, then shows the evidence returned with each answer. Proposed write-like actions are previewed by the server and only applied to local demo state after a human confirms.

The dashboard includes a dark operator-console UI with advanced line filters, adjustable vibration thresholds, configurable refresh controls, and voice input. Preferences are stored in the browser. This project uses the Alexa+ hackathon’s MCP-server path. It is not an Alexa+ production integration, Alexa Skill, or connection to factory equipment. The plant readings and all actions are fictional demo data. No cloud AI model or AWS service is used.

## Run the demo

Requires Node.js 20 or newer and Python 3.

Terminal 1 — start the self-hosted MCP server:

```bash
npm start
```

Terminal 2 — serve the browser client from this folder:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>. Keep both processes running. The MCP server binds to `127.0.0.1:4318` and exposes one Streamable HTTP endpoint at <http://127.0.0.1:4318/mcp>. The page performs the MCP initialize handshake, sends `notifications/initialized`, discovers tools, and invokes them over HTTP. No API key, cloud account, or install step is required.

## Try it

- “Give me the shift summary” — reads production and quality tools and highlights the top signal.
- “Why is Line 2 slowing down?” — returns vibration, threshold, shift-start comparison, evidence, and a rule-based next step.
- “Show quality” — reads yield, reject categories, and the next scheduled sample.
- “Trace batch PH-088” — retrieves the fictional production, material, inspection, and reject record for a batch.
- “Prepare a shift handoff” — compiles an incoming-shift brief with the highest-priority signal and open draft work.
- “Create a maintenance ticket for Line 2” — asks the server to prepare a draft, displays a confirmation, then adds a local draft only after confirmation.
- “Pause Line 2” — demonstrates a confirmation-gated, simulated state change; no equipment is contacted.

For protocol-level inspection, connect an MCP inspector to `http://127.0.0.1:4318/mcp` while the server is running. `mcp-config.json` records the endpoint, transport, and protocol version.

## MCP tools

| Tool | Purpose | Behavior |
|---|---|---|
| `get_shift_summary` | Shift output, yield, line status, and top signal | Read only |
| `get_line_diagnostics` | Sensor thresholds, trend comparison, and bounded recommendation | Read only; rule based |
| `get_quality_summary` | Yield, target, reject counts, and next sample | Read only |
| `get_batch_trace` | Batch, material lot, process revision, quantities, inspection, and reject reasons | Read only; fictional trace data |
| `get_shift_handoff` | Incoming-shift brief, open work, priority signal, and follow-up checklist | Read only; evidence cited |
| `list_open_actions` | Signals and draft work orders | Read only |
| `prepare_demo_action` | Preview a work order or simulated pause/resume | No state change |
| `confirm_demo_action` | Apply a fresh preview after explicit user confirmation | Local demo state only; one use; expires after five minutes |

The server implements JSON-RPC over Streamable HTTP with protocol version `2025-11-25`, session IDs, `MCP-Protocol-Version` checks, local Origin/Host validation, loopback binding, and JSON responses. It does not open a GET event stream; GET receives 405, which the transport specification permits for servers that do not offer server-initiated SSE. The demo transport has no authentication because it is bound to loopback; do not expose it to a network.

## Tests

```bash
npm test
```

Tests cover protocol initialization and tool discovery, evidence-bearing diagnostics, batch traceability, shift handoff refresh after a confirmed work order, confirmation gating, expired/replayed previews, unknown tools, invalid lines, and JSON-RPC errors. The dataset and thresholds are fictional; the diagnostic is a simple threshold rule, not a validated predictive-maintenance model.

## Design and submission guides

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — components, request lifecycle, tool contracts, state model, and design boundaries.
- [`DEMO_RUNBOOK.md`](DEMO_RUNBOOK.md) — setup checks, repeatable demos, narration, and troubleshooting.
- [`SAFETY_AND_LIMITATIONS.md`](SAFETY_AND_LIMITATIONS.md) — safeguards, data limits, and requirements before a real plant connection.
- [`HACKATHON_SUBMISSION.md`](HACKATHON_SUBMISSION.md) — long-form submission copy, implementation notes, feedback, friction log, and demo script.

## Project files

- `index.html` — responsive dashboard and browser MCP client.
- `server.mjs` — self-hosted Streamable HTTP MCP endpoint, demo tools, and simulated state.
- `test/server.test.mjs` — protocol/tool behavior tests.
- `mcp-config.json` — endpoint and protocol metadata.
- `ARCHITECTURE.md`, `DEMO_RUNBOOK.md`, `SAFETY_AND_LIMITATIONS.md` — engineering and reviewer guides.
- `HACKATHON_SUBMISSION.md` — submission draft, product feedback, friction log, and demo narration.
- `LICENSE` — MIT license.
