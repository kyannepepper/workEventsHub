import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Loader2, Edit2, Trash2, Plus } from "lucide-react";
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
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const { user } = useAuth();
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Events</h1>
          <Button onClick={() => navigate("/events/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events?.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              {event.images && event.images.length > 0 ? (
                <div className="w-full h-48 overflow-hidden">
                  <img
                    src={event.images[0]}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-12 bg-slate-100"></div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold truncate">
                  {event.title}
                </CardTitle>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {event.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {event.price === 0 ? "Free" : `$${event.price}`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
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
                      <p className="text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Location: </span>
                    <span className="text-muted-foreground line-clamp-1">
                      {event.location}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Capacity: </span>
                    {event.capacity} ({event.spotsLeft} spots left)
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
    </DashboardLayout>
  );
}