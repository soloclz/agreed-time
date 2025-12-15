use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Not found")]
    NotFound,

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Event has reached maximum limit of {0} participants")]
    ParticipantLimitReached(i64),
}

impl AppError {
    pub fn code(&self) -> &str {
        match self {
            AppError::Database(_) => "INTERNAL_SERVER_ERROR",
            AppError::NotFound => "NOT_FOUND",
            AppError::BadRequest(_) => "BAD_REQUEST",
            AppError::ParticipantLimitReached(_) => "PARTICIPANT_LIMIT_REACHED",
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let code = self.code().to_string(); // Get code before consuming self

        let (status, message) = match self {
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
            }
            AppError::NotFound => (StatusCode::NOT_FOUND, "Resource not found".to_string()),
            AppError::BadRequest(ref msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::ParticipantLimitReached(limit) => (
                StatusCode::BAD_REQUEST,
                format!("Event has reached maximum limit of {} participants", limit),
            ),
        };

        let body = Json(json!({
            "error": message,
            "code": code,
        }));

        (status, body).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
