use sqlx::{postgres::PgPoolOptions, PgPool};



// For testing without actual database connection
pub fn create_pool_lazy(database_url: &str) -> PgPool {
    PgPoolOptions::new()
        .max_connections(5)
        .connect_lazy(database_url)
        .expect("Failed to create lazy pool")
}
