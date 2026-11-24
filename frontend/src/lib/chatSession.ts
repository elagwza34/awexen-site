export type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  source?: string | null;
};

type ChatSessionState = {
  messages: ChatMessage[];
  name: string;
  email: string;
};

// The old floating chat kept the conversation while the app stayed open.
// A module store preserves that same tab-scoped behavior across route visits.
let state: ChatSessionState = { messages: [], name: "", email: "" };

export function readChatSession(): ChatSessionState {
  return state;
}

export function saveChatSession(patch: Partial<ChatSessionState>) {
  state = { ...state, ...patch };
}
