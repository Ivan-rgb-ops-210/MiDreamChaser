import { useEffect, useState } from "react";
import AuthScreen from "./screens/AuthScreen.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import PlayerSetupScreen from "./screens/PlayerSetupScreen.jsx";
import CareerHomeScreen from "./screens/CareerHomeScreen.jsx";
import { createCareer, deleteCareerProfile, getCareerSession, loadCareerProfile, loginCareer, logoutCareer } from "./lib/careerAccounts.js";

export default function App() {
  const [authMode, setAuthMode] = useState(null);
  const [pathname, setPathname] = useState(window.location.pathname);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [playerProfile, setPlayerProfile] = useState(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await getCareerSession();
        if (!active || !session) return;
        setUser(session);
        setPlayerProfile(await loadCareerProfile(session.token));
      } catch (error) {
        if (active) setAuthError(error.message || "No pudimos conectar con Supabase.");
      } finally {
        if (active) setAuthLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);
  useEffect(() => {
    if (authLoading || user || !["/career", "/playersetup", "/match", "/match-summary"].includes(pathname)) return;
    navigate("/", { replace: true }); setAuthMode("login");
  }, [authLoading, user, pathname]);
  useEffect(() => {
    if (!user) return;
    const hasPlayer = Boolean(playerProfile?.name?.trim() && playerProfile?.team?.name && playerProfile?.league?.name);
    if (["/career", "/match", "/match-summary"].includes(pathname) && !hasPlayer) navigate("/playersetup", { replace: true });
    if (pathname === "/playersetup" && hasPlayer) navigate("/career", { replace: true });
  }, [user, playerProfile, pathname]);
  function navigate(path, { replace = false } = {}) {
    if (window.location.pathname !== path) window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    setPathname(path); setAuthMode(null);
  }
  async function submitAuth(credentials) {
    setAuthError(""); setAuthBusy(true);
    try {
      if (authMode === "signup") {
        const account = await createCareer(credentials);
        setUser(account); setPlayerProfile(null); navigate("/playersetup");
      } else {
        const account = await loginCareer(credentials);
        setUser(account); setPlayerProfile(await loadCareerProfile(account.token)); navigate("/career");
      }
    } catch (error) { setAuthError(error.message || "No pudimos completar la operación."); }
    finally { setAuthBusy(false); }
  }
  if (authLoading || (!user && ["/career", "/playersetup", "/match", "/match-summary"].includes(pathname))) return <main className="auth-loading" role="status">Cargando tu carrera…</main>;
  if (pathname === "/playersetup") return <PlayerSetupScreen user={user} onClose={() => navigate("/", { replace: true })} onComplete={(profile) => { setPlayerProfile(profile); navigate("/career"); }} />;
  if (["/career", "/match", "/match-summary"].includes(pathname)) return <CareerHomeScreen profile={playerProfile} screenPath={pathname} onNavigate={navigate} onDeletePlayer={async () => { await deleteCareerProfile(user.token); setPlayerProfile(null); navigate("/playersetup"); }} onExit={async () => { await logoutCareer(); setUser(null); setPlayerProfile(null); navigate("/"); }} />;
  return <><HomeScreen onLogin={() => setAuthMode("login")} onSignup={() => setAuthMode("signup")} /><AuthScreen mode={authMode} onClose={() => setAuthMode(null)} onMode={(mode) => { setAuthError(""); setAuthMode(mode); }} onSubmit={submitAuth} busy={authBusy} error={authError} /></>;
}
