"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConversationList, Conversation } from '@/components/chat/conversation-list';
import { ChatWindow } from '@/components/chat/chat-window';
import type { ChatMessage } from '@/components/chat/types';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const deepLinkedUserId = searchParams.get('userId');
  const currentUserId = session?.user?.id ?? null;
  const currentUserName = session?.user?.name ?? 'You';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationError, setConversationError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!deepLinkedUserId || selectedUserId === deepLinkedUserId) {
      return;
    }

    const conversation = conversations.find((item) => item.otherUser.id === deepLinkedUserId);
    handleSelectConversation(deepLinkedUserId, conversation?.otherUser.name || 'Conversation');
  }, [conversations, deepLinkedUserId, selectedUserId]);

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
      setConversationError(null);
      const response = await fetch(`/api/messages/conversations`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data: Conversation[] = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversationError(error instanceof Error ? error.message : 'Failed to load conversations');
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
    <div className="container mx-auto py-6 space-y-4">
      <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
        <p className="font-medium text-foreground">Platform-only communication</p>
        <p className="mt-1 text-xs">Keep all booking coordination, proposals, scheduling updates, and payments inside the platform. Sharing personal contact details or arranging active bookings off-site is not allowed under the platform terms.</p>
        <p className="mt-2 text-xs">If you need to arrange a call, keep the request inside chat and schedule it through the platform conversation without sharing private phone details.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation List - Always visible on desktop, hidden when chat is open on mobile */}
        <div className={`${selectedUserId ? 'hidden lg:block' : 'block'}`}>
          {conversationError ? (
            <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border gap-3 text-center">
              <p className="font-medium">Unable to load conversations</p>
              <p className="text-sm text-muted-foreground">{conversationError}</p>
              <Button type="button" variant="outline" onClick={fetchConversations}>Retry</Button>
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              loading={loadingConversations}
              currentUserId={currentUserId}
              onSelectConversation={handleSelectConversation}
              selectedUserId={selectedUserId || undefined}
            />
          )}
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
