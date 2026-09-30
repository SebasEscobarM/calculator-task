package httpapi

import (
	"encoding/json"
	"net/http"
)

// Error codes sent to clients. They are part of the API contract in
// docs/api.md and clients may depend on them, so never rename one.
const (
	codeInvalidJSON      = "INVALID_JSON"
	codeMissingOperand   = "MISSING_OPERAND"
	codeUnknownOperation = "UNKNOWN_OPERATION"
	codeNotFound         = "NOT_FOUND"
	codeMethodNotAllowed = "METHOD_NOT_ALLOWED"
	codePayloadTooLarge  = "PAYLOAD_TOO_LARGE"
	codeDivisionByZero   = "DIVISION_BY_ZERO"
	codeInvalidOperand   = "INVALID_OPERAND"
	codeResultOutOfRange = "RESULT_OUT_OF_RANGE"
	codeInternal         = "INTERNAL_ERROR"
)

// apiError is an error response: the HTTP status plus the code and message
// sent to the client. The message must be safe for clients to see.
type apiError struct {
	status  int
	code    string
	message string
}

var errInternal = &apiError{http.StatusInternalServerError, codeInternal, "internal server error"}

// errorResponse is the JSON body of every error response.
type errorResponse struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *apiError) body() errorResponse {
	return errorResponse{Error: errorDetail{Code: e.code, Message: e.message}}
}

func writeError(w http.ResponseWriter, e *apiError) {
	writeJSON(w, e.status, e.body())
}

// writeJSON sends body as JSON with the given status.
func writeJSON(w http.ResponseWriter, status int, body any) {
	data, err := json.Marshal(body)
	if err != nil {
		// Only reachable through a bug, such as a NaN result. Encoding before
		// writing anything means the client still gets a clean 500 instead of
		// a success status with a broken body.
		status = errInternal.status
		data, _ = json.Marshal(errInternal.body()) // Plain strings always encode.
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(append(data, '\n'))
}
