// Package calculator implements the arithmetic behind the API. It is pure
// domain logic with no HTTP concerns.
//
// Operations report failures as errors rather than special float values:
// undefined operations return ErrDivisionByZero or ErrInvalidOperand, and
// results that do not fit in a float64 return ErrResultOutOfRange. A
// successful result is therefore always a finite number.
package calculator

import (
	"errors"
	"fmt"
	"math"
)

// Errors returned by the operations. Some are wrapped with details about the
// failing operand, so match them with errors.Is.
var (
	// ErrDivisionByZero is returned when the divisor is zero.
	ErrDivisionByZero = errors.New("cannot divide by zero")

	// ErrInvalidOperand is returned when an operand is outside the domain of
	// the operation, such as the square root of a negative number.
	ErrInvalidOperand = errors.New("invalid operand")

	// ErrResultOutOfRange is returned when a result is not a finite float64,
	// typically because it overflows.
	ErrResultOutOfRange = errors.New("result is out of range")
)

// Add returns a + b.
func Add(a, b float64) (float64, error) {
	return checked(a + b)
}

// Subtract returns a - b.
func Subtract(a, b float64) (float64, error) {
	return checked(a - b)
}

// Multiply returns a * b.
func Multiply(a, b float64) (float64, error) {
	return checked(a * b)
}

// Divide returns a / b, or ErrDivisionByZero when b is zero.
func Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return checked(a / b)
}

// Power returns base raised to exponent. It returns ErrInvalidOperand when
// the result is undefined over the real numbers: zero to a negative power, or
// a negative base to a fractional power. Power(0, 0) is 1 by convention.
func Power(base, exponent float64) (float64, error) {
	switch {
	case base == 0 && exponent < 0:
		return 0, fmt.Errorf("%w: cannot raise zero to a negative power", ErrInvalidOperand)
	case base < 0 && exponent != math.Trunc(exponent):
		return 0, fmt.Errorf("%w: cannot raise a negative number to a fractional power", ErrInvalidOperand)
	}
	return checked(math.Pow(base, exponent))
}

// Sqrt returns the square root of x, or ErrInvalidOperand when x is negative.
func Sqrt(x float64) (float64, error) {
	if x < 0 {
		return 0, fmt.Errorf("%w: cannot take the square root of a negative number", ErrInvalidOperand)
	}
	return checked(math.Sqrt(x))
}

// Percentage returns x percent as a fraction, x / 100. It mirrors the % key
// of a pocket calculator, where 150 × 20% is 150 × 0.2.
func Percentage(x float64) (float64, error) {
	return checked(x / 100)
}

// checked is the last step of every operation. It rejects ±Inf and NaN,
// which are not usable results and cannot be encoded as JSON numbers, and
// turns -0 into 0 so clients never display a negative zero.
func checked(x float64) (float64, error) {
	if math.IsInf(x, 0) || math.IsNaN(x) {
		return 0, ErrResultOutOfRange
	}
	if x == 0 {
		return 0, nil // -0 == 0 is true, so this also drops the sign.
	}
	return x, nil
}
