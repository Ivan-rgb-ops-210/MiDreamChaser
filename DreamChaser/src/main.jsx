import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function Mark() {
  return (
    <a className="brand" href="#home" aria-label="Dreamchaser inicio">
      <img className="brand-logo" src="/dreamchaser-logo.png" alt="" />
      <span>
        DREAMCHASER<small>PLAYER CAREER SIMULATOR</small>
      </span>
    </a>
  );
}
function Stadium() {
  return (
    <div
      className="stadium"
      aria-label="Estadio de fútbol iluminado de noche"
      role="img"
    >
      <div className="stadium-lights lights-a" />
      <div className="stadium-lights lights-b" />
      <div className="stadium-roof" />
      <div className="stands">
        <div className="crowd" />
        <div className="crowd crowd-two" />
        <div className="adboard">
          DREAM BIG · PLAY YOUR STORY · DREAM BIG · PLAY YOUR STORY
        </div>
      </div>
      <div className="pitch">
        <div className="pitch-lines">
          <i />
          <b />
          <em />
        </div>
      </div>
      <div className="stadium-shade" />
    </div>
  );
}
function Auth({ mode, onClose, onMode, onCreated }) {
  if (!mode) return null;
  const signup = mode === "signup";
  return (
    <div
      className="veil"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="auth"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button className="close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <div className="auth-kicker">
          <span /> TU CARRERA EMPIEZA HOY
        </div>
        <h2 id="auth-title">
          {signup ? "Creá tu" : "Volvé al"}
          <br />
          <i>{signup ? "futbolista." : "vestuario."}</i>
        </h2>
        <p>
          {signup
            ? "El primer paso hacia una carrera legendaria."
            : "Tu próxima convocatoria te espera."}
        </p>
        <form onSubmit={(e) => { e.preventDefault(); if (signup) onCreated(); else onClose(); }}>
          {signup && (
            <label>
              Nombre de usuario
              <input
                placeholder="El nombre en tu camiseta"
                autoComplete="nickname"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              placeholder="jugador@ejemplo.com"
              autoComplete="email"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete={signup ? "new-password" : "current-password"}
            />
          </label>
          <button className="cta form-cta" type="submit">
            {signup ? "Crear mi carrera" : "Iniciar sesión"} <b>↗</b>
          </button>
        </form>
        <div className="switch">
          {signup ? "¿Ya tenés una cuenta?" : "¿Todavía no tenés cuenta?"}{" "}
          <button onClick={() => onMode(signup ? "login" : "signup")}>
            {signup ? "Iniciá sesión" : "Registrate"}
          </button>
        </div>
        <div className="fineprint">
          SIMULACIÓN DE CARRERA · TU HISTORIA, TUS DECISIONES
        </div>
      </section>
    </div>
  );
}
function PlayerSetup({ onClose }) {
  const [leagueId, setLeagueId] = useState("");
  const [leagues, setLeagues] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [selectedNationality, setSelectedNationality] = useState("");
  const [teams, setTeams] = useState([]);
  const [previewName, setPreviewName] = useState("");
  const [previewNumber, setPreviewNumber] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    Promise.all([fetch("/api/football/leagues").then((r) => r.json()), fetch("/api/football/nationalities").then((r) => r.json())])
      .then(([leagueData, nationalityData]) => {
        setLeagues((leagueData.leagues || []).filter((item) => /la\s*liga|primera division|premier league/i.test(item.league_name || item.name || "")).map((item) => ({ ...item, id: item.league_id || item.id, name: item.league_name || item.name })));
        setNationalities(nationalityData.nationalities || []);
        if (leagueData.error || nationalityData.error) setError(leagueData.error || nationalityData.error);
        else if (!(nationalityData.nationalities || []).length) setError("La API no devolvió selecciones disponibles para esta cuenta.");
      }).catch(() => setError("No pudimos conectar con los datos del fútbol. Intentá de nuevo."));
  }, []);
  useEffect(() => {
    if (!leagueId) { setTeams([]); return; }
    let active = true;
    setLoading(true); setError("");
    fetch(`/api/football/competition?leagueId=${leagueId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No pudimos cargar los equipos.");
        return data.teams || [];
      })
      .then((data) => { if (active) setTeams(data); })
      .catch((reason) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [leagueId]);
  function savePlayer(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const team = teams.find((item) => String(item.id) === form.get("teamId"));
    const nationality = nationalities.find((item) => item.name === form.get("nationality"));
    const profile = {
      name: form.get("name"), birthDate: form.get("birthDate"),
      number: Number(form.get("number")), nationality: form.get("nationality"),
      nationalityFlag: nationality?.flag || "",
      league: leagues.find((league) => String(league.id) === leagueId), team,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("dreamchaser.player", JSON.stringify(profile));
    setSaved(true);
  }
  const chosenTeam = teams.find((item) => String(item.id) === selectedTeamId);
  const chosenNationality = nationalities.find((item) => item.name === selectedNationality);
  const nationalityFlagIsUrl = /^https?:\/\//i.test(chosenNationality?.flag || "");
  return <div className="player-creation" role="dialog" aria-modal="true" aria-label="Crear futbolista"><Stadium />
    <header className="creation-nav"><Mark /><button onClick={onClose} aria-label="Cerrar creación">×</button></header>
    {saved ? <section className="creation-success"><div className="success-number">{JSON.parse(localStorage.getItem("dreamchaser.player") || "{}").number}</div><div className="auth-kicker"><span /> FICHA DE JUGADOR COMPLETA</div><h1 id="setup-title">La cancha<br /><i>es tuya.</i></h1><p>Tu historia ya tiene protagonista. Ahora empieza la carrera.</p><button className="cta" onClick={onClose}>Entrar a mi carrera <b>↗</b></button></section> : <>
      <div className="creation-layout"><form className="creation-form" onSubmit={savePlayer}>
        <div className="form-section-title"><span>01</span> IDENTIDAD DEL JUGADOR</div>
        <label>Nombre y apellido<input name="name" placeholder="Ej. Mateo González" autoComplete="name" required maxLength="40" onChange={(e) => setPreviewName(e.target.value)} /></label>
        <div className="setup-row"><label>Fecha de nacimiento<input name="birthDate" type="date" required max={new Date().toISOString().slice(0, 10)} /></label><label>Dorsal<input name="number" type="number" min="1" max="99" placeholder="10" required onChange={(e) => setPreviewNumber(e.target.value)} /></label></div>
        <label>Selección nacional<select name="nationality" required value={selectedNationality} onChange={(event) => setSelectedNationality(event.target.value)}><option value="">Elegí tu selección</option>{nationalities.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}</select></label>
        <div className="form-section-title club-title"><span>02</span> TU PRIMER CLUB</div>
        <div className="setup-row"><label>Liga<select value={leagueId} onChange={(e) => { setLeagueId(e.target.value); setSelectedTeamId(""); }} required><option value="">Elegí una liga</option>{leagues.map((league) => <option key={league.id} value={league.id}>{league.name} · {league.country}</option>)}</select></label><label>Equipo<select name="teamId" value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} required disabled={!leagueId || loading || !teams.length}><option value="">{loading ? "Cargando…" : "Elegí tu equipo"}</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label></div>
        {error && <div className="setup-error" role="alert">{error}</div>}
        <button className="cta form-cta" type="submit" disabled={loading || !teams.length || !nationalities.length}>Empezar mi carrera <b>↗</b></button><div className="fineprint">UNA CARRERA. INFINITAS HISTORIAS.</div>
      </form><aside className="player-card"><div className="card-top"><span>PLAYER CARD</span><span>DC · 01</span></div><div className="card-silhouette"><span className="silhouette-number">{previewNumber || "10"}</span><div className="player-orb">✳</div></div><div className="card-data"><small>DREAMCHASER ACADEMY</small><strong>{previewName || "TU NOMBRE"}</strong><div className="card-club"><span>{chosenTeam?.name || "TU PRIMER CLUB"}</span>{chosenTeam?.crest && <img src={chosenTeam.crest} alt="Escudo del equipo" />}</div><div className="card-nationality">{nationalityFlagIsUrl ? <img src={chosenNationality.flag} alt="" /> : chosenNationality?.flag && <span className="card-flag-emoji">{chosenNationality.flag}</span>}<span>{selectedNationality || "TU SELECCIÓN"}</span></div></div><div className="card-bottom"><span>PRO · 2026</span><b>DC</b></div></aside></div>
    </>}
  </div>;
}
function App() {
  const [auth, setAuth] = useState(null);
  const [settingUpPlayer, setSettingUpPlayer] = useState(false);
  return (
    <main id="home" className="site">
      <header className="nav">
        <Mark />
        <nav>
          <a href="#experiencia">La experiencia</a>
          <a href="#features">Tu carrera</a>
          <a href="#noticias">En el mundo</a>
        </nav>
        <div className="nav-cta">
          <button className="nav-login" onClick={() => setAuth("login")}>
            Iniciar sesión
          </button>
          <button className="small-cta" onClick={() => setAuth("signup")}>
            Crear jugador <b>↗</b>
          </button>
        </div>
      </header>
      <section className="hero">
        <Stadium />
        <div className="hero-content">
          <div className="overline">
            <span className="live-dot" /> TU CARRERA. TUS REGLAS.{" "}
            <span className="overline-line" />
          </div>
          <div className="hero-title-row">
            <h1>
              Dream
              <br />
              <i>Chaser.</i>
            </h1>
            <div className="hero-logo-frame">
              <img src="/dreamchaser-logo.png" alt="" />
            </div>
          </div>
          <p className="intro">
            El fútbol no se mira desde la tribuna. Se vive desde adentro. Creá
            tu jugador, ganate un lugar y escribí una carrera que sea solo tuya.
          </p>
          <div className="hero-actions">
            <button className="cta" onClick={() => setAuth("signup")}>
              Crear mi futbolista <b>↗</b>
            </button>
            <a href="#experiencia" className="watch">
              <span>▶</span> Conocé el modo carrera
            </a>
          </div>
          <div className="hero-stats">
            <div>
              <strong>01</strong>
              <span>CREÁ TU JUGADOR</span>
            </div>
            <i />
            <div>
              <strong>
                90<span>′</span>
              </strong>
              <span>CADA PARTIDO CUENTA</span>
            </div>
            <i />
            <div>
              <strong>∞</strong>
              <span>UNA CARRERA, MILES DE HISTORIAS</span>
            </div>
          </div>
        </div>
        <div className="hero-tag">
          <span>01 / 90</span>
          <span>EL SUEÑO EMPIEZA EN LA CANCHA</span>
        </div>
        <div className="vertical-label">
          DREAMCHASER — PLAYER CAREER SIMULATOR
        </div>
      </section>
      <section className="intro-band" id="experiencia">
        <div className="band-label">
          [ EL JUEGO CAMBIA CUANDO SOS VOS EL PROTAGONISTA ]
        </div>
        <div className="band-main">
          <h2>
            No necesitás una consola.
            <br />
            <i>Solo ganas de jugar.</i>
          </h2>
          <p>
            Viví el modo carrera desde tu navegador. Empezá en un club, entrená,
            competí y tomá las decisiones que definen a un futbolista dentro y
            fuera de la cancha.
          </p>
        </div>
        <div className="band-mark">
          DC<span>®</span>
        </div>
      </section>
      <section className="career" id="features">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MÁS QUE NOVENTA MINUTOS</span>
            <h2>
              La carrera <i>es tuya.</i>
            </h2>
          </div>
          <span className="section-count">02 — 04</span>
        </div>
        <div className="feature-grid">
          <article className="feature feature-big">
            <div className="feature-icon">✳</div>
            <div className="feature-number">01 / EL JUGADOR</div>
            <h3>Primero, vos.</h3>
            <p>
              Elegí tu posición, nacionalidad y club. Definí tu estilo, entrená
              tus habilidades y ganate cada oportunidad.
            </p>
            <div className="player-attributes">
              <span>
                RITMO <b>82</b>
                <i>
                  <u style={{ width: "82%" }} />
                </i>
              </span>
              <span>
                TIRO <b>74</b>
                <i>
                  <u style={{ width: "74%" }} />
                </i>
              </span>
              <span>
                VISIÓN <b>88</b>
                <i>
                  <u style={{ width: "88%" }} />
                </i>
              </span>
            </div>
            <div className="feature-watermark">09</div>
          </article>
          <article className="feature feature-match">
            <div className="feature-icon">◉</div>
            <div className="feature-number">02 / DÍA DE PARTIDO</div>
            <h3>
              Que hablen
              <br />
              tus <i>botines.</i>
            </h3>
            <p>
              Simulá partidos, peleá por la titularidad y convertí cada
              calificación en el próximo capítulo.
            </p>
            <div className="rating">
              8.7<small>CALIFICACIÓN</small>
              <span>★ ★ ★ ★ ★</span>
            </div>
          </article>
          <article className="feature feature-world" id="noticias">
            <div className="feature-icon">↗</div>
            <div className="feature-number">03 / AFUERA DE LA CANCHA</div>
            <h3>
              El mundo
              <br />
              también <i>juega.</i>
            </h3>
            <p>
              Construí relaciones, negociá tu futuro y decidí cómo responder
              cuando todos miran.
            </p>
            <div className="news-chip">
              <span className="news-pulse" /> RUMOR DE MERCADO{" "}
              <b>“¿Nuevo destino?”</b>
              <small>— DANTE ROMANO</small>
            </div>
          </article>
        </div>
      </section>
      <section className="bottom-cta">
        <span className="eyebrow">TU HISTORIA TODAVÍA NO ESTÁ ESCRITA</span>
        <h2>
          ¿Listo para <i>debutar?</i>
        </h2>
        <button className="cta" onClick={() => setAuth("signup")}>
          Empezar mi carrera <b>↗</b>
        </button>
        <div className="cta-grass">DC</div>
      </section>
      <footer>
        <Mark />
        <span>UNA CARRERA. INFINITAS HISTORIAS.</span>
        <span>© DREAMCHASER 2026</span>
      </footer>
      <Auth mode={auth} onClose={() => setAuth(null)} onMode={setAuth} onCreated={() => { setAuth(null); setSettingUpPlayer(true); }} />
      {settingUpPlayer && <PlayerSetup onClose={() => setSettingUpPlayer(false)} />}
    </main>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
