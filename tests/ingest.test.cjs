/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness loads transpiled TypeScript in an isolated VM. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Run the actual schemas and handler with an isolated database adapter.
function load(path, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, process: { env: { INGEST_API_KEY: "test" } }, require: (id) => dependencies[id] ?? require(id), console, Date });
  return exports;
}
const schemas = load('src/lib/digest-types.ts', {});
function harness() {
  const daily = new Map();
  const weekly = new Map();
  const hydrate = (row) => row ? { ...row, date: new Date(row.date), weekOf: new Date(row.weekOf), visibleUntil: new Date(row.visibleUntil) } : null;
  const table = (rows) => ({
    findUnique: async ({ where }) => hydrate(rows.get(String(Object.values(where)[0]))),
    upsert: async ({ where, create, update }) => {
      const key = String(Object.values(where)[0]);
      const row = JSON.parse(JSON.stringify(rows.has(key) ? { ...rows.get(key), ...update } : create));
      rows.set(key, row);
      return hydrate(row);
    },
  });
  const locks = new Map();
  const db = { $transaction: async (work) => {
    let unlock;
    const tx = { briefing: table(daily), weekendBriefing: table(weekly), $queryRaw: async (_, key) => {
      const previous = locks.get(key) ?? Promise.resolve();
      locks.set(key, new Promise((resolve) => { unlock = resolve; }));
      await previous;
      return [];
    } };
    try { return await work(tx); } finally { unlock?.(); }
  } };
  const time = {
    keyFromString: (s) => new Date(s), todayKey: () => new Date('2026-10-22'),
    keyToString: (d) => d.toISOString().slice(0, 10),
    weekendStart: () => new Date('2026-10-24'),
    addDays: (d, n) => new Date(+d + n * 86400000),
    zonedDayBounds: () => ({ end: new Date('2026-10-26T03:59:59Z') }),
  };
  const { POST } = load('src/app/api/ingest/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/db': { db }, '@/lib/digest-types': schemas, '@/lib/time': time,
  });
  return { daily, weekly, post: async (body) => POST({ headers: { get: () => 'Bearer test' }, json: async () => body }) };
}
const email = { sender: 'A', subject: 'Reply', whyItMatters: 'Due', nextAction: 'Respond' };
const reading = { title: 'Paper', source: 'Journal', url: 'https://example.com', why: 'Relevant' };
const deal = { merchant: 'Store', offer: '20% off' };

test('concurrent independent uploads preserve all sections and source timestamps', async () => {
  const h = harness();
  const results = await Promise.all([
    h.post({ kind: 'email', payload: { emailAttention: [email] } }),
    h.post({ kind: 'news', payload: { topics: {} } }),
    h.post({ kind: 'research', payload: { readings: [reading] } }),
    h.post({ kind: 'deals', payload: { promotions: [deal] } }),
  ]);
  assert.ok(results.every((r) => r.status === 200));
  const p = [...h.daily.values()][0].payload;
  assert.equal(p.emailAttention.length, 1);
  assert.equal(p.readings.length, 1);
  assert.equal(p.promotions.length, 1);
  assert.deepEqual(Object.keys(p.sourceUpdatedAt).sort(), ['deals', 'email', 'news', 'research']);
});
test('empty snapshot clears only its own section; legacy daily posts preserve research/deals', async () => {
  const h = harness();
  await h.post({ kind: 'research', payload: { readings: [reading] } });
  await h.post({ kind: 'deals', payload: { promotions: [deal] } });
  await h.post({ payload: { topics: {}, emailAttention: [email] } });
  await h.post({ kind: 'email', payload: { emailAttention: [] } });
  const p = [...h.daily.values()][0].payload;
  assert.equal(p.emailAttention.length, 0);
  assert.equal(p.readings.length, 1);
  assert.equal(p.promotions.length, 1);
});
test('legacy weekend sections survive concurrent uploads', async () => {
  const h = harness();
  await Promise.all([
    h.post({ kind: 'weekend', payload: { promotions: [deal] } }),
    h.post({ kind: 'weekend', payload: { readings: [reading] } }),
  ]);
  const p = [...h.weekly.values()][0].payload;
  assert.equal(p.promotions.length, 1);
  assert.equal(p.readings.length, 1);
});
test('rejects malformed source payloads without writing', async () => {
  const h = harness();
  for (const body of [{ kind: 'email', payload: {} }, { kind: 'deals', payload: { readings: [] } }, { kind: 'unknown', payload: {} }]) {
    assert.equal((await h.post(body)).status, 400);
  }
  assert.equal(h.daily.size, 0);
});
test('dates remain isolated and news refresh clears a stale custom headline', async () => {
  const h = harness();
  await h.post({ kind: 'news', payload: { topics: {}, headline: [{ text: 'Old headline' }] } });
  await h.post({ kind: 'news', payload: { topics: {} } });
  await h.post({ kind: 'email', date: '2026-10-21', payload: { emailAttention: [email] } });
  const rows = [...h.daily.values()];
  assert.equal(rows.length, 2);
  assert.equal(rows[0].payload.headline, undefined);
  assert.equal(rows[0].payload.emailAttention.length, 0);
  assert.equal(rows[1].payload.emailAttention.length, 1);
});

const linkedEmail = { ...email, obligationId: 'obligation-1', ticktickProjectId: 'pixelos', ticktickTaskId: 'task-1' };
test('linked identities round-trip, reject partial/duplicate identities, and preserve prior snapshot on rejection', async () => {
  const h = harness();
  assert.equal((await h.post({ kind: 'email', payload: { emailAttention: [linkedEmail] } })).status, 200);
  assert.equal([...h.daily.values()][0].payload.emailAttention[0].ticktickTaskId, 'task-1');
  for (const items of [
    [{ ...email, obligationId: 'partial' }],
    [{ ...linkedEmail, ticktickTaskId: '' }],
    [linkedEmail, { ...linkedEmail, ticktickTaskId: 'another' }],
    [linkedEmail, { ...linkedEmail, obligationId: 'another' }],
  ]) {
    assert.equal((await h.post({ kind: 'email', payload: { emailAttention: items } })).status, 400);
    assert.equal([...h.daily.values()][0].payload.emailAttention.length, 1);
  }
  assert.equal((await h.post({ payload: { topics: {}, emailAttention: [linkedEmail, linkedEmail] } })).status, 400);
});

test('linked email views ignore marks and encode TickTick IDs; legacy views retain marks', () => {
  const data = load('src/lib/data.ts', { '@/lib/db': {}, '@/lib/digest-types': schemas, '@/lib/time': { keyToString: (d) => d.toISOString().slice(0, 10) } });
  const { buildEmails } = load('src/lib/view.ts', {
    '@/lib/data': data, '@/lib/digest-types': schemas,
    '@/lib/time': { keyToString: (d) => d.toISOString().slice(0, 10) },
  });
  const day = new Date('2026-11-03');
  const nextDay = new Date('2026-11-04');
  assert.equal(data.emailKey(day, linkedEmail), data.emailKey(nextDay, linkedEmail));
  const legacyKey = data.emailKey(day, email);
  const views = buildEmails(day, [{ ...linkedEmail, ticktickTaskId: 'a/b?#' }, email], new Set([data.emailKey(day, linkedEmail), legacyKey]));
  assert.equal(views[0].done, false);
  assert.equal(views[0].taskUrl, 'https://ticktick.com/webapp/#p/pixelos/tasks/a%2Fb%3F%23');
  assert.equal(views[1].done, true);
  assert.equal(views[1].taskUrl, undefined);
});

test('email mark action rejects linked keys and old keys for linked items while preserving legacy actions', async () => {
  let writes = 0;
  const { setMark } = load('src/app/actions.ts', {
    'next/cache': { refresh() {} }, '@/lib/auth': { getSession: async () => ({}) },
    '@/lib/ticktick': {}, '@/lib/digest-types': schemas,
    '@/lib/time': { isDateString: () => true, keyFromString: (s) => new Date(s) },
    '@/lib/db': { db: {
      briefing: { findUnique: async () => ({ payload: { topics: {}, emailAttention: [linkedEmail] } }) },
      itemMark: { upsert: async () => { writes++; }, deleteMany: async () => { writes++; } },
    } },
  });
  const input = { kind: 'email', date: '2026-11-03', on: true };
  await assert.rejects(() => setMark({ ...input, key: 'email:obligation:obligation-1' }), /TickTick/);
  await assert.rejects(() => setMark({ ...input, key: 'email:2026-11-03:A|Reply' }), /TickTick/);
  assert.equal(writes, 0);
  await setMark({ ...input, key: 'email:2026-11-03:B|Legacy' });
  await setMark({ ...input, kind: 'deal', key: 'deal:example' });
  assert.equal(writes, 2);
});
