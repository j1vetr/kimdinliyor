import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import Home from "@/pages/home";
import CreateRoom from "@/pages/create-room";
import JoinRoom from "@/pages/join-room";
import Lobby from "@/pages/lobby";
import Game from "@/pages/game";
import Results from "@/pages/results";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/oda-olustur" component={CreateRoom} />
      <Route path="/oyun/:code" component={JoinRoom} />
      <Route path="/oyun/:code/lobby" component={Lobby} />
      <Route path="/oyun/:code/game" component={Game} />
      <Route path="/oyun/:code/results" component={Results} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
