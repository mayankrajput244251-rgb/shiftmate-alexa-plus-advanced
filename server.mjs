import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

export const PROTOCOL_VERSION = '2025-11-25';
const PORT = Number(process.env.PORT || 4318);
const HOST = '127.0.0.1';
const SESSION_TTL_MS = 30 * 60 * 1000;
const ACTION_TTL_MS = 5 * 60 * 1000;

export function createPlantState() {
  return {
    lines: [
      { id: 1, name: 'Line 1', product: 'Valve body · Batch VB-241', output: 486, target: 600, uptime: 98.2, status: 'RUNNING', vibration: 2.1, vibrationBaseline: 2.0, temperature: 64, alert: null },
      { id: 2, name: 'Line 2', product: 'Pump housing · Batch PH-088', output: 392, target: 600, uptime: 87.4, status: 'WATCH', vibration: 4.8, vibrationBaseline: 3.9, temperature: 71, alert: 'Motor bearing vibration is above its watch threshold.' },
      { id: 3, name: 'Line 3', product: 'Drive shaft · Batch DS-511', output: 406, target: 600, uptime: 95.6, status: 'RUNNING', vibration: 2.7, vibrationBaseline: 2.5, temperature: 66, alert: null },
    ],
    quality: { goodUnits: 1284, firstPassYield: 96.8, targetYield: 95, rejects: { dimensional: 24, surfaceFinish: 11, other: 7 } },
    batches: [
      { id: 'VB-241', lineId: 1, product: 'Valve body', startedAt: '08:10', plannedUnits: 600, completedUnits: 486, acceptedUnits: 471, rejectedUnits: 15, rejectReasons: { dimensional: 9, surfaceFinish: 4, other: 2 }, inspection: '20/20 passed at 10:40', materialLot: 'MAT-AL-771', processRevision: 'REV-C' },
      { id: 'PH-088', lineId: 2, product: 'Pump housing', startedAt: '08:00', plannedUnits: 600, completedUnits: 392, acceptedUnits: 380, rejectedUnits: 12, rejectReasons: { dimensional: 7, surfaceFinish: 3, other: 2 }, inspection: '18/20 passed at 10:25; follow-up due', materialLot: 'MAT-AL-804', processRevision: 'REV-B' },
      { id: 'DS-511', lineId: 3, product: 'Drive shaft', startedAt: '08:15', plannedUnits: 600, completedUnits: 406, acceptedUnits: 397, rejectedUnits: 9, rejectReasons: { dimensional: 4, surfaceFinish: 3, other: 2 }, inspection: '20/20 passed at 10:30', materialLot: 'MAT-ST-198', processRevision: 'REV-A' },
    ],
    alerts: [
      { id: 'SIG-204', lineId: 2, severity: 'watch', title: 'Line 2 vibration rising', reading: '4.8 mm/s', threshold: '4.5 mm/s', observedAt: '10:42', source: 'Vibration sensor M2' },
      { id: 'SIG-205', lineId: 1, severity: 'info', title: 'Quality sample due', reading: '20/20 passed', threshold: 'due in 12 minutes', observedAt: '10:40', source: 'Quality schedule Q1' },
    ],
    tickets: [],
    paused: new Set(),
    pendingActions: new Map(),
    audit: [],
    sampleWindow: '08:00–10:42',
    lastUpdated: '2026-10-12T10:42:00+05:30',
  };
}

export const TOOL_DEFINITIONS = [
  { name: 'get_shift_summary', title: 'Get shift summary', description: 'Summarize current simulated production, quality, downtime signals, and the highest-priority action for the active shift.', inputSchema: { type: 'object', additionalProperties: false, properties: {} }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'get_line_diagnostics', title: 'Diagnose a production line', description: 'Return the selected line’s output, uptime, sensor readings, threshold comparison, trend evidence, and a rule-based next step. All readings are fictional demo data.', inputSchema: { type: 'object', additionalProperties: false, properties: { lineId: { type: 'integer', enum: [1, 2, 3], description: 'Production line number.' } }, required: ['lineId'] }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'get_quality_summary', title: 'Get quality summary', description: 'Return simulated first-pass yield, target comparison, reject categories, and the next scheduled quality sample.', inputSchema: { type: 'object', additionalProperties: false, properties: {} }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'get_batch_trace', title: 'Trace a production batch', description: 'Return a fictional batch trace with line, material lot, process revision, counts, reject reasons, inspection, and evidence. Use a batch ID such as PH-088.', inputSchema: { type: 'object', additionalProperties: false, properties: { batchId: { type: 'string', enum: ['VB-241', 'PH-088', 'DS-511'], description: 'Batch identifier shown on the dashboard.' } }, required: ['batchId'] }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'get_shift_handoff', title: 'Prepare a shift handoff', description: 'Prepare a concise, evidence-backed handoff for the incoming shift, with current production, quality, the highest-priority signal, and open draft work.', inputSchema: { type: 'object', additionalProperties: false, properties: {} }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'list_open_actions', title: 'List open actions', description: 'List simulated unresolved signals and draft work orders for the active shift.', inputSchema: { type: 'object', additionalProperties: false, properties: {} }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'prepare_demo_action', title: 'Prepare a demo action', description: 'Create a short-lived preview for a draft work order or simulated line pause/resume. This tool does not apply the action.', inputSchema: { type: 'object', additionalProperties: false, properties: { action: { type: 'string', enum: ['create_work_order', 'pause_line', 'resume_line'] }, lineId: { type: 'integer', enum: [1, 2, 3] }, issue: { type: 'string', maxLength: 300 } }, required: ['action', 'lineId'] }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
  { name: 'confirm_demo_action', title: 'Confirm a demo action', description: 'Apply a previously prepared action after the operator explicitly confirms it in the UI. It only changes local simulated demo state.', inputSchema: { type: 'object', additionalProperties: false, properties: { actionId: { type: 'string', description: 'Short-lived ID returned by prepare_demo_action.' }, confirmed: { type: 'boolean', const: true, description: 'Must be true only after a human explicitly confirms the preview.' } }, required: ['actionId', 'confirmed'] }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
];

function result(data, structuredContent = data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent, isError: false };
}

function toolError(message) {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function lineById(state, lineId) {
  return state.lines.find((line) => line.id === Number(lineId));
}

export function callTool(state, name, args = {}, now = Date.now()) {
  if (name === 'get_shift_summary') {
    const watched = state.lines.filter((line) => line.status === 'WATCH' && !state.paused.has(line.id));
    const topSignal = watched.sort((a, b) => b.vibration - a.vibration)[0] || null;
    return result({
      shift: { name: 'Shift A', window: state.sampleWindow, updatedAt: state.lastUpdated, mode: 'SIMULATED' },
      production: { goodUnits: state.quality.goodUnits, targetUnits: 1800, completionPct: 71.3 },
      quality: { firstPassYieldPct: state.quality.firstPassYield, targetPct: state.quality.targetYield },
      lines: state.lines.map((line) => ({ id: line.id, status: state.paused.has(line.id) ? 'PAUSED' : line.status, output: line.output, uptimePct: line.uptime })),
      priority: topSignal ? { lineId: topSignal.id, reason: topSignal.alert, reading: `${topSignal.vibration} mm/s`, threshold: '4.5 mm/s', recommendation: 'Inspect the motor bearing at the next safe stop; avoid an unscheduled stop unless the reading worsens.' } : null,
      evidence: ['Production counters · Shift A', 'Quality log · Q1', 'Vibration sensor M2 · 10:42'],
      dataNotice: 'Fictional sample data; no plant system is connected.',
    });
  }
  if (name === 'get_line_diagnostics') {
    const line = lineById(state, args.lineId);
    if (!line) return toolError('Unknown lineId. Choose line 1, 2, or 3.');
    const watchThreshold = 4.5;
    const reading = line.vibration;
    const delta = Number((reading - line.vibrationBaseline).toFixed(1));
    const severity = reading >= 6 ? 'critical' : reading >= watchThreshold ? 'watch' : 'normal';
    return result({ line: { id: line.id, name: line.name, product: line.product, status: state.paused.has(line.id) ? 'PAUSED' : line.status, output: line.output, target: line.target, uptimePct: line.uptime },
      sensors: [{ id: `M${line.id}`, metric: 'RMS vibration', value: reading, unit: 'mm/s', watchThreshold, baselineAtShiftStart: line.vibrationBaseline, changeSinceStart: delta, direction: delta > 0 ? 'rising' : delta < 0 ? 'falling' : 'stable', observedAt: '10:42' }, { id: `T${line.id}`, metric: 'Motor temperature', value: line.temperature, unit: '°C', observedAt: '10:42' }],
      assessment: { severity, confidence: 'rule-based threshold check', recommendation: severity === 'normal' ? 'Continue normal monitoring.' : severity === 'watch' ? 'Inspect the bearing at the next safe stop and recheck vibration before the next batch.' : 'Follow site safety procedure and escalate to a qualified technician.' },
      evidence: [`Vibration sensor M${line.id} · sample window ${state.sampleWindow}`, `Threshold configuration · watch at ${watchThreshold} mm/s`],
      dataNotice: 'Fictional sample data; this is not a predictive-maintenance diagnosis.' });
  }
  if (name === 'get_quality_summary') return result({ firstPassYieldPct: state.quality.firstPassYield, targetPct: state.quality.targetYield, aboveTargetByPoints: Number((state.quality.firstPassYield - state.quality.targetYield).toFixed(1)), goodUnits: state.quality.goodUnits, rejects: state.quality.rejects, nextSample: { lineId: 1, dueInMinutes: 12, lastSample: '20/20 passed', source: 'Quality schedule Q1 · 10:40' }, dataNotice: 'Fictional sample quality data.' });
  if (name === 'get_batch_trace') {
    const batch = state.batches.find((item) => item.id === String(args.batchId || '').trim().toUpperCase());
    if (!batch) return toolError('Unknown batchId. Choose VB-241, PH-088, or DS-511.');
    return result({ batch: { ...batch, rejectReasons: { ...batch.rejectReasons } }, trace: { materialLot: batch.materialLot, processRevision: batch.processRevision, inspection: batch.inspection, recordType: 'fictional demonstration record' }, evidence: [`Batch ledger · ${batch.id}`, `Inspection record · ${batch.lineId === 2 ? '10:25' : batch.lineId === 1 ? '10:40' : '10:30'}`, `Production counter · ${batch.startedAt}–${state.sampleWindow.split('–')[1]}`], dataNotice: 'Fictional traceability data; do not use it for product release or a real recall decision.' });
  }
  if (name === 'get_shift_handoff') {
    const openWork = state.tickets.filter((ticket) => ticket.status === 'DRAFT');
    const watched = state.lines.filter((line) => line.status === 'WATCH' && !state.paused.has(line.id)).sort((a, b) => b.vibration - a.vibration)[0];
    return result({ handoff: { from: 'Shift A', to: 'Shift B', window: state.sampleWindow, generatedAt: state.lastUpdated }, production: { goodUnits: state.quality.goodUnits, targetUnits: 1800, completionPct: 71.3 }, quality: { firstPassYieldPct: state.quality.firstPassYield, targetPct: state.quality.targetYield, rejects: state.quality.rejects }, priority: watched ? { lineId: watched.id, signal: watched.alert, reading: `${watched.vibration} mm/s`, watchThreshold: '4.5 mm/s', suggestedFollowUp: 'Recheck at the next safe stop and follow site procedure if the reading worsens.' } : null, openDraftWorkOrders: openWork.map(({ id, lineName, issue, status }) => ({ id, lineName, issue, status })), incomingShiftChecklist: ['Review the Line 2 vibration reading and next sample.', 'Confirm the scheduled quality sample and record its result.', ...(openWork.length ? ['Review the draft work order queue before accepting new work.'] : [])], evidence: ['Production counters · Shift A', 'Quality log · Q1', 'Vibration sensor M2 · 10:42', `Draft work-order queue · ${openWork.length} item(s)`], dataNotice: 'Handoff is based on fictional demo data and is not an instruction to operate equipment.' });
  }
  if (name === 'list_open_actions') return result({ openSignals: state.alerts.map((alert) => ({ ...alert })), draftWorkOrders: state.tickets.map((ticket) => ({ ...ticket })), pendingConfirmations: [...state.pendingActions.values()].filter((a) => a.expiresAt > now).length, count: state.alerts.length + state.tickets.length, dataNotice: 'Demo action queue only.' });
  if (name === 'prepare_demo_action') {
    const line = lineById(state, args.lineId);
    if (!line) return toolError('Unknown lineId. Choose line 1, 2, or 3.');
    if (!['create_work_order', 'pause_line', 'resume_line'].includes(args.action)) return toolError('Unsupported action.');
    if (args.action === 'pause_line' && state.paused.has(line.id)) return toolError(`${line.name} is already paused in the demo.`);
    if (args.action === 'resume_line' && !state.paused.has(line.id)) return toolError(`${line.name} is already running in the demo.`);
    const actionId = randomUUID();
    const issue = typeof args.issue === 'string' && args.issue.trim() ? args.issue.trim().slice(0, 300) : 'Inspect motor bearing at the next safe stop.';
    const title = args.action === 'create_work_order' ? `Draft work order for ${line.name}` : `${args.action === 'pause_line' ? 'Pause' : 'Resume'} ${line.name} in simulation`;
    const preview = { actionId, action: args.action, lineId: line.id, lineName: line.name, title, issue, expiresInSeconds: ACTION_TTL_MS / 1000, effect: args.action === 'create_work_order' ? 'Adds a draft work order to the local demo queue.' : 'Updates only the on-screen demo line state.', externalSystemWrite: false };
    state.pendingActions.set(actionId, { ...preview, expiresAt: now + ACTION_TTL_MS });
    return result(preview);
  }
  if (name === 'confirm_demo_action') {
    if (args.confirmed !== true) return toolError('Confirmation is required. No action was applied.');
    const pending = state.pendingActions.get(args.actionId);
    if (!pending || pending.expiresAt <= now) { state.pendingActions.delete(args.actionId); return toolError('Preview expired or was already used. Prepare the action again.'); }
    const line = lineById(state, pending.lineId);
    state.pendingActions.delete(args.actionId);
    let applied;
    if (pending.action === 'create_work_order') {
      const ticket = { id: `WO-${String(state.tickets.length + 1).padStart(3, '0')}`, lineId: line.id, lineName: line.name, issue: pending.issue, status: 'DRAFT', createdAt: new Date(now).toISOString(), source: 'operator-confirmed demo action' };
      state.tickets.push(ticket); applied = { status: 'DRAFT_CREATED', ticket };
    } else {
      if (pending.action === 'pause_line') state.paused.add(line.id); else state.paused.delete(line.id);
      state.audit.push({ at: new Date(now).toISOString(), action: pending.action, lineId: line.id, simulatedOnly: true });
      applied = { status: pending.action === 'pause_line' ? 'PAUSED_IN_SIMULATION' : 'RUNNING_IN_SIMULATION', lineId: line.id, simulatedOnly: true };
    }
    return result({ ...applied, externalSystemWrite: false, notice: 'Only local demo state changed; no plant equipment or external work-order system was contacted.' });
  }
  return toolError(`Unknown tool: ${name}`);
}

export function handleRpc(state, message, now = Date.now()) {
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return { error: { code: -32600, message: 'Invalid Request' } };
  const hasId = Object.hasOwn(message, 'id');
  const response = (value) => hasId ? { jsonrpc: '2.0', id: message.id, result: value } : null;
  if (message.method === 'notifications/initialized') return null;
  if (message.method === 'initialize') {
    const requested = message.params?.protocolVersion;
    if (requested !== PROTOCOL_VERSION) return { jsonrpc: '2.0', id: message.id, error: { code: -32000, message: `Unsupported protocol version. Use ${PROTOCOL_VERSION}.` } };
    return response({ protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'shiftmate-plant-copilot', version: '1.0.0' }, instructions: 'Use tools for all answers. Cite returned evidence. All plant data and writes are simulated. Never describe a demo action as controlling equipment.' });
  }
  if (message.method === 'ping') return response({});
  if (message.method === 'tools/list') return response({ tools: TOOL_DEFINITIONS });
  if (message.method === 'tools/call') {
    const { name, arguments: args = {} } = message.params || {};
    if (!TOOL_DEFINITIONS.some((tool) => tool.name === name)) return { jsonrpc: '2.0', id: message.id, error: { code: -32602, message: `Unknown tool: ${name}` } };
    return response(callTool(state, name, args, now));
  }
  if (message.method.startsWith('notifications/')) return null;
  if (!hasId) return null;
  return { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Method not found: ${message.method}` } };
}

function json(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(payload === undefined ? '' : JSON.stringify(payload));
}

function allowedLoopbackHost(value = '') {
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${value}`).hostname); } catch { return false; }
}

function originIsAllowed(origin) {
  try { const url = new URL(origin); return ['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname); } catch { return false; }
}

export function createMcpServer({ state = createPlantState(), host = HOST, port = PORT } = {}) {
  const sessions = new Map();
  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && !originIsAllowed(origin)) return json(res, 403, { error: 'Origin is not allowed.' });
    if (!allowedLoopbackHost(req.headers.host)) return json(res, 403, { error: 'Host is not allowed. Bind and connect through localhost.' });
    const cors = origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } : {};
    if (req.method === 'OPTIONS') return json(res, 204, undefined, cors);
    if (req.url !== '/mcp') return json(res, 404, { error: 'Use the /mcp endpoint.' }, cors);
    if (req.method === 'GET') { res.writeHead(405, { Allow: 'POST', ...cors }); return res.end(); }
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'GET, POST, OPTIONS', ...cors }); return res.end(); }
    if (!String(req.headers.accept || '').includes('application/json') || !String(req.headers.accept || '').includes('text/event-stream')) return json(res, 406, { error: 'Accept must include application/json and text/event-stream.' }, cors);
    if (!String(req.headers['content-type'] || '').includes('application/json')) return json(res, 415, { error: 'Content-Type must be application/json.' }, cors);
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 1_000_000) return json(res, 413, { error: 'Request body too large.' }, cors); }
    let message;
    try { message = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON.' }, cors); }
    const isInitialize = message?.method === 'initialize';
    let sessionId = req.headers['mcp-session-id'];
    if (isInitialize) {
      if (sessionId) return json(res, 400, { error: 'Initialization must not include a session ID.' }, cors);
      sessionId = randomUUID();
      sessions.set(sessionId, { lastSeen: Date.now() });
    } else {
      const protocol = req.headers['mcp-protocol-version'];
      if (protocol !== PROTOCOL_VERSION) return json(res, 400, { error: `MCP-Protocol-Version must be ${PROTOCOL_VERSION}.` }, cors);
      const session = sessions.get(sessionId);
      if (!session || Date.now() - session.lastSeen > SESSION_TTL_MS) { sessions.delete(sessionId); return json(res, 404, { error: 'Session expired. Send initialize again.' }, cors); }
      session.lastSeen = Date.now();
    }
    const rpc = handleRpc(state, message);
    if (rpc?.error?.code === -32000) return json(res, 400, rpc, cors);
    if (rpc === null) return json(res, 202, undefined, { ...cors, ...(isInitialize ? { 'MCP-Session-Id': sessionId } : {}) });
    return json(res, 200, rpc, { ...cors, ...(isInitialize ? { 'MCP-Session-Id': sessionId } : {}) });
  });
  return { server, listen: () => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => resolve(server.address())); }), close: () => new Promise((resolve) => server.close(resolve)), state };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const app = createMcpServer();
  app.listen().then((address) => console.log(`Shiftmate MCP server listening on http://${address.address}:${address.port}/mcp (protocol ${PROTOCOL_VERSION})`)).catch((error) => { console.error(error); process.exitCode = 1; });
}
