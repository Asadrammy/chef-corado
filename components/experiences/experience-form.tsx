"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { COOKING_CLASS_TYPES, COUNTRY_OPTIONS, CUISINE_TYPES, EVENT_TYPES, SERVICE_TYPES, getCurrencyForCountry } from "@/lib/request-options";

const experienceSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.string().min(1, "Price is required"),
  currency: z.string().min(3, "Currency is required"),
  duration: z.string().min(1, "Duration is required"),
  eventType: z.string().optional(),
  cuisineType: z.string().optional(),
  maxGuests: z.string().optional(),
  minGuests: z.string().optional(),
  serviceType: z.string().default("DINING"),
  offersCookingClasses: z.boolean().default(false),
  classType: z.string().optional(),
  pricePerStudent: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("EASY"),
  experienceImage: z.string().optional(),
});

const includedServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
});

const tagSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
});

type ExperienceFormData = z.infer<typeof experienceSchema>;

interface ExperienceFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  initialData?: any;
  defaultCurrency?: string;
}

export function ExperienceForm({ onSubmit, isLoading = false, initialData, defaultCurrency = "GBP" }: ExperienceFormProps) {
  const [includedServices, setIncludedServices] = useState<{ name: string; description?: string }[]>(
    initialData ? JSON.parse(initialData.includedServices || '[]') : []
  );
  const [tags, setTags] = useState<string[]>(
    initialData ? JSON.parse(initialData.tags || '[]') : []
  );
  const [newService, setNewService] = useState({ name: "", description: "" });
  const [newTag, setNewTag] = useState("");

  const form = useForm<ExperienceFormData>({
    resolver: zodResolver(experienceSchema),
    defaultValues: initialData ? {
      title: initialData.title,
      description: initialData.description,
      price: initialData.price.toString(),
      currency: initialData.currency || defaultCurrency,
      duration: initialData.duration.toString(),
      eventType: initialData.eventType || "",
      cuisineType: initialData.cuisineType || "",
      maxGuests: initialData.maxGuests?.toString() || "",
      minGuests: initialData.minGuests?.toString() || "",
      serviceType: initialData.serviceType || "DINING",
      offersCookingClasses: Boolean(initialData.offersCookingClasses),
      classType: initialData.classType || "",
      pricePerStudent: initialData.pricePerStudent?.toString() || "",
      difficulty: initialData.difficulty,
      experienceImage: initialData.experienceImage || "",
    } : {
      currency: defaultCurrency,
      serviceType: "DINING",
      offersCookingClasses: false,
      difficulty: "EASY",
    },
  });

  const selectedServiceType = form.watch("serviceType");
  const offersCookingClasses = form.watch("offersCookingClasses");
  const isCookingClass = selectedServiceType === "COOKING_CLASS" || offersCookingClasses;

  const addIncludedService = () => {
    if (newService.name.trim()) {
      setIncludedServices([...includedServices, { ...newService }]);
      setNewService({ name: "", description: "" });
    }
  };

  const removeIncludedService = (index: number) => {
    setIncludedServices(includedServices.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (data: ExperienceFormData) => {
    onSubmit({
      ...data,
      includedServices,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Experience Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Authentic Italian Pasta Making" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isCookingClass ? "Base class price" : "Price per person"}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="150" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={getCurrencyForCountry(option.value)}>{option.label} · {option.currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your culinary experience in detail..." 
                  className="min-h-[120px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="180" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EVENT_TYPES.map((eventType) => (
                      <SelectItem key={eventType} value={eventType}>{eventType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cuisineType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuisine Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cuisine" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CUISINE_TYPES.map((cuisineType) => (
                      <SelectItem key={cuisineType} value={cuisineType}>{cuisineType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SERVICE_TYPES.map((serviceType) => (
                      <SelectItem key={serviceType} value={serviceType}>{serviceType === "COOKING_CLASS" ? "Cooking Class" : "Dining Experience"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="classType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isCookingClass}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COOKING_CLASS_TYPES.map((classType) => (
                      <SelectItem key={classType} value={classType}>{classType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pricePerStudent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price Per Student</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="65" disabled={!isCookingClass} {...field} />
                </FormControl>
                <FormDescription>{isCookingClass ? "Used for student total = students × price per student." : "Enable cooking classes to set student pricing."}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <FormField
            control={form.control}
            name="minGuests"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isCookingClass ? "Minimum students" : "Min guests"}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxGuests"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isCookingClass ? "Maximum students" : "Max guests"}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="10" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Difficulty</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="experienceImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Image URL (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/image.jpg" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Included Services</CardTitle>
            <CardDescription>
              Add services that are included in this experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Service name"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                className="flex-1"
              />
              <Input
                placeholder="Description (optional)"
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                className="flex-1"
              />
              <Button type="button" onClick={addIncludedService}>
                Add
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {includedServices.map((service, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {service.name}
                  {service.description && ` - ${service.description}`}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeIncludedService(index)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>
              Add tags to help clients discover your experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1"
              />
              <Button type="button" onClick={addTag}>
                Add
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Creating..." : "Create Experience"}
        </Button>
      </form>
    </Form>
  );
}
