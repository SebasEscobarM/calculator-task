# AI prompts

This project was built with Claude Code (model: Claude Opus 5.5) running in VS Code.
These are the prompts that drove the technical work, in order and verbatim; short
confirmations and final-validation messages are left out. They were written in Spanish, so
each one is followed by an English translation and a short note on what it produced.

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

## 3. HTTP layer and server

> Vamos entonces a la fase 2, ya hice comit a la main, no push pero si commit, hagamos la
> fase 2 y 3, solo pasando a la 3 si ejecuta bien la verificacion de la dase 2

**Translation:** "Let's move on to phase 2, then. I already committed to main (committed,
not pushed). Let's do phases 2 and 3, and only move on to phase 3 if phase 2's
verification passes."

**Result:** the HTTP layer `internal/httpapi` (routing, strict JSON decoding, error
mapping, logging and panic recovery) with a test for every row of the contract. Once its
checks passed, the server entrypoint `cmd/server` (timeouts, graceful shutdown), verified
against the running binary.

## 4. Frontend foundation

> Listo hagamos 4 y 5 todo hasta justo antes de la UI

**Translation:** "OK, let's do phases 4 and 5: everything up to just before the UI."

**Result:** the Next.js app with Vitest and Testing Library, the `/api` proxy to the
backend and a frontend CI job. Then the typed API client, the calculator reducer, display
formatting, user-facing error messages and the `useCalculator` hook, all unit-tested.

## 5. The calculator UI

> Hagamos el tope de 12 digitos una calculadora, que la paleta de colores sea asi, donde
> el color predominante es el Charcoal Blue, con botones de numeros de color Grey Olive y
> botones de operacion Lime Cream, con arriba la "pantalla" o seccion donde van los numeros
> y resultados
>
> _[attached: a screenshot of a colour palette with Grey Olive #848C8E, Charcoal Blue
> #435058, Lime Cream #DCF763, Silver #BFB7B6 and Platinum #F1F2EE]_

**Translation:** "Let's keep the 12-digit limit and build the calculator. Use this colour
palette, with Charcoal Blue as the dominant colour, Grey Olive number keys and Lime Cream
operation keys, and the 'screen', where numbers and results go, at the top."

**Result:** the calculator UI (display, keypad, physical keyboard support) with component
tests. It was also checked in a real browser against the real backend at 320px, 375px and
desktop widths, including with the backend stopped.

## 6. Docker

> Listo hagamos el docker para poder levantar todo de 1 solo comando en docker desktop para
> que lo prueben al bajar el repo

**Translation:** "OK, let's do the Docker setup so everything starts with a single command
in Docker Desktop, and people can try it right after cloning the repo."

**Result:** Dockerfiles for both services, a `compose.yaml` that starts the stack with
`docker compose up --build`, and a CI job that builds the stack and runs a request through
the frontend's proxy. The browser checks were repeated against the containers.
