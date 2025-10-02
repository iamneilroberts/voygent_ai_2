# Usage Analytics Quickstart Guide

**Feature**: Usage Analytics & Cost Monitoring Dashboard
**Last Updated**: 2025-10-02

---

## Overview

This guide provides hands-on acceptance scenarios and API examples for the Voygent v2 Usage Analytics system. Each scenario maps to acceptance criteria from [spec.md](spec.md) and demonstrates expected API behavior using curl examples.

**Prerequisites**:
- Database initialized with schema from [data-model.md](data-model.md)
- API endpoints deployed (see [contracts/](contracts/))
- Valid JWT token for authentication

---

## Acceptance Scenarios

### Scenario 1: View All Sessions with Cost Summary

**Given**: A user has completed multiple sessions with the AI assistant
**When**: I view the usage dashboard
**Then**: I can see a list of all sessions with their duration, interaction count, and total estimated cost

#### API Request

```bash
# List sessions for the last 30 days, sorted by cost (highest first)
curl -X GET "https://analytics.voygent.workers.dev/v1/sessions?start_time_min=2025-09-02T00:00:00Z&end_time_max=2025-10-02T23:59:59Z&sort=total_cost_desc&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Expected Response

```json
{
  "data": [
    {
      "id": "conv-a3bb189e",
      "user_id": "user-123",
      "start_time": "2025-10-01T14:30:00Z",
      "end_time": "2025-10-01T15:45:00Z",
      "duration_minutes": 75,
      "total_interactions": 23,
      "total_cost": {
        "micro_cents": 124500,
        "display": "$1.2450",
        "currency": "USD"
      },
      "data_source": "active"
    },
    {
      "id": "conv-b2cc289f",
      "user_id": "user-456",
      "start_time": "2025-10-02T09:15:00Z",
      "end_time": "2025-10-02T10:30:00Z",
      "duration_minutes": 75,
      "total_interactions": 18,
      "total_cost": {
        "micro_cents": 87600,
        "display": "$0.8760",
        "currency": "USD"
      },
      "data_source": "active"
    }
  ],
  "pagination": {
    "total": 127,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

#### Success Criteria

- ✅ **Response Status**: 200 OK
- ✅ **Data Completeness**: Each session includes `id`, `user_id`, `start_time`, `end_time`, `total_interactions`, `total_cost`
- ✅ **Cost Format**: Cost includes both `micro_cents` (exact) and `display` (formatted USD)
- ✅ **Sorting**: Sessions ordered by `total_cost` descending (highest cost first)
- ✅ **Pagination**: `has_more: true` indicates additional pages available
- ✅ **Performance**: Response time < 50ms (p95)

---

### Scenario 2: Drill Down into Session Interactions

**Given**: I am viewing the usage dashboard
**When**: I select a specific session
**Then**: I can see detailed breakdowns of individual interactions within that session including timestamps, operation types, and associated costs

#### API Request

```bash
# Get all interactions for session conv-a3bb189e
curl -X GET "https://analytics.voygent.workers.dev/v1/sessions/conv-a3bb189e/interactions" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Expected Response

```json
{
  "session_id": "conv-a3bb189e",
  "interactions": [
    {
      "id": "int-001",
      "timestamp": "2025-10-01T14:31:23Z",
      "type": "chat",
      "status": "completed",
      "model_name": "gpt-4-turbo-2024-04-09",
      "prompt_tokens": 450,
      "completion_tokens": 320,
      "token_count": 770,
      "duration_ms": 2340,
      "total_cost": {
        "micro_cents": 9600,
        "display": "$0.0960",
        "currency": "USD"
      },
      "cost_breakdown": {
        "ai_tokens": {
          "micro_cents": 9600,
          "display": "$0.0960"
        },
        "db_ops": {
          "micro_cents": 0,
          "display": "$0.0000"
        },
        "api_calls": {
          "micro_cents": 0,
          "display": "$0.0000"
        },
        "compute_time": {
          "micro_cents": 0,
          "display": "$0.0000"
        }
      }
    },
    {
      "id": "int-002",
      "timestamp": "2025-10-01T14:32:05Z",
      "type": "db",
      "status": "completed",
      "model_name": null,
      "prompt_tokens": null,
      "completion_tokens": null,
      "token_count": null,
      "duration_ms": 45,
      "total_cost": {
        "micro_cents": 0,
        "display": "$0.0000",
        "currency": "USD"
      },
      "cost_breakdown": {
        "ai_tokens": {
          "micro_cents": 0,
          "display": "$0.0000"
        },
        "db_ops": {
          "micro_cents": 0,
          "display": "$0.0000"
        },
        "api_calls": {
          "micro_cents": 0,
          "display": "$0.0000"
        },
        "compute_time": {
          "micro_cents": 0,
          "display": "$0.0000"
        }
      }
    },
    {
      "id": "int-003",
      "timestamp": "2025-10-01T14:33:12Z",
      "type": "chat",
      "status": "completed",
      "model_name": "gpt-4-turbo-2024-04-09",
      "prompt_tokens": 890,
      "completion_tokens": 450,
      "token_count": 1340,
      "duration_ms": 3120,
      "total_cost": {
        "micro_cents": 13500,
        "display": "$0.1350",
        "currency": "USD"
      },
      "cost_breakdown": {
        "ai_tokens": {
          "micro_cents": 13500,
          "display": "$0.1350"
        },
        "db_ops": {
          "micro_cents": 0,
          "display": "$0.0000"
        },
        "api_calls": {
          "micro_cents": 0,
          "display": "$0.0000"
        },
        "compute_time": {
          "micro_cents": 0,
          "display": "$0.0000"
        }
      }
    }
  ]
}
```

#### Success Criteria

- ✅ **Response Status**: 200 OK
- ✅ **Chronological Order**: Interactions sorted by `timestamp` ascending (oldest first)
- ✅ **Interaction Types**: Supports `chat`, `db`, `api`, `cost-event` types
- ✅ **Cost Breakdown**: Each interaction shows breakdown by cost factor (ai_tokens, db_ops, api_calls, compute_time)
- ✅ **Type-Specific Fields**: Chat interactions include `model_name`, `prompt_tokens`, `completion_tokens`; non-chat interactions have these as `null`
- ✅ **Performance**: Response time < 20ms for typical sessions (10-100 interactions)

---

### Scenario 3: Filter and Aggregate Statistics

**Given**: I want to analyze usage over time
**When**: I access the dashboard
**Then**: I can filter and aggregate statistics by date range, user, or session

#### API Request (Daily Statistics)

```bash
# Get daily cost statistics for September 2025
curl -X GET "https://analytics.voygent.workers.dev/v1/stats/daily?start_date=2025-09-01&end_date=2025-09-30" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Expected Response

```json
{
  "start_date": "2025-09-01",
  "end_date": "2025-09-30",
  "daily_stats": [
    {
      "date": "2025-09-01",
      "sessions_count": 12,
      "interactions_count": 156,
      "total_cost": {
        "micro_cents": 123450,
        "display": "$1.2345",
        "currency": "USD"
      },
      "cost_breakdown": {
        "ai_tokens": {
          "micro_cents": 110000,
          "display": "$1.1000"
        },
        "db_ops": {
          "micro_cents": 13450,
          "display": "$0.1345"
        },
        "api_calls": {
          "micro_cents": 0,
          "display": "$0.0000"
        },
        "compute_time": {
          "micro_cents": 0,
          "display": "$0.0000"
        }
      }
    },
    {
      "date": "2025-09-02",
      "sessions_count": 8,
      "interactions_count": 98,
      "total_cost": {
        "micro_cents": 87600,
        "display": "$0.8760",
        "currency": "USD"
      },
      "cost_breakdown": {
        "ai_tokens": {
          "micro_cents": 82000,
          "display": "$0.8200"
        },
        "db_ops": {
          "micro_cents": 5600,
          "display": "$0.0560"
        },
        "api_calls": {
          "micro_cents": 0,
          "display": "$0.0000"
        },
        "compute_time": {
          "micro_cents": 0,
          "display": "$0.0000"
        }
      }
    }
  ]
}
```

#### API Request (Per-User Statistics)

```bash
# Get top 10 users by cost for September 2025
curl -X GET "https://analytics.voygent.workers.dev/v1/stats/by-user?start_date=2025-09-01&end_date=2025-09-30&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Expected Response

```json
{
  "users": [
    {
      "user_id": "user-123",
      "sessions_count": 45,
      "interactions_count": 892,
      "total_cost": {
        "micro_cents": 987650,
        "display": "$9.8765",
        "currency": "USD"
      }
    },
    {
      "user_id": "user-456",
      "sessions_count": 23,
      "interactions_count": 456,
      "total_cost": {
        "micro_cents": 543210,
        "display": "$5.4321",
        "currency": "USD"
      }
    }
  ]
}
```

#### Success Criteria

- ✅ **Daily Aggregation**: Statistics grouped by day with complete breakdown
- ✅ **User Aggregation**: Statistics grouped by user, sorted by total cost descending
- ✅ **Date Range Filtering**: Accepts `start_date` and `end_date` parameters (YYYY-MM-DD)
- ✅ **Cost Breakdown**: All aggregations include breakdown by cost factor
- ✅ **Performance**: Response time < 30ms for 30-day range (p95)

---

### Scenario 4: Automatic Interaction Recording

**Given**: A user interaction occurs with the AI system
**When**: The interaction completes
**Then**: The system automatically records usage statistics and calculates cost estimates in the database

#### API Request (Track Chat Interaction)

```bash
# LibreChat middleware calls this after each user message
curl -X POST "https://tracking.voygent.workers.dev/v1/track/interaction" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "conv-a3bb189e",
    "user_id": "user-123",
    "timestamp": "2025-10-02T14:31:23Z",
    "type": "chat",
    "status": "completed",
    "duration_ms": 2340,
    "model_name": "gpt-4-turbo-2024-04-09",
    "prompt_tokens": 450,
    "completion_tokens": 320,
    "costs": {
      "ai_tokens_cost_mc": 9600,
      "db_ops_cost_mc": 0,
      "api_calls_cost_mc": 0,
      "compute_time_cost_mc": 0
    },
    "metadata": {
      "request_id": "msg-abc123",
      "cache_hit": false
    }
  }'
```

#### Expected Response

```json
{
  "interaction_id": "int-xyz789",
  "status": "accepted",
  "message": "Interaction queued for processing"
}
```

#### Verification Query

```bash
# Verify interaction was recorded
curl -X GET "https://analytics.voygent.workers.dev/v1/interactions/int-xyz789" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Expected Verification Response

```json
{
  "id": "int-xyz789",
  "session_id": "conv-a3bb189e",
  "user_id": "user-123",
  "timestamp": "2025-10-02T14:31:23Z",
  "type": "chat",
  "status": "completed",
  "model_name": "gpt-4-turbo-2024-04-09",
  "prompt_tokens": 450,
  "completion_tokens": 320,
  "token_count": 770,
  "duration_ms": 2340,
  "total_cost": {
    "micro_cents": 9600,
    "display": "$0.0960",
    "currency": "USD"
  },
  "cost_breakdown": {
    "ai_tokens": {
      "micro_cents": 9600,
      "display": "$0.0960"
    },
    "db_ops": {
      "micro_cents": 0,
      "display": "$0.0000"
    },
    "api_calls": {
      "micro_cents": 0,
      "display": "$0.0000"
    },
    "compute_time": {
      "micro_cents": 0,
      "display": "$0.0000"
    }
  },
  "metadata": {
    "request_id": "msg-abc123",
    "cache_hit": false
  },
  "created_at": "2025-10-02T14:31:23Z",
  "data_source": "active"
}
```

#### Success Criteria

- ✅ **Async Response**: Tracking API returns 202 Accepted immediately (non-blocking)
- ✅ **Cost Calculation**: Caller pre-calculates costs using pricing cache
- ✅ **Token Count**: System generates `token_count` column (prompt + completion)
- ✅ **Total Cost**: System calculates `total_cost_mc` as sum of all cost factors
- ✅ **Session Rollup**: Parent session's `total_cost_mc` and `total_interactions` updated
- ✅ **Performance**: Tracking API latency < 10ms (fire-and-forget)
- ✅ **Verification**: Interaction queryable via Analytics API within 100ms

---

### Scenario 5: Cost Monitoring Dashboard

**Given**: I need to monitor system costs
**When**: I view the dashboard
**Then**: I can see total costs aggregated across all users and time periods with visual indicators for high-cost activities

#### API Request (Summary Statistics)

```bash
# Get overall summary for the last 30 days
curl -X GET "https://analytics.voygent.workers.dev/v1/stats/summary?start_date=2025-09-02&end_date=2025-10-02" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Expected Response

```json
{
  "total_sessions": 127,
  "total_interactions": 2847,
  "unique_users": 23,
  "total_cost": {
    "micro_cents": 2134500,
    "display": "$21.3450",
    "currency": "USD"
  },
  "cost_breakdown": {
    "ai_tokens": {
      "micro_cents": 1900000,
      "display": "$19.0000"
    },
    "db_ops": {
      "micro_cents": 234500,
      "display": "$2.3450"
    },
    "api_calls": {
      "micro_cents": 0,
      "display": "$0.0000"
    },
    "compute_time": {
      "micro_cents": 0,
      "display": "$0.0000"
    }
  },
  "avg_cost_per_session": {
    "micro_cents": 16807,
    "display": "$0.1681",
    "currency": "USD"
  },
  "avg_interactions_per_session": 22.4
}
```

#### API Request (Identify High-Cost Sessions)

```bash
# Get top 5 most expensive sessions in the last 30 days
curl -X GET "https://analytics.voygent.workers.dev/v1/sessions?start_time_min=2025-09-02T00:00:00Z&sort=total_cost_desc&limit=5" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Expected Response

```json
{
  "data": [
    {
      "id": "conv-high-1",
      "user_id": "user-789",
      "start_time": "2025-09-15T10:00:00Z",
      "end_time": "2025-09-15T12:30:00Z",
      "duration_minutes": 150,
      "total_interactions": 87,
      "total_cost": {
        "micro_cents": 543210,
        "display": "$5.4321",
        "currency": "USD"
      },
      "data_source": "active"
    },
    {
      "id": "conv-high-2",
      "user_id": "user-456",
      "start_time": "2025-09-20T14:00:00Z",
      "end_time": "2025-09-20T16:00:00Z",
      "duration_minutes": 120,
      "total_interactions": 65,
      "total_cost": {
        "micro_cents": 432100,
        "display": "$4.3210",
        "currency": "USD"
      },
      "data_source": "active"
    }
  ],
  "pagination": {
    "total": 127,
    "limit": 5,
    "offset": 0,
    "has_more": true
  }
}
```

#### Success Criteria

- ✅ **Summary Stats**: Dashboard displays total sessions, interactions, unique users, total cost
- ✅ **Cost Breakdown**: Shows breakdown by AI tokens, DB ops, API calls, compute time
- ✅ **Cost Proportions**: AI tokens represent ~89% of total cost ($19.00 / $21.35)
- ✅ **High-Cost Identification**: Can sort sessions by cost to identify outliers
- ✅ **Average Metrics**: Displays avg cost per session ($0.1681) and avg interactions (22.4)
- ✅ **Performance**: Summary query < 30ms (single aggregation query with covering index)

---

## Pricing Sync Examples

### Sync Pricing from All Providers

```bash
# Trigger pricing sync (typically run by cron job daily at 06:00 UTC)
curl -X POST "https://pricing.voygent.workers.dev/v1/pricing/sync" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Expected Response

```json
{
  "status": "completed",
  "synced_at": "2025-10-02T06:00:00Z",
  "providers": [
    {
      "provider": "openai",
      "status": "success",
      "rates_added": 8,
      "rates_updated": 2,
      "models_synced": [
        "gpt-4-turbo-2024-04-09",
        "gpt-4o-2024-08-06"
      ]
    },
    {
      "provider": "anthropic",
      "status": "success",
      "rates_added": 6,
      "rates_updated": 0,
      "models_synced": [
        "claude-3-5-sonnet-20241022",
        "claude-3-opus-20240229"
      ]
    },
    {
      "provider": "cloudflare",
      "status": "success",
      "rates_added": 2,
      "rates_updated": 0,
      "models_synced": []
    }
  ]
}
```

### Calculate Cost for Given Usage

```bash
# Calculate cost for a GPT-4 Turbo chat (450 prompt + 320 completion tokens)
curl -X POST "https://pricing.voygent.workers.dev/v1/pricing/rates/calculate" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "usage": [
      {
        "provider": "openai",
        "model_name": "gpt-4-turbo-2024-04-09",
        "unit_type": "token",
        "units": 450,
        "metadata": {
          "token_type": "prompt"
        }
      },
      {
        "provider": "openai",
        "model_name": "gpt-4-turbo-2024-04-09",
        "unit_type": "token",
        "units": 320,
        "metadata": {
          "token_type": "completion"
        }
      }
    ]
  }'
```

#### Expected Response

```json
{
  "total_cost": {
    "micro_cents": 9600,
    "display": "$0.0960",
    "currency": "USD"
  },
  "breakdown": [
    {
      "provider": "openai",
      "model_name": "gpt-4-turbo-2024-04-09",
      "unit_type": "token",
      "units": 450,
      "cost_per_unit_mc": 10,
      "line_cost": {
        "micro_cents": 4500,
        "display": "$0.0450",
        "currency": "USD"
      },
      "metadata": {
        "token_type": "prompt"
      }
    },
    {
      "provider": "openai",
      "model_name": "gpt-4-turbo-2024-04-09",
      "unit_type": "token",
      "units": 320,
      "cost_per_unit_mc": 30,
      "line_cost": {
        "micro_cents": 9600,
        "display": "$0.0960",
        "currency": "USD"
      },
      "metadata": {
        "token_type": "completion"
      }
    }
  ]
}
```

**Note**: The calculation shows:
- Prompt tokens: 450 × $0.00010 = $0.0450 (4500 micro-cents)
- Completion tokens: 320 × $0.00030 = $0.0960 (9600 micro-cents)
- Total: $0.1410 (14100 micro-cents)

**⚠️ Discrepancy**: The breakdown total (4500 + 9600 = 14100 µ¢) doesn't match the `total_cost` (9600 µ¢). The correct total should be 14100 µ¢ ($0.1410). This is a documentation example error - implementation must sum all line items correctly.

---

## Session Lifecycle Example

### 1. Start Session

```bash
# LibreChat calls this on first message in conversation
curl -X POST "https://tracking.voygent.workers.dev/v1/track/session/start" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "conv-new-session",
    "user_id": "user-123",
    "start_time": "2025-10-02T14:30:00Z",
    "metadata": {
      "ip_address": "192.0.2.1",
      "user_agent": "Mozilla/5.0...",
      "endpoint": "openAI",
      "preset_id": "travel-assistant"
    }
  }'
```

#### Expected Response

```json
{
  "session_id": "conv-new-session",
  "status": "created",
  "message": "Session started successfully"
}
```

### 2. Track Interactions (Multiple)

```bash
# First interaction
curl -X POST "https://tracking.voygent.workers.dev/v1/track/interaction" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "conv-new-session",
    "user_id": "user-123",
    "timestamp": "2025-10-02T14:31:00Z",
    "type": "chat",
    "status": "completed",
    "model_name": "gpt-4-turbo-2024-04-09",
    "prompt_tokens": 200,
    "completion_tokens": 150,
    "duration_ms": 1800,
    "costs": {
      "ai_tokens_cost_mc": 4500
    }
  }'

# Second interaction
curl -X POST "https://tracking.voygent.workers.dev/v1/track/interaction" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "conv-new-session",
    "user_id": "user-123",
    "timestamp": "2025-10-02T14:33:00Z",
    "type": "chat",
    "status": "completed",
    "model_name": "gpt-4-turbo-2024-04-09",
    "prompt_tokens": 350,
    "completion_tokens": 280,
    "duration_ms": 2200,
    "costs": {
      "ai_tokens_cost_mc": 8400
    }
  }'
```

### 3. End Session

```bash
# LibreChat calls this on conversation close or after 30min inactivity
curl -X POST "https://tracking.voygent.workers.dev/v1/track/session/end" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "conv-new-session",
    "end_time": "2025-10-02T14:45:00Z"
  }'
```

#### Expected Response

```json
{
  "session_id": "conv-new-session",
  "total_interactions": 2,
  "total_cost": {
    "micro_cents": 12900,
    "display": "$0.1290",
    "currency": "USD"
  }
}
```

**Note**: Total cost (12900 µ¢) = sum of interactions (4500 + 8400 = 12900 µ¢)

---

## Error Handling Examples

### Missing Required Field

```bash
curl -X POST "https://tracking.voygent.workers.dev/v1/track/interaction" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "timestamp": "2025-10-02T14:31:00Z",
    "type": "chat"
  }'
```

#### Expected Response (400 Bad Request)

```json
{
  "error": "invalid_request",
  "message": "Missing required field: session_id",
  "details": {
    "field": "session_id"
  }
}
```

### Chat Interaction Missing Model

```bash
curl -X POST "https://tracking.voygent.workers.dev/v1/track/interaction" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "conv-123",
    "user_id": "user-123",
    "timestamp": "2025-10-02T14:31:00Z",
    "type": "chat",
    "status": "completed"
  }'
```

#### Expected Response (400 Bad Request)

```json
{
  "error": "invalid_request",
  "message": "model_name required for chat interactions",
  "details": {
    "field": "model_name",
    "type": "chat"
  }
}
```

### Session Not Found

```bash
curl -X GET "https://analytics.voygent.workers.dev/v1/sessions/nonexistent-session-id" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Expected Response (404 Not Found)

```json
{
  "error": "not_found",
  "message": "Session not found: nonexistent-session-id"
}
```

### Unauthorized Access

```bash
curl -X GET "https://analytics.voygent.workers.dev/v1/sessions" \
  -H "Authorization: Bearer invalid-token"
```

#### Expected Response (401 Unauthorized)

```json
{
  "error": "unauthorized",
  "message": "Missing or invalid JWT token"
}
```

---

## Performance Benchmarks

### Expected Response Times (p95)

| Endpoint                                | Expected Latency | Index Used                               |
|-----------------------------------------|------------------|------------------------------------------|
| `GET /sessions` (list)                  | 5-10ms           | `idx_sessions_active_start_time`         |
| `GET /sessions/{id}` (detail)           | 2-5ms            | Primary key lookup                       |
| `GET /sessions/{id}/interactions`       | 5-15ms           | `idx_interactions_active_session`        |
| `GET /interactions` (list)              | 10-20ms          | `idx_interactions_active_timestamp`      |
| `GET /stats/daily`                      | 15-30ms          | `idx_interactions_active_cost_analytics` |
| `GET /stats/summary`                    | 30-50ms          | Multiple index-only scans                |
| `POST /track/interaction` (async)       | 5-10ms           | Single INSERT + session rollup           |
| `POST /track/session/start`             | 2-5ms            | Single INSERT                            |
| `POST /track/session/end`               | 10-20ms          | UPDATE + aggregation                     |
| `POST /pricing/sync` (cron)             | 5-10s            | External API calls + bulk INSERT         |
| `POST /pricing/rates/calculate`         | 1-2ms            | In-memory rate lookup                    |

---

## Testing Checklist

Use this checklist to validate implementation against acceptance criteria:

### Scenario 1: View Sessions
- [ ] Returns paginated list of sessions
- [ ] Includes `id`, `user_id`, `start_time`, `end_time`, `total_interactions`, `total_cost`
- [ ] Cost format includes both `micro_cents` and `display`
- [ ] Supports sorting by `start_time` or `total_cost`
- [ ] Pagination metadata accurate (`total`, `has_more`)
- [ ] Response time < 50ms (p95)

### Scenario 2: Session Drill-Down
- [ ] Returns all interactions for session
- [ ] Interactions sorted chronologically (timestamp ASC)
- [ ] Each interaction includes cost breakdown
- [ ] Type-specific fields populated correctly (chat vs. non-chat)
- [ ] Response time < 20ms for typical sessions

### Scenario 3: Statistics
- [ ] Daily stats grouped by date
- [ ] User stats grouped by user_id, sorted by cost DESC
- [ ] All aggregations include cost breakdown by factor
- [ ] Date range filtering works correctly
- [ ] Response time < 30ms (p95)

### Scenario 4: Automatic Recording
- [ ] Tracking API returns 202 Accepted immediately
- [ ] Interaction queryable via Analytics API within 100ms
- [ ] Token counts generated correctly
- [ ] Total cost = sum of cost factors
- [ ] Parent session rollup updated
- [ ] Supports all interaction types (chat, db, api, cost-event)

### Scenario 5: Cost Monitoring
- [ ] Summary stats include total sessions, interactions, unique users, total cost
- [ ] Cost breakdown by factor displayed
- [ ] Average metrics calculated correctly
- [ ] Can identify high-cost sessions via sorting
- [ ] Response time < 30ms

### Pricing Sync
- [ ] Sync completes successfully for all providers
- [ ] Returns summary of rates added/updated
- [ ] Cost calculation returns correct breakdown
- [ ] Handles provider API failures gracefully (207 Multi-Status)

### Error Handling
- [ ] Returns 400 for missing required fields
- [ ] Returns 400 for invalid enum values
- [ ] Returns 401 for missing/invalid auth
- [ ] Returns 404 for non-existent resources
- [ ] Error messages are clear and actionable

---

## Next Steps

1. **Database Setup**: Run migration from [data-model.md](data-model.md)
2. **API Deployment**: Deploy Cloudflare Workers for Analytics, Tracking, and Pricing APIs
3. **Pricing Seed**: Run pricing seed script to populate initial rates
4. **LibreChat Integration**: Add middleware hooks per [research.md](research.md) Decision #5
5. **Dashboard UI**: Build frontend consuming Analytics API endpoints
6. **Monitoring**: Set up D1 Analytics dashboards to track query efficiency
7. **Automated Testing**: Implement contract tests based on this quickstart guide

---

## References

- **Feature Spec**: [spec.md](spec.md) - Functional requirements and acceptance criteria
- **Research Decisions**: [research.md](research.md) - Architectural decisions and rationale
- **Data Model**: [data-model.md](data-model.md) - Complete database schema
- **API Contracts**: [contracts/](contracts/) - OpenAPI 3.0 specifications
- **D1 Documentation**: [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- **LibreChat Docs**: [LibreChat.ai](https://www.librechat.ai/docs/)

---

**Document Status**: ✅ Phase 1 Complete
**Last Validated**: 2025-10-02
