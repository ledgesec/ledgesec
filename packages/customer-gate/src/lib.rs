//! Gate for a site that stays on its own address.
//!
//! Lua on the customer server redirects a request that still needs a verdict.
//! This crate is the contour: it decides whether that request continues.

#![forbid(unsafe_code)]

mod gate;
mod hash;
mod serve;

pub use gate::{
    classify, contour_get, contour_post, customer_step, esc, handoff_token, header, is_loopback,
    pass_token, Class, Config, Incoming, Reply, Step, CSS, HANDOFF_TTL, PASS_TTL, PATH_MAX,
    QUERY_MAX,
};
pub use serve::serve;
