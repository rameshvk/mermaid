# Contracts

## Memory ABI

ABI v1 is the boundary between an independently implemented host and the renderer.
The artifact targets wasm32 with 32-bit offsets and lengths. All descriptor fields
are unsigned, little-endian integers. Input and output are UTF-8 byte sequences;
lengths count bytes, not characters, and no terminating NUL is required.

The module has zero imports and exactly these exports:

| Export | Kind | Inputs | Result |
|---|---|---|---|
| `memory` | Memory | — | Linear memory containing host input and module results |
| `alloc` | Function | Byte length, i32 | Input buffer offset, i32 |
| `free` | Function | Input buffer offset and original byte length, two i32 | None |
| `render` | Function | Input buffer offset and byte length, two i32 | Result descriptor offset, i32 |
| `result_free` | Function | Result descriptor offset, i32 | None |

JavaScript hosts interpret offsets as unsigned where necessary. Calls are
synchronous and serialized per instance. Separate instances may run concurrently.
There is no required initialization call, start service, or generated binding shim.

### Input ownership

`alloc` returns a zero-initialized allocation of the requested length. Length zero
returns zero. Lengths above 2,097,152 or a recoverable allocation failure also return
zero; for nonempty input this means failure and the host must not call `render` with
that allocation. The host writes its input bytes before rendering.

`render` borrows input only for the call. The host retains ownership and releases it
with `free`, using the exact pointer and length returned/requested at allocation.
For nonempty input within the limit, the pointer must designate initialized bytes
in a live input allocation. Zero-length input may use offset zero. Oversized input
is rejected before any memory read, so its pointer may also be zero.

`free(0, 0)` is a no-op. Other invalid pointers, mismatched allocation lengths,
double frees, concurrent mutation, and using result memory as input-allocation
ownership violate the ABI; their behavior is undefined and may corrupt the instance.

### Result ownership

On normal return, `render` returns a nonzero offset to a 12-byte descriptor:

| Byte offset | Field | Meaning |
|---|---|---|
| 0 | `status` | Result code |
| 4 | `data_pointer` | Offset of the UTF-8 payload |
| 8 | `data_length` | Payload byte length |

| Status | Payload |
|---|---|
| 0 | SVG text |
| 1 | Rendering/parse/resource diagnostic, including no diagram detected |
| 2 | Invalid UTF-8 diagnostic |
| 3 | Source-byte-limit diagnostic |

Codes are stable within ABI v1. Diagnostic wording is not a machine interface.
The host copies/decodes the payload before calling `result_free` exactly once.
That call frees both the descriptor and payload. The host must not modify either,
nor release them through `free`. `result_free(0)` is a no-op. Results may coexist
and outlive input buffers, but do not survive destruction of their instance.

Any allocation or rendering call may grow memory. Hosts must obtain fresh memory
views after calls rather than retain a possibly detached view. A trap, including
allocation exhaustion during rendering, has no result descriptor contract; discard
the instance. There is no in-module wall-clock deadline.

### Host sequence

Instantiate with an empty import object; encode source; allocate and write input;
render; refresh memory views; read the descriptor; copy/decode the payload; release
the result and input. The result and input may be released in either order after
rendering completes. The host can expose this as one string-to-string call that
throws on nonzero status. Display and sanitization policy belong to the host.

## Build interface

The operator invokes `make build` to produce `dist/mermaid.wasm`, or `make test` to
format-check Rust, build, and run all integration tests. `make fmt` formats Rust.
The tools are Rust/rustup, Node.js 22 or newer, and Make. Node built-in modules are
the only JavaScript build/test dependencies; no npm installation is required.

Build uses the pinned toolchain and locked dependencies for `wasm32-unknown-unknown`
in release mode. An import or export mismatch fails the build. Successful builds
also emit `dist/ABI.md`, upstream notices under `dist/licenses/merman/`, and a
dependency/license metadata inventory in `dist/dependencies.json`. Only the WASM
file is needed at runtime. A failed build must not be treated as publishing a new
artifact; an earlier file may remain in `dist`.
