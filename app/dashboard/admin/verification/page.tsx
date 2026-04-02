"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationManagement } from "@/components/admin/verification-management";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

interface VerificationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  avgCompletion: number;
}

export default function AdminVerificationPage() {
  const [stats, setStats] = useState<VerificationStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    avgCompletion: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get all chefs to calculate stats
      const response = await axios.get("/api/admin/verification");
      const chefs = response.data.chefs || [];
      
      const newStats: VerificationStats = {
        total: chefs.length,
        pending: chefs.filter((c: any) => !c.verified).length,
        approved: chefs.filter((c: any) => c.verified).length,
        rejected: 0, // Would need to track rejected status separately
        avgCompletion: chefs.length > 0 
          ? Math.round(chefs.reduce((sum: number, c: any) => sum + c.profileCompletion, 0) / chefs.length)
          : 0,
      };
      
      setStats(newStats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load verification stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Verification Management</h1>
          <p className="text-gray-600">Review and manage chef verification requests</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All verification requests
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              Verified chefs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCompletion}%</div>
            <p className="text-xs text-muted-foreground">
              Profile completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Verification Management */}
      <VerificationManagement onVerificationUpdate={fetchStats} />
    </div>
  );
}
