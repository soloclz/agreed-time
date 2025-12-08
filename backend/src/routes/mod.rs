use axum::{
    routing::{get, post},
    Router,
};
use sqlx::PgPool;

use crate::handlers;

pub fn create_router(pool: PgPool) -> Router {
    Router::new()
        .route("/health", get(handlers::health::health_check))
        .route("/api/events", post(handlers::create_event))
        .with_state(pool)
}
