use agreed_time_backend::models::*;
use chrono::{Utc, TimeZone};
use serde_json;
use uuid::Uuid;

#[test]
fn test_create_event_request_serialization() {
    let request = CreateEventRequest {
        title: "Test Event".to_string(),
        description: Some("Test Description".to_string()),
        organizer_name: Some("Test Organizer".to_string()),
        time_zone: Some("Asia/Taipei".to_string()),
        slot_duration: Some(30), // Added field
        time_slots: vec![
            TimeRangeRequest {
                start_at: Utc::now(),
                end_at: Utc::now(),
            }
        ],
    };

    let json = serde_json::to_string(&request).unwrap();
    assert!(json.contains("Test Event"));
    assert!(json.contains("Test Description"));
    assert!(json.contains("Test Organizer"));
    assert!(json.contains("\"slot_duration\":30"));

    let deserialized: CreateEventRequest = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.title, "Test Event");
    assert_eq!(deserialized.description, Some("Test Description".to_string()));
    assert_eq!(deserialized.organizer_name, Some("Test Organizer".to_string()));
    assert_eq!(deserialized.slot_duration, Some(30));
}

#[test]
fn test_create_event_request_optional_fields() {
    let request = CreateEventRequest {
        title: "Minimal Event".to_string(),
        description: None,
        organizer_name: None,
        time_zone: None,
        slot_duration: None, // Added field
        time_slots: vec![],
    };

    let json = serde_json::to_string(&request).unwrap();
    let deserialized: CreateEventRequest = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.title, "Minimal Event");
    assert_eq!(deserialized.description, None);
    assert_eq!(deserialized.organizer_name, None);
    assert_eq!(deserialized.time_zone, None);
    assert_eq!(deserialized.slot_duration, None);
}

#[test]
fn test_create_event_response_serialization() {
    let response = CreateEventResponse {
        id: Uuid::new_v4(),
        public_token: "public123".to_string(),
        organizer_token: "organizer456".to_string(),
    };

    let json = serde_json::to_string(&response).unwrap();
    assert!(json.contains("public123"));
    assert!(json.contains("organizer456"));

    let deserialized: CreateEventResponse = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.public_token, "public123");
    assert_eq!(deserialized.organizer_token, "organizer456");
}

#[test]
fn test_submit_availability_request() {
    let start = Utc.timestamp_opt(1678886400, 0).unwrap(); // 2023-03-15T16:00:00Z
    let end = Utc.timestamp_opt(1678890000, 0).unwrap();   // 2023-03-15T17:00:00Z

    let request = SubmitAvailabilityRequest {
        participant_name: "Charlie".to_string(),
        availabilities: vec![
            TimeRangeRequest { start_at: start, end_at: end }
        ],
    };

    let json = serde_json::to_string(&request).unwrap();
    assert!(json.contains("Charlie"));

    let deserialized: SubmitAvailabilityRequest = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.participant_name, "Charlie");
    assert_eq!(deserialized.availabilities.len(), 1);
    assert_eq!(deserialized.availabilities[0].start_at, start);
    assert_eq!(deserialized.availabilities[0].end_at, end);
}

#[test]
fn test_event_results_response_structure() {
    let response = EventResultsResponse {
        id: Uuid::new_v4(),
        title: "Team Meeting".to_string(),
        description: Some("Discuss Q1 plans".to_string()),
        time_zone: Some("America/New_York".to_string()),
        slot_duration: 60, // Added field
        state: "open".to_string(),
        event_slots: vec![],
        participants: vec![
            ParticipantAvailability {
                name: "Alice".to_string(),
                is_organizer: true, // Added field
                availabilities: vec![],
            },
            ParticipantAvailability {
                name: "Bob".to_string(),
                is_organizer: false, // Added field
                availabilities: vec![],
            },
        ],
        total_participants: 2,
    };

    let json = serde_json::to_string(&response).unwrap();
    assert!(json.contains("Team Meeting"));
    assert!(json.contains("Discuss Q1 plans"));
    assert!(json.contains("Alice"));
    assert!(json.contains("Bob"));
    assert!(json.contains("\"is_organizer\":true"));

    let deserialized: EventResultsResponse = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.title, "Team Meeting");
    assert_eq!(deserialized.total_participants, 2);
    assert_eq!(deserialized.participants.len(), 2);
    assert_eq!(deserialized.participants[0].is_organizer, true);
}

#[test]
fn test_organizer_event_response_includes_created_at() {
    let now = Utc::now();
    let response = OrganizerEventResponse {
        id: Uuid::new_v4(),
        public_token: "pub123".to_string(),
        organizer_token: "org456".to_string(),
        title: "Planning Session".to_string(),
        description: None,
        time_zone: Some("UTC".to_string()),
        slot_duration: 60, // Added field
        state: "open".to_string(),
        event_slots: vec![],
        participants: vec![],
        total_participants: 0,
        created_at: now,
    };

    let json = serde_json::to_string(&response).unwrap();
    assert!(json.contains("created_at"));
    assert!(json.contains("Planning Session"));

    let deserialized: OrganizerEventResponse = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.title, "Planning Session");
    assert_eq!(deserialized.public_token, "pub123");
    assert_eq!(deserialized.organizer_token, "org456");
    // Check that created_at is close to the original (within 1 second)
    let diff = (deserialized.created_at - now).num_seconds().abs();
    assert!(diff < 1);
}
