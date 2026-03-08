export type TicketCategory = "bug" | "billing" | "account" | "feature" | "general";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";

export interface SupportTicket {
  id: number;
  workspace_id: number;
  user_id: number;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_admin_id?: number | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export type TicketSenderType = "user" | "admin" | "ai";

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_type: TicketSenderType;
  sender_id: number;
  content: string;
  is_ai_draft: boolean;
  approved_by?: number | null;
  created_at: string;
}

export interface SupportKnowledgeEntry {
  id: number;
  category: string;
  question: string;
  answer: string;
  is_active: boolean;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface TicketClassification {
  ticket_id: number;
  suggested_category: TicketCategory;
  suggested_priority: TicketPriority;
  confidence: number;
  applied: boolean;
}

export interface AIDraftResult {
  draft: string;
  sources: Array<{
    id: number;
    question: string;
    similarity: number;
  }>;
}
