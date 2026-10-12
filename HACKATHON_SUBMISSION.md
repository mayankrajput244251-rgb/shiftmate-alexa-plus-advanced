# Devpost submission draft

## Project name

Shiftmate

## Tagline

An Alexa+ style, evidence-first copilot for the factory floor.

## Track

Alexa+ — self-hosted MCP server using Streamable HTTP, protocol version 2025-11-25.

## What it does

Shift leads lose time switching between production counters, sensor alerts, batch records, and quality logs just to decide what to check next and what must be carried over at shift change. Shiftmate puts those signals behind one conversational interface backed by eight discoverable MCP tools. A lead can ask for a shift summary, investigate a slow line, review quality, trace a sample batch, prepare an incoming-shift handoff, or preview a maintenance action in everyday language.

Shiftmate answers from a visible sample plant dataset and names the readings behind each answer. For example, it can explain that Line 2 is at 87.4% uptime while its motor bearing sensor reports 4.8 mm/s vibration against a 4.5 mm/s watch threshold, up 0.9 mm/s from the shift-start sample. It can trace batch PH-088 to its fictional material lot, process revision, quantities, inspection, and reject split. A handoff tool compiles the line signal, output, quality, and draft work into a checklist for the incoming shift. The browser client connects to the self-hosted MCP endpoint, discovers the tools, and invokes them over Streamable HTTP.

## How it was built

The browser client is plain HTML, CSS, and JavaScript. `server.mjs` is a self-hosted Node.js MCP server that implements JSON-RPC over Streamable HTTP at `/mcp`, negotiates protocol `2025-11-25`, advertises eight tools, manages short-lived sessions, and validates loopback Host/Origin values. Tool calls return structured results and evidence. `prepare_demo_action` creates a non-mutating preview; `confirm_demo_action` requires an explicit boolean confirmation and a fresh, one-use preview token before changing local demo state. The line diagnostic is a transparent threshold rule, not an ML prediction. All plant data is fictional, and no Alexa+ production integration or physical equipment is connected.

## What changed during the hackathon

The starting version of Shiftmate already contained the core shop-floor dashboard, local MCP server, summary/diagnostic/quality/action tools, and confirmation-gated demo action. During the submission period, I extended it with two new runtime tools and end-to-end user paths: `get_batch_trace` connects each sample batch to its material lot, process revision, counts, inspection, and reject reasons; `get_shift_handoff` produces a next-shift checklist from current production, quality, priority signals, and draft work. I added natural-language routing and visible evidence for both tools, tests for trace integrity and state-aware handoffs, and complete architecture, demo, and safety documentation. The interface now documents all eight tools, demo setup, expected outputs, and failure recovery. These changes are implemented in the runtime code and tests, not only described here.

## Built with

- HTML, CSS, and browser JavaScript for the responsive dashboard and deterministic question routing
- Node.js 20+ built-in HTTP, crypto, and test modules; no third-party runtime dependency
- Model Context Protocol JSON-RPC over Streamable HTTP (`2025-11-25`)
- Eight typed tools for shift, line, quality, batch, handoff, action queue, and preview/confirmation workflows
- Fictional plant data, rule-based threshold diagnostics, and in-memory simulated action state
- MIT license and a public GitHub repository
- No AWS service, cloud model, device SDK, or production system integration

## Product feedback

**MCP and Node.js:** I used the MCP `2025-11-25` Streamable HTTP protocol to expose typed tools from a local shop-floor dataset and called them from a browser client. The single endpoint and standard JSON-RPC messages made tool discovery and invocation easy to inspect; human confirmation is clear for actions. Writing the local server without a third-party runtime dependency kept setup short, but it also meant I had to implement and test protocol/session details myself. For production Alexa+ integrations, I would want an official Alexa+ sandbox and a concise guide for account authorization, domain data grounding, and confirmation UX. I would build with MCP again and connect an approved data source only after adding authentication, audit policy, and an operational safety review.

This project uses the Alexa+ self-hosted MCP-server path. The MCP server is the required runtime technology and is imported and called by the browser client. No AWS service is used; this submission does not claim AWS Builder mini-challenge eligibility. It does not claim to be an Alexa+ production integration or an Amazon Alexa Skill.

## Optional feature request

**Important:** Publish an Alexa+ simulation starter kit that shows how to turn a domain-specific data source into grounded, cited answers and confirmation-gated actions. This would help teams validate a useful conversational workflow before requesting or building a live integration.

## Optional friction log

**Task:** Build and inspect a self-hosted Alexa+ track MCP experience.  
**Steps:** Implement a Streamable HTTP server, negotiate the protocol, list tools, connect a browser client, and preview/confirm an action.  
**Expected:** A short, repeatable path from local server startup to tool discovery and a grounded tool call.  
**Observed:** The local workflow is runnable without a cloud account, but protocol session handling, local Origin checks, tool schemas, and user confirmations require careful implementation and test coverage. No official Alexa+ sandbox was available in this build.  
**Severity:** Moderate.  
**Workaround:** Add a self-hosted MCP server, expose typed tools with visible evidence, bind to loopback, and require a fresh confirmation token for every simulated write.  
**Suggestion:** Provide an Alexa+ MCP starter template with a current protocol example, local inspector workflow, auth guidance, grounding patterns, and confirmation UX.

## Demo video plan (about 90 seconds)

**0:00–0:12** — Show both local processes and the dashboard. Say: “Shiftmate gives a shift lead one conversational front door to production and quality signals.”  
**0:12–0:22** — Show MCP connection status, protocol version, and eight discovered tools.  
**0:22–0:42** — Ask why Line 2 is slowing. Show the actual `get_line_diagnostics` result, 4.8 mm/s versus the 4.5 threshold, the 0.9 shift-start change, evidence, and the rule-based recommendation.  
**0:42–0:58** — Ask for the quality summary and show the `get_quality_summary` tool result.  
**0:58–1:15** — Trace batch PH-088. Point to its material lot, counts, rejects, inspection, and fictional data notice.  
**1:15–1:32** — Prepare a shift handoff and show Line 2 as the priority.  
**1:32–1:58** — Prepare a Line 2 work order, show that the preview changed nothing, confirm it, then request the handoff again to show that the draft is now included.  
**1:58–2:15** — Show `npm test` passing and close: “All readings and actions are simulated; the value is evidence-backed answers with a human checkpoint before local demo changes.”

## Submission checklist

- Track: Alexa+ MCP server over Streamable HTTP.
- Repository: public and MIT-licensed; reviewers can access source and setup instructions without collaborator invitations.
- Demo video: record the above flow, upload publicly to YouTube or Vimeo, in English, under three minutes, and paste the URL into Devpost.
- Product feedback: use the feedback section above and adjust it to match your actual experience before submission.
- Repo URL: `https://github.com/mayankrajput244251-rgb/shiftmate-alexa-plus-advanced`

## Reviewer test instructions

1. Clone the public repository and open its root directory.
2. Run `npm test` with Node.js 20 or newer.
3. Run `npm start` in one terminal and `python3 -m http.server 8000` in another.
4. Open `http://localhost:8000` and wait for the local MCP handshake to finish.
5. Try `Why is Line 2 slowing down?`, `Trace batch PH-088`, and `Prepare a shift handoff`.
6. Try `Create a maintenance ticket for Line 2: inspect the bearing`. Review the preview before confirming. The change affects only in-memory demo state.

The demo runs without login credentials, paid service, API key, or cloud account. The public repository includes the MIT license at its root. The project page also links to the browser demonstration. The current demo server is intended to run locally; it should not be exposed on the public internet.

## Detailed product flow

### 1. Find a signal

The line overview presents three fictional lines, output progress, uptime, and a watch state. The Advanced Controls section allows the reviewer to filter the line list, adjust the visual vibration threshold, configure auto-refresh, and manually request refresh. These controls make the mock operations view explorable while keeping the source dataset constant. The app stores these display preferences in browser local storage.

### 2. Ask for a grounded answer

The operator can type or use supported browser speech recognition. The deterministic router maps common phrases to a declared MCP tool, and the browser calls that tool through the negotiated session. Each response names tool evidence, sample window, or method. Unsupported intent receives examples of valid questions and does not silently trigger a tool.

### 3. Trace batch context

Batch trace ties a known sample ID to its line, material lot, process revision, completion counts, accepted/rejected split, reject reasons, and sample inspection. The result includes a fictional-record warning. This feature is designed to show what a traceability answer could look like when its identifiers and sources are explicit; it is not a genuine genealogy record.

### 4. Prepare the incoming-shift brief

The handoff tool assembles production completion, yield against target, the active highest-priority line signal, draft work orders, and a follow-up checklist. It reads current server state, which allows the second handoff in the demo to reflect a confirmed draft ticket. The output is concise enough to review and specific enough to inspect against the sample data.

### 5. Pause before changing state

The preview tool creates a temporary action token. The UI presents the target and simulated effect. Only a separate confirmation consumes the token and changes local state. Cancelling, expiry, or replay does not create a ticket or change a line. The response explains that no external work-order system or equipment was contacted.

## Implementation and validation notes

The repository is dependency-light: runtime behavior uses Node.js built-ins and static browser code. The test suite verifies the protocol handshake, tool list, diagnostic evidence and limit label, batch trace contents, read-only behavior, handoff changes after confirmed work, action preview and one-use confirmation, expiry and replay rejection, invalid tool and line handling, and JSON-RPC errors. These tests focus on the server boundary; they do not replace browser automation or a third-party protocol conformance review.

The data is intentionally fixed and transparent to make the demonstration repeatable. The browser's adjustable threshold is a visualization preference; it does not change the server-side diagnostic rule. The diagnostic's confidence field says `rule-based threshold check` so no one mistakes it for a trained predictive model.

## Known limitations and next steps

Current limitations include narrow English intent patterns, no language model, static sample values, no durable database, no multi-user authorization, no hosted integration, and no automated browser end-to-end test. The server has no authentication and is only intended for loopback use. The local confirmation pattern is a prototype, not an operational safety control.

If the project continues, the next responsible steps would be to improve keyboard and screen-reader checks, add a resettable scenario selector, add simulator-backed read-only data, version the data schemas, introduce identity and policy boundaries before durable writes, and independently review any future AWS or plant integration. Real industrial control would require security, safety, privacy, reliability, and site approval; it is outside the scope of this entry.

