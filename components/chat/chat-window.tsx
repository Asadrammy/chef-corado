'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ChatMessage } from '@/components/chat/types';

interface ChatWindowProps {
  currentUserId: string;
  currentUserName?: string;
  otherUserId: string;
  otherUserName: string;
  onBack?: () => void;
  onMessageReceived?: (message: ChatMessage) => void;
}

type ChatWindowStateMessage = ChatMessage & { pending?: boolean };

export function ChatWindow({
  currentUserId,
  currentUserName,
  otherUserId,
  otherUserName,
  onBack,
  onMessageReceived,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatWindowStateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'error'>('connecting');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageTimestampRef = useRef<string | null>(null);

  const handleIncomingMessage = useCallback((incoming: ChatMessage) => {
    setMessages((prev) => {
      const withoutIncoming = prev.filter((message) => message.id !== incoming.id);
      const pendingFiltered = withoutIncoming.filter(
        (message) =>
          !(
            message.pending &&
            message.senderId === incoming.senderId &&
            message.receiverId === incoming.receiverId &&
            message.content === incoming.content
          )
      );
      const next = [...pendingFiltered, incoming];
      next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return next;
    });
    lastMessageTimestampRef.current = incoming.createdAt;
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!currentUserId || !otherUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/messages?userId=${currentUserId}&otherUserId=${otherUserId}`,
        {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const data: ChatMessage[] = await response.json();
      const sorted = data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(sorted);
      lastMessageTimestampRef.current = sorted.length ? sorted[sorted.length - 1].createdAt : null;
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    fetchMessages();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [fetchMessages]);

  useEffect(() => {
    if (!currentUserId || !otherUserId) return;

    // Subscribe to SSE once messages have been fetched
    const connectStream = () => {
      const since = lastMessageTimestampRef.current ?? new Date(0).toISOString();
      const streamUrl = `/api/messages/stream?userId=${currentUserId}&otherUserId=${otherUserId}&since=${encodeURIComponent(
        since
      )}`;

      setConnectionState('connecting');
      const source = new EventSource(streamUrl);
      eventSourceRef.current = source;

      source.onopen = () => {
        setConnectionState('open');
      };

      source.onmessage = (event) => {
        if (!event.data) return;
        try {
          const payload: ChatMessage = JSON.parse(event.data);
          handleIncomingMessage(payload);
          onMessageReceived?.(payload);
        } catch (error) {
          console.error('Error parsing SSE message', error);
        }
      };

      source.onerror = () => {
        setConnectionState('error');
        source.close();
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = setTimeout(connectStream, 3000);
      };
    };

    connectStream();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    setSending(true);

    const optimisticMessage: ChatWindowStateMessage = {
      id: `pending-${Date.now()}`,
      senderId: currentUserId,
      receiverId: otherUserId,
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: currentUserName || 'You',
      },
      receiver: {
        id: otherUserId,
        name: otherUserName,
      },
    };

    setMessages((prev) => [...prev, { ...optimisticMessage, pending: true }]);
    onMessageReceived?.(optimisticMessage as ChatMessage);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: otherUserId,
          content: newMessage.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      await response.json();
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-[600px]">
        <CardContent className="flex items-center justify-center h-full">
          <div>Loading conversation...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Avatar>
          <AvatarImage src={undefined} />
          <AvatarFallback>{otherUserName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-lg">{otherUserName}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.senderId === currentUserId ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.senderId !== currentUserId && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-xs">
                        {message.sender.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.senderId === currentUserId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.senderId === currentUserId
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {message.senderId === currentUserId && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-xs">
                        {message.sender.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              maxLength={1000}
            />
            <Button type="submit" disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
