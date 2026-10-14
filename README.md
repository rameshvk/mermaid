# Mermaid WASM

A standalone Mermaid-to-SVG renderer. One `.wasm` file, zero imports, no DOM,
JavaScript rendering runtime, WASI, or runtime asset downloads. The host provides
loading and UTF-8 memory transfers to expose a single `render(string) → string` call.

The engine is [Merman](https://github.com/Latias94/merman), pinned to commit
`768370e0842dbd8df24d477fdbbf3449eb61de3d`. All diagram-family features, Cytoscape
layouts, and ELK layouts are enabled. Math typesetting is excluded because its
dependency uses browser font discovery. Full Mermaid and pixel-level compatibility
are not guaranteed.

## Build and test

Install rustup, Node.js 22+, and Make, then:

```sh
make build
make test
```

Rustup installs the toolchain and WASM target from `rust-toolchain.toml`. Dependencies
are pinned by Cargo.lock. The first build needs network access and takes several
minutes. No npm packages are required. `make fmt` formats Rust.

The runtime artifact is **`dist/mermaid.wasm`**. Build verifies zero imports and the
exact export surface. Integration tests run this same binary with Node's WASM
engine and an empty import object; test-only JavaScript is not shipped with it.

The evaluation build was approximately 11.7 MB (4.0 MB gzip); actual size varies
with the wrapper and toolchain. Gzip/Brotli can be applied by the serving host.

## Host interface

See [ABI v1](specs/contracts.md) for exact signatures, descriptor layout, ownership,
errors, and edge cases. The five exports are:

| Export | Purpose |
|---|---|
| `memory` | UTF-8 buffers and result descriptors |
| `alloc` | Allocate input bytes |
| `render` | Borrow input and return an owned result descriptor |
| `free` | Release input |
| `result_free` | Release a result and its payload |

The host encodes source, allocates and copies it, calls `render`, reads a descriptor
containing status/pointer/length, decodes the SVG or diagnostic, and releases both
allocations. Refresh memory views after WASM calls because memory may grow. A
nonzero result status can become an exception in the host's string-to-string API.
Inputs are limited to 2 MiB; additional engine resource budgets apply.

Conversion is synchronous. A host may use a Worker for responsiveness and hard
cancellation. After a trap, discard the instance. Returned SVG is not a guarantee
of safe DOM insertion: the host owns display and sanitization policy. Portable text
measurement is approximate; fonts and HTML labels can affect browser appearance.

## Project documentation

Start with [architecture](specs/architecture.md), then [behavior](specs/product.md),
[contracts](specs/contracts.md), and [pinned decisions](specs/implementation.md).
[Engine rationale](specs/rendering-engine.md) records evaluation and deferred work.

## Dependency notices

Build copies Merman's licenses and upstream third-party notices to
`dist/licenses/merman/` and emits package license metadata in
`dist/dependencies.json`. Merman's own code is MIT/Apache-2.0; the selected ELK
implementation includes EPL-2.0 components. Preserve the applicable notices when
redistributing. These documentation files are not runtime dependencies.
