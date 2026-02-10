# FORGE - Field Operations and Resource Governance Engine

AI-powered field service management platform that intelligently routes, schedules, and assigns service tickets to field workers using LLM-driven severity analysis, skill matching, and route optimization.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                      │
│  Dashboard │ Tickets │ Workers │ Dispatch │ Analytics      │
└──────────────────────┬───────────────────────────────────┘
                       │ REST API
┌──────────────────────┴───────────────────────────────────┐
│                  Backend (FastAPI)                         │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ LLM Service │  │  Assignment  │  │  Optimization   │  │
│  │  (Claude)   │  │   Engine     │  │    Service      │  │
│  └─────────────┘  └──────────────┘  └─────────────────┘  │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Tickets   │  │   Workers    │  │  Assignments    │  │
│  │   Routes    │  │   Routes     │  │    Routes       │  │
│  └─────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────────────┬───────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │       PostgreSQL          │
         │   (Tickets, Workers,      │
         │    Assignments, etc.)     │
         └───────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS v4, Lucide Icons |
| Backend | Python, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| AI/LLM | Anthropic Claude API |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |

## Features

### AI-Powered Ticket Analysis
- Natural language parsing of service requests
- Automatic severity classification (P1-P4)
- Equipment and category detection
- Skills requirement extraction
- Time estimation
- Troubleshooting guide generation

### Intelligent Worker Assignment
- Weighted multi-factor scoring algorithm
  - Skill match (40%) - Required skills vs worker capabilities
  - Proximity (30%) - Haversine distance calculation
  - Availability (20%) - Current workload and status
  - Performance (10%) - Historical rating and fix rate
- Automatic best-match selection
- Manual override with ranked candidates view

### Route Optimization
- Nearest-neighbor TSP heuristic for single-worker routes
- Geographic clustering for fleet-wide optimization
- Dynamic ETA calculation
- Multi-stop route planning

### Dispatcher Dashboard
- Real-time severity board with P1-P4 counts
- Active assignments with progress tracking
- Unassigned ticket queue sorted by SLA urgency
- One-click auto-assignment
- Quick status update controls

### Customer Portal (Chat + AI Agent)
- **URL**: `/portal` — chat-like interface for customers
- **Auth**: Email or mobile + OTP (one-time code); JWT session
- **Flow**: AI agent asks for service type and problem, then:
  1. **Troubleshoot first**: Uses Claude to search/generate step-by-step troubleshooting and presents it to the customer
  2. **Create ticket if needed**: If the customer says it didn’t work or they need a technician, the agent creates a service request (ticket) in the backend, assigns severity via LLM, and continues the normal FORGE flow
- **Orchestration**: Backend conversation agent uses Claude with tools:
  - `search_troubleshooting` — generate troubleshooting steps (calls existing LLM service)
  - `create_ticket` — create ticket with AI severity/category and link to customer
- Conversations and messages are stored; each conversation can be linked to a ticket when one is created

### SLA Management
- Automatic SLA deadline calculation based on severity
- P1 Critical: < 2 hours
- P2 High: < 4 hours
- P3 Medium: < 24 hours
- P4 Low: < 72 hours
- SLA breach alerts and countdown timers

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (for PostgreSQL and Redis)

### 1. Start Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379).

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (optional: add your Anthropic API key)
cp .env.example .env
# Edit .env to add ANTHROPIC_API_KEY for AI-powered analysis

# Seed the database with demo data
python -m seed_data

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000 with interactive docs at http://localhost:8000/docs.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at http://localhost:3000.

- **Dispatcher/Admin**: http://localhost:3000 (dashboard, tickets, workers, dispatch, analytics)
- **Customer Portal**: http://localhost:3000/portal (chat UI; sign in with email or phone + OTP)

## API Endpoints

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tickets` | Create ticket (triggers AI analysis) |
| GET | `/api/tickets` | List tickets (with filters) |
| GET | `/api/tickets/{id}` | Get ticket details |
| PATCH | `/api/tickets/{id}` | Update ticket |
| POST | `/api/tickets/{id}/analyze` | Re-analyze with AI |
| GET | `/api/tickets/{id}/candidates` | Get ranked worker candidates |

### Workers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workers` | Create worker |
| GET | `/api/workers` | List workers (with filters) |
| GET | `/api/workers/{id}` | Get worker details |
| PATCH | `/api/workers/{id}` | Update worker |
| PATCH | `/api/workers/{id}/location` | Update GPS location |
| PATCH | `/api/workers/{id}/status` | Update availability |

### Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assignments` | Create assignment |
| GET | `/api/assignments` | List assignments |
| PATCH | `/api/assignments/{id}` | Update assignment status |
| POST | `/api/assignments/auto-assign/{ticket_id}` | Auto-assign best worker |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/dashboard/map-data` | Live map data |
| GET | `/api/dashboard/sla-alerts` | SLA breach alerts |

### Customer Portal
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/portal/auth/request-otp` | Send OTP to email or phone |
| POST | `/api/portal/auth/verify-otp` | Verify OTP, return JWT + customer |
| POST | `/api/portal/conversations` | Start new conversation (Bearer JWT) |
| GET | `/api/portal/conversations` | List conversations (Bearer JWT) |
| GET | `/api/portal/conversations/{id}` | Get conversation + messages (Bearer JWT) |
| POST | `/api/portal/conversations/{id}/messages` | Send message, get AI reply (Bearer JWT) |

## Project Structure

```
FORGE/
├── docker-compose.yml          # PostgreSQL + Redis
├── README.md
├── backend/
│   ├── requirements.txt
│   ├── .env                    # Environment configuration
│   ├── seed_data.py            # Demo data seeder
│   └── app/
│       ├── main.py             # FastAPI application
│       ├── config.py           # Settings management
│       ├── database.py         # SQLAlchemy async setup
│       ├── models/             # SQLAlchemy ORM models
│       │   ├── ticket.py
│       │   ├── worker.py
│       │   ├── assignment.py
│       │   └── customer.py
│       ├── schemas/            # Pydantic validation schemas
│       │   ├── ticket.py
│       │   ├── worker.py
│       │   ├── assignment.py
│       │   ├── customer.py
│       │   └── dashboard.py
│       ├── routes/             # API endpoint handlers
│       │   ├── tickets.py
│       │   ├── workers.py
│       │   ├── assignments.py
│       │   ├── customers.py
│       │   └── dashboard.py
│       ├── services/           # Business logic
│       │   ├── llm_service.py          # Anthropic Claude integration
│       │   ├── assignment_service.py   # Worker matching algorithm
│       │   ├── optimization_service.py # Route optimization (TSP)
│       │   └── notification_service.py # Notification placeholders
│       └── utils/
│           └── scoring.py      # SLA calculations, haversine
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    └── src/
        ├── lib/
        │   └── api.ts          # API client + TypeScript types
        └── app/
            ├── layout.tsx      # Sidebar navigation layout
            ├── globals.css     # Tailwind + glassmorphism styles
            ├── page.tsx        # Dashboard
            ├── tickets/
            │   ├── page.tsx    # Ticket list
            │   ├── new/page.tsx # New ticket form
            │   └── [id]/page.tsx # Ticket detail
            ├── workers/page.tsx # Worker management
            ├── dispatch/page.tsx # Dispatch center
            └── analytics/page.tsx # Analytics
```

## Severity Classification

| Level | Name | SLA Response | Criteria |
|-------|------|-------------|----------|
| P1 | Critical | < 2 hours | Service down, safety hazard, major revenue impact |
| P2 | High | < 4 hours | Degraded service, equipment malfunction |
| P3 | Medium | < 24 hours | Single user affected, workaround available |
| P4 | Low | < 72 hours | Cosmetic issues, enhancement requests |

## Worker Matching Algorithm

The assignment engine scores workers using a weighted multi-factor algorithm:

```
Overall Score = 0.40 × Skill Match
             + 0.30 × Proximity
             + 0.20 × Availability
             + 0.10 × Performance History
```

- **Skill Match**: Ratio of matching skills to required skills, with bonus for higher skill levels
- **Proximity**: Inverse of haversine distance (max 100km), normalized 0-1
- **Availability**: Based on current status and daily capacity
- **Performance**: Weighted blend of rating (60%) and first-time fix rate (40%)

## License

MIT
