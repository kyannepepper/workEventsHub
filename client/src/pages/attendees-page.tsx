import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Event, Registration } from "@shared/schema";
import { Loader2, Check, X, Search } from "lucide-react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import React, { useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function AttendeesPage() {
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all events
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", user?.id],
    enabled: !!user,
  });

  // Fetch registrations for the selected event
  const { 
    data: registrations, 
    isLoading: registrationsLoading,
    error: registrationsError
  } = useQuery<Registration[]>({
    queryKey: [`/api/events/${selectedEventId}/registrations`],
    enabled: !!selectedEventId,
  });
  
  // Let's add console logging for direct debugging
  console.log("Selected Event ID:", selectedEventId);
  console.log("Registrations:", registrations);
  console.log("Registrations Error:", registrationsError);

  // Filter registrations based on search query
  const filteredRegistrations = registrations?.filter(registration => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      registration.name.toLowerCase().includes(query) ||
      registration.email.toLowerCase().includes(query)
    );
  });

  if (eventsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Registrations</h1>
            <p className="text-muted-foreground">
              View and manage event registrations
            </p>
          </div>
          
          <div className="w-full md:w-64">
            <Select
              value={selectedEventId || ""}
              onValueChange={(value) => setSelectedEventId(value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events?.map((event) => (
                  <SelectItem key={event.id} value={String(event.id)}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedEventId ? (
          <Card>
            <CardHeader>
              <CardTitle>Select an Event</CardTitle>
              <CardDescription>
                Choose an event from the dropdown above to view registrations
              </CardDescription>
            </CardHeader>
          </Card>
        ) : registrationsLoading ? (
          <Card>
            <CardContent className="p-6 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : registrationsError ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-red-500">
                <h3 className="font-bold">Error loading registrations:</h3>
                <p>{(registrationsError as Error).message}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {events?.find(e => e.id === Number(selectedEventId))?.title}
              </CardTitle>
              <CardDescription>
                {registrations?.length || 0} participants registered
              </CardDescription>
              <div className="flex mt-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search registrations..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRegistrations?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {registrations?.length === 0
                    ? "No participants registered for this event yet"
                    : "No registrations match your search"}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Waiver Status</TableHead>
                        <TableHead>Check-in Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRegistrations?.map((registration) => (
                        <TableRow key={registration.id}>
                          <TableCell className="font-medium">{registration.name}</TableCell>
                          <TableCell>{registration.email}</TableCell>
                          <TableCell>
                            {registration.waiverSigned ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                <Check className="h-3 w-3 mr-1" />
                                Signed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                <X className="h-3 w-3 mr-1" />
                                Not Signed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {registration.checkedIn ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                <Check className="h-3 w-3 mr-1" />
                                Checked In
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                <X className="h-3 w-3 mr-1" />
                                Not Checked In
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}