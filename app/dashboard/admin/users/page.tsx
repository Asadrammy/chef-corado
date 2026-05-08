'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Ban, UserCheck, AlertTriangle, Search, Filter, Users, ChefHat, Calendar, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'CLIENT' | 'CHEF' | 'ADMIN';
  isBanned: boolean;
  banReason?: string | null;
  banAdminNotes?: string | null;
  bannedAt?: string | null;
  bannedBy?: string | null;
  createdAt: string;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  chefProfile?: {
    id: string;
    isApproved: boolean;
    isBanned: boolean;
    banReason?: string | null;
    banAdminNotes?: string | null;
    bannedAt?: string | null;
    bannedBy?: string | null;
    insuranceAcknowledgedAt?: string | null;
    insuranceVersion?: string | null;
  };
  flags: string[];
  riskLevel: 'low' | 'medium' | 'high';
  _count: {
    bookings: number;
    reviews: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banAdminNotes, setBanAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [statusFilter, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (roleFilter !== 'all') params.set('role', roleFilter);

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleBanUser = async (userId: string, action: 'ban' | 'unban', reason?: string, adminNotes?: string) => {
    setProcessing(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action,
          reason,
          adminNotes,
        }),
      });

      if (!response.ok) throw new Error('Failed to update user status');

      const data = await response.json();
      
      // Update the user in the list
      setUsers(prev => prev.map(user => 
        user.id === userId ? data.user : user
      ));

      setBanDialogOpen(false);
      setSelectedUser(null);
      setBanReason('');
      setBanAdminNotes('');
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge className="bg-purple-500">Admin</Badge>;
      case 'CHEF':
        return <Badge className="bg-blue-500">Chef</Badge>;
      case 'CLIENT':
        return <Badge className="bg-green-500">Client</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getStatusBadge = (user: User) => {
    if (user.isBanned) {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (user.chefProfile && !user.chefProfile.isApproved) {
      return <Badge variant="secondary">Pending Approval</Badge>;
    }
    return <Badge className="bg-green-500">Active</Badge>;
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'medium':
        return <Badge className="bg-orange-500">Medium Risk</Badge>;
      case 'low':
        return <Badge className="bg-green-500">Low Risk</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage users, monitor activity, and enforce platform policies
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="CLIENT">Clients</SelectItem>
            <SelectItem value="CHEF">Chefs</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user)}
                      {user.flags.length > 0 && getRiskBadge(user.riskLevel)}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>Bookings: {user._count.bookings}</span>
                        <span>Reviews: {user._count.reviews}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge variant={user.termsAcceptedAt ? "default" : "destructive"}>
                          {user.termsAcceptedAt ? `Terms accepted (${user.termsVersion ?? "current"})` : "Terms missing"}
                        </Badge>
                        {user.role === 'CHEF' && (
                          <Badge variant={user.chefProfile?.insuranceAcknowledgedAt ? "default" : "secondary"}>
                            {user.chefProfile?.insuranceAcknowledgedAt
                              ? `Insurance acknowledged (${user.chefProfile.insuranceVersion ?? "current"})`
                              : 'Insurance acknowledgement missing'}
                          </Badge>
                        )}
                      </div>
                      <div className="grid gap-1 pt-1 text-xs text-muted-foreground md:grid-cols-2">
                        <p>
                          <span className="font-medium text-foreground">Terms status:</span>{" "}
                          {user.termsAcceptedAt
                            ? `Accepted ${new Date(user.termsAcceptedAt).toLocaleString()}`
                            : "Missing acknowledgement"}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Terms version:</span>{" "}
                          {user.termsVersion ?? "Not recorded"}
                        </p>
                        {user.role === 'CHEF' ? (
                          <>
                            <p>
                              <span className="font-medium text-foreground">Insurance status:</span>{" "}
                              {user.chefProfile?.insuranceAcknowledgedAt
                                ? `Acknowledged ${new Date(user.chefProfile.insuranceAcknowledgedAt).toLocaleString()}`
                                : "Missing acknowledgement"}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Insurance version:</span>{" "}
                              {user.chefProfile?.insuranceVersion ?? "Not recorded"}
                            </p>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {user.flags.length > 0 && (
                      <Alert className="mt-3 bg-orange-50 border-orange-200">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-orange-800">
                          <strong>Flags:</strong> {user.flags.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {!user.isBanned ? (
                      <Dialog open={banDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                        setBanDialogOpen(open);
                        if (!open) {
                          setSelectedUser(null);
                          setBanReason('');
                          setBanAdminNotes('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Suspend
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Suspend user</DialogTitle>
                            <DialogDescription>
                              Suspend {user.name} from using the platform. Suspended chefs will be removed from public discovery and booking flows until restored.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="reason" className="text-sm font-medium">
                                Suspension reason
                              </label>
                              <textarea
                                id="reason"
                                className="w-full mt-1 px-3 py-2 border border-input rounded-md"
                                rows={3}
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder="Explain why this account is being suspended..."
                              />
                            </div>
                            <div>
                              <label htmlFor="adminNotes" className="text-sm font-medium">
                                Admin notes (internal)
                              </label>
                              <textarea
                                id="adminNotes"
                                className="w-full mt-1 px-3 py-2 border border-input rounded-md"
                                rows={3}
                                value={banAdminNotes}
                                onChange={(e) => setBanAdminNotes(e.target.value)}
                                placeholder="Internal notes for future admin review..."
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setBanDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleBanUser(user.id, 'ban', banReason, banAdminNotes)}
                              disabled={processing}
                            >
                              {processing ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                'Suspend User'
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBanUser(user.id, 'unban')}
                        disabled={processing}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Restore access
                      </Button>
                    )}
                  </div>
                </div>

                {user.isBanned && (
                  <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Suspension details</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <p><span className="font-medium text-foreground">Reason:</span> {user.banReason || user.chefProfile?.banReason || 'Not provided'}</p>
                      <p><span className="font-medium text-foreground">Suspended at:</span> {user.bannedAt ? new Date(user.bannedAt).toLocaleString() : user.chefProfile?.bannedAt ? new Date(user.chefProfile.bannedAt).toLocaleString() : 'Unknown'}</p>
                      <p className="md:col-span-2"><span className="font-medium text-foreground">Admin notes:</span> {user.banAdminNotes || user.chefProfile?.banAdminNotes || 'No internal notes'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
