import { pgPool } from "../db/postgres";
import { SupportKnowledgeRepo } from "./support-knowledge-repo";
import type { AIDraftResult, TicketCategory, TicketPriority } from "yua-shared";

/* ------------------------------------------------------------------ */
/*  OpenAI Chat helper                                                 */
/* ------------------------------------------------------------------ */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const { generateEmbedding } = SupportKnowledgeRepo;

async function callLLM(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("[SupportAI] OPENAI_API_KEY is not configured");
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errBody}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

/* ------------------------------------------------------------------ */
/*  System prompts                                                     */
/* ------------------------------------------------------------------ */

const DRAFT_SYSTEM_PROMPT = `You are YUA's support assistant. Generate a professional, helpful reply to the user's support ticket.

Rules:
- Be empathetic and professional
- Reference specific FAQ/knowledge when relevant
- If unsure, acknowledge and escalate rather than guess
- Keep responses concise (under 300 words)
- Match the user's language (Korean if they write in Korean, English if English)
- Never promise features or timelines that aren't confirmed
- Include relevant links to docs when applicable`;

const CLASSIFY_SYSTEM_PROMPT = `You are a support ticket classifier. Analyze the ticket and return ONLY valid JSON.
Categories: bug, billing, account, feature, general
Priorities: low, medium, high, urgent`;

/* ------------------------------------------------------------------ */
/*  SupportAIEngine                                                    */
/* ------------------------------------------------------------------ */

class SupportAIEngineImpl {
  /* ---- 1. generateDraft ---- */
  async generateDraft(
    ticketId: number,
  ): Promise<{ ok: boolean } & Partial<AIDraftResult>> {
    try {
      // 1) Load ticket
      const ticketRes = await pgPool.query(
        `SELECT id, subject, category, priority FROM support_tickets WHERE id = $1`,
        [ticketId],
      );
      const ticket = ticketRes.rows[0];
      if (!ticket) return { ok: false };

      // 2) Load all messages
      const msgRes = await pgPool.query(
        `SELECT sender_type, content FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
        [ticketId],
      );
      const messages: Array<{ sender_type: string; content: string }> =
        msgRes.rows;
      if (messages.length === 0) return { ok: false };

      // 3) Generate embedding from subject + last user message
      const lastUserMsg = [...messages]
        .reverse()
        .find((m) => m.sender_type === "user");
      const embeddingInput = `${ticket.subject} ${lastUserMsg?.content ?? ""}`;
      const embedding = await generateEmbedding(embeddingInput);

      // 4) Search knowledge base
      const faqResults = await SupportKnowledgeRepo.search(embedding, 5, 0.7);

      // 5) Build user message
      const faqSection =
        faqResults.length > 0
          ? faqResults
              .map((f) => `Q: ${f.question}\nA: ${f.answer}\n---`)
              .join("\n")
          : "No relevant knowledge base articles found.";

      const historySection = messages
        .map((m) => `[${m.sender_type}] ${m.content}`)
        .join("\n");

      const userMessage = `## Ticket Info
Subject: ${ticket.subject}
Category: ${ticket.category ?? "unclassified"}
Priority: ${ticket.priority ?? "unset"}

## Relevant Knowledge Base
${faqSection}

## Conversation History
${historySection}

## Task
Generate a helpful reply to the user's latest message. Be concise and professional.`;

      // 6) Call OpenAI (gpt-4o-mini)
      const draft = await callLLM(DRAFT_SYSTEM_PROMPT, userMessage);
      if (!draft) return { ok: false };

      // 7) Save draft as ticket_message
      await pgPool.query(
        `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, content, is_ai_draft, created_at)
         VALUES ($1, 'ai', 0, $2, true, NOW())`,
        [ticketId, draft],
      );

      // 8) Return draft + sources
      const sources = faqResults.map((f) => ({
        id: f.id,
        question: f.question,
        similarity: f.similarity,
      }));

      return { ok: true, draft, sources };
    } catch (err) {
      console.error("[SupportAIEngine] generateDraft error:", err);
      return { ok: false };
    }
  }

  /* ---- 2. classifyTicket ---- */
  async classifyTicket(
    ticketId: number,
  ): Promise<{
    ok: boolean;
    category?: TicketCategory;
    priority?: TicketPriority;
    confidence?: number;
  }> {
    try {
      // 1) Load ticket subject
      const ticketRes = await pgPool.query(
        `SELECT subject FROM support_tickets WHERE id = $1`,
        [ticketId],
      );
      const ticket = ticketRes.rows[0];
      if (!ticket) return { ok: false };

      // 2) Load first user message
      const msgRes = await pgPool.query(
        `SELECT content FROM ticket_messages WHERE ticket_id = $1 AND sender_type = 'user' ORDER BY created_at ASC LIMIT 1`,
        [ticketId],
      );
      const firstMsg = msgRes.rows[0];

      // 3) Call OpenAI (gpt-4o-mini)
      const userMessage = `Subject: ${ticket.subject}
Content: ${firstMsg?.content ?? ""}

Return JSON: {"category": "...", "priority": "...", "confidence": 0.0-1.0}`;

      const raw = await callLLM(CLASSIFY_SYSTEM_PROMPT, userMessage);

      // 4) Parse JSON response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { ok: false };

      const parsed = JSON.parse(jsonMatch[0]) as {
        category: TicketCategory;
        priority: TicketPriority;
        confidence: number;
      };

      const validCategories = ["bug", "billing", "account", "feature", "general"];
      const validPriorities = ["low", "medium", "high", "urgent"];

      if (
        !validCategories.includes(parsed.category) ||
        !validPriorities.includes(parsed.priority)
      ) {
        return { ok: false };
      }

      // 5) Insert into ticket_classifications (applied=true since we auto-apply)
      await pgPool.query(
        `INSERT INTO ticket_classifications (ticket_id, suggested_category, suggested_priority, confidence, applied, created_at)
         VALUES ($1, $2, $3, $4, true, NOW())`,
        [ticketId, parsed.category, parsed.priority, parsed.confidence],
      );

      // 6) Update support_tickets with classification result
      await pgPool.query(
        `UPDATE support_tickets SET category = $1, priority = $2, updated_at = NOW() WHERE id = $3`,
        [parsed.category, parsed.priority, ticketId],
      );

      return {
        ok: true,
        category: parsed.category,
        priority: parsed.priority,
        confidence: parsed.confidence,
      };
    } catch (err) {
      console.error("[SupportAIEngine] classifyTicket error:", err);
      return { ok: false };
    }
  }

  /* ---- 3. approveDraft ---- */
  async approveDraft(
    ticketId: number,
    messageId: number,
    adminId: number,
  ): Promise<{ ok: boolean }> {
    try {
      const result = await pgPool.query(
        `UPDATE ticket_messages SET approved_by = $1 WHERE id = $2 AND ticket_id = $3 AND is_ai_draft = true AND approved_by IS NULL`,
        [adminId, messageId, ticketId],
      );

      if (result.rowCount === 0) return { ok: false };
      return { ok: true };
    } catch (err) {
      console.error("[SupportAIEngine] approveDraft error:", err);
      return { ok: false };
    }
  }
}

export const SupportAIEngine = new SupportAIEngineImpl();
