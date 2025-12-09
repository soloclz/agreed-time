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
        CreateEventRequest, CreateEventResponse, Event, EventResponse, EventResultsResponse,
        ParticipantInfo, SubmitAvailabilityRequest, TimeSlot, TimeSlotWithParticipants,
        OrganizerEventResponse, // <-- Add this import
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

    // Fetch time slots for the event along with availability counts
    let time_slots = sqlx::query_as!(
        TimeSlot,
        r#"
        SELECT
            ts.id,
            ts.event_id,
            ts.start_at,
            ts.end_at,
            COALESCE(COUNT(a.id), 0) AS "availability_count!"
        FROM time_slots ts
        LEFT JOIN availability a ON ts.id = a.time_slot_id
        WHERE ts.event_id = $1
        GROUP BY ts.id, ts.event_id, ts.start_at, ts.end_at
        ORDER BY ts.start_at
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
            "INSERT INTO availability (event_id, time_slot_id, participant_name, comment) VALUES ($1, $2, $3, $4)",
            event_id,
            time_slot_id,
            payload.participant_name,
            payload.comment
        )
        .execute(&mut *transaction)
        .await?;
    }

    transaction.commit().await?;

    Ok(())
}

pub async fn get_event_results(
    State(pool): State<PgPool>,
    Path(public_token): Path<String>,
) -> AppResult<Json<EventResultsResponse>> {
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
    .ok_or_else(|| AppError::NotFound)?;

    // Get total number of unique participants
    let total_participants = sqlx::query_scalar!(
        r#"
        SELECT COUNT(DISTINCT participant_name) as "count!"
        FROM availability
        WHERE event_id = $1
        "#,
        event.id
    )
    .fetch_one(&pool)
    .await?;

    // Fetch time slots with participant names
    let time_slots_raw = sqlx::query!(
        r#"
        SELECT
            ts.id,
            ts.event_id,
            ts.start_at,
            ts.end_at,
            COALESCE(array_agg(a.participant_name) FILTER (WHERE a.participant_name IS NOT NULL), ARRAY[]::text[]) as "participants!"
        FROM time_slots ts
        LEFT JOIN availability a ON ts.id = a.time_slot_id
        WHERE ts.event_id = $1
        GROUP BY ts.id, ts.event_id, ts.start_at, ts.end_at
        ORDER BY ts.start_at
        "#,
        event.id
    )
    .fetch_all(&pool)
    .await?;

    let time_slots = time_slots_raw
        .into_iter()
        .map(|row| TimeSlotWithParticipants {
            id: row.id,
            event_id: row.event_id,
            start_at: row.start_at,
            end_at: row.end_at,
            availability_count: row.participants.len() as i64,
            participants: row.participants,
        })
        .collect();

    // Fetch unique participants with their comments
    let participants_raw = sqlx::query!(
        r#"
        SELECT DISTINCT ON (participant_name) participant_name, comment
        FROM availability
        WHERE event_id = $1
        ORDER BY participant_name, created_at DESC
        "#,
        event.id
    )
    .fetch_all(&pool)
    .await?;

    let participants = participants_raw
        .into_iter()
        .map(|row| ParticipantInfo {
            name: row.participant_name,
            comment: row.comment,
        })
        .collect();

    Ok(Json(EventResultsResponse {
        id: event.id,
        title: event.title,
        description: event.description,
        time_zone: event.time_zone,
        state: event.state,
        time_slots,
        participants,
        total_participants,
    }))
}

pub async fn get_organizer_event(
    State(pool): State<PgPool>,
    Path(organizer_token): Path<String>,
) -> AppResult<Json<OrganizerEventResponse>> {
    // Fetch the event
    let event = sqlx::query_as!(
        Event,
        r#"
        SELECT id, public_token, organizer_token, title, description, state, time_zone, created_at, updated_at
        FROM events
        WHERE organizer_token = $1
        "#,
        organizer_token
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound)?;

    // Get total number of unique participants
    let total_participants = sqlx::query_scalar!(
        r#"
        SELECT COUNT(DISTINCT participant_name) as "count!"
        FROM availability
        WHERE event_id = $1
        "#,
        event.id
    )
    .fetch_one(&pool)
    .await?;

    // Fetch time slots with participant names
    let time_slots_raw = sqlx::query!(
        r#"
        SELECT
            ts.id,
            ts.event_id,
            ts.start_at,
            ts.end_at,
            COALESCE(array_agg(a.participant_name) FILTER (WHERE a.participant_name IS NOT NULL), ARRAY[]::text[]) as "participants!"
        FROM time_slots ts
        LEFT JOIN availability a ON ts.id = a.time_slot_id
        WHERE ts.event_id = $1
        GROUP BY ts.id, ts.event_id, ts.start_at, ts.end_at
        ORDER BY ts.start_at
        "#,
        event.id
    )
    .fetch_all(&pool)
    .await?;

    let time_slots = time_slots_raw
        .into_iter()
        .map(|row| TimeSlotWithParticipants {
            id: row.id,
            event_id: row.event_id,
            start_at: row.start_at,
            end_at: row.end_at,
            availability_count: row.participants.len() as i64,
            participants: row.participants,
        })
        .collect();

    // Fetch unique participants with their comments
    let participants_raw = sqlx::query!(
        r#"
        SELECT DISTINCT ON (participant_name) participant_name, comment
        FROM availability
        WHERE event_id = $1
        ORDER BY participant_name, created_at DESC
        "#,
        event.id
    )
    .fetch_all(&pool)
    .await?;

    let participants = participants_raw
        .into_iter()
        .map(|row| ParticipantInfo {
            name: row.participant_name,
            comment: row.comment,
        })
        .collect();

    Ok(Json(OrganizerEventResponse {
        id: event.id,
        public_token: event.public_token,
        organizer_token: event.organizer_token,
        title: event.title,
        description: event.description,
        time_zone: event.time_zone,
        state: event.state,
        time_slots,
        participants,
        total_participants,
    }))
}

pub async fn close_event(
    State(pool): State<PgPool>,
    Path(organizer_token): Path<String>,
) -> AppResult<Json<EventResponse>> {
    let event = sqlx::query_as!(
        Event,
        r#"
        UPDATE events
        SET state = 'closed', updated_at = NOW()
        WHERE organizer_token = $1
        RETURNING id, public_token, organizer_token, title, description, state, time_zone, created_at, updated_at
        "#,
        organizer_token
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound)?;

    // Fetch the slots to be consistent with EventResponse.
    let time_slots = sqlx::query_as!(
        TimeSlot,
        r#"
        SELECT
            ts.id,
            ts.event_id,
            ts.start_at,
            ts.end_at,
            COALESCE(COUNT(a.id), 0) AS "availability_count!"
        FROM time_slots ts
        LEFT JOIN availability a ON ts.id = a.time_slot_id
        WHERE ts.event_id = $1
        GROUP BY ts.id, ts.event_id, ts.start_at, ts.end_at
        ORDER BY ts.start_at
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

