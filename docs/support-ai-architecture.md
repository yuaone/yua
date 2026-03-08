# Support AI Architecture — YUA Admin Integration

## Overview
AI-powered support system integrated into yua-admin. Admins manage tickets; AI auto-drafts replies using RAG over FAQ/knowledge base + conversation context.

## Data Flow

```
User submits ticket (yua-web/mobile)
  → support_tickets table (PostgreSQL)
  → Admin sees in yua-admin /tickets
  → Admin clicks "AI 초안" button
  → POST /api/admin/tickets/:id/ai-draft
    → SupportAIEngine:
      1. Load ticket + all messages
      2. RAG: embed ticket content → pgvector similarity search over support_knowledge
      3. Build prompt: system instructions + FAQ context + conversation history
      4. Claude generates draft reply
      5. Save as ticket_message (is_ai_draft=true)
      6. Return draft to admin
  → Admin reviews/edits → POST /api/admin/tickets/:id/reply
  → Optionally: POST /api/admin/tickets/:id/approve-draft (approves AI draft as-is)
```

## Database Schema (PostgreSQL additions)

```sql
-- FAQ/Knowledge base for RAG retrieval
CREATE TABLE IF NOT EXISTS support_knowledge (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  embedding vector(1536),  -- pgvector for similarity search
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_knowledge_embedding
  ON support_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 20);
CREATE INDEX IF NOT EXISTS idx_support_knowledge_category
  ON support_knowledge(category);

-- Auto-classification log
CREATE TABLE IF NOT EXISTS ticket_classifications (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id),
  suggested_category VARCHAR(50),
  suggested_priority VARCHAR(20),
  confidence REAL,
  applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Backend Modules

### 1. SupportAIEngine (`src/support-ai/support-ai-engine.ts`)
Core engine with 3 capabilities:
- **generateDraft(ticketId)**: RAG-augmented reply generation
- **classifyTicket(ticketId)**: Auto-categorize + prioritize new tickets
- **suggestKnowledge(query)**: Find relevant FAQ entries

### 2. SupportKnowledgeRepo (`src/support-ai/support-knowledge-repo.ts`)
- CRUD for support_knowledge table
- Embedding generation via OpenAI text-embedding-3-small
- Similarity search via pgvector

### 3. Admin Router Extensions (`src/routes/admin-router.ts`)
New endpoints:
- `POST /admin/tickets/:id/ai-draft` — generate AI draft reply
- `POST /admin/tickets/:id/approve-draft` — approve AI draft (set approved_by)
- `POST /admin/tickets/:id/classify` — auto-classify ticket
- `GET /admin/knowledge` — list FAQ entries
- `POST /admin/knowledge` — create FAQ entry
- `PATCH /admin/knowledge/:id` — update FAQ entry
- `DELETE /admin/knowledge/:id` — soft-delete FAQ entry

## yua-admin Integration Points

### Tickets Page (`/tickets`)
Already has:
- Ticket list with status/priority filters
- Detail panel with reply form
- "AI 초안" button (calls `/admin/tickets/:id/ai-draft`)

Needs:
- Message thread display (load ticket_messages for selected ticket)
- AI draft indicator (purple border + "AI 생성" badge on ai-drafted messages)
- "승인" button on AI drafts → calls approve-draft
- Auto-classification badge on new tickets

### Knowledge Base Page (`/knowledge`) — NEW
- FAQ list with search/filter by category
- Create/edit FAQ entries
- Bulk import from CSV/JSON
- Embedding status indicator

### Ticket Detail Enhancements
- Conversation thread (user messages + admin replies + AI drafts)
- Suggested similar tickets (pgvector similarity)
- Quick-action buttons: classify, assign, escalate

## Prompt Engineering

### Draft Generation System Prompt
```
You are YUA's support assistant. Generate a professional, helpful reply to the user's support ticket.

Rules:
- Be empathetic and professional
- Reference specific FAQ/knowledge when relevant
- If unsure, acknowledge and escalate rather than guess
- Keep responses concise (under 300 words)
- Use Korean language matching the user's language
- Never promise features or timelines that aren't confirmed
- Include relevant links to docs when applicable
```

### Classification Prompt
```
Classify this support ticket:
Categories: bug, billing, account, feature, general
Priorities: low, medium, high, urgent

Return JSON: { "category": "...", "priority": "...", "confidence": 0.0-1.0 }
```

## Security
- All support-ai endpoints require `requireRole("support")` minimum
- Knowledge base CRUD requires `requireRole("admin")`
- AI drafts always marked `is_ai_draft=true`, require explicit approval
- No auto-sending — human-in-the-loop mandatory
- Audit log for all AI actions

## Performance
- Embedding generation: async, fire-and-forget on knowledge create/update
- RAG search: top-5 results, cosine similarity threshold > 0.7
- Draft generation: Claude claude-sonnet-4-20250514 for speed, ~2-5s response time
- Classification: cached per ticket, re-run only on content change
