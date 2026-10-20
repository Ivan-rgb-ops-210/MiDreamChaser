import { useState } from "react";
import { Stadium } from "../components/Brand.jsx";

const NAV_ITEMS = [
  ["home", "INICIO"], ["play", "JUGAR"], ["calendar", "CALENDARIO"],
  ["training", "ENTRENAMIENTO"], ["career", "CARRERA"],
  ["player", "MI JUGADOR"], ["squads", "PLANTILLAS"], ["info", "INFO"],
];
const PLACEHOLDERS = {
  play: ["JUGAR", "La preparación de partidos estará disponible próximamente."],
  calendar: ["CALENDARIO", "Acá vas a encontrar partidos, entrenamientos y los próximos eventos de tu carrera."],
  training: ["ENTRENAMIENTO", "Pronto vas a poder elegir sesiones, administrar tu energía y mejorar tus atributos."],
  career: ["CARRERA", "Contratos, objetivos, relaciones y transferencias van a vivir en esta sección."],
  player: ["MI JUGADOR", "Consultá tu perfil, tu club y las estadísticas con las que empieza esta carrera."],
  squads: ["PLANTILLAS", "La exploración de clubes y plantillas estará disponible próximamente."],
  info: ["DREAMCHASER", "Un modo carrera para vivir el fútbol desde adentro."],
};

export default function CareerHomeScreen({ profile, onExit }) {
  const [section, setSection] = useState("home");
  const leagueName = profile.league?.name || "Liga por definir";
  const clubName = profile.team?.name || "Club por definir";

  return <main className="career-shell">
    <Stadium />
    <header className="career-topbar">
      <a className="career-brand" href="#inicio" onClick={(event) => { event.preventDefault(); setSection("home"); }} aria-label="DreamChaser, inicio">
        <img src="/dreamchaser-logo.png" alt="" /><span>DREAMCHASER<small>PLAYER CAREER SIMULATOR</small></span>
      </a>
      <div className="career-season"><span className="career-live-dot" /> MODO CARRERA <i>/</i> TEMPORADA 01</div>
      <button className="career-user" onClick={onExit} aria-label="Volver al inicio" title="Volver al inicio"><span className="career-user-avatar">{profile.number || "DC"}</span><span>{profile.name || "Jugador"}<small>{clubName}</small></span><b>↗</b></button>
    </header>

    <nav className="career-topnav" aria-label="Secciones de carrera">{NAV_ITEMS.map(([id, label]) => <button key={id} className={section === id ? "is-current" : ""} onClick={() => setSection(id)} aria-current={section === id ? "page" : undefined}>{label}</button>)}</nav>

    {section === "home" ? <section className="career-home-content" id="inicio">
      <div className="career-dashboard career-dashboard-sketch">
        <article className="career-empty-feature" aria-label="Espacio principal de inicio"><span>DC</span></article>
        <div className="career-right-stack">
          <article className="career-match-panel"><div className="panel-kicker"><span>01</span> PRÓXIMO PARTIDO <b className="match-status">DEBUT PENDIENTE</b></div><div className="match-card-inner"><div className="match-club"><span className="match-crest">{profile.team?.crest ? <img src={profile.team.crest} alt="" /> : "DC"}</span><strong>{clubName}</strong><small>LOCAL</small></div><div className="match-center"><span>JORNADA 01 <i>·</i> {leagueName}</span><strong>VS</strong><small>FECHA A CONFIRMAR</small></div><div className="match-club opponent"><span className="match-crest opponent-crest">?</span><strong>RIVAL</strong><small>VISITANTE</small></div></div></article>

          <article className="career-table-panel"><div className="panel-kicker"><span>02</span> TABLA DE {leagueName.toUpperCase()} <b>JORNADA 01</b></div><div className="table-head"><span>#</span><span>CLUB</span><span>PTS</span></div><div className="table-empty"><span>—</span><p>La temporada todavía no empezó.<small>La tabla se completa cuando arranque el torneo.</small></p></div><div className="table-foot"><span>0 PARTIDOS JUGADOS</span><span>CLASIFICACIÓN</span></div></article>
        </div>
      </div>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO LOCALMENTE <i>●</i></span></footer>
    </section> : <section className="career-home-content career-section-view">
      <div className="career-heading"><div><span className="career-eyebrow">MODO CARRERA <i>·</i> {clubName.toUpperCase()}</span><h1>{PLACEHOLDERS[section]?.[0] || "TU CARRERA"}</h1><p>{PLACEHOLDERS[section]?.[1]}</p></div></div>
      <article className="career-coming-card"><span className="coming-mark">DC</span><div className="career-eyebrow">PRÓXIMAMENTE EN DREAMCHASER</div><h2>{PLACEHOLDERS[section]?.[1]}</h2><button className="career-back-home" onClick={() => setSection("home")}>← Volver al inicio</button></article>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO LOCALMENTE <i>●</i></span></footer>
    </section>}
  </main>;
}
