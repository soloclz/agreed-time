use agreed_time_backend::models::*;
use chrono::Utc;
use serde_json;
use uuid::Uuid;

#[test]
fn test_create_event_request_serialization() {
    let request = CreateEventRequest {
        title: "Test Event".to_string(),
        description: Some("Test Description".to_string()),
        organizer_name: Some("Test Organizer".to_string()),
        time_zone: Some("Asia/Taipei".to_string()),
        time_slots: vec![
            TimeSlotRequest {
                start_at: Utc::now(),
                end_at: Utc::now(),
            }
        ],
    };

    let json = serde_json::to_string(&request).unwrap();
    assert!(json.contains("Test Event"));
    assert!(json.contains("Test Description"));
    assert!(json.contains("Test Organizer"));

    let deserialized: CreateEventRequest = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.title, "Test Event");
    assert_eq!(deserialized.description, Some("Test Description".to_string()));
    assert_eq!(deserialized.organizer_name, Some("Test Organizer".to_string()));
}

#[test]
fn test_create_event_request_optional_fields() {
    let request = CreateEventRequest {
        title: "Minimal Event".to_string(),
        description: None,
        organizer_name: None,
        time_zone: None,
        time_slots: vec![],
    };

    let json = serde_json::to_string(&request).unwrap();
    let deserialized: CreateEventRequest = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.title, "Minimal Event");
    assert_eq!(deserialized.description, None);
    assert_eq!(deserialized.organizer_name, None);
    assert_eq!(deserialized.time_zone, None);
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
fn test_participant_info_with_organizer_flag() {
    let organizer = ParticipantInfo {
        name: "Alice".to_string(),
        comment: Some("I'm the organizer".to_string()),
        is_organizer: true,
    };

    let participant = ParticipantInfo {
        name: "Bob".to_string(),
        comment: None,
        is_organizer: false,
    };

    let json_organizer = serde_json::to_string(&organizer).unwrap();
    let json_participant = serde_json::to_string(&participant).unwrap();

    assert!(json_organizer.contains("\"is_organizer\":true"));
    assert!(json_participant.contains("\"is_organizer\":false"));

    let deser_organizer: ParticipantInfo = serde_json::from_str(&json_organizer).unwrap();
    assert!(deser_organizer.is_organizer);
    assert_eq!(deser_organizer.name, "Alice");

    let deser_participant: ParticipantInfo = serde_json::from_str(&json_participant).unwrap();
    assert!(!deser_participant.is_organizer);
    assert_eq!(deser_participant.name, "Bob");
}

#[test]
fn test_submit_availability_request() {
    let request = SubmitAvailabilityRequest {
        participant_name: "Charlie".to_string(),
        time_slot_ids: vec![1, 2, 3],
        comment: Some("Looking forward to it!".to_string()),
    };

    let json = serde_json::to_string(&request).unwrap();
    assert!(json.contains("Charlie"));
    assert!(json.contains("Looking forward to it!"));

    let deserialized: SubmitAvailabilityRequest = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.participant_name, "Charlie");
    assert_eq!(deserialized.time_slot_ids, vec![1, 2, 3]);
    assert_eq!(deserialized.comment, Some("Looking forward to it!".to_string()));
}

#[test]
fn test_event_results_response_structure() {
    let response = EventResultsResponse {
        id: Uuid::new_v4(),
        title: "Team Meeting".to_string(),
        description: Some("Discuss Q1 plans".to_string()),
        time_zone: Some("America/New_York".to_string()),
        state: "open".to_string(),
        time_slots: vec![],
        participants: vec![
            ParticipantInfo {
                name: "Alice".to_string(),
                comment: None,
                is_organizer: true,
            },
            ParticipantInfo {
                name: "Bob".to_string(),
                comment: Some("I'll be 5 min late".to_string()),
                is_organizer: false,
            },
        ],
        total_participants: 2,
    };

    let json = serde_json::to_string(&response).unwrap();
    assert!(json.contains("Team Meeting"));
    assert!(json.contains("Discuss Q1 plans"));
    assert!(json.contains("Alice"));
    assert!(json.contains("Bob"));

    let deserialized: EventResultsResponse = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized.title, "Team Meeting");
    assert_eq!(deserialized.total_participants, 2);
    assert_eq!(deserialized.participants.len(), 2);
    assert!(deserialized.participants[0].is_organizer);
    assert!(!deserialized.participants[1].is_organizer);
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
        state: "open".to_string(),
        time_slots: vec![],
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
