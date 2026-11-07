# Accessibility Statement for Zyndex

Zyndex was designed, engineered, and architected from the ground up by **Bhaanu G (Bhaanu Gali)** with an uncompromising commitment to universal accessibility in higher education. All platform intellectual property, design systems, and engine implementation are created and maintained solely by Bhaanu G.

Our mission is to provide an open, accessible, barrier-free digital reading and research experience for all students, educators, researchers, and scholars, including individuals with visual, auditory, cognitive, or motor disabilities.

---

## Authorship & Accessibility Governance

> [!IMPORTANT]
> **Sole Creator, Lead Architect & Design Authority**: **Bhaanu G (Bhaanu Gali)**  
> **Direct Administrative Contact**: `Bhaanugali@gmail.com`  
> **Institutional Office**: `2400030952@kluniversity.in`, Zyndex Platform, KL University  
> **Compliance Target**: **WCAG 2.1 Level AA & Section 508 Standards**  
> *All platform accessibility standards, design patterns, and keyboard interaction models are maintained under the direct stewardship of Bhaanu G.*

---

## 1. Conformance Standards & Baseline

Zyndex adheres strictly to the following accessibility benchmarks:

- **Web Content Accessibility Guidelines (WCAG) 2.1 Level AA**: Published by the World Wide Web Consortium (W3C).
- **Section 508 of the U.S. Rehabilitation Act**: Technical standards for electronic and information technology in educational software.
- **EN 301 549**: European accessibility requirements for digital and public educational procurement.

---

## 2. Core Accessibility Architecture & Implementations

```
┌────────────────────────────────────────────────────────┐
│             FOUR PRINCIPLES OF ACCESSIBILITY           │
├─────────────────┬─────────────────┬────────────────────┤
│   PERCEIVABLE   │   OPERABLE      │   UNDERSTANDABLE   │
│ - 4.5:1 Contrast│ - Full Keyboard │ - Predictable UI   │
│ - Visible Text  │ - No Focus Traps│ - Clear Error Text │
│ - Screen Readers│ - Esc to Close  │ - Form Validation  │
└─────────────────┴─────────────────┴────────────────────┘
```

### 2.1 Visual Ergonomics & Contrast Ratio Compliance
- **WCAG AA Minimum Contrast (4.5:1)**: All body text, button labels, category badges, and icon triggers maintain a contrast ratio of at least `4.5:1` against their respective backgrounds (`3:1` for large headlines and active focus indicators).
- **High-Contrast Slate & Amber Theme**: Deep slate backgrounds (`#0f172a`, `#1e293b`) paired with warm amber/orange highlights (`#ea580c`, `#c2410c`) and crisp off-white typography (`#f8fafc`) prevent eye fatigue during extended academic research sessions.
- **Multimodal Indicator Redundancy**: Information is never conveyed through color alone. Subscription statuses, payment holds, error dialogues, and verification states pair explicit text tags with distinctive SVG vector iconography.

### 2.2 Complete Keyboard Operability & Focus Management
- **Deterministic Tab Order**: All interactive controls—search bars, category filters, pagination controls, form inputs, and modal action buttons—follow natural visual reading order.
- **High-Visibility Focus Rings**: Every focusable component features an unmistakable 4px focus ring (`focus:ring-4 focus:ring-orange-600/20`) to assist keyboard-only researchers.
- **Strict Modal Focus Trapping**: Dialog overlays (including the 2-Minute UTR Hold Modal, Session Inactivity Alert, and Document Upload Modal) trap focus within the active dialog and restore focus to the triggering element upon dismissal.
- **Global Escape Key & Enter Key Handlers**: Any modal or drawer can be instantly dismissed using the `Escape` key. All form inputs across login, registration OTP verification, and search fields trigger immediate execution via the `Enter` key.

### 2.3 Screen Reader & Assistive Technology Integration
- **Semantic HTML5 Landmark Hierarchy**: Interfaces are structured with native `<header>`, `<nav>`, `<main>`, `<section>`, `<table>`, and `<footer>` elements, allowing screen readers (NVDA, JAWS, VoiceOver, and ChromeVox) to jump directly between logical regions.
- **Comprehensive ARIA Metadata**: Buttons featuring icon-only visual layouts are reinforced with unambiguous `aria-label`, `aria-expanded`, and `aria-haspopup` attributes.
- **Live Status Announcements**: Asynchronous operations (OTP generation, document ingestion progress, payment verification state changes) are wrapped in `aria-live="polite"` regions so assistive technology users receive real-time operational feedback.

### 2.4 Digital Document & PDF Reader Accessibility
- **Dynamic In-Browser Scaling**: The embedded PDF reader supports continuous document zoom from 50% to 250% without truncating margins or breaking text reflow.
- **Browser Zoom Preservation**: The entire platform accommodates browser-level zoom up to 200% without horizontal scroll corruption or overlapping controls.
- **Direct Page Navigation**: Users can jump to specific pages via keyboard numerical input or toggle sequentially using designated arrow controls.

---

## 3. Known Limitations & Active Remediation Roadmap

- **Historical Academic Scans**: Legacy scanned PDF manuscripts uploaded from external archival sources may lack embedded OCR text layers. Zyndex is actively developing an automated server-side Optical Character Recognition (OCR) pipeline to extract and inject structured machine-readable text into legacy documents upon upload.
- **Complex Mathematical Equations**: Advanced multi-line KaTeX formulas in certain scientific publications are continually reviewed to ensure optimal screen reader speech pronunciation.

---

## 4. Accessibility Feedback & Dedicated Contact

We continuously test and audit Zyndex against assistive technology devices. If you encounter any accessibility barrier or have specific assistive requirements:

- **Primary Contact**: **Bhaanu G (Bhaanu Gali)**
- **Role**: Sole Creator, Lead Architect & Platform Maintainer
- **Administrative Email**: `Bhaanugali@gmail.com`
- **Campus Office**: `2400030952@kluniversity.in`, KL University
- **Response Commitment**: We acknowledge all accessibility inquiries within **24 hours** and triage technical remediation within **3 to 5 business days**.
