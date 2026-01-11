# AgreedTime

> **Modern scheduling made simple.**  
> Create polls, collect availability, and find the best time for your group in seconds—no login required.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-beta-orange)

**AgreedTime** is a privacy-focused, high-performance scheduling tool built with **Rust** and **Astro**. It focuses on speed, simplicity, and a "clean up after yourself" data policy.

## ✨ Key Features

*   **No Accounts Needed**: Uses secure "Capability URLs" (Token-based access). One link for the organizer to manage, another for participants to vote.
*   **Privacy First**: Events and all associated data are automatically deleted 7 days after creation.
*   **Timezone Smart**: Handling specific time slots in UTC while respecting local user context.
*   **Mobile Optimized**: "Paint" your availability on touch screens with a custom-built grid interactions.
*   **High Performance**: Powered by a Rust backend and an SSR-optimized frontend.

## 🛠 Tech Stack

### Backend
*   **Language**: Rust 🦀
*   **Framework**: [Axum](https://github.com/tokio-rs/axum)
*   **Database**: PostgreSQL with [SQLx](https://github.com/launchbadge/sqlx) (Compile-time checked queries)
*   **Runtime**: Tokio

### Frontend
*   **Framework**: [Astro](https://astro.build/) (Server-Side Rendering mode)
*   **UI Library**: React (for complex interactive islands)
*   **Styling**: Tailwind CSS
*   **State**: Local state + optimistic UI updates

### Infrastructure
*   **Containerization**: Docker & Docker Compose
*   **Reverse Proxy**: Caddy (Production)
*   **Task Runner**: `just`

## 🚀 Getting Started

### Prerequisites
*   [Docker Desktop](https://www.docker.com/) (or OrbStack)
*   [Just](https://github.com/casey/just) (`brew install just`)
*   Node.js & npm
*   Rust (Cargo)

### Quick Start

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/agreed-time.git
    cd agreed-time
    ```

2.  **Bootstrap the environment**:
    We provide a helper script to check dependencies, setup the `.env` files, and initialize the database.
    ```bash
    ./scripts/bootstrap.sh
    ```

3.  **Run Locally**:
    *   **Database**: Start the postgres container.
        ```bash
        docker compose up -d
        ```
    *   **Backend**:
        ```bash
        cd backend && cargo run
        # Server runs at http://localhost:3000
        ```
    *   **Frontend**:
        ```bash
        cd frontend && npm run dev
        # Frontend runs at http://localhost:4321
        ```

### Development Commands

We use `just` to manage common development tasks. Run `just` to see all available commands.

```bash
just fix    # Format code & update SQLx cache (Run this often!)
just check  # Run format checks, linters (clippy), and type checks
just ci     # Run full test suite (backend + frontend)
```

## 📚 Documentation
-
-*   **[Interview & Architecture Guide](./knowledge/agreed-time-interview-guide.md)**: A high-level overview of technical decisions and potential interview questions.
-*   **[Architecture Decisions (ADR)](./docs/architecture/decisions.md)**: Why we chose atomic rows, SSR, and capability URLs.
-*   **[Developer Guide](./docs/developer/guide.md)**: Code standards and contribution workflow.

## 🗺 Roadmap

- [x] **Core Functionality**
    - [x] Event Creation (Organizer View)
    - [x] Participant Availability Voting (Guest View)
    - [x] **Secure Edit Mode**: Token-based editing for participants
    - [x] Heatmap Result Visualization
    - [x] "Business Hours" auto-expansion logic
- [x] **Technical Foundation**
    - [x] Rust + Axum Backend with SQLx
    - [x] Astro SSR + React Islands Frontend
    - [x] **Timezone Auto-detection**: Support for local time context
    - [x] Docker + Docker Compose Setup
    - [x] GitHub Actions CI/CD Pipeline
- [ ] **Upcoming**
    - [ ] **Calendar Integration**: Import/Export (e.g. Google Calendar) to simplify slot selection
    - [ ] Email Notifications (Optional)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

> **Note:** The name "AgreedTime" and the logo are trademarks and not included in the open-source license. See `TRADEMARKS.md` for details.