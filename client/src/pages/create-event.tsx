import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EventForm from "@/components/event-form";
import { InsertEvent } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/ui/dashboard-layout";

export default function CreateEvent() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleSubmit = async (data: InsertEvent) => {
    try {
      await apiRequest("POST", "/api/events", data);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event created successfully",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create New Event</h1>
        <Card>
          <CardContent className="pt-6">
            <EventForm onSubmit={handleSubmit} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
