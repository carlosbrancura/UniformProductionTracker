import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Workshops from "@/pages/Workshops";
import Users from "@/pages/Users";
import Financial from "@/pages/Financial";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";

function Router() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Header />
            <Navigation />
          </div>
        </div>
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/products" component={Products} />
          <Route path="/workshops" component={Workshops} />
          <Route path="/users" component={Users} />
          <Route path="/financial" component={Financial} />
          <Route>
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-slate-900">Página não encontrada</h1>
            </div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
