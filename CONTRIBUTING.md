# Contributing to Zyndex

Welcome to the **Zyndex** project. Zyndex is an enterprise-scale distributed digital library, academic resource repository, and digital asset governance platform conceived, designed, architected, and engineered solely by **Bhaanu G (Bhaanu Gali)**. All platform intellectual property, architecture designs, copyright, and engine entitlements belong exclusively to Bhaanu G.

We welcome peer review, security audits, academic feature proposals, documentation enrichments, and automated testing contributions from the open-source engineering community under the guidelines outlined in this document.

---

## Authorship, Copyright & Sole Platform Ownership

> [!IMPORTANT]
> **Sole Creator, Lead Architect & Platform Maintainer**: **Bhaanu G (Bhaanu Gali)**  
> **Institutional Affiliation**: KL University  
> **Primary Contact**: `Bhaanugali@gmail.com`  
> **Institutional Contact**: `2400030952@kluniversity.in`  
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

- **Zero-Warning Compilation**: Every Java microservice must compile cleanly without raw types, unused imports, or suppressed compiler warnings.
- **Strict Separation of Concerns**: Controllers handle HTTP ingress only; domain logic is strictly isolated in dedicated `@Service` classes; persistence interactions are confined to `@Repository` classes or explicit Spring JDBC mappers.
- **Stateless Microservice Boundaries**: Microservices communicate over HTTP with inter-service authentication enforced by a shared gateway secret (`X-Gateway-Secret`). No service shares thread pools, internal caches, or session memory with another.
- **Fail-Safe Defensive Programming**: Validate every payload boundary. Null checks, boundary conditions, and cryptographic seeds must be deterministic and robust against edge-case anomalies.
- **Documentation Parity**: Whenever modifying a database table, service endpoint, or frontend component, you must update the corresponding section in [README.md](README.md), [SECURITY.md](SECURITY.md), or [ACCESSIBILITY.md](ACCESSIBILITY.md).

---

## 3. Microservices Cluster Architecture Reference

Zyndex operates as an orchestration of 7 autonomous backend services coordinated by an API Gateway and Eureka Registry, with an independent single-page web client:

| Subsystem | Service Name | Port | Framework / Tech Stack | Primary Responsibilities |
| :--- | :--- | :---: | :--- | :--- |
| **Discovery** | `eureka-server` | `8761` | Spring Cloud Netflix Eureka | Dynamic service registration, instance heartbeats, and cluster health discovery. |
| **Edge Gateway** | `api-gateway` | `8080` | Spring Cloud Gateway (Netty) | Reverse proxy routing, global CORS filtering, rate limiting, and stateless HMAC-SHA256 JWT validation. |
| **Identity & Auth** | `auth-service` | `8081` | Spring Boot 3.4.2, Spring Security 6, JJWT | User registration, 4-digit TLS email OTP, 24-hour trusted device management, BCrypt hashing, and role claims. |
| **Content Repository** | `content-service` | `8082` | Spring Boot 3.4.2, Apache PDFBox | Resource cataloging, multi-category indexing, file upload processing, and zero-leakage in-memory 10-page preview slicing. |
| **Access Governance** | `access-service` | `8083` | Spring Boot 3.4.2, Spring Data JPA | Tiered entitlement enforcement, reading quotas, download allowance tracking, and single-use download token issuance. |
| **Usage Telemetry** | `usage-service` | `8084` | Spring Boot 3.4.2, Spring JDBC | 15-second heartbeat ingestion, reading session calculation, live reader telemetry aggregation, and administrative log streams. |
| **Subscription Billing** | `subscription-service` | `8085` | Spring Boot 3.4.2, JavaMail | Multi-tier plan definitions, dynamic UPI intent URI generation, 12-digit bank UTR reconciliation, and 2-minute verification hold workflows. |
| **Web Presentation** | `zyndex-frontend` | `5173` | React 18.3.1, Vite 6, Tailwind CSS | High-contrast academic UI, embedded PDF reader, interactive telemetry dashboards, and multi-step verification flows. |

---

## 4. Local Workstation Setup & Toolchain

### Prerequisites
- **Java Development Kit**: OpenJDK 21 LTS (`java -version`).
- **Node.js**: v18.x or v20.x LTS (`node -v`).
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
.\mvnw.cmd clean test-compile
```

### Environment Configuration
Create a local `.env` file in the root directory (never commit secrets to version control):
```env
SPRING_PROFILES_ACTIVE=dev
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_local_password
JWT_SECRET=your_32_byte_minimum_secure_hmac_sha256_secret_key_here
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
GATEWAY_SECRET=your_inter_service_shared_secret_string
```

---

## 5. Git Workflow, Branching & Conventional Commits

### Branching Strategy
- `main`: Production-ready, zero-defect release branch. Directly deployed to Render.
- `feat/feature-name`: For new features and capabilities (e.g., `feat/pdf-bookmark-export`).
- `fix/bug-description`: For defect fixes (e.g., `fix/utr-retry-validation`).
- `docs/topic-name`: For technical documentation refinements (e.g., `docs/architecture-expansion`).

### Conventional Commit Conventions
All commit messages must follow the standard Angular/Conventional Commits specification:
```
<type>(<scope>): <concise imperative description>

[optional body explaining technical motivation and architecture impact]
```

**Permitted Types**:
- `feat`: New user-facing or API capability.
- `fix`: Patch resolving a bug or defect.
- `docs`: Documentation updates or additions.
- `refactor`: Structural code cleanup without changing functional behavior.
- `test`: Addition or refactoring of unit or integration test suites.
- `chore`: Build scripts, dependencies, or configuration adjustments.

---

## 6. Compilation, Build Verification & Quality Assurance

Before opening any Pull Request or committing changes, execute the full local verification pipeline:

### 1. Frontend Build Verification
```bash
npm run build
```
*Expected Result*: Vite builds all 2,750+ modules in under 30 seconds into `dist/` with `dist/_redirects` intact and zero runtime errors.

### 2. Backend Compilation Verification
```bash
.\mvnw.cmd clean test-compile
```
*Expected Result*: Maven reactor builds all 8 modules (`zyndex-parent`, `eureka-server`, `api-gateway`, `auth-service`, `content-service`, `access-service`, `usage-service`, `subscription-service`) with `BUILD SUCCESS` and zero compilation errors.

### 3. Static Code Analysis & Warning Check
Ensure the IDE Problems view is completely clear of:
- Raw types (e.g., unparameterized `Map` or `List`).
- Unused imports or fields.
- Dead code paths.

---

## 7. Submitting Issues & Feature RFCs

### Bug Reports
Before submitting an issue, search closed issues to verify it hasn't been resolved. Include:
1. Exact component or microservice affected.
2. Step-by-step reproduction sequence.
3. Expected system state vs. actual observed output.
4. Error logs, stack traces, and browser console output.

### Feature RFCs
Feature proposals should clearly articulate the academic or architectural value:
1. **Academic Problem**: What institutional or research workflow does this enhance?
2. **Proposed Solution**: API signature, database schema change, and UI interaction model.
3. **Security Implications**: Entitlement impacts, data leakage considerations, and audit logging.

---

## 8. Pull Request (PR) Lifecycle & Strict Review Checklist

All PRs undergo review by Lead Architect **Bhaanu G** against the following criteria:

- [ ] **Authorship Verification**: Confirms that intellectual property remains assigned to Bhaanu G.
- [ ] **Dual Build Pass**: Both `npm run build` and `.\mvnw.cmd test-compile` pass with 0 errors.
- [ ] **No Secrets**: No database passwords, JWT tokens, SMTP keys, or private URIs committed.
- [ ] **Documentation Updated**: All relevant sections in [README.md](README.md), [SECURITY.md](SECURITY.md), and [ACCESSIBILITY.md](ACCESSIBILITY.md) reflect the changes.
- [ ] **Zero Regressions**: Existing authentication flows, payment verification states, and reader access limits remain intact.

---

## 9. Deployment Readiness & Production Hosting

Zyndex is architected for seamless cloud-native containerization and static hosting:

- **Frontend Deployment**: Configured via `render.yaml` as a static site service built with `npm run build` from the `dist/` root, utilizing `public/_redirects` (`/*  /index.html  200`) for seamless client-side single-page routing.
- **Backend Microservices**: Packaged as executable Spring Boot JARs deployable as Docker containers across Kubernetes or cloud application platforms.

---

## 10. Security Disclosure & Contact Channels

For inquiries, architecture consultations, or security notifications:

- **Sole Creator & Lead Architect**: **Bhaanu G (Bhaanu Gali)**
- **Primary Administrative Email**: `Bhaanugali@gmail.com`
- **Campus & Institutional Office**: `2400030952@kluniversity.in`, KL University
