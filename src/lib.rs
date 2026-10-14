//! ABI v1: UTF-8 buffers in exported memory. See specs/contracts.md.

use merman::{OperationControl, RenderOutput, RenderRequest, Renderer, SvgRequest};

// Matches the pinned engine's interactive source-byte budget.
const MAX_SOURCE_BYTES: usize = 2 * 1024 * 1024;

/// On wasm32 this is exactly three little-endian u32 fields (12 bytes).
#[repr(C)]
pub struct RenderResult {
    status: u32,
    data: *mut u8,
    len: usize,
}

#[cfg(target_arch = "wasm32")]
const _: () = assert!(std::mem::size_of::<RenderResult>() == 12);

impl RenderResult {
    fn new(status: u32, text: String) -> *mut Self {
        let data = text.into_bytes().into_boxed_slice();
        let len = data.len();
        let data = Box::into_raw(data).cast::<u8>();
        Box::into_raw(Box::new(Self { status, data, len }))
    }
}

/// Allocate a zero-filled input buffer. Zero means empty input, too large, or allocation failure.
#[unsafe(no_mangle)]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    if len == 0 || len > MAX_SOURCE_BYTES {
        return std::ptr::null_mut();
    }
    let mut bytes = Vec::<u8>::new();
    if bytes.try_reserve_exact(len).is_err() {
        return std::ptr::null_mut();
    }
    bytes.resize(len, 0);
    Box::into_raw(bytes.into_boxed_slice()).cast::<u8>()
}

/// Release an input allocation; `(0, 0)` is a no-op.
///
/// # Safety
/// A nonzero pointer must be a live allocation returned by `alloc`, with its exact
/// original length. It must not be freed twice or alias a result allocation.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn free(ptr: *mut u8, len: usize) {
    if ptr.is_null() && len == 0 {
        return;
    }
    // SAFETY: The caller supplies the exact allocation and length, transferring ownership.
    unsafe { drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len))) };
}

/// Release a result and its payload; a null pointer is a no-op.
///
/// # Safety
/// A nonzero pointer must be an unmodified, live descriptor returned by `render`.
/// The descriptor and its data must not already have been released.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn result_free(ptr: *mut RenderResult) {
    if ptr.is_null() {
        return;
    }
    // SAFETY: The caller transfers the descriptor and its payload back to us.
    let result = unsafe { Box::from_raw(ptr) };
    unsafe { free(result.data, result.len) };
}

/// Borrow UTF-8 input and return an owned result descriptor.
///
/// # Safety
/// For nonempty input within the source limit, `ptr` must point to `len` initialized
/// bytes in a live input allocation. The host must not mutate it during the call.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn render(ptr: *const u8, len: usize) -> *mut RenderResult {
    if len > MAX_SOURCE_BYTES {
        return RenderResult::new(3, "Source exceeds the 2097152-byte limit".into());
    }
    let bytes = if len == 0 {
        &[]
    } else {
        // SAFETY: The caller guarantees the input allocation's validity for this call.
        unsafe { std::slice::from_raw_parts(ptr, len) }
    };
    let source = match std::str::from_utf8(bytes) {
        Ok(source) => source,
        Err(_) => return RenderResult::new(2, "Input is not valid UTF-8".into()),
    };
    let request = RenderRequest::svg(source, OperationControl::new(), SvgRequest::default());
    match Renderer::new().render(request) {
        Ok(RenderOutput::Svg(Some(svg))) => RenderResult::new(0, svg.svg().to_owned()),
        Ok(_) => RenderResult::new(1, "No Mermaid diagram detected".into()),
        Err(error) => RenderResult::new(1, error.to_string()),
    }
}
