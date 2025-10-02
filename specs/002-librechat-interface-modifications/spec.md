# Feature Specification: LibreChat Interface Modifications

**Feature Branch**: `002-librechat-interface-modifications`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "librechat interface modifications - token usage indicator from /home/neil/dev/voygent.appCE, voygent.ai branding, a config to automatically start librechat in travel agent assistant mode, and a way to automatically enable mcp servers"

## Execution Flow (main)
```
1. Parse user description from Input
   → Identified: token usage indicator, branding, auto-start mode, auto-enable MCP servers
2. Extract key concepts from description
   → Actors: travel agent users
   → Actions: view token usage, auto-start in assistant mode, use MCP tools
   → Data: token counts, branding assets, MCP server configs
   → Constraints: must reference existing voygent.appCE implementation
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: Token usage display format/location]
   → [NEEDS CLARIFICATION: Branding scope - logo, colors, text?]
   → [NEEDS CLARIFICATION: Which MCP servers to auto-enable?]
4. Fill User Scenarios & Testing section
   → User flow: Launch → See branding → MCP tools ready → View token usage → Start in agent mode
5. Generate Functional Requirements
   → Each requirement testable
6. Identify Key Entities
   → TokenUsageMetrics, BrandingAssets, AgentModeConfig, MCPServerConfig
7. Run Review Checklist
   → WARN "Spec has uncertainties" (clarifications needed)
8. Return: SUCCESS (spec ready for planning with clarifications)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-01
- Q: Which MCP servers should be auto-enabled on startup? → A: All current servers (d1_database, prompt_instructions, template_document, web_fetch, document_publish)
- Q: What should the token usage indicator display? → A: Input tokens, output tokens, total tokens, and cost estimate (all metrics)
- Q: What constitutes "travel agent assistant mode"? → A: Auto-select Voygent Anthropic endpoint with all MCP servers active, plus load core instructions and/or travel_agent_start from prompt_instructions MCP
- Q: What branding elements should be included? → A: Complete replacement: logo, colors, fonts, tagline, all LibreChat branding removed
- Q: Can users switch out of travel agent mode? → A: System-wide default (all users locked to travel agent mode)

---

## User Scenarios & Testing

### Primary User Story
As a travel agent using Voygent AI, I want to see the Voygent.ai branding when I open LibreChat, have all MCP servers automatically enabled, automatically start in travel agent assistant mode, and monitor my token usage in real-time, so that I can manage costs and immediately begin working on client trips with all necessary tools available without manual configuration.

### Acceptance Scenarios
1. **Given** a travel agent opens LibreChat for the first time, **When** the interface loads, **Then** they see Voygent.ai branding, all required MCP servers are enabled, and they are immediately in travel agent assistant mode
2. **Given** LibreChat has started with MCP servers, **When** the user needs to use a tool (fetch web content, query database, publish document), **Then** the MCP tool is immediately available without manual activation
3. **Given** a conversation is in progress, **When** tokens are consumed, **Then** the token usage indicator updates in real-time showing current usage
4. **Given** the token usage indicator is visible, **When** the user clicks/hovers on it, **Then** they see detailed breakdown of token consumption [NEEDS CLARIFICATION: What detail level - per message, per session, cumulative?]
5. **Given** LibreChat is already configured, **When** a user refreshes or reopens, **Then** travel agent assistant mode and MCP servers persist as defaults
6. **Given** an MCP server becomes unavailable, **When** the user attempts to use its tools, **Then** the system displays an error message [NEEDS CLARIFICATION: Should system retry? Show fallback options?]

### Edge Cases
- What happens when token usage data is unavailable or delayed?
- How does the system handle token usage display for multiple concurrent conversations?
- What should display if no token usage has occurred yet in the session?
- Should token usage reset per session, per day, or persist indefinitely?
- How does branding appear on different screen sizes (mobile, tablet, desktop)?
- What happens if an MCP server fails to initialize on startup?
- Should users be able to manually disable auto-enabled MCP servers?
- How does the system handle MCP server version updates or configuration changes?

## Requirements

### Functional Requirements

**Token Usage Indicator**
- **FR-001**: System MUST display real-time token usage during conversations
- **FR-002**: Token usage indicator MUST show input tokens, output tokens, total tokens, and cost estimate
- **FR-003**: Token usage indicator MUST be persistently visible [NEEDS CLARIFICATION: always visible or toggle-able?]
- **FR-004**: System MUST update token counts within [NEEDS CLARIFICATION: acceptable latency not specified - real-time, 1s delay, 5s delay?] of token consumption
- **FR-005**: Token usage indicator MUST reference the implementation from /home/neil/dev/voygent.appCE [NEEDS CLARIFICATION: Which specific components/features should be replicated?]
- **FR-006**: System MUST track token usage per [NEEDS CLARIFICATION: per message, per conversation, per session, per day, or all?]

**Voygent.ai Branding**
- **FR-007**: System MUST display Voygent.ai branding elements throughout the interface
- **FR-008**: Branding MUST include Voygent.ai logo in header and sidebar
- **FR-009**: Branding MUST include complete custom color theme (primary, accent, backgrounds)
- **FR-010**: Branding MUST include custom fonts and tagline
- **FR-011**: Branding MUST completely replace all LibreChat branding (no co-branding)
- **FR-012**: Branding assets MUST be consistent across all screens and components

**Travel Agent Assistant Mode Auto-Start**
- **FR-013**: System MUST automatically initialize in travel agent assistant mode on startup
- **FR-014**: Travel agent assistant mode MUST load without requiring user selection or configuration
- **FR-015**: Travel agent assistant mode MUST auto-select Voygent Anthropic endpoint, enable all MCP servers, and load core instructions and/or travel_agent_start instruction from prompt_instructions MCP
- **FR-016**: Users MUST NOT be able to switch out of travel agent mode (system-wide lock)
- **FR-017**: Travel agent assistant mode configuration MUST be enforced system-wide for all users

**MCP Server Auto-Enable**
- **FR-018**: System MUST automatically enable all configured MCP servers on startup
- **FR-019**: MCP servers to be auto-enabled MUST include all current servers: d1_database, prompt_instructions, template_document, web_fetch, document_publish
- **FR-020**: System MUST verify MCP server availability before marking them as enabled
- **FR-021**: System MUST display MCP server connection status [NEEDS CLARIFICATION: Where? How detailed - simple indicator or full health check?]
- **FR-022**: Users MUST be notified if an MCP server fails to auto-enable [NEEDS CLARIFICATION: Blocking error or background notification?]
- **FR-023**: System MUST [NEEDS CLARIFICATION: Should system retry failed MCP connections? How many times? With what backoff?]
- **FR-024**: Users MUST be able to [NEEDS CLARIFICATION: Can users manually disable auto-enabled MCP servers? Is this persistent?]
- **FR-025**: MCP server auto-enable configuration MUST [NEEDS CLARIFICATION: Should this be configurable per-user, per-endpoint, or system-wide?]

**Integration Requirements**
- **FR-026**: Token usage indicator MUST work with all configured endpoints (Anthropic, OpenAI)
- **FR-027**: System MUST maintain token usage history [NEEDS CLARIFICATION: retention period not specified]
- **FR-028**: Branding assets MUST be configurable [NEEDS CLARIFICATION: via config file, environment variables, admin UI?]
- **FR-029**: MCP server configuration MUST support startup order dependencies [NEEDS CLARIFICATION: Are there dependencies between MCP servers?]
- **FR-030**: System MUST handle MCP server configuration updates [NEEDS CLARIFICATION: Dynamic reload or requires restart?]

### Key Entities

- **TokenUsageMetrics**: Represents real-time and historical token consumption data
  - Attributes: input tokens, output tokens, total tokens, timestamp, endpoint/model identifier, cost estimate
  - Relationship: Associated with conversations, sessions, and users

- **BrandingAssets**: Represents Voygent.ai visual identity elements
  - Attributes: logo images, color palette, typography settings, tagline text
  - Relationship: Applied globally to interface components

- **AgentModeConfig**: Represents travel agent assistant mode configuration
  - Attributes: default endpoint, preset instructions, available MCP tools, UI preferences
  - Relationship: Determines initial state of LibreChat on launch

- **MCPServerConfig**: Represents MCP server connection and enablement configuration
  - Attributes: server name, endpoint URL, auto-enable flag, connection status, health check results
  - Relationship: Referenced by AgentModeConfig, used during startup initialization

- **UserSession**: Represents active user interaction with LibreChat
  - Attributes: session start time, selected mode, token budget/limits, active MCP servers
  - Relationship: Contains TokenUsageMetrics, applies BrandingAssets and AgentModeConfig, manages MCPServerConfig states

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain *(23 clarifications needed)*
- [ ] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (23 clarification points)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed *(blocked on clarifications)*

---

## Next Steps

**Required Clarifications (23)**:

**Token Usage:**
1. Token usage detail level: per message, per session, cumulative?
2. Display format: input tokens, output tokens, total, cost estimate, or all?
3. Visibility: always visible or toggle-able?
4. Update latency: real-time, 1s, 5s delay?
5. Reference implementation: which specific components from voygent.appCE?
6. Tracking granularity: per message, conversation, session, day, or all?
7. Retention period: how long to store usage history?

**Branding:**
8. Scope: logo, colors, text, or all?
9. Logo placement: header, sidebar, both?
10. Color scheme: full theme or accent colors only?
11. Text elements: custom tagline included?
12. Strategy: complete replacement or co-branding with LibreChat?
13. Configuration method: config file, environment variables, admin UI?

**Travel Agent Mode:**
14. Mode definition: specific endpoint, preset prompt, available tools, or UI layout?
15. User control: can users switch modes?
16. Persistence: does mode selection persist on refresh?
17. Scope: per-user or system-wide default?

**MCP Server Auto-Enable:**
18. Server list: which servers to auto-enable (d1_database, prompt_instructions, etc.)?
19. Status display: where and how detailed?
20. Error handling: blocking error or background notification?
21. Retry policy: should system retry? how many times? backoff strategy?
22. User control: can users manually disable? is it persistent?
23. Configuration scope: per-user, per-endpoint, or system-wide?
24. Dependency handling: are there startup order dependencies?
25. Dynamic updates: reload or restart required for config changes?

**Dependencies:**
- Existing token usage implementation in /home/neil/dev/voygent.appCE (reference implementation)
- Voygent.ai branding assets (logos, colors, fonts)
- LibreChat configuration system understanding
- Current MCP server infrastructure (d1_database, prompt_instructions, template_document, web_fetch, document_publish)

**Assumptions:**
- LibreChat supports UI customization
- Token usage data is accessible from LibreChat's backend
- Travel agent assistant mode refers to a specific preset configuration
- MCP servers can be programmatically enabled/disabled
- MCP server health can be monitored
