export type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    parentId?: string | null;
    createdAt: number;
  };
  