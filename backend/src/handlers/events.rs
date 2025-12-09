use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc; // For current timestamp
use sqlx::PgPool; // Transaction is not used directly here, PgPool's begin() returns it
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult}, // Import AppError
    models::{
        CreateEventRequest, CreateEventResponse, Event, EventResponse, SubmitAvailabilityRequest, TimeSlot,
    }, // TimeSlotRequest removed as it's not directly used here
};

// Helper to generate unique string tokens for public and organizer access.
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
    .await?;

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

pub async fn get_event(
    State(pool): State<PgPool>,
    Path(public_token): Path<String>,
) -> AppResult<Json<EventResponse>> {
    // Fetch the event
    let event = sqlx::query_as!(
        Event,
        r#"
        SELECT id, public_token, organizer_token, title, description, state, time_zone, created_at, updated_at
        FROM events
        WHERE public_token = $1
        "#,
        public_token
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound)?; // Corrected: No arguments for AppError::NotFound

    // Fetch time slots for the event
    let time_slots = sqlx::query_as!(
        TimeSlot,
        r#"
        SELECT id, event_id, start_at, end_at
        FROM time_slots
        WHERE event_id = $1
        ORDER BY start_at
        "#,
        event.id
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(EventResponse {
        id: event.id,
        title: event.title,
        description: event.description,
        time_zone: event.time_zone,
        state: event.state,
        time_slots,
    }))
}

pub async fn submit_availability(
    State(pool): State<PgPool>,
    Path(public_token): Path<String>,
    Json(payload): Json<SubmitAvailabilityRequest>,
) -> AppResult<()> {
    let mut transaction = pool.begin().await?;

    // Find the event by public_token
    let event_id = sqlx::query_scalar!(
        "SELECT id FROM events WHERE public_token = $1",
        public_token
    )
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or_else(|| AppError::NotFound)?;

    // Delete existing availability for this participant and event
    sqlx::query!(
        "DELETE FROM availability WHERE event_id = $1 AND participant_name = $2",
        event_id,
        payload.participant_name
    )
    .execute(&mut *transaction)
    .await?;

    // Insert new availability entries
    for time_slot_id in payload.time_slot_ids {
        sqlx::query!(
            "INSERT INTO availability (event_id, time_slot_id, participant_name) VALUES ($1, $2, $3)",
            event_id,
            time_slot_id,
            payload.participant_name
        )
        .execute(&mut *transaction)
        .await?;
    }

    transaction.commit().await?;

    Ok(())
}
