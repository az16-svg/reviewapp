Build an LLM-powered agent using **OpenAI Agents SDK** (https://openai.github.io/openai-agents-js/) with **GPT5.1** as the main reasoning model that can reason over construction drawing sets by referencing:
- **Project and page analysis context**: Legends, plans, elevations, details, in sheet.json and context.json

- Side‑by‑side layout:
  - Main area: overlay image viewer
  - Right side panel: chat panel (like Cursor) for questions, add a button icon to bring up the chat panel

- Chat behavior (for Friday demo):
  - Chat lives on the same page as the overlay viewer
  - User views overlay and types questions in the side panel during live call
  - AI responds using:
    - Pre‑processed overlay results and project context (location, background, current stage), if provided (call this context.json that the user will upload)
    - All associated sheet.json data (legends, general notes) 
  - AI does not process the images as context directly for now (but plan for it in future builds)
  - Follow‑up questions in the same chat reuse previous context and results

- Implementation decisions:
  - Focus for now: **pre‑populated context** (pre‑processed JSON results context.json and sheet.json for all page), not real‑time image reasoning
  - AI should answer **only** based on:
    - The pre‑generated analysis
    - project metadata
  - Items:
    - research (web search) existing chat UI components (bubbles, streaming, etc.) to avoid building from scratch
  - Latency / quality:
    - Multi‑image direct reasoning is likely slow and unpredictable, so deferred for now
    - Pre‑processed JSON keeps behavior more controllable for the demo

- UX constraints:
  - Keep interface extremely simple, fast and obvious for low‑tech users
  - overlay viewer + simple side chat is enough for MVP

- Tools
  - OpenAI Web search tool