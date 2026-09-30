# Build a static binary. Without cgo it needs no C libraries at runtime.
FROM golang:1.27-alpine3.24 AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM alpine:3.24
RUN adduser -D -H -u 10001 app
COPY --from=build /out/server /usr/local/bin/server
USER app
EXPOSE 8080
# Alpine ships BusyBox wget, so the health check needs no extra packages.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --start-interval=1s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["server"]
