package httpapi_test

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/SebasEscobarM/calculator-task/backend/internal/httpapi"
)

// response is the union of every response body in the contract. It is
// decoded with DisallowUnknownFields, so any undocumented field fails a test.
type response struct {
	Result *float64 `json:"result"`
	Status string   `json:"status"`
	Error  *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func TestCalculate(t *testing.T) {
	tests := []struct {
		name       string
		operation  string
		body       string
		wantStatus int
		wantResult float64 // Checked only when wantCode is empty.
		wantCode   string
	}{
		// One success per operation, with the examples from docs/api.md.
		{name: "add", operation: "add", body: `{"a": 2, "b": 3}`, wantStatus: 200, wantResult: 5},
		{name: "subtract", operation: "subtract", body: `{"a": 2, "b": 3}`, wantStatus: 200, wantResult: -1},
		{name: "multiply", operation: "multiply", body: `{"a": 2, "b": 3}`, wantStatus: 200, wantResult: 6},
		{name: "divide", operation: "divide", body: `{"a": 7, "b": 2}`, wantStatus: 200, wantResult: 3.5},
		{name: "power", operation: "power", body: `{"a": 2, "b": 10}`, wantStatus: 200, wantResult: 1024},
		{name: "sqrt", operation: "sqrt", body: `{"a": 9}`, wantStatus: 200, wantResult: 3},
		{name: "percentage", operation: "percentage", body: `{"a": 20}`, wantStatus: 200, wantResult: 0.2},
		{name: "zero is a valid operand", operation: "add", body: `{"a": 0, "b": 0}`, wantStatus: 200, wantResult: 0},
		{name: "negative decimals", operation: "subtract", body: `{"a": -1.5, "b": 2.25}`, wantStatus: 200, wantResult: -3.75},

		// 422: well-formed requests whose math is undefined or unrepresentable.
		{name: "division by zero", operation: "divide", body: `{"a": 1, "b": 0}`, wantStatus: 422, wantCode: "DIVISION_BY_ZERO"},
		{name: "square root of a negative number", operation: "sqrt", body: `{"a": -4}`, wantStatus: 422, wantCode: "INVALID_OPERAND"},
		{name: "zero to a negative power", operation: "power", body: `{"a": 0, "b": -1}`, wantStatus: 422, wantCode: "INVALID_OPERAND"},
		{name: "result overflows", operation: "power", body: `{"a": 10, "b": 400}`, wantStatus: 422, wantCode: "RESULT_OUT_OF_RANGE"},

		// 400: malformed requests.
		{name: "empty body", operation: "add", body: ``, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "malformed JSON", operation: "add", body: `{"a": 1,`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "operand is not a number", operation: "add", body: `{"a": "abc", "b": 1}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "operand does not fit in a double", operation: "add", body: `{"a": 1e400, "b": 1}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "body is not an object", operation: "add", body: `[2, 3]`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "unknown field", operation: "add", body: `{"a": 1, "b": 2, "c": 3}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "second operand on a unary operation", operation: "sqrt", body: `{"a": 9, "b": 1}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "more than one JSON value", operation: "add", body: `{"a": 1, "b": 2} {"a": 3}`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "trailing garbage", operation: "add", body: `{"a": 1, "b": 2} xyz`, wantStatus: 400, wantCode: "INVALID_JSON"},
		{name: "missing operand", operation: "add", body: `{"a": 1}`, wantStatus: 400, wantCode: "MISSING_OPERAND"},
		{name: "null operand", operation: "add", body: `{"a": null, "b": 1}`, wantStatus: 400, wantCode: "MISSING_OPERAND"},
		{name: "missing unary operand", operation: "sqrt", body: `{}`, wantStatus: 400, wantCode: "MISSING_OPERAND"},

		{name: "unknown operation", operation: "modulo", body: `{"a": 1, "b": 2}`, wantStatus: 404, wantCode: "UNKNOWN_OPERATION"},
		{name: "body too large", operation: "add", body: `{"a": 1, "b": 2` + strings.Repeat(" ", 2048) + `}`, wantStatus: 413, wantCode: "PAYLOAD_TOO_LARGE"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := serve(t, http.MethodPost, "/api/v1/"+tc.operation, tc.body)
			resp := decodeResponse(t, rec, tc.wantStatus)
			if tc.wantCode != "" {
				assertErrorCode(t, resp, tc.wantCode)
				return
			}
			if resp.Error != nil || resp.Result == nil || *resp.Result != tc.wantResult {
				t.Errorf("body = %s, want result %v", rec.Body, tc.wantResult)
			}
		})
	}
}

func TestRouting(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		path       string
		wantStatus int
		wantCode   string
		wantAllow  string
	}{
		{name: "wrong method on an operation", method: http.MethodGet, path: "/api/v1/add", wantStatus: 405, wantCode: "METHOD_NOT_ALLOWED", wantAllow: "POST"},
		{name: "wrong method on the health check", method: http.MethodPost, path: "/healthz", wantStatus: 405, wantCode: "METHOD_NOT_ALLOWED", wantAllow: "GET, HEAD"},
		{name: "unknown path", method: http.MethodGet, path: "/nope", wantStatus: 404, wantCode: "NOT_FOUND"},
		{name: "path below an operation", method: http.MethodPost, path: "/api/v1/add/extra", wantStatus: 404, wantCode: "NOT_FOUND"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := serve(t, tc.method, tc.path, "")
			assertErrorCode(t, decodeResponse(t, rec, tc.wantStatus), tc.wantCode)
			if got := rec.Header().Get("Allow"); got != tc.wantAllow {
				t.Errorf("Allow = %q, want %q", got, tc.wantAllow)
			}
		})
	}
}

func TestHealth(t *testing.T) {
	rec := serve(t, http.MethodGet, "/healthz", "")
	if resp := decodeResponse(t, rec, http.StatusOK); resp.Status != "ok" {
		t.Errorf("body = %s, want status ok", rec.Body)
	}
}

// TestWireFormat pins the exact bytes of the examples in docs/api.md.
func TestWireFormat(t *testing.T) {
	tests := []struct {
		name, path, body, want string
	}{
		{"success", "/api/v1/add", `{"a": 2, "b": 3}`, `{"result":5}`},
		{"error", "/api/v1/divide", `{"a": 1, "b": 0}`, `{"error":{"code":"DIVISION_BY_ZERO","message":"cannot divide by zero"}}`},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := serve(t, http.MethodPost, tc.path, tc.body)
			if got := strings.TrimSuffix(rec.Body.String(), "\n"); got != tc.want {
				t.Errorf("body = %s, want %s", got, tc.want)
			}
		})
	}
}

func TestRequestsAreLogged(t *testing.T) {
	var logs bytes.Buffer
	handler := httpapi.NewHandler(slog.New(slog.NewJSONHandler(&logs, nil)))
	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/api/v1/divide", strings.NewReader(`{"a": 1, "b": 0}`)))

	var entry struct {
		Msg    string `json:"msg"`
		Method string `json:"method"`
		Path   string `json:"path"`
		Status int    `json:"status"`
	}
	if err := json.Unmarshal(logs.Bytes(), &entry); err != nil {
		t.Fatalf("log output %q is not one JSON line: %v", logs.String(), err)
	}
	if entry.Msg != "request" || entry.Method != "POST" || entry.Path != "/api/v1/divide" || entry.Status != 422 {
		t.Errorf("log entry = %+v, want a request line for POST /api/v1/divide with status 422", entry)
	}
}

func serve(t *testing.T, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	httpapi.NewHandler(slog.New(slog.DiscardHandler)).ServeHTTP(rec, req)
	return rec
}

// decodeResponse checks the status and content type, then decodes the body.
func decodeResponse(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int) response {
	t.Helper()
	if rec.Code != wantStatus {
		t.Errorf("status = %d, want %d (body %s)", rec.Code, wantStatus, rec.Body)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	var resp response
	dec := json.NewDecoder(strings.NewReader(rec.Body.String()))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&resp); err != nil {
		t.Fatalf("decoding body %s: %v", rec.Body, err)
	}
	return resp
}

func assertErrorCode(t *testing.T, resp response, want string) {
	t.Helper()
	if resp.Error == nil {
		t.Fatalf("got no error, want code %s", want)
	}
	if resp.Error.Code != want {
		t.Errorf("error code = %s, want %s", resp.Error.Code, want)
	}
	if resp.Error.Message == "" {
		t.Error("error message is empty")
	}
	if resp.Result != nil {
		t.Errorf("error response also has a result: %v", *resp.Result)
	}
}
