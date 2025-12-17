# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Asynqmon is a web UI tool for monitoring and administering [Asynq](https://github.com/hibiken/asynq) task queues. It provides both a standalone binary and a Go library that can be embedded into web applications. The project integrates with Prometheus for time-series metrics.

**Key Technologies:**
- Backend: Go 1.16+, gorilla/mux for routing, Redis client (v9)
- Frontend: React 16, TypeScript, Material-UI, Redux Toolkit
- Build: Embedded filesystem (go:embed), multi-stage Docker builds

## Version Compatibility

Asynqmon versions are tightly coupled to Asynq versions. Before making changes, ensure compatibility:
- Asynq 0.23.x → Asynqmon 0.7.x
- Asynq 0.22.x → Asynqmon 0.6.x
- See README.md for full compatibility matrix

## Build Commands

### Full build (requires Node.js and Yarn)
```bash
make build
```
This builds frontend assets (React app) then compiles the Go binary with embedded UI files.

### Backend-only build (skip UI rebuild)
```bash
make api
```
Use during backend development to avoid rebuilding UI assets.

### Frontend development
```bash
cd ui
yarn install
yarn start    # Starts dev server on localhost:3000
yarn build    # Production build
yarn test     # Run React tests
```

### Docker
```bash
make docker   # Build image and run container
```

### Running tests
```bash
go test ./...                    # Run all Go tests
go test ./cmd/asynqmon/...       # Run specific package tests
cd ui && yarn test               # Run React tests
```

## Architecture

### Backend Structure

The backend is organized around HTTP handlers that wrap the `asynq.Inspector` API:

1. **Entry Point** ([cmd/asynqmon/main.go](cmd/asynqmon/main.go))
   - Parses flags and environment variables
   - Creates Redis connection (supports single instance, cluster, sentinel)
   - Initializes HTTP server with optional CORS and Prometheus metrics exporter

2. **HTTP Handler** ([handler.go](handler.go))
   - `HTTPHandler` wraps a gorilla/mux router
   - Can be used standalone or embedded in existing web apps with custom `RootPath`
   - Supports read-only mode via middleware

3. **API Routes** (defined in `muxRouter()` in [handler.go](handler.go))
   - Queue operations: `/api/queues/{qname}` - list, get, delete, pause, resume
   - Task operations: `/api/queues/{qname}/{state}_tasks` - list, delete, archive, run tasks by state (active, pending, scheduled, retry, archived, completed, aggregating)
   - Group operations: `/api/queues/{qname}/groups/{gname}` - manage task groups
   - Server monitoring: `/api/servers` - view active workers
   - Scheduler: `/api/scheduler_entries` - view scheduled job entries
   - Redis info: `/api/redis_info` - Redis server stats
   - Metrics: `/api/metrics` - query Prometheus time-series data

4. **Handler Files** (organized by domain)
   - [queue_handlers.go](queue_handlers.go) - queue CRUD and state management
   - [task_handlers.go](task_handlers.go) - task lifecycle operations (cancel, archive, delete, run)
   - [group_handlers.go](group_handlers.go) - task group operations
   - [server_handlers.go](server_handlers.go) - worker/server monitoring
   - [scheduler_entry_handlers.go](scheduler_entry_handlers.go) - scheduler entries
   - [redis_info_handlers.go](redis_info_handlers.go) - Redis stats
   - [metrics_handler.go](metrics_handler.go) - Prometheus integration

5. **Static File Serving** ([static.go](static.go))
   - `uiAssetsHandler` serves React SPA from embedded filesystem
   - Uses Go template delimiters `/[[` and `]]` (webpack escapes `{{`)
   - Injects `RootPath`, `PrometheusAddr`, and `ReadOnly` into index.html
   - Falls back to index.html for client-side routing

6. **Type Conversions** ([conversion_helpers.go](conversion_helpers.go))
   - Converts between `asynq` types and JSON API types
   - Handles payload/result formatting with customizable formatters

### Frontend Structure

React single-page application in [ui/src/](ui/src/):

1. **Views** ([ui/src/views/](ui/src/views/))
   - `DashboardView.tsx` - Queue overview with stats
   - `TasksView.tsx` - Task list by state (pending, active, scheduled, etc.)
   - `TaskDetailsView.tsx` - Individual task details
   - `MetricsView.tsx` - Prometheus time-series charts
   - `ServersView.tsx` - Active workers and servers
   - `SchedulersView.tsx` - Scheduler entries
   - `RedisInfoView.tsx` - Redis server information
   - `SettingsView.tsx` - UI preferences and dark mode

2. **State Management**
   - Redux Toolkit with slices in [ui/src/reducers/](ui/src/reducers/)
   - Actions in [ui/src/actions/](ui/src/actions/)
   - API client: [ui/src/api.ts](ui/src/api.ts)

3. **Components** ([ui/src/components/](ui/src/components/))
   - Task tables for each state (PendingTasksTable, ActiveTasksTable, etc.)
   - Charts (QueueMetricsChart, DailyStatsChart, ProcessedTasksChart)
   - Reusable UI elements (SyntaxHighlighter, Tooltip, TableActions)

### Embedded Filesystem

The UI is embedded into the Go binary using `//go:embed ui/build/*` in [handler.go](handler.go). When building:
1. Frontend assets are built to `ui/build/`
2. Go compiler embeds these files into the binary
3. Runtime serves files from `staticContents` embed.FS

### Redis Connection Patterns

The codebase supports three Redis deployment modes (configured in [cmd/asynqmon/main.go](cmd/asynqmon/main.go)):

1. **Single Redis instance**: `--redis-addr` or `--redis-url`
2. **Redis Sentinel**: `--redis-url=redis-sentinel://...`
3. **Redis Cluster**: `--redis-cluster-nodes`

All modes support TLS via `--redis-tls` and `--redis-insecure-tls`.

### Prometheus Integration

When `--enable-metrics-exporter` is set:
- Registers `metrics.NewQueueMetricsCollector` with Prometheus registry
- Exposes `/metrics` endpoint for scraping
- When `--prometheus-addr` is provided, UI queries Prometheus for time-series data

## Development Workflow

### Making Backend Changes

1. Modify handler or add new endpoints in appropriate `*_handlers.go` file
2. Update routing in `muxRouter()` in [handler.go](handler.go)
3. Add/update type conversions in [conversion_helpers.go](conversion_helpers.go)
4. Test with `make api` (skips UI rebuild) and run the binary

### Making Frontend Changes

1. Start backend: `./asynqmon --redis-addr=localhost:6379`
2. In separate terminal: `cd ui && yarn start`
3. Frontend dev server (localhost:3000) proxies API requests to backend
4. Make changes to React components/views
5. When ready: `cd ui && yarn build` then rebuild backend with `make build`

### Adding New Task States or Operations

Task operations follow a pattern across multiple files:

1. Add handler function in [task_handlers.go](task_handlers.go) (e.g., `newListXXXTasksHandlerFunc`)
2. Register route in [handler.go](handler.go) `muxRouter()`
3. Add corresponding API calls in [ui/src/api.ts](ui/src/api.ts)
4. Create Redux actions in [ui/src/actions/tasksActions.ts](ui/src/actions/tasksActions.ts)
5. Update reducers in [ui/src/reducers/tasksReducer.ts](ui/src/reducers/tasksReducer.ts)
6. Add/update table component in [ui/src/components/](ui/src/components/)

### Read-Only Mode

When `--read-only` flag is set, the `restrictToReadOnly` middleware blocks all non-GET requests. This is useful for public-facing dashboards.

## Running Locally

```bash
# Start with default settings (connects to localhost:6379)
./asynqmon

# Custom port and Redis connection
./asynqmon --port=3000 --redis-addr=localhost:6380 --redis-password=secret

# With Prometheus integration
./asynqmon --enable-metrics-exporter --prometheus-addr=http://localhost:9090

# Read-only mode
./asynqmon --read-only
```

## Using as a Library

Import asynqmon into your Go web application:

```go
import "github.com/hibiken/asynqmon"

h := asynqmon.New(asynqmon.Options{
    RootPath:     "/monitoring",  // URL path prefix
    RedisConnOpt: asynq.RedisClientOpt{Addr: ":6379"},
})
defer h.Close()

// Mount with net/http (note trailing slash required)
http.Handle(h.RootPath()+"/", h)

// Or with gorilla/mux
r := mux.NewRouter()
r.PathPrefix(h.RootPath()).Handler(h)
```

## Important Patterns

### Payload and Result Formatting

Custom formatters can be provided via `Options.PayloadFormatter` and `Options.ResultFormatter` to control how task payloads and results display in the UI. See [cmd/asynqmon/main.go](cmd/asynqmon/main.go) `payloadFormatterFunc()` and `resultFormatterFunc()` for truncation example.

### Pagination

List endpoints support pagination via query params `page` (1-indexed) and `size`. Extract with `getPageOptions(r)` helper.

### Error Handling

Handlers check for specific `asynq` errors (e.g., `asynq.ErrQueueNotFound`, `asynq.ErrQueueNotEmpty`) to return appropriate HTTP status codes.

## Known Quirks

- Frontend `package.json` uses custom template delimiter `/[[` in `homepage` field due to webpack escaping `{{`
- MIME type for `.js` files is manually set to `application/javascript` in [static.go](static.go) for security reasons
- The `ui/build/` directory is committed to the repository (usually gitignored in React projects) because it's needed for `go:embed`
