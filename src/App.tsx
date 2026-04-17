import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import EquipmentAdmin from "./pages/EquipmentAdmin";
import UsersAdmin from "./pages/UsersAdmin";
import OrganizationsAdmin from "./pages/OrganizationsAdmin";
import PublicView from "./pages/PublicView";
import JoinOrg from "./pages/JoinOrg";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin/equipment" element={<EquipmentAdmin />} />
              <Route path="/admin/users" element={<UsersAdmin />} />
              <Route path="/admin/organizations" element={<OrganizationsAdmin />} />
              <Route path="/join/:slug" element={<JoinOrg />} />
              <Route path="/view/:token" element={<PublicView />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
