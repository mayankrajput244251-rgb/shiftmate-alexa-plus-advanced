# Safety boundaries, assumptions, and limitations

## Read this before using the demo

Shiftmate is a hackathon prototype. It contains fictional production, quality, inspection, and sensor records. It is not connected to real machinery, workers, products, inventory, maintenance systems, or plant networks. Do not use its readings to make production, safety, maintenance, product release, or recall decisions.

The dashboard's “live” indicator means the browser has connected to the local demo server and discovered its tools. It does not mean that a real plant or real-time data feed is connected.

## Data boundaries

- All line names, batch IDs, material lot numbers, quantities, defect counts, sensor readings, timestamps, thresholds, and work orders are fictional.
- Data is stored in memory only and resets when the Node process restarts.
- Browser preferences are stored in local storage on the current browser profile.
- The demo does not ingest personal data, employee records, customer records, or proprietary factory information.
- The traceability view is illustrative; it cannot establish chain of custody, regulatory compliance, or production genealogy.
- The quality summary is a small illustrative aggregate; it is not calculated from a validated sampling plan.

## Decision boundaries

The diagnostic calculates a simple threshold band and returns a canned next step. It does not calculate failure probability, remaining useful life, or a safety state. A “watch” or “critical” label in this sample should not be interpreted as an approved industrial limit. Real maintenance decisions require the machine manufacturer's limits, site procedures, validated instruments, competent personnel, and a review of the full operating context.

The handoff checklist is a demo convenience. It is not a shift log, legal record, permit-to-work, lockout/tagout instruction, or formal transfer of responsibility. A real shift handoff must follow the site's approved procedure and preserve the actual operator's decision authority.

## Action boundaries

`prepare_demo_action` creates an expiring preview. `confirm_demo_action` updates only local in-memory demo state. Even the simulated pause/resume does not send a network command to a PLC or machine. The returned status and UI copy explicitly say the external-system write is false.

The local confirmation pattern demonstrates one interaction principle only. It is not enough to authorize real actions. A production action workflow would need, at minimum:

1. Identity authentication, secure session handling, and role-based authorization.
2. A policy engine that distinguishes read-only, draft, and operational actions.
3. Independent checks for safe operating state and a verified target asset.
4. Clear action previews that show exact target, scope, consequences, and rollback path.
5. Durable, tamper-resistant audit trails with actor, time, evidence, and result.
6. Concurrency handling, idempotency, expiry, replay defense, and recovery behavior.
7. Network segmentation and a separately reviewed integration adapter.
8. Human factors, cybersecurity, privacy, reliability, and functional safety reviews.
9. Testing with a simulator or sandbox before any authorized production pilot.

No actual control or work-order integration is part of this project.

## Local transport protections

The MCP server binds to `127.0.0.1` and checks loopback `Host` and browser `Origin` values. It expects JSON POST requests, the negotiated protocol header, and a session ID after initialization. Sessions expire after inactivity. Request bodies are capped at one megabyte. This is sufficient for a local demonstration, not a security certification.

The demo transport has no authentication or encryption. Loopback binding is a boundary, not a substitute for network security. Do not bind the server to `0.0.0.0`, expose it through a tunnel, put it behind a public reverse proxy, or reuse this server for a shared or production deployment without a security redesign.

## AI and automation disclosure

This version does not call a hosted AI model, Amazon Bedrock, AWS, an Alexa+ account, or a third-party AI service. The user-facing question router is deterministic regular-expression logic. Answers are templates populated from tool responses. The actual MCP endpoint and tools are implemented and called at runtime, rather than being described only in documentation.

The repository is submitted for the Alexa+ self-hosted MCP server path. It does not claim the AWS Builder mini challenge. It is also not a production Alexa+ integration or an Alexa Skill running on an Amazon device.

## Known limitations

- Natural-language coverage is intentionally narrow and English only.
- No LLM handles ambiguity, context, or follow-up questions.
- Sample values are static; there is no simulator clock or sensor stream.
- There is no durable storage, multi-user model, authentication, or audit export.
- No formal schema versioning or migration is implemented for persisted data.
- Threshold settings in the browser do not reconfigure the server's sample diagnostic rule.
- Browser speech input depends on support and permission from the chosen browser.
- The UI is a single static HTML file; there is no automated browser accessibility audit yet.
- Test coverage focuses on server/tool behavior and does not replace end-to-end browser testing.

## Responsible future integration

If this project is extended, begin with a read-only simulator or a reviewed data adapter. Document every real data source, its owner, scope, retention, freshness, and failure mode. Keep tool schemas narrow; pass only fields needed for the task; return source and timestamp metadata; and reject stale or malformed data. Test uncertain, missing, conflicting, and adversarial values.

Keep any text-generation layer separate from the control path. It may summarize verified tool output, but it must not invent readings, construct arbitrary control commands, bypass server-side validation, or treat operator phrasing as authorization. Require separate policy checks and explicit approval for each consequential action. Production integration would require domain, security, privacy, legal, reliability, and safety review by the responsible organization.

This document describes product boundaries and future work; it does not certify the prototype or any future system.
