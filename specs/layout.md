# Spec Layout

**Audience: agents.** These are the standing instructions for maintaining
`specs/`. Read this before editing anything under `specs/`. It describes how
the specs are organized and kept current; it says nothing about what this repo
does.

The property the layout exists to protect:

> The specs alone are enough to rebuild this repo — not byte-for-byte, but
> matching in every aspect that matters.

"Matters" is not a judgment call. It is defined by the fidelity tiers in §2,
and every rule below exists to keep that property true as the code changes.

---

## 1. The spine

Four files, fixed. Everything else is a detail doc linked from one of them.

| File | Owns | Read it to learn |
|---|---|---|
| `architecture.md` | Components, boundaries, project-wide invariants | What the pieces are, and which one owns a thing |
| `product.md` | Externally observable behavior | What a user or operator can see and do |
| `contracts.md` | The interfaces between pieces | What crosses each boundary |
| `implementation.md` | Pinned internal decisions | What may not be changed freely |
| `<subsystem>.md` | Reasoning for one subsystem | Why it is this way |

The spine is stable. Do not add a fifth spine file. A new subject is either a
section inside one of the four, or a detail doc linked from one of them.

---

## 2. Fidelity tiers — what "important" means

Each file carries a different obligation to a rebuild:

| File | A rebuild must match it |
|---|---|
| `product.md` | **Exactly.** Observable behavior is the product. |
| `contracts.md` | **Exactly.** Otherwise the two sides do not interoperate. |
| `architecture.md` | **In shape.** Component boundaries and names, not internals. |
| `implementation.md` | **Only where pinned.** Everything unpinned is explicitly free. |

That last row is also the admission test for `implementation.md`:

> If a rebuild made a different choice here, would something break or get
> measurably worse?

If no, do not write it down. Silence in `implementation.md` is a promise —
it tells an implementer they may choose freely — so filling it with
incidental facts makes the file worse, not more complete.

---

## 3. Where does this fact go?

Apply these tests in order. Each is mechanical; none requires taste.

**The interop test — `contracts.md` vs `implementation.md`.**
If two independently written implementations must agree on it in order to work
together, it is a contract. If one side could change it alone without breaking
the other, it is implementation.

> A request nonce is a 4-byte per-key random prefix followed by a big-endian
> counter — both sides must agree, so it is a *contract*. The server tracks
> replays with a 64-counter window below a high-water mark — the client never
> observes the window size, so it is *implementation*.

**The observation test — `product.md` vs everything else.**
If the statement can be verified by watching a running system through the CLI
or a browser, with no access to the source, it is product. If verifying it
requires reading code or inspecting the wire, it is not.

> "The login code is printed to the server console as four hyphen-separated
> groups" is *product*. "The code is 64 bits from `crypto/rand`" is
> *implementation*.

**The edge test — `architecture.md` vs `contracts.md`.**
Architecture names the boxes and the edges between them. Contracts define what
flows along an edge. Architecture never describes a payload, a header, a
schema, or an endpoint.

A fact that passes none of these tests is usually rationale. It belongs in a
detail doc.

---

## 4. The files

### 4.1 `architecture.md`

- Opens with a diagram, then a paragraph describing the product as a whole.
- 3–10 components. Fewer than 3 means the split is not earning its keep; more
  than 10 means the diagram has stopped being readable and some components
  should be nested or merged.
- Each component gets: a stable name, a one-paragraph responsibility, the
  files, packages, or listeners it owns, and the components it talks to.
- **Every tracked source file belongs to exactly one component.** A component
  that maps to nothing pointable is aspiration — delete it. Source that
  belongs to no component means the list is stale.
- A **Constraints** section holds the project-wide invariants that bind every
  component — the standing decisions that are not any one component's to
  revisit. An invariant here outranks local convenience; changing one is a
  deliberate act with its own commit, never a side effect of another change.
- No payloads, no endpoints, no code.

### 4.2 `product.md`

- Opens by **declaring its axis**. The natural split differs per project —
  operator surface, browser surface, and so on. State the axis explicitly
  rather than assuming a default; one axis, chosen once, applied throughout.
- Each outcome gets a stable name and states what an observer sees, including
  error and edge behavior. An outcome with no failure story is half-specified.
- Every sentence must pass the observation test.
- Describe visual surfaces as structure and behavior — layout, what is fixed
  versus what scrolls, what each control does, what changes when it is used —
  never as markup.
- No internal details. If you find yourself naming a function, a header, or a
  data structure, you are in the wrong file.
- When one surface outgrows its section, move it to a detail doc and leave the
  summary plus the link.

### 4.3 `contracts.md`

- One section per boundary. Include the boundaries that are easy to forget:
  the HTTP API, the streaming channel, browser storage, the CLI's contract
  with whoever invokes it, and the command surface of any external binary the
  project drives — which subcommands and flags are depended on, and what each
  is relied on to guarantee.
- For each boundary: who is on each side, what crosses it, the shape of what
  crosses, the ordering and lifetime rules, and the failure behavior.
- Design, not implementation. Field names and their semantics, yes; the code
  that produces them, no.
- **Never paste source.** A spec that pins an argument list or a function body
  rots silently against the code, and a silent rot is worse than an omission.
- A protocol large enough to need reasoning gets a detail doc; `contracts.md`
  keeps the summary and the link.

### 4.4 `implementation.md`

- Only pinned decisions, each surviving the admission test in §2.
- The usual inhabitants: cryptographic choices and constructions; sizes,
  windows, budgets, TTLs, and poll intervals; limits and caps; heuristics with
  tuned thresholds.
- Each entry: a stable name, the value, and one line on **why this value** —
  what breaks or degrades if it moves. An entry that only restates the value
  is a duplicate of the code and will drift out of date unnoticed.
- Where a value appears both here and in code, the code is the source of truth
  for what it *is*; this file is the source of truth for whether it may
  *change*.

### 4.5 Detail docs

One per subsystem that needs reasoning, named after the subsystem. Required
shape:

- **Status**, as the first line: `Implemented.`, `Planned.`, or
  `Partially implemented — <what is missing>.`
- **Goal** — the property the subsystem exists to guarantee, stated sharply
  enough to be falsifiable.
- **The reasoning** — why this design, and which alternatives were rejected
  and why. This is the part that cannot be recovered from the code.
- **Test coverage** — what is verified, so a rebuild knows what to prove.
- **Deferred** — what was deliberately left out. Load-bearing: it is what
  stops a later pass from helpfully adding back something that was refused on
  purpose.

---

## 5. Stable names

- Every component, outcome, contract, and pinned decision has a stable name,
  declared once in the file that owns it.
- **References across files use the name, never a section number.** Section
  numbers renumber the moment someone inserts a section above them, and a
  reference in another file silently becomes a lie that nothing will catch.
  Names survive edits.
- Within a single document, section numbers are fine. Whoever renumbers a
  section is looking at every reference to it in the same edit, so the failure
  mode above does not apply, and rewriting them buys nothing.
- Citations of an external standard keep that standard's own numbering
  (`RFC 7230 §6.1`). It is not ours to rename.
- A name outlives its implementation. Renaming is its own commit that updates
  every reference in one go, and a retired name is never reused for a
  different thing.
- If you cannot name it, you do not yet understand it well enough to spec it.

---

## 6. Maintenance protocol

**Spec and code land in the same commit.** A behavior change and its spec
update are one commit, not a commit and a follow-up. A spec that lags by even
one commit teaches every later agent that the specs are approximate, and from
then on they are.

| Change | Update |
|---|---|
| Component added, removed, merged, or re-scoped | `architecture.md`, including the diagram |
| Something a user or operator can now see, or no longer sees | `product.md` |
| New endpoint, field, event, storage key, or external-command dependency | `contracts.md` |
| A constant that matters, or a crypto or heuristic choice | `implementation.md` |
| A decision you had to think hard about, or deliberately rejected | Detail doc |
| Pure refactor, no boundary moved | Nothing |

**When the specs and the code disagree, that is a bug report, not a merge
conflict.** Work out which one is wrong. If the code drifted, either fix the
code or record the drift as a deliberate change — never quietly rewrite the
spec to match code you have not confirmed was intended.

**Never delete a spec section because the feature is not implemented.** Mark
it `Planned.` Deleting it throws away the decision and guarantees it gets
re-litigated.

**Size budget: about 400 lines per file.** Past that, split the heaviest
section into a detail doc and leave a summary plus a link. The budget is not
tidiness — an agent will only confidently rewrite a section it can hold whole,
and a file it cannot hold whole is a file it will only ever append to.

---

## 7. Reading order

For a task, read in this order and stop once you have what you need:

1. `layout.md` — this file, if you are going to edit specs.
2. `architecture.md` — always. It tells you which component you are in.
3. The one spine file matching the change you are making.
4. The detail doc for your subsystem, if it has one.

---

## 8. Anti-patterns

Each of these has a specific failure mode; none is a style preference.

- **Source pasted into a spine file.** It rots against the code silently.
  Describe the contract, not the call.
- **Cross-references by section number.** They break on the next insertion.
- **Rationale in `contracts.md`.** Contracts state what *is*; "we chose X
  because Y" belongs in a detail doc.
- **`implementation.md` as a junk drawer.** Every entry must pass the
  admission test, or the file stops meaning anything.
- **Internals leaking into `product.md`.** It destroys the one guarantee that
  file offers — that everything in it is externally checkable.
- **A component that owns no files.** The component list has become a wish.
- **The spec update deferred to a follow-up commit.** See above.
- **A diagram that no longer matches the component list.** Whichever is right,
  they must agree before the commit lands.
