"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Calendar,
  Users,
  Send,
  Star
} from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

interface Message {
  id: string;
  content: string;
  offerId?: string;
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

interface Offer {
  id: string;
  title: string;
  description: string;
  price: number;
  duration?: number;
  includedServices?: string[];
  eventType?: string;
  cuisineType?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
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
  onMessageUpdate 
}: EnhancedMessageProps) {
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [newOffer, setNewOffer] = useState({
    title: "",
    description: "",
    price: "",
    duration: "",
    eventType: "",
    cuisineType: "",
    includedServices: "",
  });

  const isFromMe = message.sender.id === currentUserId;
  const hasOffer = message.offerId;
  const hasBooking = message.bookingId;

  const fetchOffer = async () => {
    if (!message.offerId) return;
    
    try {
      const response = await axios.get(`/api/messages/offer?offerId=${message.offerId}`);
      setOffer(response.data.offer);
    } catch (error) {
      console.error("Error fetching offer:", error);
    }
  };

  useEffect(() => {
    if (hasOffer) {
      fetchOffer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOffer, message.offerId]);

  const sendOffer = async () => {
    if (!newOffer.title || !newOffer.description || !newOffer.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const receiverId = isFromMe ? message.receiver.id : message.sender.id;
      
      await axios.post("/api/messages/offer", {
        receiverId,
        title: newOffer.title,
        description: newOffer.description,
        price: newOffer.price,
        duration: newOffer.duration || undefined,
        eventType: newOffer.eventType || undefined,
        cuisineType: newOffer.cuisineType || undefined,
        includedServices: newOffer.includedServices ? newOffer.includedServices.split(',').map(s => s.trim()) : undefined,
      });

      toast.success("Offer sent successfully!");
      setIsOfferDialogOpen(false);
      setNewOffer({
        title: "",
        description: "",
        price: "",
        duration: "",
        eventType: "",
        cuisineType: "",
        includedServices: "",
      });
      onMessageUpdate?.();
    } catch (error: any) {
      console.error("Error sending offer:", error);
      toast.error(error.response?.data?.error || "Failed to send offer");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!offer || accepting || rejecting) return;
    
    setAccepting(true);
    try {
      const response = await axios.post("/api/messages/offer/accept", {
        offerId: offer.id,
      });

      const updatedOffer: Offer = {
        ...offer,
        ...(response.data.offer ?? {}),
      };

      setOffer(updatedOffer);
      toast.success("Booking created from offer");
      onMessageUpdate?.();
    } catch (error: any) {
      console.error("Error accepting offer:", error);
      toast.error(error.response?.data?.error || "Failed to accept offer");
    } finally {
      setAccepting(false);
    }
  };

  const handleRejectOffer = async () => {
    if (!offer || accepting || rejecting) return;
    
    setRejecting(true);
    try {
      const response = await axios.post("/api/messages/offer/reject", {
        offerId: offer.id,
      });

      const updatedOffer: Offer = {
        ...offer,
        ...(response.data.offer ?? {}),
      };

      setOffer(updatedOffer);
      toast.success("Offer declined");
      onMessageUpdate?.();
    } catch (error: any) {
      console.error("Error rejecting offer:", error);
      toast.error(error.response?.data?.error || "Failed to decline offer");
    }
  };

  if (hasOffer) {
    return (
      <Card className={`w-full max-w-2xl ${isFromMe ? 'ml-auto' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
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
            <Badge variant="secondary" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Offer
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">{message.content}</h4>
            {offer && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">{offer.title}</h5>
                  <Badge 
                    variant={offer.status === 'PENDING' ? 'secondary' : 
                            offer.status === 'ACCEPTED' ? 'default' : 'destructive'}
                  >
                    {offer.status}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600">{offer.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>${offer.price}</span>
                  </div>
                  {offer.duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{offer.duration} min</span>
                    </div>
                  )}
                  {offer.eventType && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{offer.eventType}</span>
                    </div>
                  )}
                  {offer.cuisineType && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{offer.cuisineType}</span>
                    </div>
                  )}
                </div>

                {offer.includedServices && offer.includedServices.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Included Services:</p>
                    <div className="flex flex-wrap gap-1">
                      {offer.includedServices.map((service, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {offer.status === 'PENDING' && !isFromMe && (
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleAcceptOffer} className="flex-1" disabled={accepting || rejecting}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept Offer
                    </Button>
                    <Button variant="outline" onClick={handleRejectOffer} className="flex-1" disabled={accepting || rejecting}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

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
          {isChef && !isFromMe && !hasOffer && (
            <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Send Custom Offer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Send Custom Offer</DialogTitle>
                  <DialogDescription>
                    Create a personalized offer for {message.sender.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Offer Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Private Italian Cooking Class"
                      value={newOffer.title}
                      onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what you'll offer..."
                      value={newOffer.description}
                      onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="150"
                        value={newOffer.price}
                        onChange={(e) => setNewOffer({ ...newOffer, price: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="duration">Duration (min)</Label>
                      <Input
                        id="duration"
                        type="number"
                        placeholder="180"
                        value={newOffer.duration}
                        onChange={(e) => setNewOffer({ ...newOffer, duration: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventType">Event Type</Label>
                      <Select
                        value={newOffer.eventType}
                        onValueChange={(value) => setNewOffer({ ...newOffer, eventType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRIVATE_DINNER">Private Dinner</SelectItem>
                          <SelectItem value="COOKING_CLASS">Cooking Class</SelectItem>
                          <SelectItem value="TEAM_BUILDING">Team Building</SelectItem>
                          <SelectItem value="CELEBRATION">Celebration</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="cuisineType">Cuisine Type</Label>
                      <Select
                        value={newOffer.cuisineType}
                        onValueChange={(value) => setNewOffer({ ...newOffer, cuisineType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select cuisine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ITALIAN">Italian</SelectItem>
                          <SelectItem value="FRENCH">French</SelectItem>
                          <SelectItem value="ASIAN">Asian</SelectItem>
                          <SelectItem value="MEXICAN">Mexican</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="includedServices">Included Services (comma-separated)</Label>
                    <Textarea
                      id="includedServices"
                      placeholder="Ingredients, recipes, cleanup, etc."
                      value={newOffer.includedServices}
                      onChange={(e) => setNewOffer({ ...newOffer, includedServices: e.target.value })}
                    />
                  </div>
                  
                  <Button onClick={sendOffer} disabled={loading} className="w-full">
                    {loading ? "Sending..." : "Send Offer"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {!isChef && !isFromMe && !hasOffer && (
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Request Booking
            </Button>
          )}

          {isFromMe && hasOffer && (
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
