use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[allow(dead_code)]
pub struct Event {
    pub id: Uuid,
    pub public_token: String,
    pub organizer_token: String,
    pub title: String,
    pub description: Option<String>,
    pub organizer_name: String, // Organizer's name
    pub state: String, // 'open', 'finalized', etc.
    pub time_zone: Option<String>, // Metadata for UI display
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TimeSlotRequest {
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: Option<String>,
    pub organizer_name: Option<String>, // Organizer's name (defaults to "Organizer")
    pub time_zone: Option<String>, // Organizer's original timezone
    pub time_slots: Vec<TimeSlotRequest>,
}

// Response structure for event creation
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEventResponse {
    pub id: Uuid,
    pub public_token: String,
    pub organizer_token: String,
}

// 為了輸出給前端，我們需要一個帶有 ID 和詳細時間的 TimeSlot 結構
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct TimeSlot {
    pub id: i64,
    pub event_id: Uuid, // Also include event_id for clarity
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
    pub availability_count: i64, // New field for participant count
}

// 這是回傳給前端的完整活動資料 (Participant View)
#[derive(Debug, Serialize, Deserialize)]
pub struct EventResponse {
    pub id: Uuid, // Include event ID
    pub title: String,
    pub description: Option<String>,
    pub time_zone: Option<String>,
    pub state: String,
    pub time_slots: Vec<TimeSlot>, // Use the new TimeSlot struct
}

#[derive(Debug, Serialize, Deserialize)] // Need both for testing
pub struct SubmitAvailabilityRequest {
    pub participant_name: String,
    pub time_slot_ids: Vec<i64>,
    pub comment: Option<String>,
}

// For results view: time slot with participant names
#[derive(Debug, Serialize, Deserialize)]
pub struct TimeSlotWithParticipants {
    pub id: i64,
    pub event_id: Uuid,
    pub start_at: DateTime<Utc>,
    pub end_at: DateTime<Utc>,
    pub availability_count: i64,
    pub participants: Vec<String>, // List of participant names
}

// Participant information for results view
#[derive(Debug, Serialize, Deserialize)]
pub struct ParticipantInfo {
    pub name: String,
    pub comment: Option<String>,
    pub is_organizer: bool, // Whether this participant is the organizer
}

// For results view: complete event results
#[derive(Debug, Serialize, Deserialize)]
pub struct EventResultsResponse {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub time_zone: Option<String>,
    pub state: String,
    pub time_slots: Vec<TimeSlotWithParticipants>,
    pub participants: Vec<ParticipantInfo>, // List of all participants with their comments
    pub total_participants: i64, // Total unique participants
}

// Response structure for organizer view
#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizerEventResponse {
    pub id: Uuid,
    pub public_token: String,    // Organizer needs this for sharing
    pub organizer_token: String, // Organizer needs this for management actions
    pub title: String,
    pub description: Option<String>,
    pub time_zone: Option<String>,
    pub state: String,
    pub time_slots: Vec<TimeSlotWithParticipants>, // Detailed slots with participants
    pub participants: Vec<ParticipantInfo>,        // All participants with comments
    pub total_participants: i64,
    pub created_at: DateTime<Utc>, // Event creation timestamp for expiration display
}


