# PlayOnLeh – Product Requirements Document (PRD)

## 1. Product Overview

**Product name:** PlayOnLeh  
**Tagline (working):** "Your AI rules buddy for game night."

PlayOnLeh is an AI-powered rules assistant for board and card games. It lets players:

- Ask natural-language questions such as "They played this card, what happens next?" or "How do we set up this game?" and get concise, rules-accurate answers.
- Configure per-game house rules via a standardised form (checkboxes + small free-text field), so each game session respects how that particular group plays.
- Identify the game by snapping a photo of the box, then jump straight into the correct game and its house-rule configuration.
- Provide structured feedback on incorrect or unclear answers through a feedback modal, to drive continuous quality improvement.

The longer-term vision is to become the default "rules brain" at the table, eventually adding deeper computer-vision features (e.g., board/tableau understanding) and richer teaching flows, while remaining table-friendly and fast.

***

## 2. Problem Statement & Goals

### Problem

- Game nights are frequently slowed down by trips to rulebooks, long YouTube explainers, or arguments over edge cases.
- Existing AI tools can answer rules questions but typically:
  - Do not incorporate **group-specific house rules** in a structured, repeatable way.
  - Do not expose a clear, per-game configuration surface for those rules; users must prompt-engineer manually.
  - Often hallucinate, with no easy feedback loop to fix bad answers over time.
- New or casual players are overwhelmed by dense rule texts; hosts want a **simple, conversational way** to resolve questions quickly.

### Primary goals (for v1 / hackathon MVP)

1. Provide a **chat-based rules assistant** for a small set of games that can answer common rules questions accurately and concisely.
2. Allow users to configure **per-game house rules** via a standardised form when creating a game chat.
3. Enable **game identification from a box-cover photo**, then route users directly into the corresponding game + configuration flow.
4. Capture structured **feedback on answers** (e.g., wrong/unclear) in a sidebar tied to messages.

### Non-goals (v1)

- Full computer-vision understanding of arbitrary board states (detecting exact card positions, scores, or tokens on the table).
- Supporting a large catalog of games; v1 should focus on a very small set.
- Rich multi-user accounts, social features, or real-time multi-device syncing.

***

## 3. Target Users & Personas

### Persona 1 – The Game Host

- Organises game nights, owns multiple games, is usually the "rules person" in the group.
- Pain: tired of re-explaining basic setup and edge cases; rulebook lookups interrupt flow.
- Needs: quick, authoritative clarifications; ability to set and remember the group’s house rules per game.

### Persona 2 – The Casual Player

- Joins game nights occasionally or is new to a specific game.
- Pain: feels lost during setup or when rules get technical.
- Needs: simple answers to "What happens now?" without reading the whole book.

### Persona 3 – The Rules Geek

- Enjoys digging into corner cases and FAQs.
- Pain: online forum posts and unofficial answers can be inconsistent.
- Needs: an assistant that can reference official rules and clearly distinguish them from house rules.

***

## 4. Key Use Cases

1. **Setup assistance**  
   - "We’re playing Uno for 4 players – how do we set up and who goes first?"  
   - User expects a short, clear checklist.

2. **In-game resolution**  
   - "The previous player played a Draw Two in Uno and I have a Draw Two as well. Under our house rules, can I stack it?"  
   - Assistant considers both official rules and configured house rules to answer.

3. **Fast game selection via photo**  
   - User snaps a photo of a game box; system recognises it as Uno, automatically selects that game, and opens the house-rules form.

4. **House-rules configuration and persistence**  
   - When starting a new Uno session, the host sets toggles like "Stack +2s" and "7–0 rule" once and expects consistent answers under those constraints.

5. **Feedback on incorrect answers**  
   - If an answer is wrong/unclear, the host taps thumbs-down, marks "Incorrect ruling" and adds a note. This is stored for offline review and future improvement.

***

## 5. Scope – v1 Hackathon MVP

### In-scope

- Web-based single-page app (SPA) with:
  - Game selection for a small set of games (can be as few as 1 for hackathon; roadmap will define initial production set).
  - Chat UI for asking questions and displaying answers.
  - Per-game house-rules configuration form at chat creation.
  - Box-photo game identification limited to the same small game set.
  - Basic structured feedback mechanism tied to assistant messages.
- Backend logic to:
  - Generate system prompts that include selected game, house rules, and (optionally) small retrieved rule snippets.
  - Call the LLM provider (e.g., GPT-style model) to generate answers.

### Out-of-scope (v1)

- User authentication, cross-device sync, or persistent user profiles beyond simple local storage.
- Large, scalable retrieval system with many games; simple, hard-coded or lightweight retrieval is acceptable.
- Deep analytics dashboards; only basic event logging/metrics if time permits.

***

## 6. Functional Requirements

### F1. Game Selection & Session Management

**Description:** Users choose a game and start a dedicated rules chat session tied to that game.

**Requirements:**

1. Session start uses two explicit workflows:
   - Guided start: `New Session` routes to `/sessions/new` (select-a-game picker).
   - Browse-first: `/games` remains catalogue for browsing game details.
2. Naming conventions:
   - Actions that begin a fresh chat must be labeled **Start Session** or **New Session**.
   - Existing history must be labeled **My Sessions**.
3. User selects a game and is taken to a **Configure House Rules** screen:
   - Shows game name and short description.
   - Presents per-game house-rules configuration form (F2).
4. After completing setup, a **Chat Session** is created with:
   - Game ID.
   - House-rules configuration JSON.
   - Optional metadata (timestamp, session name).
5. The session page displays the chosen game and a short summary of active house rules in the header/sidebar.

### F2. Per-game House-Rules Configuration (skills.md-style)

**Description:** Each game has a standardised configuration form consisting of toggles, choice fields, and a small free-text "Other rules" field.

**Requirements:**

1. For each game, define a schema of configurable parameters, e.g.:  
   **Example – Uno**
   - Stack Draw Two cards? [checkbox]
   - Stack Wild Draw Four cards? [checkbox]
   - 7–0 rule (swap hands)? [checkbox]
   - Jump-in (play identical card out of turn)? [checkbox]
   - Victory condition: [dropdown: Standard 500 points / First to zero cards / Other]
   - Other house rules: [textarea]

   **Example – Mahjong (roadmap)**
   - Variant: [dropdown: Hong Kong / Riichi / Singapore / Other]
   - Minimum fan to win: [numeric]
   - Flowers/Seasons counted? [checkbox]
   - Other house rules: [textarea]

2. The form is rendered dynamically based on the game’s schema.
3. On submit, the selected values are stored as a JSON object associated with the session (and optionally persisted as default for this browser/device + game).
4. The backend generates a **house-rules summary string** from the JSON, such as:
   - "House rules: allow stacking Draw Two; disallow stacking Draw Four; enable 7–0 rule; jump-in allowed; other: no scoring, just first to empty hand wins."
5. This summary is injected into the system prompt for the LLM for all messages in this session.
6. In the UI, the house-rules summary is displayed clearly as a short bullet-list text block so users know what is active.
7. Standard vs Custom gating:
   - Standard mode can start immediately with deterministic standard summary.
   - Custom mode requires explicit **Save house rules** before **Start Session** is enabled.
7. The assistant is instructed to:
   - Respect these house rules as overrides where they diverge from official rules.
   - Explicitly note when a house rule deviates from the official rule (e.g., "Under your house rules… Officially, the base rules say…").

### F3. Chat Interface & Messaging

**Description:** Conversational UI where users ask rules questions and get answers.

**Requirements:**

1. Main layout: chat pane on the right (or main area on mobile), sidebar on the left with game info and house-rules summary.
2. Each chat message shows:
   - User messages with timestamp.
   - Assistant messages with text answer and optional reference to rules (e.g., "According to the official rules…").
3. Input box supports short to medium-length natural-language questions.
4. Hitting Enter (or clicking Send) submits the question; the UI shows a loading indicator while awaiting response.
5. Messages are appended to session history; for hackathon, in-memory storage is acceptable.

### F4. Rules-Answering Engine (LLM + official-rulebook RAG)

**Description:** Backend logic that uses an LLM to answer questions with awareness of game, house rules, and retrieved context from official rulebook chunks.

**Requirements:**

1. For each request, backend builds a structured prompt that includes:
   - Game name and short description.
   - House-rules summary string.
   - User question.
   - Top-k retrieved rulebook chunks (vector search over official source).
2. Assistant behaviour guidelines in the system prompt:
   - Prefer concise, step-by-step explanations.
   - Clearly distinguish between official rules and house rules when relevant.
   - Keep user-facing replies conversational and do not mention chunk numbers/sources in output.
   - When context is insufficient or rules conflict, say "I'm not fully certain" rather than hallucinating.
3. The backend calls the LLM API and returns the answer text plus retrieved chunk metadata to the frontend.
### F5. Game Identification via Box Photo

**Description:** Users can upload or capture a photo of a game box to automatically identify which supported game they are playing and jump into the setup flow.

**Requirements:**

1. Provide a **"Scan Game"** action in primary navigation (desktop sidebar and mobile navigation sheet).
2. When clicked:
   - User selects or captures an image (camera or file upload, depending on platform/browser).
3. Backend (or client, depending on infra) sends the image to a vision-capable model and asks it to:
   - Read text (OCR) and logos on the box.
   - Map the detected name to one of the small set of supported games (string matching over a predefined list, e.g., ["Uno", "Uno Flip", "Mahjong" in later phases]).
4. If a match is found:
   - Show confirmation: "Detected game: Uno. Continue? [Yes/No]".
   - On Yes, auto-select Uno and open its house-rules configuration form.
5. If no match or low confidence:
   - Fall back to manual game selection with a friendly message ("Couldn’t confidently identify the game.").
6. For hackathon, it is acceptable to support only a subset (e.g., Uno + Uno Flip) and assume relatively clean, frontal box images.

### F6. Feedback Sidebar & Message-level Feedback

**Description:** Allow users to flag assistant responses as incorrect or unclear and provide structured feedback.

**Requirements:**

1. Each assistant message shows quick actions:
   - 👍 and 👎 icons.
2. On 👎 click:
   - Open a centered modal dialog with dimmed background overlay, containing:
     - Reason (radio buttons): [Incorrect ruling / Missing information / Unclear explanation / Other].
     - Optional free-text field.
     - Submit button.
3. On submit:
   - Store feedback with fields: session ID, message ID, game ID, timestamp, reason, text.
   - Show a simple success toast ("Thanks, this helps us improve!").
4. For hackathon MVP, data can be logged to console or a simple datastore; no full admin UI is required.

### F7. App Navigation Sidebar (v1 update)

**Description:** A persistent app-level navigation sidebar provides consistent movement between core experiences.

**Requirements:**

1. Sidebar nav ships only these five items:
   - New Session
   - Scan Game
   - Games Catalogue
   - Recent Chats
   - Settings
2. Desktop:
   - Persistent left sidebar at fixed width (compact, non-hover expanding).
   - Main content renders in the right content pane.
3. Mobile:
   - Sidebar content appears in a slide-in sheet from a hamburger-triggered top bar.
4. Navigation targets:
   - `/` Home dashboard (Welcome + Recent Games + Recent Chats)
   - `/sessions/new` Guided New Session game picker
   - `/games` Games Catalogue
   - `/recent-chats` Recent Chats list
   - `/settings` Settings page
5. Guest-only state in v1:
   - Show profile footer as `Guest`.
   - No login/signup/auth flows.
6. Settings includes a global reset action in v1 to clear sessions/messages/feedback (no per-user ownership in v1).
### F8. Game Detail + Rules Reader (v1 update)

**Description:** Each supported game has a dedicated detail page and a rules page with an embedded official rulebook and AI summary.

**Requirements:**

1. Routing:
   - `/games` remains the catalogue.
   - `/games/:gameId` opens game detail.
   - `/games/:gameId/sessions` opens game-specific session history.
   - `/games/:gameId/rules` opens rules reader.
2. Game detail page includes:
   - Cover image.
   - Metadata row (players, duration, age).
   - Actions: Start Session, My Sessions, Rules.
3. Start Session action behavior:
   - Routes to setup flow for a new session.
4. My Sessions behavior:
   - Lists existing sessions filtered by game, each opening its existing chat session.
5. Rules page includes:
   - AI summary section (setup, turn flow, special cards, winning, common questions).
   - Embedded PDF viewer for official rulebook source.
   - Placeholder sections for Expansions and Similar games.
6. MVP may hardcode Uno metadata and placeholders while keeping structure extensible.
***

## 7. Non-functional Requirements

1. **Performance**  
   - Target end-to-end response time: < 4 seconds for most queries (network + model).  
   - Box-photo identification may take slightly longer; communicate via a spinner.

2. **Reliability**  
   - Handle LLM or vision API failures gracefully with user-friendly error messages and retry options.

3. **Usability**  
   - Mobile-friendly layout; many users will use phones at the table.
   - Dark mode or at least a dark-ish theme is preferred for table use.

4. **Security & Privacy**  
   - No user accounts in v1; store session data only in memory or local storage (depending on scope).  
   - Images used for box identification should not be persisted beyond what the model provider logs by default.

5. **Localization (future)**  
   - Initial version can be English-only, but design copy and prompts such that multi-language support can be added later.

***

## 8. Design System & UX

### 8.1 Design Principles

- **Table-first, not tech-first:** Minimize visual noise and interactions so PlayOnLeh feels like a subtle tool at the edge of the table, not the main attraction, similar to companion apps for complex board games.
- **Fast legibility in dim light:** Support use in cafés, bars, and living rooms with dim lighting by preferring dark theme, high-contrast text, and limited saturated accents.
- **Game-night personality:** Use playful but restrained visuals (chips, cards, tiles) and a warm color accent so it feels like part of a physical game collection, not a generic SaaS tool.
- **Consistency and predictability:** Reuse a tight set of components (cards, chips, buttons, form controls, message bubbles) to make behavior obvious and reduce cognitive load.

### 8.2 Color System

Target a **dark theme** as default, inspired by Material Design dark-theme guidance: avoid pure black, avoid overly saturated colors, and maintain sufficient contrast.

**Base palette (example):**

- **Background:** Rich dark gray, e.g. `#121212` for the main surface and `#181A20` for elevated surfaces.
- **Primary accent:** A warm, playful orange or yellow (e.g., between `#ff9800` and `#eddc6a`) used for primary buttons, key icons, and highlights.
- **Secondary accent:** A teal or blue-teal (`#009688` or `#396979`) for secondary actions, links, and selection states.
- **Success:** Soft green (e.g., `#4caf50`).
- **Error:** Deep orange/red (e.g., `#ff5722`).
- **Text:**
  - Primary: near-white (`#EDEDED`).
  - Secondary: muted grey (`#B0B0B0`).

**Usage rules:**

- Primary accent reserved for: primary call-to-action, active game chip, send button.
- Secondary accent for chips, selected filters, and informational highlights.
- Avoid using more than 2–3 accent colors on a single screen to keep the interface calm.

### 8.3 Typography

- **Heading font:** Rounded, friendly sans-serif (e.g., Inter, SF Pro, or Rubik) with slightly increased letter-spacing to read well at-a-glance.
- **Body font:** Same family for consistency; 14–16px on mobile, 16–18px on desktop.
- **Message text:** 15–16px minimum, with generous line-height (1.4–1.6) to allow quick scanning.
- Use typographic hierarchy instead of multiple colors: H1 for page title, H2 for section titles ("House rules"), H3 for smaller labels.

### 8.4 Iconography & Illustration

- Style: simple, outlined icons with slight rounding, consistent stroke width.
- Theming: cards, tiles, dice, and meeple motifs to echo tabletop gaming.
- Keep illustrations minimal on core screens to avoid clutter; use them on empty states and marketing pages.

### 8.5 Layout & Information Architecture

On desktop/tablet:

- **Left sidebar (~260–300px fixed width):**
  - PlayOnLeh logo + wordmark.
  - Section groups:
    - PLAY: New Session, Scan Game
    - LIBRARY: Games Catalogue, Recent Chats
    - SETTINGS: Settings
  - Compact Guest profile row at bottom ("Guest", optional "Local sessions only").
- **Main content area:**
  - Active page content (Home dashboard, Games Catalogue, Setup, Session, Recent Chats, Settings).
- **Chat area (within session page):**
  - Messages stacked vertically.
  - Input bar anchored to the bottom.
- **Feedback sidebar:**
  - Slides from right when a message is downvoted.

On mobile:

- Top app bar shows page title + hamburger icon.
- Sidebar navigation and Scan Game are accessible via slide-in sheet.
- Chat occupies most of the screen.
### 8.6 Key Screens

1. **Home dashboard (`/`)**
   - Greeting ("Welcome, Guest") and quick helper text.
   - Recent Games (top unique games inferred from recent sessions).
   - Recent Chats preview list.

2. **Games Catalogue (`/games`)**
   - Grid/list of supported games.
   - Clicking a card opens game detail (`/games/:gameId`).
   - Card quick action starts a fresh session (`/setup/:gameId`) and is labeled Start Session.

3. **Game Detail (`/games/:gameId`)**
   - Cover image + metadata row (players, duration, age).
   - Actions for Start Session, My Sessions, and Rules.

4. **Game Sessions (`/games/:gameId/sessions`)**
   - Existing sessions filtered by game.
   - Start Session shortcut for fresh setup.

5. **Rules Reader (`/games/:gameId/rules`)**
   - AI summary section grounded in official rule chunks.
   - Embedded official PDF viewer.
   - Placeholder sections for Expansions and Similar games.

6. **Scan Game flow**
   - Modal or full-screen step:
     - Top: explainer text.
     - Center: drag-and-drop / camera interface.
     - Bottom: progress indicator and candidate confirmation.

7. **House-rules configuration**
   - For each game, grouped sections ("Draw & stack rules", "Special rules", "Scoring").
   - Toggles, checkboxes, and radios; avoid large textareas except "Other house rules".
   - Rules Summary is shown as a bullet list.
   - Standard mode starts immediately.
   - Custom mode requires explicit save before start.

8. **Chat session**
   - Message bubbles with subtle elevation or border.
   - Each assistant message contains text + thumbs icons.
   - Header shows session title and compact Rules Summary text (no chips).
### 8.7 Component Library (Design System)

- **Buttons:** primary (filled, primary accent), secondary (outlined), and icon buttons for thumbs, camera, settings.
- **Chips & tags:** pill-shaped, used for house-rules summary and game variants; filled if active, outlined if passive.
- **Cards:** for game selection and detection results; elevated with shadow or border.
- **Form controls:** toggles, radio groups, sliders/numeric steppers; consistent spacing and alignment.
- **Chat bubbles:** user vs assistant styling (alignment, background tint) with timestamps in subdued text.
- **Feedback sidebar:** panel with title, reason radio group, multiline text field, submit/cancel buttons.

### 8.8 Micro-interactions & States

- Sending a message: subtle animation of send button, then typing indicator.
- Thumbs up/down: small scale animation to confirm selection; 👎 opens feedback modal.
- House-rules toggles: live summary briefly highlights updated phrases.
- Box photo upload: progress bar and skeleton placeholder.
- Error/empty states: friendly copy and simple illustration (e.g., for failed detection or no house rules yet).

### 8.9 Accessibility

- Maintain contrast ratios consistent with WCAG for text and interactive elements.
- Icons accompanied by text labels or tooltips where meaning is not obvious.
- Hit targets at least 44x44 px for mobile controls.
- Avoid relying solely on color; use labels or icons for status.

### 8.10 Design System Implementation Notes

- Base the system loosely on Material Design or a similar framework to speed implementation while preserving custom branding.
- Define tokens for colors, spacing, radii, and elevations.
- In Figma, create a **PlayOnLeh UI Kit** with reusable components and variants for states.

***

## 9. Technical Overview (High-level)

- **Frontend:**
  - SPA (React/Vue/Svelte or similar) deployed on a static host.
  - Components: GameSelector, HouseRulesForm, ChatPane, FeedbackSidebar, ImageUploadModal.

- **Backend (lightweight):**
  - REST API or serverless functions:
    - `POST /identify-game` – accepts image, returns probable game.
    - `POST /chat` – accepts session/game/house-rules metadata + question, returns answer.
    - `POST /feedback` – logs message feedback.
  - Calls out to:
    - Vision-capable model endpoint for game-box recognition.
    - LLM endpoint for chat completion.

- **Rules data (for hackathon):**
  - Store minimal official rules snippets per game as static files or constants.
  - (Optional) Tiny retrieval layer using embeddings or keyword search.

***

## 10. Risks & Open Questions

- **Accuracy vs time:** building a robust, retrieval-grounded system in 12 hours is challenging; hackathon version may rely heavily on prompt-engineered LLM answers with only light rule grounding.
- **Vision robustness:** game-box detection may fail on low-light, partial, or non-English boxes; fallback UX is important.
- **House-rule conflicts:** no validation in v1; conflicting configurations may lead to inconsistent answers.
- **IP / Rulebook rights:** for hackathon, using excerpts is likely acceptable; long term, relationships with publishers may be needed.

***

## 11. Roadmap

### Phase 0 – Hackathon MVP (12h)

- Support at least 2 games end-to-end (Uno and Uno Flip):
  - Game selection.
  - Per-game house-rules form.
  - Chat-based rules answering with prompt-based grounding.
  - Box-photo game identification limited to supported game(s).
  - Feedback sidebar logging.

### Phase 1 – Early Alpha (Initial production-style feature set)

- **Game coverage:**
  - Officially support **3 games first: Uno, Uno Flip, Mahjong** with:
    - Per-game house-rules schemas.
    - At least basic rule snippets for grounding.
- **Rules data:**
  - Replace hard-coded snippets with a small, structured rules corpus per game (sections, FAQs, examples).
- **Better retrieval:**
  - Implement a small vector store or hybrid retrieval so answers can cite relevant sections more consistently.
- **Session persistence:**
  - Basic account or device-level session persistence (e.g., recent sessions, default house rules per game).

### Phase 2 – Teaching & Onboarding Features

- **Setup walkthroughs:**
  - "Teach me setup" button per game that generates a short, stepwise checklist based on rules, with modes like "Quick start" vs "Full rules".
- **Mode selector:**
  - Beginner / Standard / Expert modes adjusting answer depth and jargon level.
- **Multi-language support:**
  - Begin with English + one additional language common among target users.

### Phase 3 – Deeper Intelligence & Computer Vision

- **Board/tableau understanding:**
  - For selected games, allow users to photograph the current hand/tableau/board and ask state-aware questions (e.g., "Is this a legal Mahjong hand?", "Is our Uno starting setup correct?").
- **Per-group profiles:**
  - Let groups save named profiles (e.g., "Friday Mahjong group") with recurring house rules and favourite games.
- **Fair-play and transparency features:**
  - Surface clear "mode" indicators (Practice/Casual/Competitive) and guidelines for when AI help is appropriate.

### Phase 4 – Ecosystem & Publisher Integrations

- **Publisher console:**
  - Tools for publishers to upload and maintain official rules, FAQs, and errata for their games.
- **Community-driven FAQs:**
  - Curate high-signal common questions and answers into semi-official FAQs per game.

PlayOnLeh can start as a focused, delightful rules chatbot for a handful of games, with structured house rules, a small but impressive vision feature, and a coherent design system, then grow into a broader rules and teaching platform for tabletop gaming.




