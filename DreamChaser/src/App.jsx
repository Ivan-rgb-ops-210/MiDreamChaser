import { useEffect, useState } from "react";
import AuthScreen from "./screens/AuthScreen.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import PlayerSetupScreen from "./screens/PlayerSetupScreen.jsx";

export default function App() {
  const [authMode, setAuthMode] = useState(null);
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  function navigate(path, { replace = false } = {}) {
    if (window.location.pathname !== path) {
      const method = replace ? "replaceState" : "pushState";
      window.history[method]({}, "", path);
    }
    setPathname(path);
    setAuthMode(null);
  }

  if (pathname === "/playersetup") {
    return <PlayerSetupScreen onClose={() => navigate("/", { replace: true })} />;
  }

  return (
    <>
      <HomeScreen onLogin={() => setAuthMode("login")} onSignup={() => setAuthMode("signup")} />
      <AuthScreen
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onMode={setAuthMode}
        onCreated={() => navigate("/playersetup")}
      />
    </>
  );
}
