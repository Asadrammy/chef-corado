"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExperienceForm } from "@/components/experiences/experience-form";
import { ExperienceCard } from "@/components/experiences/experience-card";
import { Plus, Edit, Trash2, Users, DollarSign, Star } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

interface Experience {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: number;
  includedServices: string;
  eventType?: string;
  cuisineType?: string;
  maxGuests?: number;
  minGuests?: number;
  difficulty: string;
  tags?: string;
  experienceImage?: string;
  isActive: boolean;
  chef: {
    id: string;
    user: {
      name: string;
      verified: boolean;
      experienceLevel: string;
    };
    location: string;
  };
  _count: {
    bookings: number;
  };
  createdAt: string;
}

export default function ChefExperiencesPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);

  useEffect(() => {
    fetchExperiences();
  }, []);

  const fetchExperiences = async () => {
    try {
      const response = await axios.get("/api/experiences");
      setExperiences(response.data.experiences || []);
    } catch (error) {
      console.error("Error fetching experiences:", error);
      toast.error("Failed to load experiences");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExperience = async (data: any) => {
    setSubmitting(true);
    try {
      await axios.post("/api/experiences", data);
      toast.success("Experience created successfully!");
      setIsCreateDialogOpen(false);
      fetchExperiences();
    } catch (error: any) {
      console.error("Error creating experience:", error);
      toast.error(error.response?.data?.error || "Failed to create experience");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateExperience = async (data: any) => {
    if (!editingExperience) return;
    
    setSubmitting(true);
    try {
      await axios.put(`/api/experiences/${editingExperience.id}`, data);
      toast.success("Experience updated successfully!");
      setEditingExperience(null);
      fetchExperiences();
    } catch (error: any) {
      console.error("Error updating experience:", error);
      toast.error(error.response?.data?.error || "Failed to update experience");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExperience = async (experienceId: string) => {
    if (!confirm("Are you sure you want to delete this experience?")) return;
    
    try {
      await axios.delete(`/api/experiences/${experienceId}`);
      toast.success("Experience deleted successfully!");
      fetchExperiences();
    } catch (error: any) {
      console.error("Error deleting experience:", error);
      toast.error(error.response?.data?.error || "Failed to delete experience");
    }
  };

  const toggleExperienceStatus = async (experienceId: string, isActive: boolean) => {
    try {
      await axios.put(`/api/experiences/${experienceId}`, { isActive });
      toast.success(`Experience ${isActive ? 'activated' : 'deactivated'} successfully!`);
      fetchExperiences();
    } catch (error: any) {
      console.error("Error toggling experience status:", error);
      toast.error(error.response?.data?.error || "Failed to update experience status");
    }
  };

  const activeExperiences = experiences.filter(exp => exp.isActive);
  const inactiveExperiences = experiences.filter(exp => !exp.isActive);

  const totalBookings = experiences.reduce((sum, exp) => sum + exp._count.bookings, 0);
  const avgPrice = experiences.length > 0 
    ? experiences.reduce((sum, exp) => sum + exp.price, 0) / experiences.length 
    : 0;

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Experiences</h1>
          <p className="text-gray-600">Create and manage your culinary experiences</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Experience
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Experience</DialogTitle>
              <DialogDescription>
                Design a unique culinary experience for your clients
              </DialogDescription>
            </DialogHeader>
            <ExperienceForm onSubmit={handleCreateExperience} isLoading={submitting} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Experiences</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{experiences.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Experiences</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeExperiences.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgPrice.toFixed(0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Experiences List */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active ({activeExperiences.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({inactiveExperiences.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {activeExperiences.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">🍳</div>
                <h3 className="text-lg font-semibold mb-2">No active experiences</h3>
                <p className="text-gray-600 text-center mb-4">
                  Create your first culinary experience to start attracting clients
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Experience
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeExperiences.map((experience) => (
                <Card key={experience.id} className="overflow-hidden">
                  <ExperienceCard 
                    experience={experience} 
                    showBookButton={false}
                  />
                  <div className="p-4 border-t bg-gray-50">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingExperience(experience)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleExperienceStatus(experience.id, false)}
                      >
                        Deactivate
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteExperience(experience.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="inactive" className="space-y-4">
          {inactiveExperiences.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold mb-2">No inactive experiences</h3>
                <p className="text-gray-600">
                  All your experiences are currently active
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inactiveExperiences.map((experience) => (
                <Card key={experience.id} className="overflow-hidden opacity-75">
                  <div className="absolute top-2 left-2 z-10">
                    <Badge variant="destructive">Inactive</Badge>
                  </div>
                  <ExperienceCard 
                    experience={experience} 
                    showBookButton={false}
                  />
                  <div className="p-4 border-t bg-gray-50">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingExperience(experience)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => toggleExperienceStatus(experience.id, true)}
                      >
                        Activate
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteExperience(experience.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingExperience} onOpenChange={() => setEditingExperience(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Experience</DialogTitle>
            <DialogDescription>
              Update your experience details
            </DialogDescription>
          </DialogHeader>
          {editingExperience && (
            <ExperienceForm 
              onSubmit={handleUpdateExperience} 
              isLoading={submitting}
              initialData={editingExperience}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
