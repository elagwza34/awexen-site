export const OPEN_KNOWLEDGE_CHAT_EVENT = "awexen:open-knowledge-chat";

export function openKnowledgeChat() {
  window.dispatchEvent(new Event(OPEN_KNOWLEDGE_CHAT_EVENT));
}

