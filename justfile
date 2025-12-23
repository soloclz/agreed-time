# 列出所有可用的指令
default:
    @just --list

# 🛠️ 自動修復：格式化程式碼 + 更新 SQLx 快取 (開發時最常用)
fix: backend-fmt sqlx-prepare

# ⚡️ 快速檢查：格式檢查 + SQLx 檢查 + Clippy + 前端型別
check: backend-fmt-check sqlx-check backend-clippy frontend-typecheck

# 🐢 完整 CI 檢查：包含所有測試
ci: check backend-test frontend-test

# === Backend (Rust) ===

# 格式化程式碼
backend-fmt:
    echo "🎨 Formatting Rust code..."
    cd backend && cargo fmt

# 檢查格式 (CI 用，不修改檔案)
backend-fmt-check:
    echo "🎨 Checking Rust formatting..."
    cd backend && cargo fmt -- --check

# 更新 SQLx 離線檢查檔案 (需要 DB 在執行中)
sqlx-prepare:
    echo "🗄️  Updating SQLx offline data..."
    cd backend && cargo sqlx prepare

# 檢查 SQLx 檔案是否過期 (CI 用)
sqlx-check:
    echo "🗄️  Checking SQLx offline data freshness..."
    cd backend && cargo sqlx prepare --check

# Linter
backend-clippy:
    echo "🦀 Running Clippy..."
    cd backend && cargo clippy -- -D warnings

# 測試
backend-test:
    echo "🧪 Running Backend Tests..."
    cd backend && cargo test

# === Frontend (Astro/React) ===

# 基礎檢查：型別檢查
frontend-typecheck:
    echo "🪐 Checking Frontend Types..."
    cd frontend && npx astro check

# 完整測試
frontend-test:
    echo "🪐 Running Frontend Tests..."
    cd frontend && npm run test -- --run