use agreed_time_backend::config::Config;
use std::{
    collections::HashMap,
    net::{Ipv4Addr, SocketAddr, SocketAddrV4},
    sync::{Arc, Mutex},
    task::{Context, Poll},
    time::{Duration, Instant}, // Use Instant for time tracking
};

use axum::{
    extract::{connect_info::ConnectInfo, Request},
    http::{HeaderValue, Method, StatusCode},
    response::{IntoResponse, Response},
};
use clap::{Parser, Subcommand};
use tower::{Layer, Service};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};



#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Run database migrations
    Migrate,
    /// Run the API server
    Serve,
}

// Rate limiting configuration
const RATE_LIMIT_DURATION: Duration = Duration::from_secs(60); // 1 minute
const MAX_REQUESTS_PER_DURATION: u32 = 5; // 5 requests per minute

#[derive(Clone)]
struct RateLimitLayer {
    // Store rate limit state: (last_request_time, request_count_in_window)
    clients: Arc<Mutex<HashMap<SocketAddr, (Instant, u32)>>>,
}

impl RateLimitLayer {
    fn new() -> Self {
        RateLimitLayer {
            clients: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl<S> Layer<S> for RateLimitLayer {
    type Service = RateLimitService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        RateLimitService {
            inner,
            clients: self.clients.clone(),
        }
    }
}

#[derive(Clone)]
struct RateLimitService<S> {
    inner: S,
    clients: Arc<Mutex<HashMap<SocketAddr, (Instant, u32)>>>,
}

impl<S> Service<Request> for RateLimitService<S>
where
    S: Service<Request, Response = Response> + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = futures::future::BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request) -> Self::Future {
        let conn_info = req
            .extensions()
            .get::<ConnectInfo<SocketAddr>>()
            .expect("ConnectInfo extension missing");

        let peer_addr = {
            let mut extracted_ip = conn_info.0; // Default to direct connection IP
            if let Some(x_forwarded_for) = req.headers().get("x-forwarded-for") {
                if let Ok(ip_str) = x_forwarded_for.to_str() {
                    // X-Forwarded-For can contain multiple IPs, the client IP is usually the first one
                    if let Some(client_ip) = ip_str.split(',').next() {
                        if let Ok(ip_addr) = client_ip.trim().parse::<Ipv4Addr>() {
                            extracted_ip = SocketAddr::V4(SocketAddrV4::new(
                                ip_addr,
                                conn_info.0.port(),
                            ));
                        }
                    }
                }
            }
            extracted_ip
        };

        let mut clients = self.clients.lock().unwrap();
        let now = Instant::now();

        let should_limit = {
            if let Some((last_req_time, count)) = clients.get_mut(&peer_addr) {
                if now.duration_since(*last_req_time) > RATE_LIMIT_DURATION {
                    // Reset counter if window expired
                    *last_req_time = now;
                    *count = 1;
                    false // Not limited
                } else if *count >= MAX_REQUESTS_PER_DURATION {
                    true // Limited
                } else {
                    // Increment count within window
                    *count += 1;
                    false // Not limited
                }
            } else {
                // First request from this IP
                clients.insert(peer_addr, (now, 1));
                false // Not limited
            }
        };

        if should_limit {
            let fut = async move { Ok(StatusCode::TOO_MANY_REQUESTS.into_response()) };
            return Box::pin(fut);
        }

        // Limit not exceeded, call the inner service
        let fut = self.inner.call(req);
        Box::pin(fut)
    }
}

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

    // Parse CLI arguments
    let cli = Cli::parse();

    // Load configuration
    let config = Config::from_env()?;
    tracing::info!("Configuration loaded: {:?}", config);

    // Create database pool (lazy - won't connect until first query)
    let pool = agreed_time_backend::db::create_pool_lazy(&config.database_url);
    tracing::info!("Database connection pool created (lazy)");

    match cli.command.unwrap_or(Commands::Serve) {
        Commands::Migrate => {
            tracing::info!("Running database migrations...");
            sqlx::migrate!("./migrations")
                .run(&pool)
                .await
                .expect("Failed to run database migrations");
            tracing::info!("Database migrations applied successfully!");
        }
        Commands::Serve => {
            // Start background task for auto-deletion
            let pool_for_cleanup = pool.clone();
            tokio::spawn(async move {
                // Run every hour
                let mut interval = tokio::time::interval(Duration::from_secs(3600));
                loop {
                    interval.tick().await;
                    tracing::info!("Running auto-deletion task...");

                    match agreed_time_backend::db::cleanup::delete_expired_events(&pool_for_cleanup).await {
                        Ok(count) => {
                            if count > 0 {
                                tracing::info!("Deleted {} expired events", count);
                            }
                        }
                        Err(e) => {
                            tracing::error!("Error in auto-deletion task: {:?}", e);
                        }
                    }
                }
            });

            // Setup Rate Limiter
            let rate_limit_layer = RateLimitLayer::new();

            // Setup CORS
            let cors = CorsLayer::new()
                .allow_origin(
                    config
                        .allowed_origins
                        .iter()
                        .map(|origin| origin.parse::<HeaderValue>().unwrap())
                        .collect::<Vec<HeaderValue>>(),
                )
                .allow_methods([Method::GET, Method::POST])
                .allow_headers([
                    axum::http::header::ACCEPT,
                    axum::http::header::AUTHORIZATION,
                    axum::http::header::CONTENT_TYPE,
                ])
                .allow_credentials(true);

            // Create router
            let app = agreed_time_backend::routes::create_router(pool)
                .layer(rate_limit_layer)
                .layer(cors);

            // Start server
            let addr = config.addr();
            tracing::info!("Starting server on {}", addr);

            let listener = tokio::net::TcpListener::bind(&addr).await?;
            axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await?;
        }
    }

    Ok(())
}
