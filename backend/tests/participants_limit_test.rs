use agreed_time_backend::handlers::events::submit_availability;
use agreed_time_backend::models::{SubmitAvailabilityRequest, TimeRangeRequest};
use agreed_time_backend::error::AppError; // Added import
use axum::extract::{Path, State};
use axum::Json;
use chrono::{Utc, Duration};
use sqlx::postgres::PgPoolOptions;
use std::env;
use uuid::Uuid;

#[tokio::test]
async fn test_participant_limit() {
    let _ = dotenvy::dotenv();
    let database_url = match env::var("DATABASE_URL") {
        Ok(url) => url,
        Err(_) => {
            eprintln!("Skipping participant limit test: DATABASE_URL not set");
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

    sqlx::query!(
        r#"
        INSERT INTO events (
            id, public_token, organizer_token, title, description, state, time_zone, slot_duration, created_at, updated_at
        )
        VALUES (
            $1, $2, $3, 'Limit Test Event', NULL, 'open', 'UTC', 60, $4, $4
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

    // 2. Add Organizer (Participant 1)
    sqlx::query!(
        "INSERT INTO participants (event_id, name, is_organizer, comment) VALUES ($1, $2, $3, $4)",
        event_id,
        "Organizer",
        true,
        Some("Host".to_string())
    )
    .execute(&pool)
    .await
    .expect("Failed to insert organizer");

    // 3. Add 8 Guests (Participants 2 to 9)
    for i in 2..=9 {
        sqlx::query!(
            "INSERT INTO participants (event_id, name, is_organizer, comment) VALUES ($1, $2, $3, $4)",
            event_id,
            format!("Guest {}", i),
            false,
            Some("Comment".to_string())
        )
        .execute(&pool)
        .await
        .expect("Failed to insert participant");
    }

    // 4. Try to add 10th participant via handler (Should Succeed)
    // Current count in DB is 9. Limit is 10.
    let payload_10 = SubmitAvailabilityRequest {
        participant_name: "Guest 10".to_string(),
        availabilities: vec![TimeRangeRequest {
            start_at: Utc::now(),
            end_at: Utc::now() + Duration::hours(1),
        }],
        comment: None,
    };

    let result_10 = submit_availability(
        State(pool.clone()),
        Path(public_token.clone()),
        Json(payload_10),
    )
    .await;

    assert!(result_10.is_ok(), "10th participant should be allowed");

    // 5. Try to add 11th participant via handler (Should Fail)
    // Current count in DB is 10. Limit is 10.
    let payload_11 = SubmitAvailabilityRequest {
        participant_name: "Guest 11".to_string(),
        availabilities: vec![TimeRangeRequest {
            start_at: Utc::now(),
            end_at: Utc::now() + Duration::hours(1),
        }],
        comment: None,
    };

    let result_11 = submit_availability(
        State(pool.clone()),
        Path(public_token.clone()),
        Json(payload_11),
    )
    .await;

    match result_11 {
        Ok(_) => panic!("Should have failed due to participant limit"),
        Err(e) => {
             assert_eq!(e.code(), "PARTICIPANT_LIMIT_REACHED", "Unexpected error code: {:?}", e);
        }
    }
    
    // 6. Cleanup
    sqlx::query!("DELETE FROM events WHERE id = $1", event_id)
        .execute(&pool)
        .await
        .unwrap();
}