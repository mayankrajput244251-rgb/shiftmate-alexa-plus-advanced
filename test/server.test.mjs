import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callTool, createMcpServer, createPlantState, handleRpc, PROTOCOL_VERSION, TOOL_DEFINITIONS } from '../server.mjs';

test('MCP initialization negotiates the required protocol and advertises tools', () => {
  const initialized = handleRpc(createPlantState(), { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: PROTOCOL_VERSION } });
  assert.equal(initialized.result.protocolVersion, '2025-11-25');
  assert.ok(initialized.result.capabilities.tools);
  const listed = handleRpc(createPlantState(), { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.equal(listed.result.tools.length, TOOL_DEFINITIONS.length);
  assert.ok(listed.result.tools.some((tool) => tool.name === 'confirm_demo_action'));
});

test('line diagnostics return threshold, trend, evidence, and a bounded recommendation', () => {
  const answer = callTool(createPlantState(), 'get_line_diagnostics', { lineId: 2 });
  assert.equal(answer.structuredContent.assessment.severity, 'watch');
  assert.equal(answer.structuredContent.sensors[0].value, 4.8);
  assert.equal(answer.structuredContent.sensors[0].watchThreshold, 4.5);
  assert.match(answer.structuredContent.evidence.join(' '), /Vibration sensor/);
  assert.match(answer.structuredContent.dataNotice, /not a predictive-maintenance diagnosis/);
});

test('write-like demo actions require a fresh preview and explicit confirmation', () => {
  const state = createPlantState();
  const preview = callTool(state, 'prepare_demo_action', { action: 'create_work_order', lineId: 2, issue: 'Inspect bearing' }, 1_000);
  assert.equal(state.tickets.length, 0);
  const denied = callTool(state, 'confirm_demo_action', { actionId: preview.structuredContent.actionId, confirmed: false }, 1_001);
  assert.equal(denied.isError, true);
  assert.equal(state.tickets.length, 0);
  const applied = callTool(state, 'confirm_demo_action', { actionId: preview.structuredContent.actionId, confirmed: true }, 1_002);
  assert.equal(applied.structuredContent.status, 'DRAFT_CREATED');
  assert.equal(applied.structuredContent.ticket.issue, 'Inspect bearing');
  assert.equal(state.tickets.length, 1);
  const replay = callTool(state, 'confirm_demo_action', { actionId: preview.structuredContent.actionId, confirmed: true }, 1_003);
  assert.equal(replay.isError, true);
  const expiredPreview = callTool(state, 'prepare_demo_action', { action: 'pause_line', lineId: 2 }, 2_000);
  const expired = callTool(state, 'confirm_demo_action', { actionId: expiredPreview.structuredContent.actionId, confirmed: true }, 302_001);
  assert.equal(expired.isError, true);
  assert.equal(state.paused.has(2), false);
});

test('unknown tool and invalid line are returned as tool errors', () => {
  assert.equal(callTool(createPlantState(), 'missing').isError, true);
  assert.equal(callTool(createPlantState(), 'get_line_diagnostics', { lineId: 99 }).isError, true);
});

test('batch trace returns linked production and inspection evidence without changing state', () => {
  const state = createPlantState();
  const before = JSON.stringify(state.batches);
  const trace = callTool(state, 'get_batch_trace', { batchId: 'ph-088' });
  assert.equal(trace.structuredContent.batch.id, 'PH-088');
  assert.equal(trace.structuredContent.batch.materialLot, 'MAT-AL-804');
  assert.equal(trace.structuredContent.batch.completedUnits, 392);
  assert.equal(trace.structuredContent.batch.rejectReasons.dimensional, 7);
  assert.match(trace.structuredContent.evidence.join(' '), /Inspection record/);
  assert.match(trace.structuredContent.dataNotice, /do not use it for product release/);
  assert.equal(JSON.stringify(state.batches), before);
  assert.equal(callTool(state, 'get_batch_trace', { batchId: 'UNKNOWN' }).isError, true);
});

test('shift handoff summarizes priority, quality, and confirmed draft work', () => {
  const state = createPlantState();
  const initial = callTool(state, 'get_shift_handoff');
  assert.equal(initial.structuredContent.handoff.to, 'Shift B');
  assert.equal(initial.structuredContent.priority.lineId, 2);
  assert.equal(initial.structuredContent.openDraftWorkOrders.length, 0);
  const preview = callTool(state, 'prepare_demo_action', { action: 'create_work_order', lineId: 2, issue: 'Inspect the bearing' }, 10_000);
  callTool(state, 'confirm_demo_action', { actionId: preview.structuredContent.actionId, confirmed: true }, 10_001);
  const updated = callTool(state, 'get_shift_handoff');
  assert.equal(updated.structuredContent.openDraftWorkOrders.length, 1);
  assert.equal(updated.structuredContent.openDraftWorkOrders[0].issue, 'Inspect the bearing');
  assert.match(updated.structuredContent.evidence.join(' '), /Draft work-order queue/);
});

test('tool schemas are discoverable and both new tools are declared read-only', () => {
  const listed = handleRpc(createPlantState(), { jsonrpc: '2.0', id: 4, method: 'tools/list' }).result.tools;
  for (const name of ['get_batch_trace', 'get_shift_handoff']) {
    const tool = listed.find((item) => item.name === name);
    assert.ok(tool, `${name} is advertised`);
    assert.equal(tool.annotations.readOnlyHint, true);
  }
});

test('MCP JSON-RPC dispatch handles notifications without a response body', () => {
  assert.equal(handleRpc(createPlantState(), { jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  assert.equal(handleRpc(createPlantState(), { jsonrpc: '2.0', id: 3, method: 'not/a/method' }).error.code, -32601);
});

test('Streamable HTTP endpoint initializes sessions, lists tools, and rejects non-loopback origins', async (t) => {
  const app = createMcpServer({ port: 0 });
  let address;
  try { address = await app.listen(); }
  catch (error) {
    if (error.code === 'EPERM') { t.skip('This environment does not permit binding a local HTTP socket.'); return; }
    throw error;
  }
  const url = `http://127.0.0.1:${address.port}/mcp`;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  try {
    const initialized = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: PROTOCOL_VERSION } }) });
    assert.equal(initialized.status, 200);
    const session = initialized.headers.get('MCP-Session-Id');
    assert.ok(session);
    assert.equal((await initialized.json()).result.protocolVersion, PROTOCOL_VERSION);
    const connectedHeaders = { ...headers, 'MCP-Protocol-Version': PROTOCOL_VERSION, 'MCP-Session-Id': session };
    const listed = await fetch(url, { method: 'POST', headers: connectedHeaders, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) });
    assert.equal(listed.status, 200);
    assert.equal((await listed.json()).result.tools.length, 8);
    const blocked = await fetch(url, { method: 'POST', headers: { ...connectedHeaders, Origin: 'https://example.com' }, body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping' }) });
    assert.equal(blocked.status, 403);
  } finally {
    await app.close();
  }
});
