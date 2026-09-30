package calculator_test

import (
	"fmt"
	"testing"

	"github.com/SebasEscobarM/calculator-task/backend/internal/calculator"
)

func TestLookup(t *testing.T) {
	supported := []struct {
		name  string
		arity int
	}{
		{"add", 2},
		{"subtract", 2},
		{"multiply", 2},
		{"divide", 2},
		{"power", 2},
		{"sqrt", 1},
		{"percentage", 1},
	}
	for _, tc := range supported {
		t.Run(tc.name, func(t *testing.T) {
			op, ok := calculator.Lookup(tc.name)
			if !ok {
				t.Fatalf("Lookup(%q) found nothing", tc.name)
			}
			if op.Name != tc.name || op.Arity != tc.arity {
				t.Errorf("Lookup(%q) = %q with arity %d, want arity %d", tc.name, op.Name, op.Arity, tc.arity)
			}
		})
	}

	for _, name := range []string{"modulo", "Add", ""} {
		t.Run(fmt.Sprintf("unknown %q", name), func(t *testing.T) {
			if op, ok := calculator.Lookup(name); ok {
				t.Errorf("Lookup(%q) = %q, want not found", name, op.Name)
			}
		})
	}
}

func TestOperationApply(t *testing.T) {
	tests := []struct {
		name     string
		op       string
		operands []float64
		want     float64
		wantErr  error
	}{
		// Non-commutative operations catch operands passed in the wrong order.
		{name: "subtract keeps operand order", op: "subtract", operands: []float64{5, 3}, want: 2},
		{name: "divide keeps operand order", op: "divide", operands: []float64{6, 3}, want: 2},
		{name: "power keeps operand order", op: "power", operands: []float64{2, 3}, want: 8},
		{name: "unary operation", op: "sqrt", operands: []float64{16}, want: 4},
		{name: "returns domain errors", op: "divide", operands: []float64{1, 0}, wantErr: calculator.ErrDivisionByZero},
		{name: "too few operands", op: "add", operands: []float64{1}, wantErr: calculator.ErrOperandCount},
		{name: "too many operands", op: "sqrt", operands: []float64{4, 2}, wantErr: calculator.ErrOperandCount},
		{name: "no operands", op: "percentage", wantErr: calculator.ErrOperandCount},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			op, ok := calculator.Lookup(tc.op)
			if !ok {
				t.Fatalf("Lookup(%q) found nothing", tc.op)
			}
			got, err := op.Apply(tc.operands...)
			assertOutcome(t, got, err, tc.want, tc.wantErr)
		})
	}
}
