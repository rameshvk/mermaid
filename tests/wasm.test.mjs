// Host glue exists only in this test harness. No JS is shipped with the renderer.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const module = await WebAssembly.compile(readFileSync(new URL('../dist/mermaid.wasm', import.meta.url)));
const fixtures = JSON.parse(readFileSync(new URL('./fixtures.json', import.meta.url), 'utf8'));
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;

async function host() {
  const { exports: wasm } = await WebAssembly.instantiate(module, {});
  function result(ptr) {
    assert.notEqual(ptr, 0);
    try {
      const view = new DataView(wasm.memory.buffer);
      const status = view.getUint32(ptr, true);
      const data = view.getUint32(ptr + 4, true);
      const length = view.getUint32(ptr + 8, true);
      const text = decoder.decode(new Uint8Array(wasm.memory.buffer, data, length));
      return { status, text };
    } finally {
      wasm.result_free(ptr);
    }
  }
  function renderBytes(bytes) {
    const input = wasm.alloc(bytes.length);
    if (bytes.length) assert.notEqual(input, 0, 'input allocation failed');
    try {
      if (bytes.length) new Uint8Array(wasm.memory.buffer, input, bytes.length).set(bytes);
      return result(wasm.render(input, bytes.length));
    } finally {
      wasm.free(input, bytes.length);
    }
  }
  return { wasm, result, renderBytes, render: (source) => renderBytes(encoder.encode(source)) };
}

test('module has no imports and exposes only ABI v1', () => {
  assert.deepEqual(WebAssembly.Module.imports(module), []);
  assert.deepEqual(WebAssembly.Module.exports(module).map((e) => `${e.name}:${e.kind}`).sort(), [
    'alloc:function', 'free:function', 'memory:memory', 'render:function', 'result_free:function',
  ]);
});

for (const [name, source] of Object.entries(fixtures)) {
  test(`renders ${name} deterministically across calls and instances`, async () => {
    const a = await host();
    const first = a.render(source);
    assert.equal(first.status, 0, first.text);
    assert.match(first.text, /<svg\b/);
    assert.match(first.text, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(first.text, /<\/svg>\s*$/);
    assert.deepEqual(a.render(source), first);
    assert.deepEqual((await host()).render(source), first);
    if (name === 'unicode') {
      assert.ok(first.text.includes('こんにちは'));
      assert.ok(first.text.includes('مرحبا'));
      assert.ok(first.text.includes('🌍'));
    }
  });
}

test('render errors and invalid UTF-8 do not poison the instance', async () => {
  const h = await host();
  for (const source of ['', '   ', 'this is not a diagram', 'flowchart LR\n A[unterminated']) {
    const error = h.render(source);
    assert.equal(error.status, 1, source);
    assert.ok(error.text.length > 0);
  }
  assert.equal(h.renderBytes(Uint8Array.of(0xc3, 0x28)).status, 2);
  assert.equal(h.render(fixtures.flowchart).status, 0);
});

test('source byte limit is enforced before reading memory', async () => {
  const h = await host();
  assert.equal(h.wasm.alloc(MAX_SOURCE_BYTES + 1), 0);
  assert.equal(h.result(h.wasm.render(0, MAX_SOURCE_BYTES + 1)).status, 3);
  const atLimit = new Uint8Array(MAX_SOURCE_BYTES).fill(32);
  atLimit.set(encoder.encode(fixtures.flowchart));
  assert.equal(h.renderBytes(atLimit).status, 0);
});

test('empty allocation and null release are defined', async () => {
  const { wasm, result } = await host();
  assert.equal(wasm.alloc(0), 0);
  wasm.free(0, 0);
  wasm.result_free(0);
  assert.equal(result(wasm.render(0, 0)).status, 1);
});

test('host refreshes views after memory growth; result outlives input', async () => {
  const { wasm, result } = await host();
  const bytes = encoder.encode(fixtures.flowchart);
  const input = wasm.alloc(bytes.length);
  assert.notEqual(input, 0);
  new Uint8Array(wasm.memory.buffer, input, bytes.length).set(bytes);
  wasm.memory.grow(1);
  const output = wasm.render(input, bytes.length);
  wasm.free(input, bytes.length);
  assert.equal(result(output).status, 0);
});

test('many render/free cycles reuse the same instance', async () => {
  const h = await host();
  for (let i = 0; i < 100; i++) {
    const label = `Request${i}`;
    const output = h.render(`flowchart LR\n A[${label}] --> B[Done]`);
    assert.equal(output.status, 0, output.text);
    assert.ok(output.text.includes(label));
  }
});

test('frontmatter configuration does not leak into the next request', async () => {
  const h = await host();
  const before = h.render(fixtures.flowchart);
  assert.equal(h.render(fixtures.frontmatter).status, 0);
  assert.deepEqual(h.render(fixtures.flowchart), before);
});

test('multiple owned results coexist until explicitly released', async () => {
  const { wasm, result } = await host();
  const outputs = [];
  for (const label of ['FirstOwnedResult', 'SecondOwnedResult']) {
    const bytes = encoder.encode(`flowchart LR\n A[${label}] --> B`);
    const input = wasm.alloc(bytes.length);
    assert.notEqual(input, 0);
    new Uint8Array(wasm.memory.buffer, input, bytes.length).set(bytes);
    outputs.push(wasm.render(input, bytes.length));
    wasm.free(input, bytes.length);
  }
  const first = result(outputs[0]);
  const second = result(outputs[1]);
  assert.equal(first.status, 0);
  assert.equal(second.status, 0);
  assert.ok(first.text.includes('FirstOwnedResult'));
  assert.ok(second.text.includes('SecondOwnedResult'));
});
