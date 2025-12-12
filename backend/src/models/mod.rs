use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]

pub struct Event {
    pub id: Uuid,
    pub public_token: String,
    pub organizer_token: String,
    pub title: String,
    pub description: Option<String>,
    // pub organizer_name: String, // Removed from DB model
    pub state: String,
    pub time_zone: Option<String>,
    pub slot_duration: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimeRangeRequest {
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: Option<String>,
    pub organizer_name: String,
    pub time_zone: Option<String>,
    pub slot_duration: Option<i32>,
    pub time_slots: Vec<TimeRangeRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEventResponse {
    pub id: Uuid,
    pub public_token: String,
    pub organizer_token: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct EventSlot {
    pub id: i64,
    pub event_id: Uuid,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EventResponse {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub time_zone: Option<String>,
    pub slot_duration: i32,
    pub state: String,
    pub event_slots: Vec<EventSlot>,
    pub organizer_name: String, // Computed field
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubmitAvailabilityRequest {
    pub participant_name: String,
    pub availabilities: Vec<TimeRangeRequest>,
    pub comment: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParticipantAvailability {
    pub name: String,
    pub is_organizer: bool, // Add this to help frontend identify organizer
    pub comment: Option<String>,
    pub availabilities: Vec<TimeRangeRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EventResultsResponse {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub time_zone: Option<String>,
    pub slot_duration: i32,
    pub state: String,
    pub event_slots: Vec<EventSlot>,
    pub participants: Vec<ParticipantAvailability>,
    pub total_participants: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizerEventResponse {
    pub id: Uuid,
    pub public_token: String,
    pub organizer_token: String,
    pub title: String,
    pub description: Option<String>,
    pub time_zone: Option<String>,
    pub slot_duration: i32,
    pub state: String,
    pub event_slots: Vec<EventSlot>,
    pub participants: Vec<ParticipantAvailability>,
    pub total_participants: i64,
    pub created_at: DateTime<Utc>,
}
