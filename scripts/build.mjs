import { execFileSync } from 'node:child_process';
import { cpSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = 'wasm32-unknown-unknown';
const cargo = (args, options = {}) => execFileSync('cargo', args, { cwd: root, ...options });
cargo(['build', '--locked', '--release', '--target', target], { stdio: 'inherit' });
const metadata = JSON.parse(cargo([
  'metadata', '--locked', '--format-version', '1', '--filter-platform', target,
], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
const artifact = join(metadata.target_directory, target, 'release', 'mermaid_wasm.wasm');
const bytes = readFileSync(artifact);
const module = await WebAssembly.compile(bytes);
assert.deepEqual(WebAssembly.Module.imports(module), [], 'WASM must not import host functions or memory');
assert.deepEqual(WebAssembly.Module.exports(module).map(({ name, kind }) => `${name}:${kind}`).sort(), [
  'alloc:function', 'free:function', 'memory:memory', 'render:function', 'result_free:function',
], 'Unexpected ABI exports');
// Instantiation also checks that no hidden host initialization is necessary.
await WebAssembly.instantiate(module, {});

const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });
copyFileSync(artifact, join(dist, 'mermaid.wasm'));
copyFileSync(join(root, 'specs/contracts.md'), join(dist, 'ABI.md'));
const engine = metadata.packages.find((pkg) => pkg.name === 'merman');
assert.ok(engine, 'Pinned rendering dependency missing from metadata');
const upstream = resolve(dirname(engine.manifest_path), '../..');
const notices = join(dist, 'licenses', 'merman');
mkdirSync(notices, { recursive: true });
for (const filename of ['LICENSE-MIT', 'LICENSE-APACHE', 'THIRD_PARTY_NOTICES.md']) {
  copyFileSync(join(upstream, filename), join(notices, filename));
}
cpSync(join(upstream, 'THIRD_PARTY_LICENSES'), join(notices, 'THIRD_PARTY_LICENSES'), { recursive: true });
writeFileSync(join(dist, 'dependencies.json'), JSON.stringify(metadata.packages.map((pkg) => ({
  name: pkg.name, version: pkg.version, source: pkg.source, license: pkg.license,
})), null, 2) + '\n');
console.log(`Built dist/mermaid.wasm (${bytes.length} bytes), zero imports, ABI v1.`);
