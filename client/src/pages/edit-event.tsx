import { Card, CardContent } from "@/components/ui/card";
import EventForm from "@/components/event-form";
import { InsertEvent, Event } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";

export default function EditEvent() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const eventId = params?.id ? parseInt(params.id, 10) : null;

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId && !isNaN(eventId),
  });

  if (!eventId || isNaN(eventId)) {
    navigate("/");
    return null;
  }

  if (isLoading || !event) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = async (data: InsertEvent) => {
    try {
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
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Edit Event: {event.title}</h1>
        <Card>
          <CardContent className="pt-6">
            <EventForm 
              defaultValues={{
                title: event.title,
                description: event.description || undefined,
                unitNumber: event.unitNumber,
                revenueCode: event.revenueCode,
                location: event.location,
                price: event.price === null ? 0 : event.price,
                capacity: event.capacity,
                startTime: event.startTime,
                endTime: event.endTime,
                waiver: event.waiver || undefined,
                needsWaiver: event.needsWaiver,
                images: event.images || [],
                category: 
                  (event.category === "Community" || 
                   event.category === "Education" || 
                   event.category === "Sports" || 
                   event.category === "Culture" || 
                   event.category === "Government" || 
                   event.category === "Other") 
                    ? event.category 
                    : "Other",
              }}
              onSubmit={handleSubmit}
              isSubmitting={false}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}