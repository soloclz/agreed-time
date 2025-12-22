use agreed_time_backend::models::{
    BatchCheckStatusRequest, BatchCheckStatusResponse, CreateEventRequest, CreateEventResponse,
    TimeRangeRequest,
};
use axum::{
    Router,
    body::Body,
    http::{Request, StatusCode},
};
use chrono::{Duration, Utc};
use sqlx::PgPool;
use tower::ServiceExt; // for `oneshot`

// Helper to create an app router for testing
async fn create_test_app(pool: PgPool) -> Router {
    agreed_time_backend::routes::create_router(pool)
}

#[sqlx::test]
async fn test_batch_check_status(pool: PgPool) {
    let app = create_test_app(pool.clone()).await;

    // 1. Create 3 events
    let mut tokens = Vec::new();
    for i in 0..3 {
        let req = CreateEventRequest {
            title: format!("Event {}", i),
            description: None,
            organizer_name: "Test Organizer".to_string(),
            time_zone: None,
            slot_duration: None,
            time_slots: vec![TimeRangeRequest {
                start_at: Utc::now() + Duration::hours(1),
                end_at: Utc::now() + Duration::hours(2),
            }],
        };

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/events")
                    .header("Content-Type", "application/json")
                    .body(Body::from(serde_json::to_string(&req).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let body: CreateEventResponse = serde_json::from_slice(&body_bytes).unwrap();
        tokens.push(body.public_token);
    }

    // 2. Add a fake token
    let fake_token = uuid::Uuid::new_v4().to_string();
    tokens.push(fake_token.clone());

    // 3. Batch check
    let check_req = BatchCheckStatusRequest {
        tokens: tokens.clone(),
    };

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/events/batch-check")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_string(&check_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body: BatchCheckStatusResponse = serde_json::from_slice(&body_bytes).unwrap();

    // 4. Verify
    // Should contain the 3 valid tokens
    assert_eq!(body.statuses.len(), 3);
    for i in 0..3 {
        assert!(body.statuses.contains_key(&tokens[i]));
        assert_eq!(body.statuses.get(&tokens[i]).unwrap(), "open");
    }
    // Should NOT contain the fake token
    assert!(!body.statuses.contains_key(&fake_token));
}

#[sqlx::test]
async fn test_batch_check_limit(pool: PgPool) {
    let app = create_test_app(pool).await;

    // Generate 51 tokens
    let tokens: Vec<String> = (0..51).map(|_| uuid::Uuid::new_v4().to_string()).collect();

    let check_req = BatchCheckStatusRequest { tokens };

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/events/batch-check")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_string(&check_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // Should fail with BadRequest
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
