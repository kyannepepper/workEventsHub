import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Loader2, Plus, Calendar, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
import AttendeeManagement from "@/components/attendee-management";

export default function HomePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  // Add user.id to queryKey to refetch when user changes
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", user?.id],
    enabled: !!user, // Only fetch when user is logged in
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiRequest("DELETE", `/api/events/${deleteId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/events", user?.id] });
      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the event.",
        variant: "destructive",
      });
    }
    setDeleteId(null);
  };

  const handleEdit = (event: Event) => {
    navigate(`/events/${event.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {user?.department}
            </h1>
            <p className="text-muted-foreground">
              Manage your Utah State events here
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/events/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </Link>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events?.map((event) => (
            <Card key={event.id}>
              <CardHeader className="items-center justify-between space-y-0 pb-2">
                {event.images && event.images.length > 0 && (
                  <div className="w-full h-48 rounded-t-lg overflow-hidden mb-4">
                    <img
                      src={event.images[0]}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg font-bold truncate mb-3">
                  {event.title}
                </CardTitle>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Date: </span>
                    {format(new Date(event.startTime), "MMM d, yyyy")}
                  </div>
                  <div>
                    <span className="font-medium">Time: </span>
                    {format(new Date(event.startTime), "h:mm a")} -{" "}
                    {format(new Date(event.endTime), "h:mm a")}
                  </div>
                  {event.description && (
                    <div>
                      <span className="font-medium">Description: </span>
                      <p className="mt-1 text-muted-foreground line-clamp-3">
                        {event.description}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Location: </span>
                    {event.location}
                  </div>
                  <div>
                    <span className="font-medium">Price: </span>
                    {event.price === 0 ? "Free" : `$${event.price}`}
                  </div>
                  <div>
                    <span className="font-medium">Capacity: </span>
                    {event.capacity}
                  </div>
                  <div className="pt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(event)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(event.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                  <div className="pt-4">
                    <AttendeeManagement eventId={event.id} price={event.price} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {events?.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              No events yet. Click "Create Event" to get started.
            </p>
          </Card>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                event.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}