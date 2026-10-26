import { useEffect, useMemo, useState } from "react";
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
const formatMatchTime = (value) => new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value));
const localDateKey = (value) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));

export default function CareerHomeScreen({ profile, onExit }) {
  const [section, setSection] = useState("home");
  const [leagueTeams, setLeagueTeams] = useState([]);
  const [leagueTeamsLoading, setLeagueTeamsLoading] = useState(false);
  const [leagueTeamsError, setLeagueTeamsError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const leagueName = profile?.league?.name || "Liga por definir";
  const clubName = profile?.team?.name || "Club por definir";
  const leagueId = profile?.league?.id || profile?.league?.league_id;
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(calendarMonth);
  const calendarDays = useMemo(() => {
    const firstDayOffset = (monthStart.getDay() + 6) % 7;
    const days = [];
    for (let offset = 0; offset < 42; offset += 1) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - firstDayOffset + offset);
      days.push({ date, inMonth: date.getMonth() === monthStart.getMonth(), key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` });
    }
    return days;
  }, [calendarMonth]);
  const matchesByDate = useMemo(() => matches.reduce((groups, match) => {
    const key = match.utcDate ? localDateKey(match.utcDate) : "";
    if (key) (groups[key] ||= []).push(match);
    return groups;
  }, {}), [matches]);
  const selectedMatches = matchesByDate[selectedDate] || [];
  function changeCalendarMonth(offset) {
    const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
    setCalendarMonth(nextMonth);
    setSelectedDate(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`);
  }

  useEffect(() => {
    if (!leagueId) return;
    let active = true;
    setLeagueTeamsLoading(true);
    setLeagueTeamsError("");
    fetch(`/api/football/competition?leagueId=${encodeURIComponent(leagueId)}`)
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "No pudimos cargar los clubes de la liga."); return data; })
      .then((data) => { if (active) setLeagueTeams(data.teams || []); })
      .catch((error) => { if (active) setLeagueTeamsError(error.message); })
      .finally(() => { if (active) setLeagueTeamsLoading(false); });
    return () => { active = false; };
  }, [leagueId]);

  useEffect(() => {
    if (section !== "calendar" || !leagueId) return;
    let active = true;
    const dateFrom = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-01`;
    const dateTo = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;
    setMatchesLoading(true);
    setMatchesError("");
    fetch(`/api/football/matches?leagueId=${encodeURIComponent(leagueId)}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "No pudimos cargar el calendario."); return data; })
      .then((data) => { if (active) setMatches(data.matches || []); })
      .catch((error) => { if (active) { setMatches([]); setMatchesError(error.message); } })
      .finally(() => { if (active) setMatchesLoading(false); });
    return () => { active = false; };
  }, [section, leagueId, calendarMonth]);

  return <main className="career-shell">
    <Stadium />
    <header className="career-topbar">
      <a className="career-brand" href="#inicio" onClick={(event) => { event.preventDefault(); setSection("home"); }} aria-label="DreamChaser, inicio">
        <img src="/dreamchaser-logo.png" alt="" /><span>DREAMCHASER<small>PLAYER CAREER SIMULATOR</small></span>
      </a>
      <div className="career-season"><span className="career-live-dot" /> MODO CARRERA <i>/</i> TEMPORADA 01</div>
      <button className="career-user" onClick={onExit} aria-label="Volver al inicio" title="Volver al inicio"><span className="career-user-avatar">{profile?.number || "DC"}</span><span>{profile?.name || "Jugador"}<small>{clubName}</small></span><b>↗</b></button>
    </header>

    <nav className="career-topnav" aria-label="Secciones de carrera">{NAV_ITEMS.map(([id, label]) => <button key={id} className={section === id ? "is-current" : ""} onClick={() => setSection(id)} aria-current={section === id ? "page" : undefined}>{label}</button>)}</nav>

    {section === "home" ? <section className="career-home-content" id="inicio">
      <div className="career-dashboard career-dashboard-sketch">
        <div className="career-left-stack">
          <button type="button" className="career-match-panel" onClick={() => setSection("play")} aria-label="Ver próximo partido">
            <span className="panel-kicker"><span>01</span> PRÓXIMO PARTIDO <b className="match-status">DEBUT PENDIENTE</b></span><span className="match-card-inner"><span className="match-club"><span className="match-crest">{profile?.team?.crest ? <img src={profile.team.crest} alt="" /> : "DC"}</span><strong>{clubName}</strong><small>LOCAL</small></span><span className="match-center"><span>JORNADA 01 <i>·</i> {leagueName}</span><strong>VS</strong><small>FECHA A CONFIRMAR</small></span><span className="match-club opponent"><span className="match-crest opponent-crest">?</span><strong>RIVAL</strong><small>VISITANTE</small></span></span>
          </button>
          <article className="career-empty-feature career-lower-empty" aria-label="Espacio reservado"><span>DC</span></article>
        </div>
        <article className="career-table-panel career-table-feature"><div className="panel-kicker"><span>02</span> TABLA DE {leagueName.toUpperCase()} <b>TODO EN CERO</b></div><div className="table-head career-zero-head"><span>#</span><span>CLUB</span><span>PJ</span><span>G</span><span>E</span><span>P</span><span>GF</span><span>GC</span><span>DG</span><span>PTS</span></div><div className="career-standings-list">{leagueTeamsLoading ? <div className="table-empty"><p>Cargando clubes…</p></div> : leagueTeamsError ? <div className="table-empty"><p>{leagueTeamsError}</p></div> : leagueTeams.length ? leagueTeams.map((team, index) => <div className={String(team.id) === String(profile?.team?.id) ? "zero-standing-row is-player-team" : "zero-standing-row"} key={team.id || team.name}><span>{index + 1}</span><span className="standing-team">{team.crest && <img src={team.crest} alt="" />}<b>{team.shortName || team.name}</b></span>{Array.from({ length: 8 }, (_, column) => <span className="zero-stat" key={column}>0</span>)}</div>) : <div className="table-empty"><p>No hay clubes disponibles para mostrar.<small>Revisá la conexión con la API de la liga.</small></p></div>}</div><div className="table-foot"><span>{leagueTeams.length} CLUBES</span><span>CLASIFICACIÓN INICIAL</span></div></article>
      </div>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO EN LA NUBE <i>●</i></span></footer>
    </section> : section === "calendar" ? <section className="career-home-content career-section-view">
      <div className="calendar-layout">
        <div className="calendar-main">
          <header className="calendar-title"><div><span className="career-eyebrow">MODO CARRERA · {leagueName.toUpperCase()}</span><h1>CALENDARIO <span>{profile?.league?.emblem ? <img src={profile.league.emblem} alt="" /> : "DC"}</span></h1></div><div className="calendar-controls"><button aria-label="Mes anterior" onClick={() => changeCalendarMonth(-1)}>‹</button><button aria-label="Mes siguiente" onClick={() => changeCalendarMonth(1)}>›</button></div></header>
          <div className="calendar-grid" aria-label={`Calendario de ${monthLabel} de ${calendarMonth.getFullYear()}`}>
            {["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"].map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
            {calendarDays.map(({ date, inMonth, key }) => {
              const dayMatches = matchesByDate[key] || [];
              return <button type="button" key={key} className={`calendar-day ${inMonth ? "" : "is-outside"} ${key === selectedDate ? "is-selected" : ""} ${dayMatches.length ? "has-match" : ""}`} onClick={() => setSelectedDate(key)}>
                <span className="calendar-day-number">{date.getDate()}</span>
                {dayMatches.slice(0, 2).map((match) => <span className="calendar-fixture" key={match.id}><span className="fixture-crests">{match.homeTeam.crest ? <img src={match.homeTeam.crest} alt="" /> : <i>{match.homeTeam.tla || "L"}</i>}{match.awayTeam.crest ? <img src={match.awayTeam.crest} alt="" /> : <i>{match.awayTeam.tla || "V"}</i>}</span><span className="fixture-info"><b>{match.homeTeam.shortName} <em>{match.homeScore ?? "·"}–{match.awayScore ?? "·"} {match.awayTeam.shortName}</em></b><small>{match.status === "FINISHED" ? "FINALIZADO" : match.status === "IN_PLAY" ? "EN JUEGO" : "LIGA"}</small></span></span>)}
              </button>;
            })}
          </div>
          <div className="calendar-feedback" role="status">{matchesLoading ? "CARGANDO PARTIDOS…" : matchesError || (matches.length ? `${matches.length} PARTIDOS EN ${monthLabel.toUpperCase()}` : "NO HAY PARTIDOS PROGRAMADOS PARA ESTE MES")}</div>
        </div>
        <aside className="calendar-aside"><div className="calendar-date-block"><strong>{calendarMonth.getFullYear()}</strong><span>{monthLabel}</span></div><div className="calendar-aside-section"><b>PARTIDOS DEL DÍA</b><span>{new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long" }).format(new Date(`${selectedDate}T12:00:00`))}</span>
          {selectedMatches.length ? selectedMatches.map((match) => <div className="calendar-detail-match" key={match.id}><span>{formatMatchTime(match.utcDate)} · {match.status === "FINISHED" ? "FINAL" : "LIGA"}</span><b>{match.homeTeam.name}</b><strong>{match.homeScore ?? "–"} : {match.awayScore ?? "–"}</strong><b>{match.awayTeam.name}</b></div>) : <p>{matchesLoading ? "Buscando partidos…" : "No hay encuentros para esta fecha."}</p>}
        </div><div className="calendar-aside-section calendar-rules"><b>REGLAS DEL CALENDARIO</b><p><i>←</i> <span>Usá las flechas para cambiar de mes.</span></p><p><i>●</i> <span>Los partidos se muestran con sus escudos y resultados.</span></p><p><i>↗</i> <span>Seleccioná un día para ver sus encuentros.</span></p></div></aside>
      </div>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>DATOS DE FOOTBALL-DATA.ORG <i>●</i></span></footer>
    </section> : <section className="career-home-content career-section-view">
      <div className="career-heading"><div><span className="career-eyebrow">MODO CARRERA <i>·</i> {clubName.toUpperCase()}</span><h1>{PLACEHOLDERS[section]?.[0] || "TU CARRERA"}</h1><p>{PLACEHOLDERS[section]?.[1]}</p></div></div>
      <article className="career-coming-card"><span className="coming-mark">DC</span><div className="career-eyebrow">PRÓXIMAMENTE EN DREAMCHASER</div><h2>{PLACEHOLDERS[section]?.[1]}</h2><button className="career-back-home" onClick={() => setSection("home")}>← Volver al inicio</button></article>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO EN LA NUBE <i>●</i></span></footer>
    </section>}
  </main>;
}
