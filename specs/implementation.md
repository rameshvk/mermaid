# Implementation

## Engine revision

Pin Merman to Git revision `768370e0842dbd8df24d477fdbbf3449eb61de3d`
(upstream package version 0.9.0), with Cargo.lock committed. This is the revision
verified during evaluation; updating it can change syntax, output, limits, or imports.
Disable defaults and enable only `all-diagrams`, `svg`, `layout-cytoscape`, and
`layout-elk`. In particular, `math` pulls in browser bindings through font discovery.

## Deterministic engine configuration

Use a fresh renderer and operation control per call with the pinned engine's
deterministic SVG defaults and interactive resource profile. Do not enable system
clock, timezone, random, timing, or font features. This preserves zero imports and
repeatability while keeping request configuration from leaking between conversions.

The interactive profile at this revision caps source at 2 MiB, semantic model items
at 32,000, retained model text at 2 MiB, model nesting at 256, output at 24 MiB,
SVG elements at 250,000, and accounted layout work at 14,100,000 units. These are
admission budgets, not hard runtime memory or execution-time bounds. The source
budget is also enforced by the ABI allocator before copying input.

## Build reproducibility

Pin Rust 1.99.0 and wasm32-unknown-unknown. Use size optimization, LTO, one codegen
unit, stripped symbols, and aborting panics in release builds. These match the
evaluated artifact recipe and prevent host unwind/runtime requirements. No
post-link optimizer or JavaScript binding generator is required.
