'use client';

import { useState } from 'react';
import { ChefCard } from '@/components/chefs/chef-card';
import { RequestCard } from '@/components/requests/request-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, MapPin, DollarSign, Users, Calendar } from 'lucide-react';

interface Chef {
  id: string;
  bio?: string;
  experience?: number;
  location: string;
  latitude?: number;
  longitude?: number;
  radius: number;
  profileImage?: string;
  isApproved: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
  menus: Array<{
    id: string;
    title: string;
    description?: string;
    price: number;
    menuImage?: string;
  }>;
  averageRating: number;
  reviewCount: number;
}

interface Request {
  id: string;
  title: string;
  description?: string;
  budget: number;
  eventDate: string;
  location: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  client: {
    id: string;
    name: string;
  };
  proposals: Array<{
    id: string;
    price: number;
  }>;
}

interface SearchResultsProps {
  results: {
    chefs: Chef[];
    requests: Request[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  loading?: boolean;
  onLoadMore?: () => void;
}

export function SearchResults({ results, loading, onLoadMore }: SearchResultsProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'chefs' | 'requests'>('all');

  const hasResults = results.chefs.length > 0 || results.requests.length > 0;

  if (!hasResults && !loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">No results found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Search Results</h2>
          <p className="text-muted-foreground">
            Found {results.pagination.total} results
          </p>
        </div>
        {results.pagination.totalPages > 1 && (
          <Badge variant="secondary">
            Page {results.pagination.page} of {results.pagination.totalPages}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList>
          <TabsTrigger value="all">
            All ({results.chefs.length + results.requests.length})
          </TabsTrigger>
          <TabsTrigger value="chefs">
            Chefs ({results.chefs.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            Requests ({results.requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {results.chefs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Chefs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.chefs.map((chef) => (
                  <ChefCard key={chef.id} chef={chef} />
                ))}
              </div>
            </div>
          )}

          {results.requests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Requests</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.requests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="chefs" className="space-y-6">
          {results.chefs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.chefs.map((chef) => (
                <ChefCard key={chef.id} chef={chef} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">No chefs found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms or filters to find chefs.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          {results.requests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">No requests found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms or filters to find requests.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {results.pagination.page < results.pagination.totalPages && (
        <div className="flex justify-center">
          <Button onClick={onLoadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
