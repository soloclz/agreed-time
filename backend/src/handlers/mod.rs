use axum::{extract::State, Json};
use crate::{error::AppResult, models::CreateEventRequest};
use serde_json::{json, Value};
use sqlx::PgPool;

pub mod health;

pub async fn create_event(
    State(_pool): State<PgPool>,
    Json(payload): Json<CreateEventRequest>,
) -> AppResult<Json<Value>> {
    // TODO: Implement actual event creation
    Ok(Json(json!({
        "message": "Event creation endpoint",
        "title": payload.title
    })))
}
