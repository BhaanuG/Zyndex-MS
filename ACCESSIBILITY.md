# Accessibility Statement for Zyndex

Zyndex (operating under the ScholarSphere Engine) is dedicated to providing an open, accessible, and barrier-free digital reading and research experience for all students, educators, and scholars, including people with visual, auditory, cognitive, or motor disabilities.

---

## 1. Conformance Standards

We design and test our web platform to align with the **Web Content Accessibility Guidelines (WCAG) 2.1 Level AA** standards published by the World Wide Web Consortium (W3C), and the Section 508 accessibility guidelines for digital educational tools.

---

## 2. Key Accessibility Implementations

### 2.1 Visual Design & Contrast
- **WCAG AA Compliant Contrast Ratios**: All foreground text, button labels, badges, and icon elements provide a contrast ratio of at least `4.5:1` against their backgrounds (`3:1` for large headlines and decorative borders).
- **Theme Readability**: High-contrast typography pairing deep slate (`#0f172a`, `#1e293b`) with accessible orange highlights (`#ea580c`, `#c2410c`) ensures readability under varying ambient lighting conditions.
- **Independent Color Reliance**: Visual cues (such as active subscription badges, payment states, and error alerts) use text labels and recognizable iconography alongside color indicators to avoid reliance solely on color perception.

### 2.2 Keyboard Navigation & Focus Flow
- **Logical Tab Order**: All form inputs, modal dialogs, search boxes, tab bars, and reader controls follow natural tab sequences across both desktop and mobile views.
- **Focus Indicators**: Interactive elements feature clear, visible focus rings (`focus:ring-4 focus:ring-orange-600/10`) to assist keyboard-only navigators.
- **Modal Focus Trapping & Dismissal**: Dialogs and popups (e.g. Session Timeout, UTR Payment Hold modal, and PDF Viewer controls) capture focus on entry and allow immediate dismissal via the `Escape` key or explicit close buttons.
- **Keyboard Shortcuts**: Input forms support instant submission via the `Enter` key across login, signup OTP verification, and search fields.

### 2.3 Screen Reader & Assistive Technology Support
- **Semantic HTML5 Architecture**: Pages are structured with semantic tags (`<header>`, `<nav>`, `<main>`, `<section>`, `<table>`, `<footer>`) enabling screen readers (NVDA, JAWS, VoiceOver) to navigate directly via landmarks.
- **Descriptive Labels & ARIA Attributes**: Icon-only buttons (such as page flips, zoom controls, and close icons) include descriptive `aria-label` or `title` attributes.
- **Live Status Announcements**: Asynchronous operations (like OTP verification, document upload progress, and payment status updates) surface clear feedback messages for assistive devices.

### 2.4 Digital Document & PDF Reader Experience
- **Responsive Zoom & Scaling**: The embedded PDF reader offers continuous zoom scaling (`Zoom In`, `Zoom Out`, `Reset Scale`) without clipping text or corrupting reading layouts.
- **Flexible Document Orientation**: Supports browser-level text magnification up to 200% without loss of functionality.
- **Page-by-Page Navigation**: Jump-to-page input and previous/next page triggers permit effortless navigation for keyboard and screen-reader users.

---

## 3. Known Limitations & Ongoing Roadmap

While we strive for complete compliance, certain third-party historical scan PDFs may contain non-OCR rasterized text that cannot be fully parsed by screen readers. Our ongoing content roadmap incorporates automated Optical Character Recognition (OCR) pipeline processing to enrich all incoming scanned materials with accessible text layers.

---

## 4. Feedback & Accessibility Contact

We welcome feedback, suggestions, and reports of accessibility barriers encountered within the Zyndex platform. If you experience difficulty accessing any part of our site:

- **Primary Contact**: Bhaanu Gali
- **Email**: `Bhaanugali@gmail.com`
- **Campus & Institutional Office**: `2400030952@kluniversity.in`, ScholarSphere Research Engine, KL University
- **Response Commitment**: We review all accessibility inquiries promptly and aim to respond within **2 business days** with an actionable remediation timeline.
