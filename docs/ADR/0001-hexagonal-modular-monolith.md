# ADR 0001: Modular Monolith + Hexagonal Architecture

## Status

Accepted (Phase 01).

## Context

This is a hackathon project that must, per the brief, avoid becoming
"throwaway hackathon code" while still shipping a working backbone
quickly. It will later grow adapters for at least five external providers
(Tavily, Apify, Vapi, ElevenLabs, n8n) plus a browser-agent (WebMCP)
surface and a human UI, all operating on the same authoritative world.

Two extremes were considered and rejected:

- A collection of independently deployed microservices: far more
  operational overhead than a hackathon timeline supports, and unnecessary
  given a single team and a single deployable backend for Phase 01.
- A single undifferentiated Express/Hono app with route handlers calling
  a database directly: fast to write, but every new adapter (Tavily today,
  something else tomorrow) would end up entangled with business logic,
  and the browser agent and the human UI would drift into two different
  implementations of "what does approving a plan mean."

## Decision

Structure the codebase as a **modular monolith** (one deployable backend,
many independently-typed packages) using **hexagonal architecture**:
dependency direction is strictly `Infrastructure/Adapters/UI → Application
→ Domain`. Domain has no runtime dependency on anything outside
TypeScript. Application depends only on Domain and a small `contracts`
package (zod schemas + the `AgentToolResult` envelope) and defines ports
for everything infrastructure-shaped. Every concrete integration (routing,
planning, persistence, WebMCP, HTTP) is a package that implements a port
and is wired together only in `apps/api`'s composition root.

## Consequences

- Adding Tavily/Vapi/Apify/ElevenLabs/n8n later means adding a new port +
  adapter package, not touching Domain or Application.
- `packages/domain` and `packages/application` are trivially unit-testable
  without any infrastructure running.
- There is real short-term ceremony (every package needs its own
  `package.json`/`tsconfig.json`, ports must be defined before an adapter
  can exist) that a single-file Express app would not have. This is judged
  worth it given the explicit "not throwaway code" requirement.
- Enforcement today is by convention and code review, not a build-time
  lint rule (e.g. dependency-cruiser). `docs/tasks/` scopes adding
  automated enforcement as a parallel task if desired.
