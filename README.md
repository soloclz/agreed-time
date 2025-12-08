# AgreedTime

Modern scheduling made simple. Create polls, collect availability, and find the best time for your group in seconds.

## Documentation

*   **[Developer Guide](./docs/DEVELOPER_GUIDE.md)**: Architecture, code standards, and contribution workflow.
*   **[Product Spec](./docs/PRODUCT_SPEC.md)**: Functional requirements and design specifications.
*   **[Learning Notes](./docs/learning/)**: Technical deep dives and architectural decisions.

## Getting Started

### Prerequisites
*   Docker Desktop (or OrbStack)
*   Node.js & npm
*   Rust (Cargo)

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
