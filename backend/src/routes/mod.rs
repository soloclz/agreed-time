use axum::{
    routing::{get, post},
    Router,
};
use sqlx::PgPool;

use crate::handlers;

pub fn create_router(pool: PgPool) -> Router {
    Router::new()
        .route("/health", get(handlers::health::health_check))
        .route("/events", post(handlers::events::create_event))
        .route("/events/{public_token}", get(handlers::events::get_event))
        .route(
            "/events/{public_token}/availability",
            post(handlers::events::submit_availability),
        )
        .route(
            "/events/{public_token}/results",
            get(handlers::events::get_event_results),
        )
        .route(
            "/events/{organizer_token}/close",
            post(handlers::events::close_event),
        )
        .route(
            "/events/organizer/{organizer_token}",
            get(handlers::events::get_organizer_event),
        )
        .with_state(pool)
}
