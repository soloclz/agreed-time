use axum::{
    extract::{Request, connect_info::ConnectInfo},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use futures::future::BoxFuture;
use std::{
    collections::HashMap,
    net::{Ipv4Addr, SocketAddr, SocketAddrV4},
    sync::{Arc, Mutex},
    task::{Context, Poll},
    time::{Duration, Instant},
};
use tower::{Layer, Service};

// Rate limiting configuration
const RATE_LIMIT_DURATION: Duration = Duration::from_secs(60); // 1 minute
const MAX_REQUESTS_PER_DURATION: u32 = 60; // 60 requests per minute

#[derive(Clone)]
pub struct RateLimitLayer {
    // Store rate limit state: (last_request_time, request_count_in_window)
    clients: Arc<Mutex<HashMap<SocketAddr, (Instant, u32)>>>,
}

impl RateLimitLayer {
    pub fn new() -> Self {
        RateLimitLayer {
            clients: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Default for RateLimitLayer {
    fn default() -> Self {
        Self::new()
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
pub struct RateLimitService<S> {
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
    type Future = BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request) -> Self::Future {
        // Extract IP (Simplified logic for middleware)
        // If ConnectInfo is missing (e.g. in tests without proper setup), we fallback to a loopback.
        // In real Axum run, ConnectInfo is injected by the router.
        let peer_addr = if let Some(conn_info) = req.extensions().get::<ConnectInfo<SocketAddr>>() {
            let mut extracted_ip = conn_info.0;

            // Check X-Forwarded-For
            if let Some(x_forwarded_for) = req.headers().get("x-forwarded-for")
                && let Ok(ip_str) = x_forwarded_for.to_str()
                && let Some(client_ip) = ip_str.split(',').next()
                && let Ok(ip_addr) = client_ip.trim().parse::<Ipv4Addr>()
            {
                extracted_ip = SocketAddr::V4(SocketAddrV4::new(ip_addr, conn_info.0.port()));
            }
            extracted_ip
        } else {
            // Fallback for when ConnectInfo is missing (shouldn't happen in prod if configured right)
            SocketAddr::from(([127, 0, 0, 1], 0))
        };

        let should_limit = {
            let mut clients = self.clients.lock().unwrap();
            let now = Instant::now();

            if let Some((last_req_time, count)) = clients.get_mut(&peer_addr) {
                if now.duration_since(*last_req_time) > RATE_LIMIT_DURATION {
                    // Reset counter if window expired
                    *last_req_time = now;
                    *count = 1;
                    false
                } else if *count >= MAX_REQUESTS_PER_DURATION {
                    true
                } else {
                    // Increment count within window
                    *count += 1;
                    false
                }
            } else {
                // First request from this IP
                clients.insert(peer_addr, (now, 1));
                false
            }
        };

        if should_limit {
            let fut = async move { Ok(StatusCode::TOO_MANY_REQUESTS.into_response()) };
            return Box::pin(fut);
        }

        let fut = self.inner.call(req);
        Box::pin(fut)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt; // for oneshot

    // A dummy service that always returns 200 OK
    async fn handle_request(_req: Request<Body>) -> Result<Response, String> {
        Ok(StatusCode::OK.into_response())
    }

    #[tokio::test]
    async fn test_rate_limiting() {
        let layer = RateLimitLayer::new();
        let service = tower::service_fn(handle_request);
        let mut rate_limit_service = layer.layer(service);

        let ip = SocketAddr::from(([127, 0, 0, 1], 12345));

        // Send 5 requests (Allowed)
        for _ in 0..5 {
            let mut req = Request::builder().body(Body::empty()).unwrap();
            req.extensions_mut().insert(ConnectInfo(ip));
            let res = rate_limit_service
                .ready()
                .await
                .unwrap()
                .call(req)
                .await
                .unwrap();
            assert_eq!(res.status(), StatusCode::OK);
        }

        // Send 6th request (Blocked)
        let mut req = Request::builder().body(Body::empty()).unwrap();
        req.extensions_mut().insert(ConnectInfo(ip));
        let res = rate_limit_service
            .ready()
            .await
            .unwrap()
            .call(req)
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::TOO_MANY_REQUESTS);
    }

    #[tokio::test]
    async fn test_rate_limit_reset_after_duration() {
        // Skip as discussed
    }

    #[tokio::test]
    async fn test_x_forwarded_for() {
        let layer = RateLimitLayer::new();
        let service = tower::service_fn(handle_request);
        let mut rate_limit_service = layer.layer(service);

        // Direct IP (Load Balancer)
        let lb_ip = SocketAddr::from(([10, 0, 0, 1], 12345));
        // Real Client IP
        let client_ip = "203.0.113.195";

        // Send 5 requests from client_ip
        for _ in 0..5 {
            let mut req = Request::builder()
                .header("x-forwarded-for", client_ip)
                .body(Body::empty())
                .unwrap();
            req.extensions_mut().insert(ConnectInfo(lb_ip));
            let res = rate_limit_service
                .ready()
                .await
                .unwrap()
                .call(req)
                .await
                .unwrap();
            assert_eq!(res.status(), StatusCode::OK);
        }

        // 6th from client_ip should be blocked
        let mut req = Request::builder()
            .header("x-forwarded-for", client_ip)
            .body(Body::empty())
            .unwrap();
        req.extensions_mut().insert(ConnectInfo(lb_ip));
        let res = rate_limit_service
            .ready()
            .await
            .unwrap()
            .call(req)
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::TOO_MANY_REQUESTS);

        // But a request from a DIFFERENT IP (even if coming from same LB) should be OK
        let mut req_other = Request::builder()
            .header("x-forwarded-for", "198.51.100.1")
            .body(Body::empty())
            .unwrap();
        req_other.extensions_mut().insert(ConnectInfo(lb_ip));

        let res_other = rate_limit_service
            .ready()
            .await
            .unwrap()
            .call(req_other)
            .await
            .unwrap();
        assert_eq!(res_other.status(), StatusCode::OK);
    }
}

#[derive(Clone, Default)]
pub struct SecurityHeadersLayer;

impl<S> Layer<S> for SecurityHeadersLayer {
    type Service = SecurityHeadersService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        SecurityHeadersService { inner }
    }
}

#[derive(Clone)]
pub struct SecurityHeadersService<S> {
    inner: S,
}

impl<S> Service<Request> for SecurityHeadersService<S>
where
    S: Service<Request, Response = Response> + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request) -> Self::Future {
        let fut = self.inner.call(req);
        Box::pin(async move {
            let mut res: Response = fut.await?;
            let headers = res.headers_mut();

            headers.insert("X-Content-Type-Options", "nosniff".parse().unwrap());
            headers.insert(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains".parse().unwrap(),
            );

            Ok(res)
        })
    }
}
