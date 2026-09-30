package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// maxBodyBytes caps request bodies. A valid request is a few dozen bytes, so
// 1 KiB leaves room for formatting while rejecting oversized bodies early.
const maxBodyBytes = 1 << 10

// Request bodies. Operands are pointers so a missing operand can be told
// apart from an explicit 0. Unary operations decode into unaryRequest, so a
// stray "b" is rejected like any other unknown field.
type unaryRequest struct {
	A *float64 `json:"a"`
}

type binaryRequest struct {
	A *float64 `json:"a"`
	B *float64 `json:"b"`
}

// readOperands decodes the request body into the operands of an operation
// with the given arity.
func readOperands(w http.ResponseWriter, r *http.Request, arity int) ([]float64, *apiError) {
	if arity == 1 {
		var req unaryRequest
		if apiErr := decodeJSON(w, r, &req); apiErr != nil {
			return nil, apiErr
		}
		if req.A == nil {
			return nil, errMissingOperand("a")
		}
		return []float64{*req.A}, nil
	}

	var req binaryRequest
	if apiErr := decodeJSON(w, r, &req); apiErr != nil {
		return nil, apiErr
	}
	switch {
	case req.A == nil:
		return nil, errMissingOperand("a")
	case req.B == nil:
		return nil, errMissingOperand("b")
	}
	return []float64{*req.A, *req.B}, nil
}

// decodeJSON decodes a body holding exactly one JSON object into dst,
// rejecting unknown fields and bodies larger than maxBodyBytes.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) *apiError {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		return decodeError(err)
	}

	// The body must end after the object; even a second valid value is an error.
	switch err := dec.Decode(&json.RawMessage{}); {
	case errors.Is(err, io.EOF):
		return nil
	case err == nil:
		return errInvalidJSON("request body must contain a single JSON object")
	default:
		return decodeError(err)
	}
}

// decodeError explains to the client why its body could not be decoded.
func decodeError(err error) *apiError {
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		return &apiError{http.StatusRequestEntityTooLarge, codePayloadTooLarge,
			fmt.Sprintf("request body must not exceed %d bytes", tooLarge.Limit)}
	}

	var typeErr *json.UnmarshalTypeError
	if errors.As(err, &typeErr) {
		switch {
		case typeErr.Field == "":
			return errInvalidJSON("request body must be a JSON object")
		case strings.HasPrefix(typeErr.Value, "number"):
			return errInvalidJSON(fmt.Sprintf("operand %q does not fit in a double", typeErr.Field))
		default:
			return errInvalidJSON(fmt.Sprintf("operand %q must be a number", typeErr.Field))
		}
	}

	switch {
	case errors.Is(err, io.EOF):
		return errInvalidJSON("request body must not be empty")
	case strings.HasPrefix(err.Error(), "json: unknown field "):
		// encoding/json has no typed error for unknown fields.
		return errInvalidJSON(strings.TrimPrefix(err.Error(), "json: "))
	default:
		return errInvalidJSON("request body is not valid JSON")
	}
}

func errInvalidJSON(message string) *apiError {
	return &apiError{http.StatusBadRequest, codeInvalidJSON, message}
}

func errMissingOperand(name string) *apiError {
	return &apiError{http.StatusBadRequest, codeMissingOperand, fmt.Sprintf("missing operand %q", name)}
}
