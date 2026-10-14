.PHONY: build test fmt

build:
	node scripts/build.mjs

test:
	cargo fmt --check
	node scripts/build.mjs
	node --test tests/wasm.test.mjs

fmt:
	cargo fmt
