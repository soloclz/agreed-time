use axum::{
    routing::{get, post},
    Router,
};
use sqlx::PgPool;

use crate::handlers;

pub fn create_router(pool: PgPool) -> Router {
    Router::new()
        .route("/health", get(handlers::health::health_check))
        .route("/api/events", post(handlers::events::create_event))
        .route("/api/events/{public_token}", get(handlers::events::get_event))
        .route(
            "/api/events/{public_token}/availability",
            post(handlers::events::submit_availability),
        )
        .route(
            "/api/events/{public_token}/results",
            get(handlers::events::get_event_results),
        )
        .with_state(pool)
}
