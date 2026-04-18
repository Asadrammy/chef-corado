export interface ChatUser {
  id: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
  sender: ChatUser;
  receiver: ChatUser;
}
