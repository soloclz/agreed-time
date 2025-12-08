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

