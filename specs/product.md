# Product

Axis: conversion outcomes observed by a host application.

## Hosted distribution

When GitHub Pages is configured, a successful default-branch build publishes a
directly downloadable WASM binary, ABI documentation, and dependency notices.
The download URL follows the latest successful deployment and is not an immutable
release. Pull requests and other branches cannot replace the published binary.
Build or test failures prevent publication. Missing hosting configuration or
permissions produce a failed deployment rather than a successful publication.

## Diagram conversion

Supported Mermaid source produces SVG text, including labels, shapes, styles, and
layout. Unicode and supported frontmatter are accepted. Unsupported or malformed
input produces a diagnostic; empty or whitespace-only input produces a diagnostic
instead of an empty SVG. Input must be valid UTF-8 and at most 2,097,152 bytes.

Coverage follows the pinned engine and its enabled capabilities. Full compatibility
with official Mermaid and pixel-identical browser output are not promised. Math
typesetting is unavailable. Browser font substitution and HTML label display can
change the appearance of the returned SVG.

## Independent conversion

Conversion requires no document, external assets, clock, filesystem, network, or
JavaScript rendering service. Repeating the same accepted input in the same build
produces identical SVG text, including across fresh instances. A successful result
remains available until the host releases it, independently of the input buffer.

## Failure and recovery

Invalid UTF-8, oversized source, and rendering failures produce distinguishable
error results. Ordinary errors leave the instance usable for later conversions.
Engine resource budgets can reject otherwise valid diagrams with a diagnostic.

Exhausted memory, engine panics, and incorrect memory ownership can trap rather
than return an ordinary error. After a trap the host discards the instance.
There is no wall-clock timeout within a conversion; a host needing hard cancellation
can terminate the Worker running the module.
