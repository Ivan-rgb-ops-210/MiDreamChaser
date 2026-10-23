import { useEffect, useState } from "react";
import AuthScreen from "./screens/AuthScreen.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import PlayerSetupScreen from "./screens/PlayerSetupScreen.jsx";
import CareerHomeScreen from "./screens/CareerHomeScreen.jsx";
import { getSupabaseConfigError, supabase } from "./lib/supabase.js";
import { loadPlayerProfile } from "./lib/playerProfiles.js";

export default function App() {
  const [authMode, setAuthMode] = useState(null);
  const [pathname, setPathname] = useState(window.location.pathname);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [playerProfile, setPlayerProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileLoadedFor, setProfileLoadedFor] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setUser(data?.session?.user || null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!user || !supabase) {
      setPlayerProfile(null);
      setProfileLoading(false);
      setProfileError("");
      setProfileLoadedFor(null);
      return () => { active = false; };
    }
    setProfileLoading(true);
    setProfileError("");
    setProfileLoadedFor(null);
    loadPlayerProfile(user.id)
      .then((profile) => {
        if (!active) return;
        setPlayerProfile(profile);
        setProfileLoadedFor(user.id);
      })
      .catch((error) => {
        if (!active) return;
        setProfileError(error.message || "No pudimos cargar tu perfil.");
        setProfileLoadedFor(user.id);
      })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    if (authLoading || user || !["/career", "/playersetup"].includes(pathname)) return;
    navigate("/", { replace: true });
    setAuthMode("login");
  }, [authLoading, user, pathname]);

  useEffect(() => {
    if (!user || profileLoading || profileLoadedFor !== user.id || profileError) return;
    const hasPlayer = Boolean(playerProfile?.name?.trim() && playerProfile?.team?.name && playerProfile?.league?.name);
    if (pathname === "/career" && !hasPlayer) navigate("/playersetup", { replace: true });
    if (pathname === "/playersetup" && hasPlayer) navigate("/career", { replace: true });
  }, [user, profileLoading, profileLoadedFor, profileError, playerProfile, pathname]);

  function navigate(path, { replace = false } = {}) {
    if (window.location.pathname !== path) {
      const method = replace ? "replaceState" : "pushState";
      window.history[method]({}, "", path);
    }
    setPathname(path);
    setAuthMode(null);
  }

  async function submitAuth({ username, email, password }) {
    setAuthError("");
    setAuthNotice("");
    const configError = getSupabaseConfigError();
    if (configError || !supabase) {
      setAuthError(configError || "No se pudo iniciar Supabase.");
      return;
    }
    setAuthBusy(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAuthNotice("Te enviamos un email para confirmar tu cuenta. Después de confirmarlo, iniciá sesión.");
          return;
        }
        navigate("/playersetup");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/career");
    } catch (error) {
      setAuthError(error.message || "No pudimos completar la operación. Revisá los datos e intentá de nuevo.");
    } finally {
      setAuthBusy(false);
    }
  }

  if (authLoading || (!user && ["/career", "/playersetup"].includes(pathname)) || (user && (profileLoading || profileLoadedFor !== user.id) && ["/career", "/playersetup"].includes(pathname))) {
    return <main className="auth-loading" role="status">Conectando con tu cuenta…</main>;
  }
  if (profileError && ["/career", "/playersetup"].includes(pathname)) {
    return <main className="auth-loading" role="alert">No pudimos cargar tu perfil: {profileError}. Ejecutá el script DreamChaser/supabase/player_profiles.sql en Supabase y recargá la página.</main>;
  }

  if (pathname === "/playersetup") {
    return <PlayerSetupScreen user={user} onClose={() => navigate("/", { replace: true })} onComplete={(profile) => { setPlayerProfile(profile); setProfileLoadedFor(user.id); navigate("/career"); }} />;
  }
  if (pathname === "/career") {
    return <CareerHomeScreen profile={playerProfile} onExit={() => navigate("/")} />;
  }

  return (
    <>
      <HomeScreen onLogin={() => setAuthMode("login")} onSignup={() => setAuthMode("signup")} />
      <AuthScreen
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onMode={(mode) => { setAuthError(""); setAuthNotice(""); setAuthMode(mode); }}
        onSubmit={submitAuth}
        busy={authBusy}
        error={authError || (!supabase ? getSupabaseConfigError() : "")}
        notice={authNotice}
      />
    </>
  );
}
