// Package httpapi exposes the calculator as a JSON REST API. The contract it
// implements is documented in docs/api.md at the repository root.
package httpapi

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/SebasEscobarM/calculator-task/backend/internal/calculator"
)

// NewHandler returns the root handler of the API, with request logging and
// panic recovery applied.
func NewHandler(logger *slog.Logger) http.Handler {
	h := &handler{logger: logger}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/{operation}", h.calculate)
	mux.HandleFunc("GET /healthz", health)

	// Patterns without a method are less specific than the ones above, so they
	// only receive the requests those reject. They answer in JSON, like every
	// other response, instead of the mux's plain-text 404 and 405.
	mux.HandleFunc("/api/v1/{operation}", methodNotAllowed(http.MethodPost))
	mux.HandleFunc("/healthz", methodNotAllowed("GET, HEAD"))
	mux.HandleFunc("/", notFound)

	return logRequests(logger, recoverPanics(logger, mux))
}

type handler struct {
	logger *slog.Logger
}

type calculationResponse struct {
	Result float64 `json:"result"`
}

type healthResponse struct {
	Status string `json:"status"`
}

// calculate serves POST /api/v1/{operation}.
func (h *handler) calculate(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("operation")
	op, ok := calculator.Lookup(name)
	if !ok {
		writeError(w, &apiError{http.StatusNotFound, codeUnknownOperation, fmt.Sprintf("unknown operation %q", name)})
		return
	}

	operands, apiErr := readOperands(w, r, op.Arity)
	if apiErr != nil {
		writeError(w, apiErr)
		return
	}

	result, err := op.Apply(operands...)
	if err != nil {
		writeError(w, h.calculationError(op, err))
		return
	}
	writeJSON(w, http.StatusOK, calculationResponse{Result: result})
}

// calculationErrors maps calculator errors to their API codes. All of them
// are 422: the request was well-formed, but the math is undefined or its
// result cannot be represented.
var calculationErrors = []struct {
	err  error
	code string
}{
	{calculator.ErrDivisionByZero, codeDivisionByZero},
	{calculator.ErrInvalidOperand, codeInvalidOperand},
	{calculator.ErrResultOutOfRange, codeResultOutOfRange},
}

// calculationError converts an error from the calculator into an API error.
// Unexpected errors are logged and hidden behind a generic 500.
func (h *handler) calculationError(op calculator.Operation, err error) *apiError {
	for _, known := range calculationErrors {
		if errors.Is(err, known.err) {
			return &apiError{http.StatusUnprocessableEntity, known.code, err.Error()}
		}
	}
	h.logger.Error("unexpected calculation error", "operation", op.Name, "error", err)
	return errInternal
}

func health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
}

func notFound(w http.ResponseWriter, r *http.Request) {
	writeError(w, &apiError{http.StatusNotFound, codeNotFound, fmt.Sprintf("no route for %s %s", r.Method, r.URL.Path)})
}

// methodNotAllowed answers requests to an existing path with a method it does
// not accept. allow lists the accepted methods for the Allow header.
func methodNotAllowed(allow string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Allow", allow)
		writeError(w, &apiError{http.StatusMethodNotAllowed, codeMethodNotAllowed,
			fmt.Sprintf("method %s is not allowed; use %s", r.Method, allow)})
	}
}
