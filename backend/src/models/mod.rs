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

#[derive(Debug, Deserialize)] // Only need Deserialize for incoming request
pub struct SubmitAvailabilityRequest {
    pub participant_name: String,
    pub time_slot_ids: Vec<i64>,
}


