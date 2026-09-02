"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  bookingId?: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
  };
  receiver: {
    id: string;
    name: string;
  };
}

interface EnhancedMessageProps {
  message: Message;
  currentUserId: string;
  isChef: boolean;
  onMessageUpdate?: () => void;
}

export function EnhancedMessage({ 
  message, 
  currentUserId, 
  isChef,
  onMessageUpdate: _onMessageUpdate
}: EnhancedMessageProps) {
  const isFromMe = message.sender.id === currentUserId;
  const hasBooking = message.bookingId;

  return (
    <Card className={`w-full max-w-2xl ${isFromMe ? 'ml-auto' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.sender.name} />
            <AvatarFallback>
              {message.sender.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{message.sender.name}</p>
            <p className="text-xs text-gray-500">
              {format(new Date(message.createdAt), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm">{message.content}</p>
        </div>

        {hasBooking && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-700">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Booking Reference</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              This message is linked to a booking
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {isChef && !isFromMe && (
            <Button variant="outline" size="sm" disabled>
              <MessageSquare className="h-4 w-4 mr-2" />
              Reply in Conversation
            </Button>
          )}

          {!isChef && !isFromMe && (
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Request Booking
            </Button>
          )}

          {isFromMe && (
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Follow Up
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
