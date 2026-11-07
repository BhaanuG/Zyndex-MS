# Contributing to Zyndex

Thank you for your interest in contributing to **Zyndex** (ScholarSphere Engine)! We welcome contributions from developers, researchers, students, and educators.

Please take a moment to review this document to ensure an efficient and collaborative workflow.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to `2400030952@kluniversity.in` or `Bhaanugali@gmail.com`.

---

## How Can I Contribute?

### 1. Reporting Bugs
- Check the [GitHub Issues](https://github.com/BhaanuG/Zyndex-MS/issues) tab to see if the bug has already been reported.
- If not, open a new issue using our **Bug Report** template.
- Include clear steps to reproduce, expected vs actual behavior, screenshots, and system environment details (OS, browser, Java version, Node version).

### 2. Suggesting Enhancements
- Open a **Feature Request** issue describing the goal, motivation, and practical use case for academic researchers, students, or administrators.
- Detail the proposed API, database schema, or UI changes.

### 3. Code Contributions & Pull Requests
- Fork the repository and create a descriptive branch from `main`:
  ```bash
  git checkout -b feat/your-feature-name
  ```
- Follow established architectural boundaries:
  - Spring Boot 3.4.2 & Java 21 LTS across backend microservices.
  - React 18.3.1 + Vite + Tailwind CSS without TypeScript overhead.
  - Spring Cloud Gateway routing and `X-Gateway-Secret` header security checks.
  - MySQL 8.x schema consistency.
- Test your changes:
  - Run `npm run build` to verify frontend compilation.
  - Run `.\mvnw.cmd test-compile` to verify all Java microservices compile cleanly.
  - Ensure zero compilation errors and warnings.
- Open a Pull Request referencing related issues and following our PR template.

---

## Commit Message Guidelines

We follow clean, conventional commit messages:
- `feat: <description>` for new user or admin features
- `fix: <description>` for bug fixes
- `docs: <description>` for documentation updates
- `refactor: <description>` for code improvements without functional change
- `test: <description>` for adding or updating test cases

---

## Development Environment Setup

1. **Prerequisites**:
   - Java 21 LTS JDK (`java -version`)
   - Node.js 18+ & npm (`node -v`, `npm -v`)
   - MySQL 8.0+ running locally (`root:root` default credentials or set via `.env`)
2. **Setup**:
   ```bash
   npm install
   ```
3. **Execution**:
   ```bash
   npm run dev:all
   ```
   Or launch services individually as documented in [README.md](README.md).

---

Thank you for helping make Zyndex a world-class academic resource ecosystem!
