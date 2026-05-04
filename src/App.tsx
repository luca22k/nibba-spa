import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { BranchProvider } from "@/context/BranchContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Bookings from "@/pages/Bookings";
import { TherapistQueue, TherapistSchedulePage, Attendance, Customers, Therapists, Services, Payments, Reports, AdminManagement, BranchManagement, AuditLog, Settings } from "@/pages/SimplePages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BranchProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/queue" element={<TherapistQueue />} />
                <Route path="/schedule" element={<TherapistSchedulePage />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/therapists" element={<Therapists />} />
                <Route path="/services" element={<Services />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/admins" element={<AdminManagement />} />
                <Route path="/branches" element={<BranchManagement />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BranchProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
