# Architectural Decision Record: Database Selection

**Date:** 2025-10-26

## Context

For this project, I needed to select a primary database to support my web application’s data storage and access
patterns. My main requirements were:

- High performance and low-latency for both reads and writes
- Simplicity in setup, operations, and maintenance
- Excellent developer experience (DX) for rapid iteration and onboarding
- Strong security guarantees
- Support for edge/region distribution to enable fast, global data access

The two main options I considered were Turso (a distributed, edge-capable SQLite platform) and MongoDB (a widely-used
NoSQL document database).

## Decision

I chose **Turso (SQLite)** as the primary database for this project.

## Rationale and Trade-offs

I selected Turso (SQLite) over MongoDB for several key reasons:

- **Performance:** Turso’s distributed SQLite architecture enables low-latency reads and writes, especially when
  deployed close to users at the edge. This is ideal for my use case, where fast response times are important.
- **Simplicity:** Turso offers a straightforward setup and operational model. I can use familiar SQL queries and schema
  management without the complexity of managing clusters or sharding, which is often required with MongoDB at scale.
- **Developer Experience:** As a solo developer, I value tools that minimize friction. Turso’s developer tooling, SQL
  compatibility, and easy integration with modern frameworks (like Next.js) make development and iteration fast and
  enjoyable.
- **Security:** Turso provides strong security defaults, including encrypted connections and managed access controls.
  Its smaller attack surface (compared to a self-hosted MongoDB instance) reduces operational risk.
- **Edge/Region Distribution:** Turso’s architecture is designed for global distribution, allowing me to deploy
  databases close to users in multiple regions. This is more challenging and expensive to achieve with MongoDB, which
  typically requires complex multi-region setups.

**Trade-offs:**

- **NoSQL Flexibility:** MongoDB’s document model can be more flexible for unstructured or rapidly evolving data. By
  choosing SQLite, I accept the need for a defined schema and more structured data modeling.
- **Ecosystem Maturity:** MongoDB has a larger ecosystem, more third-party integrations, and a longer track record in
  production at scale. Turso is newer and may have fewer community resources.
- **Advanced Features:** Some advanced features (e.g., full-text search, analytics, or horizontal scaling for massive
  datasets) may be more mature in MongoDB. For my current needs, Turso’s feature set is sufficient.

## Consequences

By choosing Turso (SQLite), I benefit from a simple, high-performance, and globally distributed database that aligns
well with my priorities as a solo developer. This decision streamlines development, reduces operational overhead, and
provides fast, secure data access for users regardless of location.

However, I acknowledge that if the project’s requirements change—such as needing more flexible data models, advanced
analytics, or massive horizontal scaling—I may need to revisit this decision or consider integrating additional data
solutions. For now, Turso’s strengths in performance, simplicity, developer experience, security, and edge distribution
make it the best fit for this project.
