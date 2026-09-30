# Calculator

A full-stack calculator: a Go REST microservice performs the arithmetic, and a Next.js
(React + TypeScript) frontend consumes it.

> **Work in progress.** Sections marked _pending_ are filled in as each part lands.

## Features

- Basic operations: addition, subtraction, multiplication, division.
- Advanced operations: exponentiation, square root, percentage.
- Input validation and consistent JSON errors for edge cases such as division by zero,
  invalid data and overflow.

## Repository layout

| Path                                 | Contents                                         |
| ------------------------------------ | ------------------------------------------------ |
| [`backend/`](backend/)               | Go REST API (standard library only)              |
| `frontend/`                          | Next.js + TypeScript UI (_pending_)              |
| [`docs/api.md`](docs/api.md)         | API contract: endpoints, payloads, error codes   |
| [`docs/PROMPTS.md`](docs/PROMPTS.md) | AI prompts used to build the project             |

## Prerequisites

- Go 1.27+
- Node.js 22+ and npm
- Docker (optional)

## Setup

_Pending._

## Running the backend

_Pending._

## Running the frontend

_Pending._

## API examples

The full contract is in [docs/api.md](docs/api.md). `curl` examples: _pending_.

## Testing and coverage

Backend:

```bash
cd backend
go test ./... -cover
```

Frontend: _pending_.

## Design decisions and assumptions

- **Go standard library only.** `net/http` routing, `encoding/json`, `log/slog` and
  `testing` cover everything the service needs, so there are no third-party dependencies
  to audit or update.
- **Pure domain package.** `backend/internal/calculator` has no HTTP concerns: operations
  are plain functions returning `(float64, error)`, and a small registry maps operation
  names to them. That registry is the single source of truth for what the API supports.
- **One endpoint per operation** (`POST /api/v1/{operation}`) with JSON bodies. Typed JSON
  numbers keep validation simple, and each operation reads clearly in examples.
- **Errors instead of special float values.** Division by zero, operands outside an
  operation's domain and overflow are explicit errors, so the API never returns `Inf` or
  `NaN` (which JSON cannot represent anyway). Negative zero is normalized to `0`.
- **400 vs 422.** 400 means the request is malformed; 422 means it is well-formed but the
  math is undefined or cannot be represented.
- **Percentage is `x / 100`**, like the `%` key of a pocket calculator: 150 × 20% = 30.
- **Floating point.** Results are IEEE-754 doubles, so `0.1 + 0.2` is
  `0.30000000000000004`. Rounding for display belongs to the frontend; exact decimal
  arithmetic is out of scope.

## AI usage

This project was built with Claude Code. Every prompt is logged in
[docs/PROMPTS.md](docs/PROMPTS.md).
