Implemented.

# Rendering engine

## Goal

Provide broad Mermaid-to-SVG conversion in a module that instantiates with an empty
import object and accepts only a documented UTF-8 memory interface.

## The reasoning

Merman offers a native Rust parser, layout engines, and SVG writer with explicit
deterministic operation. Evaluation of the pinned revision with math disabled
produced a zero-import module and rendered 17 inputs across 15 diagram families.
The probe measured 11.67 MB raw and 4.02 MB gzip; these are observations, not size
guarantees for future wrapper builds.

Official Mermaid.js remains the compatibility reference but relies on browser
rendering services, so it does not meet this boundary. The smaller
mermaid-rs-renderer compiled to zero imports but trapped on its first flowchart;
unconditional system clock calls in layout are a likely portability issue.
Implementing a new Go renderer would make this project responsible for language
and layout compatibility. Merman best fits the priority of broad coverage.

The existing browser package is not used. The wrapper exposes its own ABI over the
Rust facade. Default Merman features were rejected because the math dependency
introduces JavaScript bindings for font discovery. Upstream makes the same exclusion
for its Typst WASM artifact.

Deterministic text measurement uses approximations; it does not supply the browser's
font metrics. SVG may contain HTML labels and font references without consulting a
DOM during conversion. Consumers decide how to display and admit that output.

## Test coverage

Tests instantiate the actual release WASM, check the exact import/export surface,
exercise representative families, Unicode and frontmatter, compare repeat output
within and across instances, and check invalid input, UTF-8, source limits, memory
growth, independent result lifetime, and repeated allocation/render/release cycles.
They are integration smoke tests, not a full Mermaid conformance or visual suite.

## Deferred

- Math typesetting until its dependency closure meets the zero-import boundary.
- Pixel-identical Mermaid output and a full upstream compatibility corpus.
- Embedded ordinary text fonts, outlined text, and font-selection options.
- A shipped browser wrapper, UI, automatic SVG insertion, or sanitization policy.
- Streaming, configurable rendering options, and in-module wall-clock deadlines.
- Additional WASM optimization and a hard download-size budget.
