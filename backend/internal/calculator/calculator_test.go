package calculator_test

import (
	"errors"
	"math"
	"testing"

	"github.com/SebasEscobarM/calculator-task/backend/internal/calculator"
)

// negativeZero is -0. It needs math.Copysign because the constant -0.0 is +0 in Go.
var negativeZero = math.Copysign(0, -1)

type binaryCase struct {
	name    string
	a, b    float64
	want    float64
	wantErr error
}

type unaryCase struct {
	name    string
	x       float64
	want    float64
	wantErr error
}

func TestAdd(t *testing.T) {
	testBinary(t, calculator.Add, []binaryCase{
		{name: "positive numbers", a: 2, b: 3, want: 5},
		{name: "negative numbers", a: -2, b: -3, want: -5},
		{name: "keeps float64 rounding", a: 0.1, b: 0.2, want: 0.30000000000000004},
		{name: "overflow", a: math.MaxFloat64, b: math.MaxFloat64, wantErr: calculator.ErrResultOutOfRange},
		{name: "NaN operand", a: math.NaN(), b: 1, wantErr: calculator.ErrResultOutOfRange},
	})
}

func TestSubtract(t *testing.T) {
	testBinary(t, calculator.Subtract, []binaryCase{
		{name: "positive result", a: 5, b: 3, want: 2},
		{name: "negative result", a: 3, b: 5, want: -2},
		{name: "equal operands", a: 1.5, b: 1.5, want: 0},
		{name: "overflow", a: -math.MaxFloat64, b: math.MaxFloat64, wantErr: calculator.ErrResultOutOfRange},
	})
}

func TestMultiply(t *testing.T) {
	testBinary(t, calculator.Multiply, []binaryCase{
		{name: "positive numbers", a: 4, b: 2.5, want: 10},
		{name: "mixed signs", a: -4, b: 2.5, want: -10},
		{name: "negative zero is normalized", a: -5, b: 0, want: 0},
		{name: "overflow", a: 1e308, b: 10, wantErr: calculator.ErrResultOutOfRange},
	})
}

func TestDivide(t *testing.T) {
	testBinary(t, calculator.Divide, []binaryCase{
		{name: "exact quotient", a: 7, b: 2, want: 3.5},
		{name: "repeating decimal", a: 1, b: 3, want: 0.3333333333333333},
		{name: "negative zero is normalized", a: 0, b: -5, want: 0},
		{name: "by zero", a: 1, b: 0, wantErr: calculator.ErrDivisionByZero},
		{name: "zero by zero", a: 0, b: 0, wantErr: calculator.ErrDivisionByZero},
		{name: "by negative zero", a: 1, b: negativeZero, wantErr: calculator.ErrDivisionByZero},
		{name: "overflow", a: math.MaxFloat64, b: 0.5, wantErr: calculator.ErrResultOutOfRange},
	})
}

func TestPower(t *testing.T) {
	testBinary(t, calculator.Power, []binaryCase{
		{name: "integer exponent", a: 2, b: 10, want: 1024},
		{name: "negative base with odd exponent", a: -2, b: 3, want: -8},
		{name: "negative exponent", a: 2, b: -2, want: 0.25},
		{name: "fractional exponent", a: 4, b: 0.5, want: 2},
		{name: "zero to the zero", a: 0, b: 0, want: 1},
		{name: "zero to a negative power", a: 0, b: -1, wantErr: calculator.ErrInvalidOperand},
		{name: "negative base with fractional exponent", a: -8, b: 1.0 / 3, wantErr: calculator.ErrInvalidOperand},
		{name: "overflow", a: 10, b: 400, wantErr: calculator.ErrResultOutOfRange},
	})
}

func TestSqrt(t *testing.T) {
	testUnary(t, calculator.Sqrt, []unaryCase{
		{name: "perfect square", x: 9, want: 3},
		{name: "decimal", x: 2.25, want: 1.5},
		{name: "zero", x: 0, want: 0},
		{name: "negative zero is normalized", x: negativeZero, want: 0},
		{name: "negative number", x: -4, wantErr: calculator.ErrInvalidOperand},
	})
}

func TestPercentage(t *testing.T) {
	testUnary(t, calculator.Percentage, []unaryCase{
		{name: "whole number", x: 20, want: 0.2},
		{name: "over one hundred", x: 250, want: 2.5},
		{name: "negative decimal", x: -12.5, want: -0.125},
		{name: "infinite operand", x: math.Inf(1), wantErr: calculator.ErrResultOutOfRange},
	})
}

func testBinary(t *testing.T, fn func(a, b float64) (float64, error), cases []binaryCase) {
	t.Helper()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := fn(tc.a, tc.b)
			assertOutcome(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func testUnary(t *testing.T, fn func(x float64) (float64, error), cases []unaryCase) {
	t.Helper()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := fn(tc.x)
			assertOutcome(t, got, err, tc.want, tc.wantErr)
		})
	}
}

// assertOutcome compares results exactly, including the sign of zero: every
// expected value is either exactly representable or the precise float64 the
// operation must return.
func assertOutcome(t *testing.T, got float64, err error, want float64, wantErr error) {
	t.Helper()
	if !errors.Is(err, wantErr) {
		t.Fatalf("error = %v, want %v", err, wantErr)
	}
	if err == nil && (got != want || math.Signbit(got) != math.Signbit(want)) {
		t.Errorf("result = %v, want %v", got, want)
	}
}
