"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star, 
  MapPin, 
  Calendar,
  Users,
  DollarSign,
  Award,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

interface Chef {
  id: string;
  bio?: string;
  experience?: number;
  location: string;
  verified: boolean;
  profileCompletion: number;
  experienceLevel: string;
  cuisineType?: string;
  profileImage?: string;
  user: {
    id: string;
    name: string;
    email: string;
    verified: boolean;
    createdAt: string;
  };
  _count: {
    experiences: number;
    bookings: number;
    reviews: number;
  };
}

interface VerificationManagementProps {
  onVerificationUpdate?: () => void;
}

export function VerificationManagement({ onVerificationUpdate }: VerificationManagementProps) {
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("PENDING");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedChef, setSelectedChef] = useState<Chef | null>(null);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);

  useEffect(() => {
    fetchChefs();
  }, [selectedStatus]);

  const fetchChefs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/admin/verification?status=${selectedStatus}`);
      setChefs(response.data.chefs || []);
    } catch (error) {
      console.error("Error fetching chefs:", error);
      toast.error("Failed to load verification requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (chefId: string) => {
    setActionLoading(chefId);
    try {
      await axios.post("/api/admin/verification", {
        chefId,
        action: "APPROVE",
      });
      toast.success("Chef approved successfully!");
      fetchChefs();
      onVerificationUpdate?.();
    } catch (error: any) {
      console.error("Error approving chef:", error);
      toast.error(error.response?.data?.error || "Failed to approve chef");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedChef || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setActionLoading(selectedChef.id);
    try {
      await axios.post("/api/admin/verification", {
        chefId: selectedChef.id,
        action: "REJECT",
        reason: rejectionReason,
      });
      toast.success("Chef rejected successfully!");
      setIsRejectionDialogOpen(false);
      setRejectionReason("");
      setSelectedChef(null);
      fetchChefs();
      onVerificationUpdate?.();
    } catch (error: any) {
      console.error("Error rejecting chef:", error);
      toast.error(error.response?.data?.error || "Failed to reject chef");
    } finally {
      setActionLoading(null);
    }
  };

  const getExperienceLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-blue-100 text-blue-800';
      case 'INTERMEDIATE': return 'bg-purple-100 text-purple-800';
      case 'EXPERT': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProfileCompletionColor = (completion: number) => {
    if (completion >= 80) return 'bg-green-500';
    if (completion >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const ChefCard = ({ chef }: { chef: Chef }) => (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={chef.profileImage} />
              <AvatarFallback>
                {chef.user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{chef.user.name}</h3>
              <p className="text-sm text-gray-600">{chef.user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-500">{chef.location}</span>
                {chef.cuisineType && (
                  <Badge variant="outline" className="text-xs">
                    {chef.cuisineType}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge className={getExperienceLevelColor(chef.experienceLevel)}>
              {chef.experienceLevel}
            </Badge>
            <div className="mt-2">
              {chef.verified ? (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Profile Completion */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm font-bold">{chef.profileCompletion}%</span>
          </div>
          <Progress 
            value={chef.profileCompletion} 
            className="h-2"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <Award className="h-4 w-4" />
              <span>Experiences</span>
            </div>
            <p className="font-semibold">{chef._count.experiences}</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <Calendar className="h-4 w-4" />
              <span>Bookings</span>
            </div>
            <p className="font-semibold">{chef._count.bookings}</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <Star className="h-4 w-4" />
              <span>Reviews</span>
            </div>
            <p className="font-semibold">{chef._count.reviews}</p>
          </div>
        </div>

        {/* Bio */}
        {chef.bio && (
          <div>
            <p className="text-sm text-gray-600 line-clamp-3">{chef.bio}</p>
          </div>
        )}

        {/* Experience */}
        {chef.experience && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{chef.experience} years of experience</span>
          </div>
        )}

        {/* Action Buttons */}
        {!chef.verified && (
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={() => handleApprove(chef.id)}
              disabled={actionLoading === chef.id}
              className="flex-1"
            >
              {actionLoading === chef.id ? "Processing..." : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setSelectedChef(chef);
                setIsRejectionDialogOpen(true);
              }}
              disabled={actionLoading === chef.id}
              className="flex-1"
            >
              {actionLoading === chef.id ? "Processing..." : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </div>
        )}

        {/* Joined Date */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          Joined {format(new Date(chef.user.createdAt), 'MMM d, yyyy')}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verification Management</h2>
          <p className="text-gray-600">Review and approve chef verification requests</p>
        </div>
        
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending ({chefs.filter(c => !c.verified).length})</SelectItem>
            <SelectItem value="APPROVED">Approved ({chefs.filter(c => c.verified).length})</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold">{chefs.length}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {chefs.filter(c => !c.verified).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {chefs.filter(c => c.verified).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Completion</p>
                <p className="text-2xl font-bold">
                  {chefs.length > 0 
                    ? Math.round(chefs.reduce((sum, c) => sum + c.profileCompletion, 0) / chefs.length)
                    : 0}%
                </p>
              </div>
              <Award className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chef List */}
      <div className="space-y-4">
        {chefs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No verification requests</h3>
              <p className="text-gray-600 text-center">
                {selectedStatus === 'PENDING' 
                  ? 'No pending verification requests at the moment.'
                  : `No ${selectedStatus.toLowerCase()} chefs found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          chefs.map((chef) => (
            <ChefCard key={chef.id} chef={chef} />
          ))
        )}
      </div>

      {/* Rejection Dialog */}
      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedChef?.user.name}'s verification request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Explain why this verification request is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsRejectionDialogOpen(false);
                  setRejectionReason("");
                  setSelectedChef(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleReject}
                disabled={!rejectionReason.trim() || actionLoading === selectedChef?.id}
                variant="destructive"
                className="flex-1"
              >
                {actionLoading === selectedChef?.id ? "Processing..." : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
