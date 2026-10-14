# Mermaid WASM

This is a Rust project producing a standalone Mermaid-to-SVG WebAssembly module.

## Notes

* The project specs live in `specs/` and are kept current enough to rebuild
  the project from.  Start with
  [specs/architecture.md](specs/architecture.md) — it names the components and
  tells you which one you are in.

  | Spec | Holds |
  |---|---|
  | [architecture.md](specs/architecture.md) | Components, boundaries, project-wide constraints |
  | [product.md](specs/product.md) | Externally observable behavior |
  | [contracts.md](specs/contracts.md) | The interfaces between pieces |
  | [implementation.md](specs/implementation.md) | Pinned internal decisions |

* **A behavior change and its spec update are one commit.**  Before editing
  anything under `specs/`, read [specs/layout.md](specs/layout.md) — it defines
  where a fact belongs and how the specs stay current.
* Use small conventional commits. All tests must pass + `cargo fmt --check`
  before every commit.
* External Rust dependencies are allowed for the rendering engine. Pin the engine
  revision and commit Cargo.lock. The final WASM module must have zero imports;
  browser APIs, JavaScript bindings, WASI, and runtime asset fetching are prohibited.
