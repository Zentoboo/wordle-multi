import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts";
import { SignalRConnectionProvider } from "./contexts/SignalRContext";
import Layout from "./Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Auth from "./pages/AuthPage";
import Profile from "./pages/Profile";
import Wordle from "./game/WordleLocal";
import NotFound from "./pages/NotFound";
import LobbyList from "./pages/LobbyList";
import LobbyDetail from "./pages/LobbyDetail";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/wordle" element={<Wordle />} />
        <Route path="/lobby" element={<LobbyList />} />
        <Route path="/lobby/:id" element={<LobbyDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <SignalRConnectionProvider>
        <AppRoutes />
      </SignalRConnectionProvider>
    </AuthProvider>
  );
}

export default App;