use axum::{
    Json,
    extract::{Path, State},
};
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    models::{
        BatchCheckStatusRequest, BatchCheckStatusResponse, CreateEventRequest, CreateEventResponse,
        Event, EventResponse, EventResultsResponse, EventSlot, OrganizerEventResponse,
        ParticipantAvailability, ParticipantResponse, SubmitAvailabilityRequest,
        SubmitAvailabilityResponse, TimeRangeRequest, UpdateParticipantRequest,
    },
};

fn generate_token() -> String {
    Uuid::new_v4().to_string()
}

fn merge_time_ranges(mut ranges: Vec<TimeRangeRequest>) -> Vec<TimeRangeRequest> {
    if ranges.is_empty() {
        return vec![];
    }

    ranges.sort_by(|a, b| a.start_at.cmp(&b.start_at));

    let mut merged = Vec::new();
    let mut current = ranges[0].clone();

    for next in ranges.into_iter().skip(1) {
        if next.start_at <= current.end_at {
            if next.end_at > current.end_at {
                current.end_at = next.end_at;
            }
        } else {
            merged.push(current);
            current = next;
        }
    }
    merged.push(current);
    merged
}

pub async fn create_event(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateEventRequest>,
) -> AppResult<Json<CreateEventResponse>> {
    // Validate input
    if payload.title.trim().is_empty() || payload.title.len() > 100 {
        return Err(AppError::BadRequest(
            "Title is required and must be less than 100 characters".to_string(),
        ));
    }

    if let Some(ref desc) = payload.description
        && desc.len() > 1000
    {
        return Err(AppError::BadRequest(
            "Description must be less than 1000 characters".to_string(),
        ));
    }

    if payload.organizer_name.trim().is_empty() || payload.organizer_name.len() > 50 {
        return Err(AppError::BadRequest(
            "Organizer name is required and must be less than 50 characters".to_string(),
        ));
    }

    if payload.time_slots.is_empty() {
        return Err(AppError::BadRequest(
            "At least one time slot is required".to_string(),
        ));
    }

    for slot in &payload.time_slots {
        if slot.start_at >= slot.end_at {
            return Err(AppError::BadRequest(
                "Invalid time range: start must be before end".to_string(),
            ));
        }
    }

    let slot_duration = payload.slot_duration.unwrap_or(60);
    if slot_duration <= 0 {
        return Err(AppError::BadRequest(
            "Slot duration must be positive".to_string(),
        ));
    }

    let mut transaction = pool.begin().await?;

    let event_id = Uuid::new_v4();
    let public_token = generate_token();
    let organizer_token = generate_token();
    let current_time = Utc::now();

    let organizer_name = payload.organizer_name.clone();

    // 1. Insert Event (without organizer_name)
    sqlx::query_as!(
        Event,
        r#"
        INSERT INTO events (
            id, public_token, organizer_token, title, description, state, time_zone, slot_duration, created_at, updated_at
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        RETURNING id, public_token, organizer_token, title, description, state, time_zone, slot_duration, created_at, updated_at
        "#,
        event_id,
        public_token,
        organizer_token,
        payload.title,
        payload.description,
        "open",
        payload.time_zone,
        slot_duration,
        current_time,
        current_time
    )
    .fetch_one(&mut *transaction)
    .await?;

    // 2. Event Slots
    let merged_slots = merge_time_ranges(payload.time_slots);

    for slot in &merged_slots {
        sqlx::query!(
            r#"
            INSERT INTO event_slots (event_id, start_at, end_at)
            VALUES ($1, $2, $3)
            "#,
            event_id,
            slot.start_at,
            slot.end_at
        )
        .execute(&mut *transaction)
        .await?;
    }

    // 3. Create Organizer Participant (is_organizer = true)
    let participant_id = sqlx::query_scalar!(
        r#"
        INSERT INTO participants (event_id, name, is_organizer)
        VALUES ($1, $2, $3)
        RETURNING id
        "#,
        event_id,
        organizer_name,
        true // is_organizer
    )
    .fetch_one(&mut *transaction)
    .await?;

    // 4. Organizer Availability
    for slot in &merged_slots {
        sqlx::query!(
            r#"
            INSERT INTO availabilities (participant_id, start_at, end_at)
            VALUES ($1, $2, $3)
            "#,
            participant_id,
            slot.start_at,
            slot.end_at
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
    // 1. Fetch Event
    let event = sqlx::query_as!(
        Event,
        r#"
        SELECT id, public_token, organizer_token, title, description, state, time_zone, slot_duration, created_at, updated_at
        FROM events
        WHERE public_token = $1
        "#,
        public_token
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound)?;

    // 2. Fetch Organizer Name
    let organizer_name = sqlx::query_scalar!(
        r#"
        SELECT name
        FROM participants
        WHERE event_id = $1 AND is_organizer = true
        LIMIT 1
        "#,
        event.id
    )
    .fetch_one(&pool)
    .await?;

    // 3. Fetch Event Slots
    let event_slots = sqlx::query_as!(
        EventSlot,
        r#"
        SELECT id, event_id, start_at, end_at
        FROM event_slots
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
        slot_duration: event.slot_duration,
        state: event.state,
        event_slots,
        organizer_name,
    }))
}

pub async fn submit_availability(
    State(pool): State<PgPool>,
    Path(public_token): Path<String>,
    Json(payload): Json<SubmitAvailabilityRequest>,
) -> AppResult<Json<SubmitAvailabilityResponse>> {
    // Validate participant name
    if payload.participant_name.trim().is_empty() || payload.participant_name.len() > 50 {
        return Err(AppError::BadRequest(
            "Participant name is required and must be less than 50 characters".to_string(),
        ));
    }

    if let Some(ref comment) = payload.comment
        && comment.len() > 500
    {
        return Err(AppError::BadRequest(
            "Comment must be less than 500 characters".to_string(),
        ));
    }

    // Validate time ranges
    for range in &payload.availabilities {
        if range.start_at >= range.end_at {
            return Err(AppError::BadRequest(
                "Invalid time range: start must be before end".to_string(),
            ));
        }
    }

    let mut transaction = pool.begin().await?;

    let event_id = sqlx::query_scalar!(
        "SELECT id FROM events WHERE public_token = $1",
        public_token
    )
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or_else(|| AppError::NotFound)?;

    // Check participant limit
    let count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM participants WHERE event_id = $1",
        event_id
    )
    .fetch_one(&mut *transaction)
    .await?
    .unwrap_or(0);

    if count >= 10 {
        return Err(AppError::ParticipantLimitReached(10));
    }

    // Insert new participant (Always insert, allowing duplicates)
    // We need to return both id (for internal FK) and token (for external client)
    let participant = sqlx::query!(
        "INSERT INTO participants (event_id, name, is_organizer, comment) VALUES ($1, $2, $3, $4) RETURNING id, token",
        event_id,
        payload.participant_name,
        false, // Default is not organizer
        payload.comment
    )
    .fetch_one(&mut *transaction)
    .await?;

    let id = participant.id;
    let participant_token = participant.token;

    sqlx::query!("DELETE FROM availabilities WHERE participant_id = $1", id)
        .execute(&mut *transaction)
        .await?;

    let merged_availabilities = merge_time_ranges(payload.availabilities);

    for range in merged_availabilities {
        sqlx::query!(
            "INSERT INTO availabilities (participant_id, start_at, end_at) VALUES ($1, $2, $3)",
            id,
            range.start_at,
            range.end_at
        )
        .execute(&mut *transaction)
        .await?;
    }

    transaction.commit().await?;

    Ok(Json(SubmitAvailabilityResponse { participant_token }))
}

async fn fetch_event_results_data(
    pool: &PgPool,
    event_id: Uuid,
) -> AppResult<(Vec<EventSlot>, Vec<ParticipantAvailability>, i64)> {
    let event_slots = sqlx::query_as!(
        EventSlot,
        r#"
        SELECT id, event_id, start_at, end_at
        FROM event_slots
        WHERE event_id = $1
        ORDER BY start_at
        "#,
        event_id
    )
    .fetch_all(pool)
    .await?;

    struct Row {
        name: String,
        is_organizer: bool,
        comment: Option<String>, // Add comment field
        start_at: Option<DateTime<Utc>>,
        end_at: Option<DateTime<Utc>>,
    }

    let rows = sqlx::query_as!(
        Row,
        r#"
        SELECT p.name, p.is_organizer, p.comment, a.start_at, a.end_at
        FROM participants p
        LEFT JOIN availabilities a ON p.id = a.participant_id
        WHERE p.event_id = $1
        ORDER BY p.is_organizer DESC, p.created_at ASC, a.start_at
        "#,
        event_id
    )
    .fetch_all(pool)
    .await?;

    // We need to keep track of is_organizer and comment per participant
    struct ParticipantData {
        is_organizer: bool,
        comment: Option<String>, // Add comment field
        ranges: Vec<TimeRangeRequest>,
    }

    let mut participants_map: std::collections::HashMap<String, ParticipantData> =
        std::collections::HashMap::new();

    // Order needs to be preserved as fetched (Organizer first)
    // HashMap doesn't preserve order. We should use a Vec and look up by index?
    // Or just collect unique names in order first.
    let mut participant_names: Vec<String> = Vec::new();

    for row in rows {
        if !participants_map.contains_key(&row.name) {
            participants_map.insert(
                row.name.clone(),
                ParticipantData {
                    is_organizer: row.is_organizer,
                    comment: row.comment.clone(), // Set comment
                    ranges: Vec::new(),
                },
            );
            participant_names.push(row.name.clone());
        }

        if let (Some(start), Some(end)) = (row.start_at, row.end_at)
            && let Some(data) = participants_map.get_mut(&row.name)
        {
            data.ranges.push(TimeRangeRequest {
                start_at: start,
                end_at: end,
            });
        }
    }

    let total_participants = participants_map.len() as i64;

    let participants: Vec<ParticipantAvailability> = participant_names
        .into_iter()
        .map(|name| {
            let data = participants_map.remove(&name).unwrap();
            ParticipantAvailability {
                name,
                is_organizer: data.is_organizer,
                comment: data.comment, // Pass comment
                availabilities: data.ranges,
            }
        })
        .collect();

    Ok((event_slots, participants, total_participants))
}

pub async fn get_event_results(
    State(pool): State<PgPool>,
    Path(public_token): Path<String>,
) -> AppResult<Json<EventResultsResponse>> {
    let event = sqlx::query_as!(
        Event,
        r#"
        SELECT id, public_token, organizer_token, title, description, state, time_zone, slot_duration, created_at, updated_at
        FROM events
        WHERE public_token = $1
        "#,
        public_token
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound)?;

    let (event_slots, participants, total_participants) =
        fetch_event_results_data(&pool, event.id).await?;

    Ok(Json(EventResultsResponse {
        id: event.id,
        title: event.title,
        description: event.description,
        time_zone: event.time_zone,
        slot_duration: event.slot_duration,
        state: event.state,
        event_slots,
        participants,
        total_participants,
    }))
}

pub async fn get_organizer_event(
    State(pool): State<PgPool>,
    Path(organizer_token): Path<String>,
) -> AppResult<Json<OrganizerEventResponse>> {
    let event = sqlx::query_as!(
        Event,
        r#"
        SELECT id, public_token, organizer_token, title, description, state, time_zone, slot_duration, created_at, updated_at
        FROM events
        WHERE organizer_token = $1
        "#,
        organizer_token
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound)?;

    let (event_slots, participants, total_participants) =
        fetch_event_results_data(&pool, event.id).await?;

    Ok(Json(OrganizerEventResponse {
        id: event.id,
        public_token: event.public_token,
        organizer_token: event.organizer_token,
        title: event.title,
        description: event.description,
        time_zone: event.time_zone,
        slot_duration: event.slot_duration,
        state: event.state,
        event_slots,
        participants,
        total_participants,
        created_at: event.created_at,
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
        RETURNING id, public_token, organizer_token, title, description, state, time_zone, slot_duration, created_at, updated_at
        "#,
        organizer_token
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound)?;

    // Need to fetch organizer name separately now
    let organizer_name = sqlx::query_scalar!(
        r#"
        SELECT name
        FROM participants
        WHERE event_id = $1 AND is_organizer = true
        LIMIT 1
        "#,
        event.id
    )
    .fetch_one(&pool)
    .await?;

    let event_slots = sqlx::query_as!(
        EventSlot,
        r#"
        SELECT id, event_id, start_at, end_at
        FROM event_slots
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
        slot_duration: event.slot_duration,
        state: event.state,
        event_slots,
        organizer_name,
    }))
}

pub async fn get_participant(
    State(pool): State<PgPool>,
    Path((public_token, participant_token)): Path<(String, Uuid)>,
) -> AppResult<Json<ParticipantResponse>> {
    // 1. Verify Event exists
    let event = sqlx::query!(
        "SELECT id FROM events WHERE public_token = $1",
        public_token
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound)?;

    // 2. Fetch Participant using TOKEN (ensure it belongs to this event)
    let participant = sqlx::query!(
        "SELECT id, name, comment FROM participants WHERE token = $1 AND event_id = $2",
        participant_token,
        event.id
    )
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound)?;

    // 3. Fetch Availabilities using internal ID
    let availabilities = sqlx::query_as!(
        TimeRangeRequest,
        r#"
        SELECT start_at, end_at
        FROM availabilities
        WHERE participant_id = $1
        ORDER BY start_at
        "#,
        participant.id
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(ParticipantResponse {
        participant_token, // Corrected field name
        name: participant.name,
        comment: participant.comment,
        availabilities,
    }))
}

pub async fn update_participant(
    State(pool): State<PgPool>,
    Path((public_token, participant_token)): Path<(String, Uuid)>,
    Json(payload): Json<UpdateParticipantRequest>,
) -> AppResult<()> {
    // Validate inputs
    if payload.participant_name.trim().is_empty() || payload.participant_name.len() > 50 {
        return Err(AppError::BadRequest(
            "Participant name is required and must be less than 50 characters".to_string(),
        ));
    }

    if let Some(ref comment) = payload.comment
        && comment.len() > 500
    {
        return Err(AppError::BadRequest(
            "Comment must be less than 500 characters".to_string(),
        ));
    }

    for range in &payload.availabilities {
        if range.start_at >= range.end_at {
            return Err(AppError::BadRequest("Invalid time range".to_string()));
        }
    }

    let mut transaction = pool.begin().await?;

    // 1. Verify Event
    let event = sqlx::query!(
        "SELECT id, state FROM events WHERE public_token = $1",
        public_token
    )
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or_else(|| AppError::NotFound)?;

    if event.state == "closed" {
        return Err(AppError::BadRequest(
            "Cannot update participation for a closed event".to_string(),
        ));
    }

    // 2. Verify Participant ownership using TOKEN and get internal ID
    let participant = sqlx::query!(
        "SELECT id FROM participants WHERE token = $1 AND event_id = $2",
        participant_token,
        event.id
    )
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or_else(|| AppError::NotFound)?;

    let id = participant.id;

    // 3. Update Participant details
    sqlx::query!(
        "UPDATE participants SET name = $1, comment = $2, updated_at = NOW() WHERE id = $3",
        payload.participant_name,
        payload.comment,
        id
    )
    .execute(&mut *transaction)
    .await?;

    // 4. Update Availabilities (using internal ID)
    sqlx::query!("DELETE FROM availabilities WHERE participant_id = $1", id)
        .execute(&mut *transaction)
        .await?;

    let merged = merge_time_ranges(payload.availabilities);
    for range in merged {
        sqlx::query!(
            "INSERT INTO availabilities (participant_id, start_at, end_at) VALUES ($1, $2, $3)",
            id,
            range.start_at,
            range.end_at
        )
        .execute(&mut *transaction)
        .await?;
    }

    transaction.commit().await?;

    Ok(())
}

pub async fn check_events_status(
    State(pool): State<PgPool>,
    Json(payload): Json<BatchCheckStatusRequest>,
) -> AppResult<Json<BatchCheckStatusResponse>> {
    if payload.tokens.len() > 50 {
        return Err(AppError::BadRequest(
            "Too many tokens to check (max 50)".to_string(),
        ));
    }

    if payload.tokens.is_empty() {
        return Ok(Json(BatchCheckStatusResponse {
            statuses: std::collections::HashMap::new(),
        }));
    }

    struct EventStatus {
        public_token: String,
        state: String,
    }

    let rows = sqlx::query_as!(
        EventStatus,
        r#"
        SELECT public_token, state 
        FROM events 
        WHERE public_token = ANY($1)
        "#,
        &payload.tokens
    )
    .fetch_all(&pool)
    .await?;

    let mut statuses = std::collections::HashMap::new();
    for row in rows {
        statuses.insert(row.public_token, row.state);
    }

    Ok(Json(BatchCheckStatusResponse { statuses }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_merge_time_ranges_no_overlap() {
        let t1_start = Utc.timestamp_opt(1000, 0).unwrap();
        let t1_end = Utc.timestamp_opt(2000, 0).unwrap();
        let t2_start = Utc.timestamp_opt(3000, 0).unwrap();
        let t2_end = Utc.timestamp_opt(4000, 0).unwrap();

        let ranges = vec![
            TimeRangeRequest {
                start_at: t1_start,
                end_at: t1_end,
            },
            TimeRangeRequest {
                start_at: t2_start,
                end_at: t2_end,
            },
        ];

        let merged = merge_time_ranges(ranges);
        assert_eq!(merged.len(), 2);
    }

    #[test]
    fn test_merge_time_ranges_overlap() {
        let t1_start = Utc.timestamp_opt(1000, 0).unwrap();
        let t1_end = Utc.timestamp_opt(3000, 0).unwrap();
        let t2_start = Utc.timestamp_opt(2000, 0).unwrap(); // Overlaps
        let t2_end = Utc.timestamp_opt(4000, 0).unwrap();

        let ranges = vec![
            TimeRangeRequest {
                start_at: t1_start,
                end_at: t1_end,
            },
            TimeRangeRequest {
                start_at: t2_start,
                end_at: t2_end,
            },
        ];

        let merged = merge_time_ranges(ranges);
        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].start_at, t1_start);
        assert_eq!(merged[0].end_at, t2_end);
    }
}
