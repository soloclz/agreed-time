use agreed_time_backend::models::{CreateEventRequest, TimeRangeRequest, SubmitAvailabilityRequest};
use axum::http::StatusCode;
use axum_test::TestServer;
use chrono::Utc;

async fn setup_test_server() -> TestServer {
    let config = agreed_time_backend::config::Config::from_env().unwrap();
    let pool = agreed_time_backend::db::create_pool_lazy(&config.database_url);
    
    // In actual tests, we usually mock the DB or use a test DB.
    // Assuming the test environment sets up DATABASE_URL correctly.
    let app = agreed_time_backend::routes::create_router(pool)
        .layer(agreed_time_backend::middleware::SecurityHeadersLayer)
        .layer(agreed_time_backend::middleware::RateLimitLayer::new());
        
    TestServer::new(app).unwrap()
}

#[tokio::test]
async fn test_security_headers() {
    let server = setup_test_server().await;
    let response = server.get("/health").await;

    response.assert_status_ok();
    response.assert_header("X-Content-Type-Options", "nosniff");
    response.assert_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

#[tokio::test]
async fn test_input_length_validation_create_event() {
    let server = setup_test_server().await;
    
    // Title too long (101 chars)
    let long_title = "a".repeat(101);
    let payload = CreateEventRequest {
        title: long_title,
        description: None,
        organizer_name: "Admin".to_string(),
        time_zone: Some("UTC".to_string()),
        slot_duration: Some(60),
        time_slots: vec![TimeRangeRequest {
            start_at: Utc::now(),
            end_at: Utc::now(),
        }],
    };

    let response = server.post("/events").json(&payload).await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_input_length_validation_submit_availability() {
    let server = setup_test_server().await;
    
    // Name too long (51 chars)
    let long_name = "a".repeat(51);
    let payload = SubmitAvailabilityRequest {
        participant_name: long_name,
        availabilities: vec![],
        comment: None,
    };

    let response = server.post("/events/some-token/availability").json(&payload).await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    
    // Comment too long (501 chars)
    let long_comment = "c".repeat(501);
    let payload_comment = SubmitAvailabilityRequest {
        participant_name: "User".to_string(),
        availabilities: vec![],
        comment: Some(long_comment),
    };
    
    let response = server.post("/events/some-token/availability").json(&payload_comment).await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}
