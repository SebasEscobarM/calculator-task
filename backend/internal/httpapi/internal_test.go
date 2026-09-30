package httpapi

// White-box tests for defensive paths that no HTTP request can reach: panics,
// unexpected calculator errors and response encoding failures.

import (
	"bytes"
	"errors"
	"log/slog"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/SebasEscobarM/calculator-task/backend/internal/calculator"
)

func TestRecoverPanicsReturnsInternalError(t *testing.T) {
	var logs bytes.Buffer
	h := recoverPanics(slog.New(slog.NewJSONHandler(&logs, nil)), http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	}))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	assertInternalError(t, rec)
	if !strings.Contains(logs.String(), "boom") {
		t.Errorf("logs = %q, want the panic value logged", logs.String())
	}
}

func TestRecoverPanicsLetsAbortHandlerThrough(t *testing.T) {
	h := recoverPanics(slog.New(slog.DiscardHandler), http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic(http.ErrAbortHandler)
	}))

	defer func() {
		if rec := recover(); rec != http.ErrAbortHandler {
			t.Errorf("recovered %v, want http.ErrAbortHandler to propagate", rec)
		}
	}()
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
}

func TestCalculationErrorHidesUnexpectedErrors(t *testing.T) {
	var logs bytes.Buffer
	h := &handler{logger: slog.New(slog.NewJSONHandler(&logs, nil))}
	op, _ := calculator.Lookup("add")

	if got := h.calculationError(op, errors.New("unexpected failure")); got != errInternal {
		t.Errorf("calculationError = %+v, want errInternal", got)
	}
	if !strings.Contains(logs.String(), "unexpected failure") {
		t.Errorf("logs = %q, want the original error logged", logs.String())
	}
}

func TestWriteJSONNeverSendsABrokenBody(t *testing.T) {
	rec := httptest.NewRecorder()
	writeJSON(rec, http.StatusOK, math.NaN()) // NaN cannot be encoded as JSON.
	assertInternalError(t, rec)
}

func assertInternalError(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `"code":"INTERNAL_ERROR"`) {
		t.Errorf("body = %s, want an INTERNAL_ERROR response", rec.Body)
	}
}
