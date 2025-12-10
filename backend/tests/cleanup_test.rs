use agreed_time_backend::db::cleanup::delete_expired_events;
use chrono::{Utc, Duration};
use sqlx::postgres::PgPoolOptions;
use std::env;
use uuid::Uuid;

#[tokio::test]
async fn test_delete_expired_events() {
    let _ = dotenvy::dotenv();
    let database_url = match env::var("DATABASE_URL") {
        Ok(url) => url,
        Err(_) => {
            eprintln!("Skipping cleanup test: DATABASE_URL not set");
            return;
        }
    };

    let pool = PgPoolOptions::new()
        .connect(&database_url)
        .await
        .expect("Failed to connect to DB");

    // 1. Create Expired Event (8 days ago)
    let expired_event_id = Uuid::new_v4();
    let old_time = Utc::now() - Duration::days(8);
    
    // Updated Schema: No organizer_name, Added slot_duration
    sqlx::query!(
        r#"
        INSERT INTO events (id, public_token, organizer_token, title, description, state, time_zone, slot_duration, created_at, updated_at)
        VALUES ($1, $2, $3, 'Expired Event', NULL, 'open', 'UTC', 60, $4, $4)
        "#,
        expired_event_id,
        Uuid::new_v4().to_string(),
        Uuid::new_v4().to_string(),
        old_time
    )
    .execute(&pool)
    .await
    .expect("Failed to insert expired event");

    // 2. Create Active Event (1 day ago)
    let active_event_id = Uuid::new_v4();
    let recent_time = Utc::now() - Duration::days(1);

    sqlx::query!(
        r#"
        INSERT INTO events (id, public_token, organizer_token, title, description, state, time_zone, slot_duration, created_at, updated_at)
        VALUES ($1, $2, $3, 'Active Event', NULL, 'open', 'UTC', 60, $4, $4)
        "#,
        active_event_id,
        Uuid::new_v4().to_string(),
        Uuid::new_v4().to_string(),
        recent_time
    )
    .execute(&pool)
    .await
    .expect("Failed to insert active event");

    // 3. Run Cleanup
    let deleted_count = delete_expired_events(&pool).await.expect("Cleanup failed");
    
    // 4. Verify
    // Note: deleted_count might be > 1 if other junk exists in DB.
    assert!(deleted_count >= 1);

    let expired_exists = sqlx::query!("SELECT id FROM events WHERE id = $1", expired_event_id)
        .fetch_optional(&pool)
        .await
        .unwrap()
        .is_some();
    
    assert!(!expired_exists, "Expired event should be deleted");

    let active_exists = sqlx::query!("SELECT id FROM events WHERE id = $1", active_event_id)
        .fetch_optional(&pool)
        .await
        .unwrap()
        .is_some();
        
    assert!(active_exists, "Active event should remain");

    // Cleanup active event
    sqlx::query!("DELETE FROM events WHERE id = $1", active_event_id).execute(&pool).await.unwrap();
}