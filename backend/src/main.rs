mod config;
mod db;
mod error;
mod handlers;
mod models;
mod routes;

use config::Config;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "agreed_time_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env()?;
    tracing::info!("Configuration loaded: {:?}", config);

    // Create database pool (lazy - won't connect until first query)
    let pool = db::create_pool_lazy(&config.database_url);
    tracing::info!("Database connection pool created (lazy)");

    // Start background task for auto-deletion
    let pool_for_cleanup = pool.clone();
    tokio::spawn(async move {
        // Run every hour
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600));
        loop {
            interval.tick().await;
            tracing::info!("Running auto-deletion task...");

            let result = sqlx::query!(
                r#"
                DELETE FROM events 
                WHERE id IN (
                    SELECT event_id 
                    FROM time_slots 
                    GROUP BY event_id 
                    HAVING MAX(end_at) < NOW() - INTERVAL '7 days'
                )
                "#
            )
            .execute(&pool_for_cleanup)
            .await;

            match result {
                Ok(result) => {
                    if result.rows_affected() > 0 {
                        tracing::info!("Deleted {} expired events", result.rows_affected());
                    }
                }
                Err(e) => {
                    tracing::error!("Error in auto-deletion task: {:?}", e);
                }
            }
        }
    });

    // Setup CORS
    let cors = CorsLayer::new()
        .allow_origin(
            config
                .allowed_origins
                .iter()
                .map(|origin| origin.parse().unwrap())
                .collect::<Vec<_>>(),
        )
        .allow_methods(Any)
        .allow_headers(Any);

    // Create router
    let app = routes::create_router(pool).layer(cors);

    // Start server
    let addr = config.addr();
    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
