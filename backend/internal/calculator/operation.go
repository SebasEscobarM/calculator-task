package calculator

import (
	"errors"
	"fmt"
	"slices"
)

// ErrOperandCount is returned by Operation.Apply when the number of operands
// does not match the operation's arity.
var ErrOperandCount = errors.New("wrong number of operands")

// Operation is an arithmetic operation that callers can look up by name.
type Operation struct {
	// Name identifies the operation in the API, e.g. "add".
	Name string
	// Arity is the number of operands the operation takes: 1 or 2.
	Arity int

	eval func(operands []float64) (float64, error)
}

// operations lists every supported operation. It is the single source of
// truth for which operations exist and what they are called.
var operations = []Operation{
	binary("add", Add),
	binary("subtract", Subtract),
	binary("multiply", Multiply),
	binary("divide", Divide),
	binary("power", Power),
	unary("sqrt", Sqrt),
	unary("percentage", Percentage),
}

// Lookup returns the operation with the given name. Names are case-sensitive.
func Lookup(name string) (Operation, bool) {
	i := slices.IndexFunc(operations, func(op Operation) bool { return op.Name == name })
	if i < 0 {
		return Operation{}, false
	}
	return operations[i], true
}

// Apply evaluates the operation on the operands, in order. It returns
// ErrOperandCount if their number does not match Arity.
func (op Operation) Apply(operands ...float64) (float64, error) {
	if len(operands) != op.Arity {
		return 0, fmt.Errorf("%w: %s takes %d, got %d", ErrOperandCount, op.Name, op.Arity, len(operands))
	}
	return op.eval(operands)
}

func unary(name string, fn func(x float64) (float64, error)) Operation {
	return Operation{Name: name, Arity: 1, eval: func(operands []float64) (float64, error) {
		return fn(operands[0])
	}}
}

func binary(name string, fn func(a, b float64) (float64, error)) Operation {
	return Operation{Name: name, Arity: 2, eval: func(operands []float64) (float64, error) {
		return fn(operands[0], operands[1])
	}}
}
