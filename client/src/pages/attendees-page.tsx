import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Event, Attendee } from "@shared/schema";
import { Loader2, Check, X, Search } from "lucide-react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { useState } from "react";
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

  // Fetch attendees for the selected event
  const { data: attendees, isLoading: attendeesLoading } = useQuery<Attendee[]>({
    queryKey: ["/api/events", selectedEventId, "attendees"],
    enabled: !!selectedEventId,
  });

  // Filter attendees based on search query
  const filteredAttendees = attendees?.filter(attendee => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      attendee.name.toLowerCase().includes(query) ||
      attendee.email.toLowerCase().includes(query)
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
            <h1 className="text-2xl font-bold">Attendees</h1>
            <p className="text-muted-foreground">
              View and manage attendees for your events
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
                Choose an event from the dropdown above to view its attendees
              </CardDescription>
            </CardHeader>
          </Card>
        ) : attendeesLoading ? (
          <Card>
            <CardContent className="p-6 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {events?.find(e => e.id === Number(selectedEventId))?.title}
              </CardTitle>
              <CardDescription>
                {attendees?.length || 0} attendees registered
              </CardDescription>
              <div className="flex mt-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search attendees..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAttendees?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {attendees?.length === 0
                    ? "No attendees registered for this event yet"
                    : "No attendees match your search"}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendees?.map((attendee) => (
                        <TableRow key={attendee.id}>
                          <TableCell className="font-medium">{attendee.name}</TableCell>
                          <TableCell>{attendee.email}</TableCell>
                          <TableCell>{format(new Date(attendee.registeredAt), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            {attendee.checkedIn ? (
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