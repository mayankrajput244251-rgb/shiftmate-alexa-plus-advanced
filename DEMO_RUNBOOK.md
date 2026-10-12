# Shiftmate demo runbook

This runbook is for a reviewer or presenter who wants to run the project from a clean checkout. It includes a short live demo, a longer walkthrough, expected evidence, reset behavior, and common fixes.

## 1. What you need

- Node.js 20 or newer.
- Python 3, or another static file server for `index.html`.
- A modern desktop browser. Chrome or Edge are recommended for the optional speech recognition feature.
- Two free local ports: 4318 for the MCP server and 8000 for the static page.

No package installation, AWS account, API key, Alexa device, or factory connection is needed. The current implementation uses Node.js built-ins only. Every plant reading and state change is fictional and local to the running process.

## 2. Start from a fresh checkout

Open a terminal in the repository root and run:

```bash
node --version
npm test
npm start
```

Keep the MCP server terminal open. The expected startup message includes `127.0.0.1:4318/mcp` and protocol version `2025-11-25`.

Open a second terminal in the same repository root:

```bash
python3 -m http.server 8000
```

In a browser, open <http://localhost:8000>. Use `localhost`, not a machine's LAN IP or a public tunnel. This keeps the page origin compatible with the server's loopback checks.

## 3. Thirty-second smoke check

1. Confirm the top of the assistant panel changes from `CONNECTING` to `MCP tools connected`.
2. Confirm the context line reports eight discovered tools and protocol `2025-11-25`.
3. Ask `Why is Line 2 slowing down?`.
4. Confirm the answer includes `4.8 mm/s`, the `4.5 mm/s` threshold, the `0.9` increase, and a source line naming sensor evidence.
5. Ask `Trace batch PH-088` and confirm the app displays `MAT-AL-804`, batch quantities, inspection status, and the fictional-data notice.
6. Ask `Prepare a shift handoff` and confirm Line 2 is identified as the priority and the output/yield summary is shown.

If the assistant says the MCP server is offline, check that `npm start` is still running and that the page was loaded from `localhost:8000`.

## 4. Three-minute judge walkthrough

### Opening — 0:00–0:20

Show the dashboard as the Shift A operator console. Say:

> “Shiftmate brings sample production, quality, and equipment signals into one review flow. This is a local prototype using fictional data; it cannot control equipment.”

Point out the fictional-data label and that the interface reports a live MCP connection only after the server handshake succeeds.

### Grounded diagnostics — 0:20–0:55

Ask `Why is Line 2 slowing down?`. Point to these values in the answer:

- Vibration is 4.8 mm/s.
- The displayed watch threshold is 4.5 mm/s.
- The reading is up 0.9 mm/s from the shift-start sample.
- The answer labels its method as a rule-based threshold check.
- The response identifies the sensor source and sample window.

Explain that the project presents a bounded follow-up suggestion. It is not a predictive-maintenance model or a safety instruction.

### Trace a batch — 0:55–1:20

Ask `Trace batch PH-088`. Show the link between the batch identifier, Line 2, the material lot, process revision, output/acceptance/reject counts, reject reasons, and inspection status. Read the caution that this sample record must not be used for product release or recall decisions.

### Prepare the next-shift brief — 1:20–1:45

Ask `Prepare a shift handoff`. Show the priority signal and follow-up checklist. Explain that the server assembles the handoff from the same tool-owned sample state and includes a source list.

### Review a draft action — 1:45–2:30

Ask `Create a maintenance ticket for Line 2: inspect the bearing at the next safe stop`. The app should show an action preview and a confirmation panel. Before clicking, say:

> “The preview is not yet applied. It will only add a local draft to this demo queue; no maintenance system or equipment is contacted.”

Confirm it. Ask `Prepare a shift handoff` again and show the open draft work item now appears. This demonstrates that the tool output reflects the confirmed local state, not a hard-coded answer.

### Close — 2:30–3:00

Show the test run (`npm test`) or the repository's test workflow. Close with:

> “Shiftmate demonstrates an MCP-connected, evidence-first workflow with a clear human checkpoint. All records and actions are simulated, and the repository documents what would be required before a real integration.”

## 5. Optional test sequence

Run the suite from the repository root:

```bash
npm test
```

The test suite verifies:

- MCP initialization negotiates the declared protocol version.
- Tool discovery publishes the complete tool catalog.
- A diagnostic contains its reading, threshold, comparison, evidence, and limitation label.
- A trace returns linked batch data and does not mutate state.
- A handoff changes when a draft ticket is created and confirmed.
- A declined, expired, or replayed action preview does not apply twice.
- Invalid lines, batch IDs, tools, and JSON-RPC methods are rejected.

## 6. Resetting the demo

Restarting the Node process creates a fresh in-memory plant state, removes demo tickets, clears pending previews, and resets paused lines. Reload the browser page afterwards to establish a new MCP session. Browser preferences such as the display threshold and refresh interval are stored in local storage; use the `Reset controls` button in the Advanced Controls panel if you want to restore those defaults.

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `EADDRINUSE` for port 4318 | Another server owns the MCP port | Stop the old process, or set `PORT` to another local port and update `MCP_ENDPOINT` in `index.html` for the demo session. |
| Browser reports MCP offline | Server stopped, wrong page origin, or port mismatch | Keep `npm start` running, use `http://localhost:8000`, and reload. |
| CORS or origin error | Page opened from a network address or unrelated origin | Use the local static server command and `localhost`. |
| Protocol/session error after a long pause | Session expired after inactivity | Reload the page to negotiate a fresh MCP session. |
| Mic button reports unavailable | Browser does not implement Web Speech API | Use the text box; microphone support is optional. |
| Voice input is blocked | Browser permission or insecure-origin restriction | Allow microphone permission on localhost, or use text input. |
| A prompt does not route | It does not match a supported deterministic phrase | Try one of the example questions. No fallback write is performed. |
| Pending preview cannot be confirmed | It expired or was already used | Prepare the action again and review the new preview. |

## 8. Recording guidance

- Record the browser and, if useful, the terminal that proves the local MCP server is running.
- Keep the fictional-data notice visible when showing operational readings.
- Show the actual preview and confirmation steps; do not edit a ticket directly in the screen to simulate confirmation.
- Do not describe the browser as connected to Alexa+ itself or to a real plant.
- Keep names and identifiers in the sample data visible only as fictional demo records.
- Make sure the demo recording remains within the hackathon's current duration and accessibility requirements.

## 9. Reviewer checklist

- Repository includes source, MIT license, setup steps, and test command.
- MCP server starts without third-party runtime packages.
- Browser discovers the tools over Streamable HTTP and shows evidence.
- Tool behavior is reproducible after restarting the server.
- New batch trace and shift handoff are shown as live tool results.
- A write-like interaction is previewed before confirmation.
- The confirmation changes only local demo state.
- No AWS service, physical equipment, hosted model, or production Alexa+ integration is claimed.
