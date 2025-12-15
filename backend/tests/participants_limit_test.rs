use agreed_time_backend::handlers::events::submit_availability;
use agreed_time_backend::models::{SubmitAvailabilityRequest, TimeRangeRequest};
use axum::extract::{Path, State};
use axum::Json;
use chrono::Utc;
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

    // 2. Add 9 Participants directly to DB
    for i in 1..=9 {
        sqlx::query!(
            "INSERT INTO participants (event_id, name, is_organizer, comment) VALUES ($1, $2, $3, $4)",
            event_id,
            format!("Participant {}", i),
            false,
            Some("Comment".to_string())
        )
        .execute(&pool)
        .await
        .expect("Failed to insert participant");
    }

    // 3. Try to add 10th participant via handler
    let payload = SubmitAvailabilityRequest {
        participant_name: "Participant 10".to_string(),
        availabilities: vec![TimeRangeRequest {
            start_at: Utc::now(),
            end_at: Utc::now(),
        }],
        comment: None,
    };

    let result = submit_availability(
        State(pool.clone()),
        Path(public_token.clone()),
        Json(payload),
    )
    .await;

    // 4. Verify it fails
    match result {
        Ok(_) => panic!("Should have failed due to participant limit"),
        Err(e) => {
             // Check error message or type if possible
             let err_msg = format!("{:?}", e);
             assert!(err_msg.contains("Event has reached maximum limit of 9 participants") || err_msg.contains("BadRequest"), "Unexpected error: {:?}", e);
        }
    }
    
    // 5. Cleanup
    sqlx::query!("DELETE FROM events WHERE id = $1", event_id)
        .execute(&pool)
        .await
        .unwrap();
}
