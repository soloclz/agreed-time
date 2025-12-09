use sqlx::PgPool;

pub async fn delete_expired_events(pool: &PgPool) -> Result<u64, sqlx::Error> {
    let result = sqlx::query!(
        r#"
        DELETE FROM events
        WHERE created_at < NOW() - INTERVAL '7 days'
        "#
    )
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}
