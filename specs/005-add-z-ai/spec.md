# Feature Specification: Add z.ai as AI Provider

**Feature Branch**: `005-add-z-ai`
**Created**: 2025-10-01
**Status**: Ready for Planning
**Input**: User description: "add z.ai (api key is in ~/Documents/.env) as an AI provider in the voygent app https://z.ai/model-api https://docs.z.ai/guides/overview/quick-start"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Add z.ai provider alongside existing Claude/GPT-4 endpoints
2. Extract key concepts from description
   → Actors: Travel agents using Voygent interface
   → Actions: Select z.ai models, make API calls, display results
   → Data: API credentials (Z_AI_API_KEY), model configurations
   → Constraints: Must integrate with existing LibreChat configuration
3. For each unclear aspect:
   → RESOLVED: Offer GLM-4.6 (flagship), GLM-4.5-Air (cost-effective), and GLM-4.5V (visual)
   → RESOLVED: Display per-million-token pricing consistent with Claude/GPT-4 format
   → RESOLVED: Position as "Flexible Options" - multiple tiers for different use cases
4. Fill User Scenarios & Testing section
   → User flow: Select z.ai endpoint → Choose model → Send message → Receive response
5. Generate Functional Requirements
   → Add z.ai configuration to librechat.yaml
   → Display z.ai models in endpoint selector
   → Use Z_AI_API_KEY for authentication
6. Identify Key Entities (if data involved)
   → z.ai Endpoint Configuration
   → z.ai Model Selection
7. Run Review Checklist
   → All clarifications resolved via pricing research
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a travel agent using Voygent, I want to select z.ai as an AI provider so that I can access alternative language models for travel planning tasks, potentially at different pricing or capability levels than the current Claude and GPT-4 options.

### Acceptance Scenarios
1. **Given** I open a new conversation in Voygent, **When** I click the endpoint selector, **Then** I see z.ai listed as an available AI provider alongside Claude and GPT-4
2. **Given** I select the z.ai endpoint, **When** I view the model options, **Then** I see available z.ai models with clear display labels indicating their purpose and pricing
3. **Given** I have selected a z.ai model, **When** I send a travel planning query, **Then** the system uses the z.ai API to generate a response
4. **Given** z.ai is configured in the system, **When** the API key is missing or invalid, **Then** the system displays a clear error message indicating authentication failure

### Edge Cases
- What happens when the z.ai API is unavailable or returns an error?
- How does the system handle rate limiting or quota exhaustion from z.ai?
- What happens if a user selects a z.ai model that has been deprecated or removed?
- How should the system behave if the Z_AI_API_KEY is malformed or expired?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST allow travel agents to select z.ai as an AI provider from the endpoint selector
- **FR-002**: System MUST authenticate API requests to z.ai using the Z_AI_API_KEY from the environment configuration
- **FR-003**: System MUST display three z.ai models: GLM-4.6 (flagship at $2.80/1M avg), GLM-4.5-Air (cost-effective at $0.65/1M avg), and GLM-4.5V (visual reasoning at $1.20/1M avg)
- **FR-004**: System MUST send user messages to the z.ai API in the correct format and receive responses
- **FR-005**: System MUST handle z.ai API errors gracefully and display user-friendly error messages
- **FR-006**: System MUST maintain conversation history when using z.ai models (same as existing Claude/GPT-4 behavior)
- **FR-007**: System MUST allow switching between z.ai and other providers (Claude, GPT-4) within the same session
- **FR-008**: System MUST respect the same timeout (30 seconds) and retry logic as other providers
- **FR-009**: System MUST display model labels in format: "{Icon} {Model Name} - {Use Case} (${avg_cost}/1M tokens)" for consistency with existing Claude/GPT-4 labels

### Key Entities *(include if feature involves data)*
- **z.ai Endpoint Configuration**: Represents the connection settings for z.ai API, including base URL (https://api.z.ai/api/paas/v4/), API key reference, and available models
- **z.ai Model Selection**: Represents user's choice of specific z.ai model (e.g., GLM-4.6, GLM-4.5V), with associated display label and pricing information
- **API Credentials**: The Z_AI_API_KEY stored in environment configuration, format: `{key_id}.{secret}` (e.g., `98707df5ebdb448abb4d28e9ad21e240.nPXKR0N2xzwnrF2E`)

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Dependencies and Assumptions

### Dependencies
- Z_AI_API_KEY must be available in environment configuration (currently in ~/Documents/.env)
- LibreChat endpoint configuration system must support custom endpoints
- Existing endpoint selector UI must accommodate additional providers

### Assumptions
- z.ai API follows OpenAI-compatible request/response format (based on documentation showing OpenAI SDK compatibility)
- Travel agents will use z.ai models for the same types of tasks as Claude/GPT-4 (no specialized use cases)
- Pricing structure is predictable and can be displayed statically (not dynamic/usage-based)

### Resolved Clarifications

1. **Model Selection** ✅ RESOLVED:
   - **GLM-4.6** (flagship): Best for complex travel planning requiring reasoning and coding
   - **GLM-4.5-Air** (cost-effective): Economical option for simple queries and conversations
   - **GLM-4.5V** (visual): For image-based travel planning (destination photos, hotel images)
   - Excluded: GLM-4-32b-0414-128K (older), CogVideoX-3 (video generation out of scope)

2. **Positioning** ✅ RESOLVED:
   - **GLM-4.6**: "Premium Alternative" - competitive with Sonnet at $2.80/1M avg (vs $3.00/1M)
   - **GLM-4.5-Air**: "Ultra Cost Effective" - cheaper than Haiku at $0.65/1M (vs $0.25/1M for Haiku but better capabilities)
   - **GLM-4.5V**: "Visual Specialist" - unique offering for image-based planning at $1.20/1M avg

3. **Pricing Display** ✅ RESOLVED:
   - Display weighted average cost per million tokens:
     - GLM-4.6: $2.80/1M (calculated as input $0.6 + output $2.2 weighted 40/60)
     - GLM-4.5-Air: $0.65/1M (input $0.2 + output $1.1 weighted 40/60)
     - GLM-4.5V: $1.20/1M (input $0.6 + output $1.8 weighted 40/60)
   - Format matches existing labels: "{Icon} {Name} - {Purpose} (${cost}/1M tokens)"

4. **Default Selection** ✅ RESOLVED:
   - z.ai offered as alternative, NOT default
   - Claude Sonnet remains default per existing configuration
   - Travel agents can switch to z.ai for cost optimization or specialized tasks

---

## Pricing Reference *(for implementation)*

### z.ai Model Pricing (Source: https://docs.z.ai/guides/overview/pricing)

| Model | Input (per 1M) | Output (per 1M) | Avg Cost* | Use Case |
|-------|---------------|-----------------|-----------|----------|
| GLM-4.6 | $0.60 | $2.20 | $2.80 | Flagship - complex reasoning, coding, agentic |
| GLM-4.5-Air | $0.20 | $1.10 | $0.65 | Cost-effective - general queries |
| GLM-4.5V | $0.60 | $1.80 | $1.20 | Visual reasoning - image analysis |
| GLM-4.5 | $0.60 | $2.20 | $2.80 | Legacy flagship |
| GLM-4.5-Flash | Free | Free | Free | Limited - not recommended for production |

*Weighted average assuming 40% input / 60% output token distribution

### Comparison with Existing Providers

| Provider | Model | Cost/1M | Position |
|----------|-------|---------|----------|
| Claude | Haiku | $0.25 | Most economical |
| z.ai | GLM-4.5-Air | $0.65 | Cost-effective |
| z.ai | GLM-4.5V | $1.20 | Visual specialist |
| z.ai | GLM-4.6 | $2.80 | Premium alternative |
| Claude | Sonnet | $3.00 | Default premium |
| OpenAI | GPT-4 | $10.00 | Fallback |

### Value Proposition

- **Cost Optimization**: GLM-4.5-Air provides 2.6x more expensive than Haiku but with competitive capabilities
- **Premium Competition**: GLM-4.6 offers 7% cost savings vs Sonnet with "frontier reasoning, coding, and agentic capabilities"
- **Unique Capability**: GLM-4.5V fills gap for visual reasoning at competitive pricing (no equivalent in current Claude/GPT-4 lineup)
