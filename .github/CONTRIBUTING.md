# Contributing to Zyndex

Welcome to the **Zyndex** project. Zyndex is an enterprise-scale distributed digital library, academic resource repository, and digital asset governance platform conceived, designed, architected, and engineered solely by **Bhaanu G (Bhaanu Gali)**. All platform intellectual property, architecture designs, copyright, and engine entitlements belong exclusively to Bhaanu G.

We welcome peer review, security audits, academic feature proposals, documentation enrichments, and automated testing contributions from the open-source engineering community under the guidelines outlined in this document.

---

## Authorship, Copyright & Sole Platform Ownership

> [!IMPORTANT]
> **Sole Creator, Lead Architect & Platform Maintainer**: **Bhaanu G (Bhaanu Gali)**  
> **Primary Contact**: `Bhaanugali@gmail.com`  
> **Direct Engineering Contact**: `2400030952@kluniversity.in`  
> **Legal License**: MIT License (Copyright © 2026 Bhaanu Gali. All Rights Reserved.)  
> *All rights, architecture definitions, database schemas, and intellectual property remain with Bhaanu G. All pull requests and community contributions become part of the canonical Zyndex engine under the direct stewardship and sole ownership of Bhaanu G.*

---

## Table of Contents

1. [Code of Conduct](#1-code-of-conduct)
2. [Engineering Principles & Senior Development Standards](#2-engineering-principles--senior-development-standards)
3. [Microservices Cluster Architecture Reference](#3-microservices-cluster-architecture-reference)
4. [Local Workstation Setup & Toolchain](#4-local-workstation-setup--toolchain)
5. [Git Workflow, Branching & Conventional Commits](#5-git-workflow-branching--conventional-commits)
6. [Compilation, Build Verification & Quality Assurance](#6-compilation-build-verification--quality-assurance)
7. [Submitting Issues & Feature RFCs](#7-submitting-issues--feature-rfcs)
8. [Pull Request (PR) Lifecycle & Strict Review Checklist](#8-pull-request-pr-lifecycle--strict-review-checklist)
9. [Deployment Readiness & Production Hosting](#9-deployment-readiness--production-hosting)
10. [Security Disclosure & Contact Channels](#10-security-disclosure--contact-channels)

---

## 1. Code of Conduct

All contributors, reviewers, and maintainers participating in the Zyndex project are required to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). We maintain a strictly professional, welcoming, and harassment-free development ecosystem. Any behavior violating community trust or ethical development standards will result in immediate exclusion from the project repository. Violations may be reported directly to **`Bhaanugali@gmail.com`**.

---

## 2. Engineering Principles & Senior Development Standards

The Zyndex codebase adheres to senior production software engineering standards:

- **Zero-Warning Compilation**: Every Java microservice must compile cleanly without raw types, unused imports, or suppressed compiler warnings. Frontend code must pass Vite production build checks with zero bundling errors.
- **Strict Separation of Concerns**: Controllers handle HTTP ingress only; domain logic is strictly isolated in dedicated `@Service` classes; persistence interactions are confined to Spring Data JPA repositories or explicit Spring `JdbcTemplate` mappers.
- **Stateless Microservice Boundaries**: Microservices communicate over HTTP via Eureka discovery. Inter-service authentication is enforced by a shared gateway secret (`X-Gateway-Secret`). Direct unauthorized calls bypass attempts are rejected with HTTP 403 Forbidden.
- **Asynchronous Long-Running Operations**: Any CPU-intensive operation (such as PDFBox stream deflation, thumbnail generation, or batch report creation) must run asynchronously via `CompletableFuture` or dedicated background executors to guarantee sub-second HTTP responses and avoid proxy timeouts.
- **Fail-Safe Defensive Programming**: Validate every payload boundary. Null checks, boundary conditions, and cryptographic seeds must be deterministic and robust against edge-case anomalies.
- **Documentation Parity**: Whenever modifying a database table, service endpoint, or frontend component, you must update the corresponding section in [README.md](README.md), [SECURITY.md](SECURITY.md), or [ACCESSIBILITY.md](ACCESSIBILITY.md).

---

## 3. Microservices Cluster Architecture Reference

Zyndex operates as an orchestration of 7 autonomous backend services coordinated by an API Gateway and Eureka Registry, with an independent single-page web client:

| Subsystem | Service Name | Internal Port | Framework / Tech Stack | Primary Responsibilities |
| :--- | :--- | :---: | :--- | :--- |
| **Discovery Registry** | `eureka-server` | `8761` | Spring Cloud Netflix Eureka | Dynamic service registration, instance heartbeats, and cluster health discovery. |
| **Edge Gateway** | `api-gateway` | `8080` | Spring Cloud Gateway (Netty) | Reverse proxy routing, global CORS filtering, rate limiting, and stateless HMAC-SHA256 JWT validation. |
| **Identity & Auth** | `auth-service` | `8081` | Spring Boot 3.4.2, Spring Security 6, JJWT | User registration, 4-digit TLS email OTP, 24-hour trusted device management, BCrypt hashing, and role claims. |
| **Content Repository** | `content-service` | `8082` | Spring Boot 3.4.2, Apache PDFBox | Resource cataloging, multi-category indexing, file upload processing, async compression, and in-memory 10-page preview slicing. |
| **Access Governance** | `access-service` | `8083` | Spring Boot 3.4.2, Spring Data JPA | Tiered entitlement enforcement, reading quotas, download allowance tracking, and single-use download token issuance. |
| **Usage Telemetry** | `usage-service` | `8084` | Spring Boot 3.4.2, Spring JDBC | 15-second heartbeat ingestion, reading session calculation, live reader telemetry aggregation, and administrative log streams. |
| **Subscription Billing** | `subscription-service` | `8085` | Spring Boot 3.4.2, JavaMail | Multi-tier plan definitions, dynamic UPI intent URI generation, 12-digit bank UTR reconciliation, and 2-minute verification hold workflows. |
| **Web Presentation** | `zyndex-frontend` | `5173` | React 18.3.1, Vite 6, Tailwind CSS | High-contrast academic UI, embedded PDF reader, interactive telemetry dashboards, and multi-step verification flows. |

---

## 4. Local Workstation Setup & Toolchain

### Prerequisites
- **Java Development Kit**: OpenJDK 21 LTS (`java -version`).
- **Node.js**: v18.x, v20.x, or v22.x LTS (`node -v`).
- **Package Manager**: npm v9+ or v10+ (`npm -v`).
- **Database Server**: MySQL 8.0 or MySQL 8.4 LTS running on port `3306`.
- **Git**: v2.40+ (`git --version`).

### Step-by-Step Repository Cloning & Dependency Initialization
```bash
# 1. Clone the repository
git clone https://github.com/BhaanuG/Zyndex-MS.git
cd Zyndex-MS

# 2. Install frontend dependencies
npm install

# 3. Compile all backend microservices
./mvnw clean test-compile
# On Windows PowerShell:
.\mvnw.cmd clean test-compile
```

### Environment Configuration
Copy the provided `.env.example` file to create your local `.env` file (never commit secrets to version control):
```bash
cp .env.example .env
```
Ensure the following variables match your local environment:
```env
SPRING_PROFILES_ACTIVE=dev
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_local_password
JWT_SECRET=your_32_byte_minimum_secure_hmac_sha256_secret_key_here
GATEWAY_SECRET=zyndex_internal_mesh_secret_token_2026
VITE_API_BASE_URL=http://localhost:8080/api
```

### Running Locally
To launch all microservices and frontend concurrently:
```bash
# Run multi-service orchestrator
node start-all.js
```
Or start individual microservices using the Maven wrapper:
```bash
.\mvnw.cmd -pl eureka-server spring-boot:run
.\mvnw.cmd -pl api-gateway spring-boot:run
.\mvnw.cmd -pl auth-service spring-boot:run
.\mvnw.cmd -pl content-service spring-boot:run
.\mvnw.cmd -pl access-service spring-boot:run
.\mvnw.cmd -pl usage-service spring-boot:run
.\mvnw.cmd -pl subscription-service spring-boot:run
npm run dev
```

---

## 5. Git Workflow, Branching & Conventional Commits

We follow a strict **Trunk-Based / Feature-Branch Workflow**:

1. Always branch off the latest `main` branch.
2. Branch naming convention:
   - `feat/feature-name` (e.g., `feat/pdf-bookmark-sync`)
   - `fix/issue-description` (e.g., `fix/utr-reconciliation-rounding`)
   - `perf/optimization-target` (e.g., `perf/pdfbox-in-memory-deflate`)
   - `docs/documentation-update` (e.g., `docs/update-codebase-metrics`)
3. Commits must follow the **Conventional Commits** specification:
   ```text
   <type>(<scope>): <short imperative description>

   [optional body explaining motivation and technical approach]
   [optional footer referencing issue numbers, e.g., Closes #42]
   ```
   **Allowed Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `security`.

---

## 6. Compilation, Build Verification & Quality Assurance

Before submitting a pull request, run the complete verification suite locally:

```bash
# 1. Verify frontend build
npm run build

# 2. Verify backend microservices compilation and tests
.\mvnw.cmd clean test

# 3. Check for security vulnerabilities in dependencies
npm audit
```

Pull requests with broken builds, failing unit tests, or unhandled compiler warnings will not be merged.

---

## 7. Submitting Issues & Feature RFCs

### Bug Reports
When reporting a bug, use our GitHub issue templates and provide:
- Exact steps to reproduce the issue.
- Expected behavior vs. actual behavior.
- Relevant log output (sanitized to remove credentials, passwords, or JWTs).
- Environment details (OS, Browser version, Java version, Node version).

### Feature Requests (RFCs)
For substantial changes (e.g., new microservices, external payment gateways, major UI overhauls):
1. Open an Issue with the prefix `[RFC]: <Feature Title>`.
2. Outline the motivation, architectural impact, data model updates, and security considerations.
3. Wait for maintainer review and consensus from **Bhaanu G** before proceeding with development.

---

## 8. Pull Request (PR) Lifecycle & Strict Review Checklist

All PRs undergo review by the platform architect (**Bhaanu G**). Review criteria include:

- [ ] **Authorship & Scope**: Does the PR address a single focused concern?
- [ ] **Security**: Are all inputs validated? Are endpoints protected by JWT or `X-Gateway-Secret`?
- [ ] **Performance**: Are blocking calls avoided on web threads?
- [ ] **Database Integrity**: Are schema changes backward-compatible and accompanied by safe DDL migrations?
- [ ] **Accessibility**: Does frontend UI comply with WCAG 2.1 AA (4.5:1 contrast, keyboard focus, ARIA labels)?
- [ ] **Tests**: Are unit and integration tests provided where appropriate?
- [ ] **Documentation**: Are changes documented in `README.md`, `SECURITY.md`, and relevant doc files?

---

## 9. Deployment Readiness & Production Hosting

- **Frontend Target**: Netlify Edge CDN (`https://zyndex.netlify.app`), deploying automatically from `main`.
- **Backend Target**: Oracle Cloud VM (Ubuntu/Oracle Linux x86_64) running Docker Compose (`docker-compose.prod.yml`).
- **Direct VM Entrypoint**: `http://92.5.166.34/` (Reverse proxy on port 80 routing to Gateway on 8080).

---

## 10. Security Disclosure & Contact Channels

If you discover a security vulnerability, **do not open a public issue**. Follow our private disclosure process in [SECURITY.md](SECURITY.md) and report immediately to:
- **Lead Maintainer**: `Bhaanugali@gmail.com`
- **Academic Contact**: `2400030952@kluniversity.in`
