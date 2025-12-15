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
        CreateEventRequest, CreateEventResponse, Event, EventResponse, EventResultsResponse,
        EventSlot, OrganizerEventResponse, ParticipantAvailability, SubmitAvailabilityRequest,
        TimeRangeRequest,
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
) -> AppResult<()> {
    // Validate participant name
    if payload.participant_name.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Participant name is required".to_string(),
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

    // Try to find participant by name
    // Important: We should NOT overwrite the Organizer if someone just enters the organizer's name.
    // For MVP anonymous, we might allow it, but let's be safe:
    // If the name matches an existing participant, we update it.
    // Ideally we should block overwriting organizer if payload is from guest form?
    // But since organizer uses same submit flow? No, organizer is created at event creation.
    // Let's keep simple logic: find by name. If it's organizer, so be it (organizer updating their time).

    let participant_id = if let Some(id) = sqlx::query_scalar!(
        "SELECT id FROM participants WHERE event_id = $1 AND name = $2",
        event_id,
        payload.participant_name
    )
    .fetch_optional(&mut *transaction)
    .await?
    {
        // Participant exists, update their comment
        sqlx::query!(
            "UPDATE participants SET comment = $1, updated_at = NOW() WHERE id = $2",
            payload.comment,
            id
        )
        .execute(&mut *transaction)
        .await?;
        id
    } else {
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

        // New participant, insert with comment
        sqlx::query_scalar!(
            "INSERT INTO participants (event_id, name, is_organizer, comment) VALUES ($1, $2, $3, $4) RETURNING id",
            event_id,
            payload.participant_name,
            false, // Default is not organizer
            payload.comment
        )
        .fetch_one(&mut *transaction)
        .await?
    };

    sqlx::query!(
        "DELETE FROM availabilities WHERE participant_id = $1",
        participant_id
    )
    .execute(&mut *transaction)
    .await?;

    let merged_availabilities = merge_time_ranges(payload.availabilities);

    for range in merged_availabilities {
        sqlx::query!(
            "INSERT INTO availabilities (participant_id, start_at, end_at) VALUES ($1, $2, $3)",
            participant_id,
            range.start_at,
            range.end_at
        )
        .execute(&mut *transaction)
        .await?;
    }

    transaction.commit().await?;

    Ok(())
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
