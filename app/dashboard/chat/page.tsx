"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ConversationList, Conversation } from '@/components/chat/conversation-list';
import { ChatWindow } from '@/components/chat/chat-window';
import type { ChatMessage } from '@/components/chat/types';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const currentUserName = session?.user?.name ?? 'You';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  const handleSelectConversation = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.otherUser.id === userId ? { ...conversation, unreadCount: 0 } : conversation
      )
    );
  };

  useEffect(() => {
    fetchConversations();
  }, [currentUserId]);

  const handleBackToList = () => {
    setSelectedUserId(null);
    setSelectedUserName('');
  };

  const fetchConversations = async () => {
    if (!currentUserId) {
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    try {
      setLoadingConversations(true);
      const response = await fetch(`/api/messages/conversations?userId=${currentUserId}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data: Conversation[] = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleMessageReceived = (message: ChatMessage) => {
    if (!currentUserId) return;
    const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
    const otherUser = message.senderId === currentUserId ? message.receiver : message.sender;
    setConversations((prev) => {
      const existing = prev.find((conversation) => conversation.otherUser.id === otherUserId);
      const isActiveConversation = selectedUserId === otherUserId;
      const unreadCount = message.receiverId === currentUserId
        ? isActiveConversation
          ? 0
          : (existing?.unreadCount || 0) + 1
        : existing?.unreadCount || 0;

      const updatedConversation: Conversation = {
        otherUser,
        lastMessage: {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
        },
        unreadCount,
      };

      const filtered = prev.filter((conversation) => conversation.otherUser.id !== otherUserId);
      return [updatedConversation, ...filtered];
    });
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center text-muted-foreground">Loading chat...</div>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center text-muted-foreground">
          Sign in to access the chat.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation List - Always visible on desktop, hidden when chat is open on mobile */}
        <div className={`${selectedUserId ? 'hidden lg:block' : 'block'}`}>
          <ConversationList
            conversations={conversations}
            loading={loadingConversations}
            currentUserId={currentUserId}
            onSelectConversation={handleSelectConversation}
            selectedUserId={selectedUserId || undefined}
          />
        </div>

        {/* Chat Window - Hidden on mobile until conversation is selected */}
        <div className={`${selectedUserId ? 'block' : 'hidden lg:block'} lg:col-span-2`}>
          {selectedUserId ? (
            <ChatWindow
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              otherUserId={selectedUserId}
              otherUserName={selectedUserName}
              onBack={handleBackToList}
              onMessageReceived={handleMessageReceived}
            />
          ) : (
            <div className="flex items-center justify-center h-[600px] border rounded-lg">
              <div className="text-center text-muted-foreground">
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p>Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
