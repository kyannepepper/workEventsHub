import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import CreateEvent from "@/pages/create-event";
import EditEvent from "@/pages/edit-event";
import AttendeesPage from "@/pages/attendees-page";
import CheckInPage from "@/pages/check-in-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/events/new" component={CreateEvent} />
      <ProtectedRoute path="/events/:id" component={EditEvent} />
      <ProtectedRoute path="/attendees" component={AttendeesPage} />
      <ProtectedRoute path="/check-in" component={CheckInPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;