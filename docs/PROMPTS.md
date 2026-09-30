# AI prompts

This project was built with Claude Code (model: Claude Opus 5.5) running in VS Code.
The prompts are listed in order and verbatim. They were written in Spanish, so each one
is followed by an English translation and a short note on what it produced.

## 1. Planning

> Estoy iniciando un repositorio de Calculadora, se compone de un modulo de backend que
> esta iniciandoce en GO y un front que planeo hacer en Next, para ser mas especifico los
> requerimientos son:
>
> _[the full assignment brief was pasted here verbatim]_
>
> Hagamos un plan de como implementaremos cada cosa en stacks de pasos que sean
> verificables para poder ir avanzando

**Translation:** "I'm starting a Calculator repository. It has a backend module that I'm
starting in Go and a frontend I plan to build with Next. More specifically, the
requirements are: _[assignment brief]_. Let's plan how we'll implement each part as
stacks of verifiable steps, so we can make progress."

**Result:** a phased plan in which every phase ends with verification commands and a
commit, plus the API contract now in [api.md](api.md).

## 2. Repository base and backend domain

> Vamos a lo siguiente, con ese contrato que me parece adecuado arranquemo socn fase 0 y 1

**Translation:** "Let's move on. That contract looks right to me, so let's start with
phases 0 and 1."

**Result:** repository scaffolding (git and editor settings, this log, the API contract,
the README skeleton), the backend domain package `internal/calculator` with table-driven
tests, and a CI workflow for the backend.
