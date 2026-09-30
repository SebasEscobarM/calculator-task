// Command server runs the calculator REST API.
//
// It is configured through the environment:
//
//	HOST  interface to listen on (default: all interfaces)
//	PORT  port to listen on (default: 8080)
package main

import (
	"cmp"
	"context"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/SebasEscobarM/calculator-task/backend/internal/httpapi"
)

// shutdownTimeout bounds how long in-flight requests may take to finish once
// a shutdown starts.
const shutdownTimeout = 10 * time.Second

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	addr := net.JoinHostPort(os.Getenv("HOST"), cmp.Or(os.Getenv("PORT"), "8080"))

	if err := run(logger, addr); err != nil {
		logger.Error("server failed", "error", err)
		os.Exit(1)
	}
	logger.Info("server stopped")
}

// run serves the API on addr until the process receives an interrupt or
// SIGTERM, then shuts down gracefully.
func run(logger *slog.Logger, addr string) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	return serve(ctx, logger, ln)
}

// serve runs the API on ln until ctx is done. It then stops accepting
// connections and waits up to shutdownTimeout for in-flight requests.
func serve(ctx context.Context, logger *slog.Logger, ln net.Listener) error {
	srv := &http.Server{
		Handler:           httpapi.NewHandler(logger),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
		ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}

	serveErr := make(chan error, 1)
	go func() { serveErr <- srv.Serve(ln) }()
	logger.Info("server listening", "addr", ln.Addr().String())

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
	}

	logger.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}
