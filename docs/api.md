# API contract

The backend exposes a small JSON REST API. Requests and responses use
`Content-Type: application/json`.

- **Base URL (local):** `http://localhost:8080`
- **Versioning:** every operation lives under `/api/v1`.

## Operations

```
POST /api/v1/{operation}
```

| Operation    | Request body        | Result        | Example result |
| ------------ | ------------------- | ------------- | -------------- |
| `add`        | `{"a": 2, "b": 3}`  | a + b         | `5`            |
| `subtract`   | `{"a": 2, "b": 3}`  | a − b         | `-1`           |
| `multiply`   | `{"a": 2, "b": 3}`  | a × b         | `6`            |
| `divide`     | `{"a": 7, "b": 2}`  | a ÷ b         | `3.5`          |
| `power`      | `{"a": 2, "b": 10}` | a raised to b | `1024`         |
| `sqrt`       | `{"a": 9}`          | √a            | `3`            |
| `percentage` | `{"a": 20}`         | a ÷ 100       | `0.2`          |

- Binary operations require `a` and `b`; unary operations (`sqrt`, `percentage`) take only `a`.
- Operands are JSON numbers, handled as IEEE-754 double-precision floats.
- `percentage` works like the `%` key of a pocket calculator: 150 × 20% = 150 × 0.2 = 30.
- `power` with `{"a": 0, "b": 0}` returns `1`, following the usual convention.

### Success

`200 OK`

```json
{ "result": 5 }
```

Results are always finite numbers. They are not rounded, so `add` with `0.1` and `0.2`
returns `0.30000000000000004`; rounding for display is up to the client. Negative zero is
returned as `0`.

### Errors

Every error response has the same shape:

```json
{ "error": { "code": "DIVISION_BY_ZERO", "message": "cannot divide by zero" } }
```

`code` is stable and meant for programs; `message` is human-readable and may change.

| Status | Code                  | When                                                                                                                                                          |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `INVALID_JSON`        | The body is empty or not valid JSON, an operand is not a number (`"a": "abc"`) or does not fit in a double (`1e400`), or there are unknown fields (including `b` on unary operations) |
| 400    | `MISSING_OPERAND`     | A required operand is missing or `null`                                                                                                                        |
| 404    | `UNKNOWN_OPERATION`   | `{operation}` is not one of the operations above                                                                                                              |
| 405    | `METHOD_NOT_ALLOWED`  | The method is not `POST`                                                                                                                                      |
| 413    | `PAYLOAD_TOO_LARGE`   | The body exceeds the size limit                                                                                                                               |
| 422    | `DIVISION_BY_ZERO`    | `divide` with `b = 0`                                                                                                                                         |
| 422    | `INVALID_OPERAND`     | An operand is outside the operation's domain: `sqrt` of a negative number, `power` of zero to a negative exponent, or of a negative base to a fractional exponent |
| 422    | `RESULT_OUT_OF_RANGE` | The result does not fit in a double, e.g. `power` with `{"a": 10, "b": 400}`                                                                                   |
| 500    | `INTERNAL_ERROR`      | Unexpected server error                                                                                                                                       |

**400 vs 422:** 400 means the request itself is malformed; 422 means it is well-formed but
the math is undefined or cannot be represented.

## Health check

```
GET /healthz
```

`200 OK`

```json
{ "status": "ok" }
```
