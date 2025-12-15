use agreed_time_backend::handlers::events::submit_availability;
use agreed_time_backend::models::{SubmitAvailabilityRequest, TimeRangeRequest};
use axum::Json;
use axum::extract::{Path, State};
use chrono::{Duration, Utc};
use sqlx::postgres::PgPoolOptions;
use std::env;
use uuid::Uuid;

#[tokio::test]
async fn test_duplicate_participant_names_allowed() {
    let _ = dotenvy::dotenv();
    let database_url = match env::var("DATABASE_URL") {
        Ok(url) => url,
        Err(_) => {
            eprintln!("Skipping duplicate name test: DATABASE_URL not set");
            return;
        }
    };

    let pool = PgPoolOptions::new()
        .connect(&database_url)
        .await
        .expect("Failed to connect to DB");

    // 1. Create Test Event
    let event_id = Uuid::new_v4();
    let public_token = Uuid::new_v4().to_string();
    let organizer_token = Uuid::new_v4().to_string();
    let current_time = Utc::now();
    let organizer_name = "Alice";

    // Insert event
    sqlx::query!(
        r#"
        INSERT INTO events (
            id, public_token, organizer_token, title, description, state, time_zone, slot_duration, created_at, updated_at
        )
        VALUES (
            $1, $2, $3, 'Duplicate Name Test Event', NULL, 'open', 'UTC', 60, $4, $4
        )
        "#,
        event_id,
        public_token,
        organizer_token,
        current_time
    )
    .execute(&pool)
    .await
    .expect("Failed to create test event");

    // Insert Organizer "Alice"
    sqlx::query!(
        "INSERT INTO participants (event_id, name, is_organizer) VALUES ($1, $2, $3)",
        event_id,
        organizer_name,
        true
    )
    .execute(&pool)
    .await
    .expect("Failed to insert organizer");

    // 2. Submit availability for "Alice" (Same name as organizer)
    // This should CREATE A NEW PARTICIPANT, not update the organizer.
    let payload_duplicate = SubmitAvailabilityRequest {
        participant_name: organizer_name.to_string(),
        availabilities: vec![TimeRangeRequest {
            start_at: Utc::now(),
            end_at: Utc::now() + Duration::hours(1),
        }],
        comment: Some("I am the imposter Alice".to_string()),
    };

    let result = submit_availability(
        State(pool.clone()),
        Path(public_token.clone()),
        Json(payload_duplicate),
    )
    .await;

    if let Err(e) = &result {
        eprintln!("Submit availability failed: {:?}", e);
    }
    assert!(
        result.is_ok(),
        "Duplicate name submission should be allowed"
    );

    // 3. Verify there are now TWO participants named "Alice"
    let count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM participants WHERE event_id = $1 AND name = $2",
        event_id,
        organizer_name
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(
        count, 2,
        "Should have 2 participants named Alice (Organizer + Guest)"
    );

    // 4. Cleanup
    sqlx::query!("DELETE FROM events WHERE id = $1", event_id)
        .execute(&pool)
        .await
        .unwrap();
}
