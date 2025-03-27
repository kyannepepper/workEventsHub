import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EventForm from "@/components/event-form";
import { InsertEvent, Event } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function EditEvent() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const eventId = params?.id ? parseInt(params.id, 10) : null;

  console.log("EditEvent: Rendering with eventId =", eventId); // Debug log

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId && !isNaN(eventId),
  });

  console.log("EditEvent: Fetched event data =", event); // Debug log

  if (!eventId || isNaN(eventId)) {
    console.error("Invalid eventId, redirecting to home");
    navigate("/");
    return null;
  }

  if (isLoading || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async (data: InsertEvent) => {
    try {
      console.log("Submitting update with data:", data);
      await apiRequest("PATCH", `/api/events/${eventId}`, data);
      // Invalidate both the event list and the specific event
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
      navigate("/");
    } catch (error) {
      console.error("Failed to update event:", error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Event</CardTitle>
          </CardHeader>
          <CardContent>
            <EventForm 
              defaultValues={event} 
              onSubmit={handleSubmit}
              isSubmitting={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}