# Contributing to Zyndex

Welcome to the **Zyndex** project! Zyndex was architected and developed by **Bhaanu G (Bhaanu Gali)** as a distributed academic learning and enterprise digital resource governance ecosystem. All core intellectual property, architectural design, and platform rights are reserved to Bhaanu G.

Whether you are fixing an issue, proposing an academic domain feature, improving documentation, or adding automated test suites, your efforts help researchers, students, and faculty across the globe.

---

## Authorship, Copyright & Intellectual Ownership Notice

> [!NOTE]
> **Primary Author, Lead Architect & Platform Owner**: **Bhaanu G (Bhaanu Gali)**  
> **Contact**: `Bhaanugali@gmail.com` | `2400030952@kluniversity.in`  
> **Project**: Zyndex  
> **Licensing**: MIT License (Copyright © 2026 Bhaanu Gali. All Rights Reserved.)  
> All submissions and merged contributions are integrated into the Zyndex project under the stewardship and sole platform direction of Bhaanu G.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [What We Expect From Contributors](#what-we-expect-from-contributors)
3. [Architecture & Technical Principles](#architecture--technical-principles)
4. [Getting Started Locally](#getting-started-locally)
5. [Development Workflow & Branching Strategy](#development-workflow--branching-strategy)
6. [Commit Guidelines & Standards](#commit-guidelines--standards)
7. [Submitting Issues & Feature Requests](#submitting-issues--feature-requests)
8. [Pull Request (PR) Submission & Review Criteria](#pull-request-pr-submission--review-criteria)
9. [Continuous Integration & Pre-Deployment Verification](#continuous-integration--pre-deployment-verification)
10. [Community & Contact Channels](#community--contact-channels)

---

## 1. Code of Conduct

All contributors, maintainers, and community participants are required to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to fostering an open, inclusive, harassment-free environment for everyone. Please report violations to **`Bhaanugali@gmail.com`** and **`2400030952@kluniversity.in`**.

---

## 2. What We Expect From Contributors

- **Quality Over Speed**: Write clean, self-documenting code with clear architectural separation.
- **Documentation Integrity**: Keep comments, docstrings, schema tables, and API references accurate and up-to-date with your code changes.
- **Strict Verification**: Ensure zero compilation errors and warnings before submitting your work.
- **Security Awareness**: Never commit credentials, database passwords, SMTP secrets, JWT secret keys, or customer PII.

---

## 3. Architecture & Technical Principles

Zyndex is structured as a distributed poly-service microservices architecture with a modern reactive frontend:

### 3.1 Backend Microservices (Java 21 LTS + Spring Boot 3.4.2)
- **`eureka-server`** (Port 8761): Service registry enabling dynamic service discovery.
- **`api-gateway`** (Port 8080): Spring Cloud Gateway acting as the single reverse-proxy entry point, handling CORS, rate limiting, and stateless JWT verification.
- **`auth-service`** (Port 8081): User identity, multi-factor OTP via SMTP relay, 24-hour trusted device management, BCrypt password hashing, and role-based access control.
- **`content-service`** (Port 8082): Catalog management, categorized academic metadata, document upload processing, and in-memory Apache PDFBox preview slicing.
- **`access-service`** (Port 8083): Tier entitlement gating, page limit ceilings, and single-use download token issuance.
- **`usage-service`** (Port 8084): Real-time reading telemetry ingestion, 15-second heartbeat aggregation, and active session calculation.
- **`subscription-service`** (Port 8085): Multi-tier plan subscriptions, dynamic UPI QR generation, 12-digit bank UTR reconciliation, and 2-minute verification hold processing.

### 3.2 Frontend Client (React 18.3.1 + Vite 6 + Tailwind CSS)
- **Pure JavaScript & JSX**: Zero TypeScript transpilation overhead.
- **Styling**: Tailwind CSS utility classes adhering to our orange-and-slate design language.
- **Routing**: React Router with protected route wrappers and seamless redirect intent preservation.

---

## 4. Getting Started Locally

### 4.1 Prerequisites
- **Java**: OpenJDK 21 LTS installed and on `PATH` (`java -version`).
- **Node.js**: Node v18+ and npm v9+ installed (`node -v`, `npm -v`).
- **Database**: MySQL 8.0+ server running locally on port 3306.

### 4.2 Initial Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/BhaanuG/Zyndex-MS.git
   cd Zyndex
   ```
2. Configure environment variables in `.env`:
   ```properties
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASS=root
   JWT_SECRET=YourSecure256BitHmacKeyMustBeAtLeast32BytesLong!
   OTP_SMTP_HOST=smtp.gmail.com
   OTP_SMTP_PORT=587
   OTP_SMTP_USER=your-email@gmail.com
   OTP_SMTP_PASS=your-app-password
   OTP_MAIL_FROM=your-email@gmail.com
   MAIN_ADMIN_EMAIL=Bhaanugali@gmail.com
   ```
3. Install frontend dependencies:
   ```bash
   npm install
   ```

### 4.3 Running All Services
Run the concurrent orchestrator script to start Eureka, the API Gateway, all 5 business microservices, and the Vite frontend:
```bash
npm run dev:all
```
Once initialized, access the frontend at `http://localhost:5173` and the Eureka dashboard at `http://localhost:8761`.

---

## 5. Development Workflow & Branching Strategy

1. Ensure your local `main` branch is fully synchronized:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Create a feature or bugfix branch following our naming convention:
   - `feat/feature-name` (e.g., `feat/citation-exporter`)
   - `fix/issue-description` (e.g., `fix/utr-retry-validation`)
   - `docs/topic-name` (e.g., `docs/render-deployment`)
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Keep changes cohesive and focused. Do not mix unrelated refactors with bug fixes.

---

## 6. Commit Guidelines & Standards

We enforce clear Conventional Commits:

| Type | Purpose | Example |
| :--- | :--- | :--- |
| `feat:` | New capability or user-facing feature | `feat(auth): add 24-hour trusted device support` |
| `fix:` | Bug fix or error resolution | `fix(gateway): whitelist check-login in JwtValidationFilter` |
| `docs:` | Documentation update or expansion | `docs(readme): add granular character and word metrics` |
| `refactor:`| Code cleanup without functional change | `refactor(payment): use ParameterizedTypeReference in REST call` |
| `test:` | Adding or improving automated tests | `test(usage): verify telemetry session aggregation` |

Always ensure your git author signature is correctly configured:
```bash
git config user.name "Your Name"
git config user.email "your.email@domain.com"
```

---

## 7. Submitting Issues & Feature Requests

### Reporting Bugs
Before filing a bug report, check existing [GitHub Issues](https://github.com/BhaanuG/Zyndex-MS/issues) to avoid duplicates.
Use our **Bug Report** template and include:
- Clear, descriptive title.
- Affected microservice or UI component.
- Reproduction steps (1, 2, 3...).
- Expected vs actual behavior.
- Environment details (OS, browser, Java and Node versions).

### Proposing Feature Enhancements
Use our **Feature Request** template to outline:
- The academic problem or user need being addressed.
- The proposed solution, API endpoints, or UI layouts.
- Alternative workflows considered.

---

## 8. Pull Request (PR) Submission & Review Criteria

Before submitting your PR:
1. **Frontend Build Verification**:
   ```bash
   npm run build
   ```
   Must output clean bundles into `dist/` with zero errors.
2. **Backend Compilation Verification**:
   ```bash
   .\mvnw.cmd test-compile
   ```
   Must exit with `BUILD SUCCESS` across all 8 reactor modules (`zyndex-parent`, `eureka-server`, `api-gateway`, `auth-service`, `content-service`, `access-service`, `usage-service`, `subscription-service`).
3. **No Unused Imports or Raw Types**: Check the IDE Problems tab to verify zero warnings.
4. **Fill Out the PR Template**: Reference the related issue number and provide verification logs or screenshots.

---

## 9. Continuous Integration & Pre-Deployment Verification

All contributions must pass automated build criteria before being merged into `main`. Our deployment targets (including Render and Netlify) rely on:
- Single-page application rewriting via `public/_redirects` and `render.yaml`.
- Stateless API Gateway proxying preserving CORS and security headers.
- Automatic database table initialization handled via `DbInitializer.java` across every microservice.

---

## 10. Community & Contact Channels

If you have questions regarding the platform roadmap or need technical guidance:
- **Lead Maintainer**: Bhaanu Gali (`Bhaanugali@gmail.com`)
- **Institutional Inquiries**: `2400030952@kluniversity.in`
- **Issue Tracker**: [https://github.com/BhaanuG/Zyndex-MS/issues](https://github.com/BhaanuG/Zyndex-MS/issues)

Thank you for contributing to the future of academic learning with **Zyndex**!
