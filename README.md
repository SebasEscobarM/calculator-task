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
| [`frontend/`](frontend/)             | Next.js + TypeScript frontend                    |
| [`docs/api.md`](docs/api.md)         | API contract: endpoints, payloads, error codes   |
| [`docs/PROMPTS.md`](docs/PROMPTS.md) | AI prompts used to build the project             |

## Prerequisites

- Go 1.27+
- Node.js 22+ and npm
- Docker (optional)

## Setup

```bash
git clone https://github.com/SebasEscobarM/calculator-task.git
cd calculator-task
```

The backend has no third-party dependencies, so Go is all it needs. The frontend needs its
npm packages:

```bash
cd frontend
npm install
```

## Running the backend

```bash
cd backend
go run ./cmd/server
```

The API listens on `http://localhost:8080` and logs one JSON line per request. Stop it with
Ctrl+C: it stops accepting connections and gives in-flight requests up to 10 seconds to
finish.

| Variable | Default        | Description                                                                                         |
| -------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `PORT`   | `8080`         | Port to listen on.                                                                                  |
| `HOST`   | all interfaces | Interface to listen on. `HOST=127.0.0.1` keeps the API local and avoids the Windows Firewall prompt. |

## Running the frontend

Start the backend first, then:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`. The browser only talks to Next.js, which proxies `/api/*` to
the backend.

| Variable      | Default                 | Description                                                                                                                 |
| ------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `BACKEND_URL` | `http://localhost:8080` | Backend that `/api/*` is proxied to. Read when `npm run dev` starts or when `npm run build` runs; `npm start` keeps the build's value. |

To override it, copy [`frontend/.env.example`](frontend/.env.example) to `frontend/.env.local`.

## API examples

The full contract is in [docs/api.md](docs/api.md). With the backend running:

```bash
# 200 {"result":5}
curl -X POST http://localhost:8080/api/v1/add -H 'Content-Type: application/json' -d '{"a": 2, "b": 3}'

# 200 {"result":3}
curl -X POST http://localhost:8080/api/v1/sqrt -H 'Content-Type: application/json' -d '{"a": 9}'

# 422 {"error":{"code":"DIVISION_BY_ZERO","message":"cannot divide by zero"}}
curl -X POST http://localhost:8080/api/v1/divide -H 'Content-Type: application/json' -d '{"a": 1, "b": 0}'

# 400 {"error":{"code":"INVALID_JSON","message":"operand \"a\" must be a number"}}
curl -X POST http://localhost:8080/api/v1/add -H 'Content-Type: application/json' -d '{"a": "abc", "b": 1}'

# 200 {"status":"ok"}
curl http://localhost:8080/healthz
```

In Windows PowerShell 5.1, `curl` is an alias for `Invoke-WebRequest`, so run these in Git
Bash or use the native cmdlet:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/v1/add -ContentType 'application/json' -Body '{"a": 2, "b": 3}'
```

## Testing and coverage

Backend:

```bash
cd backend
go test ./... -cover                      # run all tests with a coverage summary
go test ./... -coverprofile=coverage.out  # write a coverage profile
go tool cover -html=coverage.out          # browse it line by line
```

CI also runs the tests with the race detector (`-race`), which needs cgo and a C compiler.

Frontend (Vitest and Testing Library):

```bash
cd frontend
npm test                # run all tests once
npm run test:coverage   # with a coverage summary; the HTML report lands in coverage/index.html
npm run lint
npm run typecheck
```

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
- **Strict request parsing.** Bodies are capped at 1 KiB, unknown fields and trailing data
  are rejected, and operands are decoded as pointers so that a missing operand is not
  mistaken for `0`.
- **JSON for every response.** Routing errors (404, 405) use the same error shape as the
  rest of the API instead of the standard library's plain-text replies.
- **Operational basics.** Structured request logs with `log/slog`, panic recovery that
  answers with a JSON 500, server timeouts against slow clients, and graceful shutdown on
  SIGINT/SIGTERM.
- **Percentage is `x / 100`**, like the `%` key of a pocket calculator: 150 × 20% = 30.
- **Floating point.** Results are IEEE-754 doubles, so `0.1 + 0.2` is
  `0.30000000000000004`. Rounding for display belongs to the frontend; exact decimal
  arithmetic is out of scope.
- **Next.js proxies the API.** A rewrite forwards `/api/*` to the Go backend, so the browser
  talks to a single origin: no CORS to configure, and the backend's address stays out of the
  client bundle.
- **A pocket calculator with immediate execution.** `2 + 3 × 4 =` evaluates left to right
  (20), like a basic calculator. Every arithmetic operation runs on the backend; the
  frontend only edits the number being typed (digits, decimal point, sign, backspace).
- **A pure state machine; effects as data.** All calculator logic lives in a reducer that
  never calls the API. When a key needs a result, the reducer stores a request with an id;
  a small hook sends it and dispatches the outcome. Every transition is therefore a pure,
  unit-tested function, and responses to cancelled requests (after AC) are ignored.
- **Twelve digits.** Input and results show at most twelve significant digits, which also
  hides floating-point noise; larger or smaller magnitudes switch to exponent notation.
- **Errors in the user's words.** The frontend maps error codes to short messages such as
  "Cannot divide by zero"; the backend's `message` is meant for developers. While the
  backend is down, the proxy answers with a plain-text 500, which the client reports as
  "Calculator service unavailable".

## AI usage

This project was built with Claude Code. Every prompt is logged in
[docs/PROMPTS.md](docs/PROMPTS.md).
