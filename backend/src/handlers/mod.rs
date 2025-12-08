use axum::{extract::State, Json};
use sqlx::PgPool;
use crate::{
    error::AppResult,
    models::{CreateEventRequest, CreateEventResponse, Event},
};
use uuid::Uuid;
use chrono::Utc; // For current timestamp

pub mod health;

// Helper to generate unique string tokens for public and organizer access.
// Using UUID v4 for now for simplicity, can be replaced with shorter unique IDs later if needed.
fn generate_token() -> String {
    Uuid::new_v4().to_string()
}

pub async fn create_event(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateEventRequest>,
) -> AppResult<Json<CreateEventResponse>> {
    let mut transaction = pool.begin().await?;

    let event_id = Uuid::new_v4();
    let public_token = generate_token();
    let organizer_token = generate_token();
    let current_time = Utc::now();

    // Insert the new event
    sqlx::query_as!(
        Event,
        r#"
        INSERT INTO events (
            id, public_token, organizer_token, title, description, state, time_zone, created_at, updated_at
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        RETURNING id, public_token, organizer_token, title, description, state, time_zone, created_at, updated_at
        "#,
        event_id,
        public_token,
        organizer_token,
        payload.title,
        payload.description,
        // For MVP, directly set state to 'open' as discussed
        "open",
        payload.time_zone,
        current_time,
        current_time
    )
    .fetch_one(&mut *transaction)
    .await?; // Use &mut *transaction for the mutable reference

    // Insert time slots
    for time_slot in payload.time_slots {
        sqlx::query!(
            r#"
            INSERT INTO time_slots (event_id, start_at, end_at)
            VALUES ($1, $2, $3)
            "#,
            event_id,
            time_slot.start_at,
            time_slot.end_at
        )
        .execute(&mut *transaction)
        .await?;
    }

    transaction.commit().await?;

    Ok(Json(CreateEventResponse {
        id: event_id,
        public_token,
        organizer_token,
    }))
}
