import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts";
import Layout from "./Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Auth from "./pages/AuthPage";
import Profile from "./pages/Profile";
import Wordle from "./game/WordleLocal";
import NotFound from "./pages/NotFound";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/wordle" element={<Wordle />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;