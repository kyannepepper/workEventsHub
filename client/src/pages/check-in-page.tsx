import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { Loader2, QrCode } from "lucide-react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import SimpleCheckInScanner from "@/components/simple-check-in-scanner";
import QrCodeScanner from "@/components/qr-code-scanner";

export default function CheckInPage() {
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Fetch all events
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", user?.id],
    enabled: !!user,
  });

  // Get the selected event
  const selectedEvent = events?.find(event => event.id === Number(selectedEventId));

  const handleCheckInComplete = () => {
    // Optionally refresh data after check-in
    setShowScanner(false);
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
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Check-In</h1>
            <p className="text-muted-foreground">
              Scan QR codes to check in attendees
            </p>
          </div>
          
          <div className="w-full md:w-64">
            <Select
              value={selectedEventId || ""}
              onValueChange={(value) => {
                setSelectedEventId(value || null);
                setShowScanner(false);
              }}
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
                Choose an event from the dropdown above to start scanning QR codes
              </CardDescription>
            </CardHeader>
          </Card>
        ) : !showScanner ? (
          <Card>
            <CardHeader>
              <CardTitle>{selectedEvent?.title}</CardTitle>
              <CardDescription>
                Ready to check in attendees for this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4 p-4">
                <QrCode className="h-16 w-16 text-primary" />
                <p className="text-center text-muted-foreground max-w-md">
                  Click the button below to start scanning QR codes. Make sure to allow camera access when prompted.
                </p>
                <Button onClick={() => setShowScanner(true)}>
                  Start Scanning
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          selectedEvent && (
            <QrCodeScanner 
              event={selectedEvent} 
              onCheckInComplete={handleCheckInComplete} 
            />
          )
        )}
      </div>
    </DashboardLayout>
  );
}