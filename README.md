# AgreedTime

Modern scheduling made simple. Create polls, collect availability, and find the best time for your group in seconds.

## Documentation

*   **[Developer Guide](./docs/developer/guide.md)**: Architecture, code standards, and contribution workflow.
*   **[Product Spec](./docs/product/spec.md)**: Functional requirements and design specifications.

## Getting Started

### Prerequisites
*   Docker Desktop (or OrbStack)
*   Node.js & npm
*   Rust (Cargo)

### One-Time Bootstrap
After cloning the repo, run `./scripts/bootstrap.sh`. The script:
*   Verifies the tools above are installed.
*   Installs Rust via rustup automatically if `cargo` is missing (requires `curl`).
*   Installs `sqlx-cli` once Rust/Cargo are available.
*   Initializes the `knowledge/` git submodule (requires SSH access to `git@soloclz:soloclz/knowledge.git`).
*   Creates `backend/.env` with local defaults if it doesn’t exist.
*   Starts the Postgres container, applies database migrations, runs `cargo check`, installs frontend dependencies, and completes an `npm run build` so both apps are ready.

### Environment Setup
If you skip the bootstrap script, ensure you have a `.env` file in the `backend/` directory with your database connection string and other settings. A template for required variables is typically available or can be inferred from `backend/src/config.rs`.

### Running Locally

1.  **Start Database**:
    ```bash
    docker compose up -d
    ```

2.  **Run Backend** (in a new terminal):
    ```bash
    cd backend
    cargo run
    ```
    *Server runs at `http://localhost:3000`*

3.  **Run Frontend** (in a new terminal):
    ```bash
    cd frontend
    npm run dev
    ```
    *Frontend runs at `http://localhost:4321`*

### Testing
- Backend: `cd backend && cargo test`
- Frontend (Vitest): `cd frontend && npm test`  
  - Run a single spec: `npm test -- CreateEventForm.test.tsx`

## Roadmap

- [x] **Event Creation (Organizer View)**
    - [x] Sticky time column layout
    - [x] Mobile long-press selection
    - [x] UTC timezone storage
- [x] **Guest Response View**
    - [x] Availability overlay ("painting" on top of organizer's slots)
    - [x] Heatmap visualization
- [x] **Backend Infrastructure**
    - [x] Rust + Axum project initialization
    - [x] Modular architecture (routes, handlers, models, db)
    - [x] CORS configuration
    - [x] Error handling and logging
    - [x] Database schema and migrations (PostgreSQL)
    - [x] Create Event API endpoints
    - [ ] Authentication system
- [ ] **Advanced Features**
    - [ ] Public Roadmap Page (`/roadmap`)
    - [ ] Timezone auto-detection for guests
    - [ ] GitHub Actions CI/CD
    - [ ] VPS deployment
