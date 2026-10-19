import { useState } from "react";
import AuthScreen from "./screens/AuthScreen.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import PlayerSetupScreen from "./screens/PlayerSetupScreen.jsx";

export default function App() {
  const [authMode, setAuthMode] = useState(null);
  const [settingUpPlayer, setSettingUpPlayer] = useState(false);

  return (
    <>
      <HomeScreen onLogin={() => setAuthMode("login")} onSignup={() => setAuthMode("signup")} />
      <AuthScreen
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onMode={setAuthMode}
        onCreated={() => { setAuthMode(null); setSettingUpPlayer(true); }}
      />
      {settingUpPlayer && <PlayerSetupScreen onClose={() => setSettingUpPlayer(false)} />}
    </>
  );
}
