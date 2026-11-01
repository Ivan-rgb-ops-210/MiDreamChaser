import { useEffect, useMemo, useState } from "react";
import { Stadium } from "../components/Brand.jsx";

const NAV_ITEMS = [
  ["home", "INICIO"], ["calendar", "CALENDARIO"],
  ["training", "ENTRENAMIENTO"], ["career", "CARRERA"],
  ["player", "MI JUGADOR"], ["squads", "PLANTILLAS"], ["info", "INFO"],
];
const PLACEHOLDERS = {
  calendar: ["CALENDARIO", "Acá vas a encontrar partidos, entrenamientos y los próximos eventos de tu carrera."],
  training: ["ENTRENAMIENTO", "Pronto vas a poder elegir sesiones, administrar tu energía y mejorar tus atributos."],
  career: ["CARRERA", "Contratos, objetivos, relaciones y transferencias van a vivir en esta sección."],
  player: ["MI JUGADOR", "Consultá tu perfil, tu club y las estadísticas con las que empieza esta carrera."],
  squads: ["PLANTILLAS", "La exploración de clubes y plantillas estará disponible próximamente."],
  info: ["DREAMCHASER", "Un modo carrera para vivir el fútbol desde adentro."],
};
const formatMatchTime = (value) => new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value));
const localDateKey = (value) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const seasonStartFor = (profile, reference = new Date()) => {
  const argentina = /argentina/i.test(profile?.league?.country || "");
  const startMonth = argentina ? 1 : 7;
  const year = !argentina && reference.getMonth() < startMonth ? reference.getFullYear() - 1 : reference.getFullYear();
  const day = argentina ? 1 : profile?.league?.id === "PL" ? 21 : 15;
  return new Date(year, startMonth, day);
};
const competitionTone = (match) => match.id?.startsWith("international-") ? "international" : match.id?.startsWith("cup-") ? "cup" : "league";
function makeKnockoutBracket(teams, playerTeam, size, seedText) {
  if (teams.length < size || !playerTeam) return [];
  let seed = [...seedText].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 11);
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const entrants = [...teams].sort(() => random() - .5).slice(0, size);
  if (!entrants.some((team) => String(team.id) === String(playerTeam.id))) entrants[entrants.length - 1] = playerTeam;
  const matches = [];
  for (let index = 0; index < entrants.length; index += 2) matches.push({ home: entrants[index], away: entrants[index + 1] });
  const rounds = [{ label: size === 16 ? "OCTAVOS" : "SEMIFINALES", matches }];
  let count = matches.length;
  let playerMatchIndex = matches.findIndex((match) => [match.home, match.away].some((team) => String(team.id) === String(playerTeam.id)));
  while (count > 1) {
    const nextCount = count / 2;
    rounds.push({ label: nextCount === 1 ? "FINAL" : nextCount === 2 ? "SEMIFINALES" : nextCount === 4 ? "CUARTOS" : "OCTAVOS", matches: Array.from({ length: nextCount }, (_, index) => ({ home: index === Math.floor(playerMatchIndex / 2) ? playerTeam : { name: `Ganador ${index * 2 + 1}` }, away: { name: `Ganador ${index * 2 + 2}` } })) });
    playerMatchIndex = Math.floor(playerMatchIndex / 2);
    count = nextCount;
  }
  return rounds;
}
function fixturesFromBracket(rounds, playerTeam, start, idPrefix, competitionName, dayOffset, roundGap) {
  return rounds.flatMap((round, index) => {
    const tie = round.matches.find((match) => [match.home, match.away].some((team) => String(team.id) === String(playerTeam?.id)));
    if (!tie) return [];
    const date = new Date(start);
    date.setDate(start.getDate() + dayOffset + index * roundGap);
    date.setHours(20, 0, 0, 0);
    const home = String(tie.home.id) === String(playerTeam?.id);
    const toClub = (team, side) => ({ id: team.id || `${idPrefix}-${index}-${side}`, name: team.name || team.shortName, shortName: team.shortName || team.name, crest: team.crest || "", tla: team.tla || "" });
    return [{ id: `${idPrefix}-${index}`, utcDate: date.toISOString(), status: "SCHEDULED", competitionName, homeTeam: toClub(tie.home, "home"), awayTeam: toClub(tie.away, "away"), homeScore: null, awayScore: null, roundName: round.label }];
  });
}

export default function CareerHomeScreen({ profile, onExit }) {
  const [section, setSection] = useState("home");
  const [leagueTeams, setLeagueTeams] = useState([]);
  const [leagueTeamsLoading, setLeagueTeamsLoading] = useState(false);
  const [leagueTeamsError, setLeagueTeamsError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(seasonStartFor(profile).getFullYear(), seasonStartFor(profile).getMonth(), 1));
  const [matches, setMatches] = useState([]);
  const [selectedCompetition, setSelectedCompetition] = useState("league");
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(seasonStartFor(profile)));
  const leagueName = profile?.league?.name || "Liga por definir";
  const clubName = profile?.team?.name || "Club por definir";
  const seasonStart = seasonStartFor(profile);
  const seasonLabel = `${seasonStart.getFullYear()}/${String(seasonStart.getFullYear() + 1).slice(-2)}`;
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
  const playerPosition = leagueTeams.findIndex((team) => String(team.id) === String(profile?.team?.id));
  const competitionOptions = [{ id: "league", label: leagueName }, { id: "cup", label: /argentina/i.test(profile?.league?.country || "") ? "Copa nacional" : "Copa doméstica" }, ...(playerPosition >= 0 && playerPosition < 4 ? [{ id: "international", label: "Copa internacional" }] : [])];
  const cupBracket = useMemo(() => makeKnockoutBracket(leagueTeams, profile?.team, 16, `${profile?.team?.id}-domestic-cup`), [leagueTeams, profile?.team?.id]);
  const internationalBracket = useMemo(() => makeKnockoutBracket(leagueTeams.slice(0, playerPosition >= 0 && playerPosition < 4 ? 4 : 0), profile?.team, 4, `${profile?.team?.id}-international`), [leagueTeams, playerPosition, profile?.team?.id]);
  const nextMatch = matches.find((match) => competitionTone(match) === selectedCompetition) || matches[0];
  const selectedBracket = selectedCompetition === "international" ? internationalBracket : cupBracket;
  useEffect(() => {
    if (!leagueTeams.length || !profile?.team?.id) return;
    const playerIndex = leagueTeams.findIndex((team) => String(team.id) === String(profile.team.id));
    if (playerIndex < 0) { setMatches([]); return; }
    const start = seasonStartFor(profile);
    let seed = [...`${profile.team.id}-${profile.createdAt || "career"}`].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const opponents = leagueTeams.filter((_, index) => index !== playerIndex).sort(() => random() - 0.5);
    const leagueFixtures = [...opponents, ...opponents.slice().reverse()].map((opponent, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index * 7 + Math.floor(random() * 2));
      date.setHours(19 + Math.floor(random() * 3), random() < .5 ? 0 : 30, 0, 0);
      const home = index % 2 === (index < opponents.length ? 0 : 1);
      return { id: `career-${index}`, utcDate: date.toISOString(), status: "SCHEDULED", competitionName: leagueName, homeTeam: home ? profile.team : opponent, awayTeam: home ? opponent : profile.team, homeScore: null, awayScore: null };
    });
    const cupName = /argentina/i.test(profile.league?.country || "") ? "Copa nacional" : "Copa doméstica";
    const cupFixtures = fixturesFromBracket(cupBracket, profile.team, start, "cup", cupName, 50, 35);
    const internationalFixtures = fixturesFromBracket(internationalBracket, profile.team, start, "international", "Copa internacional", 175, 35);
    setMatches([...leagueFixtures, ...cupFixtures, ...internationalFixtures].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)));
  }, [leagueTeams, profile?.team?.id, profile?.createdAt, profile?.league?.country, leagueName, cupBracket, internationalBracket]);
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


  return <main className="career-shell">
    <Stadium />
    <header className="career-topbar">
      <a className="career-brand" href="#inicio" onClick={(event) => { event.preventDefault(); setSection("home"); }} aria-label="DreamChaser, inicio">
        <img src="/dreamchaser-logo.png" alt="" /><span>DREAMCHASER<small>PLAYER CAREER SIMULATOR</small></span>
      </a>
      <div className="career-season"><span className="career-live-dot" /> MODO CARRERA <i>/</i> TEMPORADA {seasonLabel}</div>
      <button className="career-user" onClick={onExit} aria-label="Volver al inicio" title="Volver al inicio"><span className="career-user-avatar">{profile?.number || "DC"}</span><span>{profile?.name || "Jugador"}<small>{clubName}</small></span><b>↗</b></button>
    </header>

    <nav className="career-topnav" aria-label="Secciones de carrera">{NAV_ITEMS.map(([id, label]) => <button key={id} className={section === id ? "is-current" : ""} onClick={() => setSection(id)} aria-current={section === id ? "page" : undefined}>{label}</button>)}</nav>

    {section === "home" ? <section className="career-home-content" id="inicio">
      <div className="home-competition-picker"><span>COMPETICIÓN</span>{competitionOptions.map((competition) => <button key={competition.id} type="button" className={`competition-choice competition-choice--${competition.id} ${selectedCompetition === competition.id ? "is-selected" : ""}`} onClick={() => setSelectedCompetition(competition.id)} aria-pressed={selectedCompetition === competition.id}>{competition.label}</button>)}</div>
      <div className="career-dashboard career-dashboard-sketch">
        <div className="career-left-stack">
          <button type="button" className="career-match-panel" onClick={() => setSection("play")} aria-label="Ver próximo partido">
            <span className="panel-kicker"><span>01</span> PRÓXIMO PARTIDO <b className="match-status">{nextMatch?.competitionName || "DEBUT PENDIENTE"}</b></span><span className="match-card-inner"><span className="match-club"><span className="match-crest">{nextMatch?.homeTeam?.crest ? <img src={nextMatch.homeTeam.crest} alt="" /> : "DC"}</span><strong>{nextMatch?.homeTeam?.shortName || nextMatch?.homeTeam?.name || clubName}</strong><small>{String(nextMatch?.homeTeam?.id) === String(profile?.team?.id) ? "LOCAL" : "VISITANTE"}</small></span><span className="match-center"><span>{nextMatch?.competitionName || leagueName}</span><strong>VS</strong><small>{nextMatch ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(new Date(nextMatch.utcDate)) : "INICIO DE TEMPORADA"}</small></span><span className="match-club opponent"><span className="match-crest opponent-crest">{nextMatch?.awayTeam?.crest ? <img src={nextMatch.awayTeam.crest} alt="" /> : "?"}</span><strong>{nextMatch?.awayTeam?.shortName || nextMatch?.awayTeam?.name || "RIVAL"}</strong><small>{String(nextMatch?.awayTeam?.id) === String(profile?.team?.id) ? "LOCAL" : "VISITANTE"}</small></span></span>
          </button>
          <article className="career-empty-feature career-lower-empty" aria-label="Espacio reservado"><span>DC</span></article>
        </div>
        <article className={`career-table-panel career-table-feature ${selectedCompetition !== "league" ? "is-hidden" : ""}`}><div className="panel-kicker"><span>02</span> TABLA DE {leagueName.toUpperCase()} <b>TODO EN CERO</b></div><div className="table-head career-zero-head"><span>#</span><span>CLUB</span><span>PJ</span><span>G</span><span>E</span><span>P</span><span>GF</span><span>GC</span><span>DG</span><span>PTS</span></div><div className="career-standings-list">{leagueTeamsLoading ? <div className="table-empty"><p>Cargando clubes…</p></div> : leagueTeamsError ? <div className="table-empty"><p>{leagueTeamsError}</p></div> : leagueTeams.length ? leagueTeams.map((team, index) => <div className={String(team.id) === String(profile?.team?.id) ? "zero-standing-row is-player-team" : "zero-standing-row"} key={team.id || team.name}><span>{index + 1}</span><span className="standing-team">{team.crest && <img src={team.crest} alt="" />}<b>{team.shortName || team.name}</b></span>{Array.from({ length: 8 }, (_, column) => <span className="zero-stat" key={column}>0</span>)}</div>) : <div className="table-empty"><p>No hay clubes disponibles para mostrar.<small>Revisá la conexión con la API de la liga.</small></p></div>}</div><div className="table-foot"><span>{leagueTeams.length} CLUBES</span><span>CLASIFICACIÓN INICIAL</span></div></article>
        {selectedCompetition !== "league" && <article className={`career-cup-bracket career-cup-bracket--${selectedCompetition}`}><div className="panel-kicker"><span>02</span> CUADRO · {competitionOptions.find((item) => item.id === selectedCompetition)?.label.toUpperCase()} <b>{selectedBracket.length ? "ELIMINACIÓN DIRECTA" : "EN PREPARACIÓN"}</b></div>{selectedBracket.length ? <div className="cup-bracket-rounds">{selectedBracket.map((round, roundIndex) => <section className="cup-round" key={`${round.label}-${roundIndex}`}><h3>{round.label}<small>RONDA {roundIndex + 1}</small></h3>{round.matches.map((match, matchIndex) => { const playerTie = [match.home, match.away].some((team) => String(team.id) === String(profile?.team?.id)); return <div className={`cup-tie ${playerTie ? "is-player-tie" : ""}`} key={`${roundIndex}-${matchIndex}`}><span>{match.home.shortName || match.home.name}</span><i>vs</i><span>{match.away.shortName || match.away.name}</span></div>; })}</section>)}</div> : <div className="cup-bracket-empty">{leagueTeamsLoading ? "Cargando cuadro…" : selectedCompetition === "cup" ? "El cuadro estará disponible cuando se carguen los equipos." : "Esta carrera no clasificó a la copa internacional."}</div>}<div className="table-foot"><span>{selectedCompetition === "international" ? "CLASIFICACIÓN SEGÚN PUESTO DE LIGA" : "SORTEO DE TEMPORADA"}</span><span>CAMINO DEL EQUIPO RESALTADO</span></div></article>}
      </div>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO EN LA NUBE <i>●</i></span></footer>
    </section> : section === "play" ? <section className="career-home-content career-section-view">
      <div className="career-heading"><div><span className="career-eyebrow">MODO CARRERA · {clubName.toUpperCase()}</span><h1>DÍA DE PARTIDO</h1><p>{nextMatch?.competitionName || leagueName} · Temporada {seasonLabel}</p></div></div>
      <article className="play-match-card"><div className="play-match-kicker">PRÓXIMO PARTIDO <span>{nextMatch ? new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(nextMatch.utcDate)) : "CALENDARIO EN PREPARACIÓN"}</span></div><div className="play-match-teams"><div><span className="play-team-crest">{nextMatch?.homeTeam?.crest ? <img src={nextMatch.homeTeam.crest} alt="" /> : "DC"}</span><strong>{nextMatch?.homeTeam?.name || clubName}</strong><small>{String(nextMatch?.homeTeam?.id) === String(profile?.team?.id) ? "LOCAL" : "VISITANTE"}</small></div><b>VS</b><div><span className="play-team-crest">{nextMatch?.awayTeam?.crest ? <img src={nextMatch.awayTeam.crest} alt="" /> : "DC"}</span><strong>{nextMatch?.awayTeam?.name || "Rival por confirmar"}</strong><small>{String(nextMatch?.awayTeam?.id) === String(profile?.team?.id) ? "LOCAL" : "VISITANTE"}</small></div></div><div className="play-match-meta"><span>COMPETICIÓN<strong>{nextMatch?.competitionName || leagueName}</strong></span><span>ESTADIO<strong>{String(nextMatch?.homeTeam?.id) === String(profile?.team?.id) ? profile?.team?.name : nextMatch?.homeTeam?.name || "Por confirmar"}</strong></span><span>JUGADOR<strong>{profile?.name}</strong></span></div><button className="career-back-home" onClick={() => setSection("home")}>← Volver al inicio</button></article>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>TEMPORADA {seasonLabel}</span></footer>
    </section> : section === "calendar" ? <section className="career-home-content career-section-view">
      <div className="calendar-layout">
        <div className="calendar-main">
          <header className="calendar-title"><div><span className="career-eyebrow">MODO CARRERA · {leagueName.toUpperCase()}</span><h1>CALENDARIO <span>{profile?.league?.emblem ? <img src={profile.league.emblem} alt="" /> : "DC"}</span></h1></div><div className="calendar-controls"><button aria-label="Mes anterior" onClick={() => changeCalendarMonth(-1)}>‹</button><button aria-label="Mes siguiente" onClick={() => changeCalendarMonth(1)}>›</button></div></header>
          <div className="calendar-grid" aria-label={`Calendario de ${monthLabel} de ${calendarMonth.getFullYear()}`}>
            {["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"].map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
            {calendarDays.map(({ date, inMonth, key }) => {
              const dayMatches = matchesByDate[key] || [];
              return <button type="button" key={key} className={`calendar-day ${inMonth ? "" : "is-outside"} ${key === selectedDate ? "is-selected" : ""} ${dayMatches.length ? "has-match" : ""} ${[...new Set(dayMatches.map(competitionTone))].map((tone) => `has-${tone}`).join(" ")}`} onClick={() => setSelectedDate(key)}>
                <span className="calendar-day-number">{date.getDate()}</span>
                {dayMatches.slice(0, 2).map((match) => <span className={`calendar-fixture calendar-fixture--${competitionTone(match)}`} key={match.id}><span className="fixture-crests">{match.homeTeam.crest ? <img src={match.homeTeam.crest} alt="" /> : <i>{match.homeTeam.tla || "L"}</i>}{match.awayTeam.crest ? <img src={match.awayTeam.crest} alt="" /> : <i>{match.awayTeam.tla || "V"}</i>}</span><span className="fixture-info"><b>{match.homeTeam.shortName} <em>{match.homeScore ?? "·"}–{match.awayScore ?? "·"} {match.awayTeam.shortName}</em></b><small>{match.competitionName || "LIGA"}</small></span></span>)}
              </button>;
            })}
          </div>
          <div className="calendar-feedback" role="status">{matches.length ? `${matches.filter((match) => localDateKey(match.utcDate).startsWith(`${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`)).length} PARTIDOS EN ${monthLabel.toUpperCase()}` : "CARGANDO CALENDARIO…"}</div>
          <div className="calendar-legend" aria-label="Colores por competición"><span className="legend-league">Liga</span><span className="legend-cup">Copa doméstica</span><span className="legend-international">Copa internacional</span></div>
        </div>
        <aside className="calendar-aside"><div className="calendar-date-block"><strong>{calendarMonth.getFullYear()}</strong><span>{monthLabel}</span></div><div className="calendar-aside-section"><b>PARTIDOS DEL DÍA</b><span>{new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long" }).format(new Date(`${selectedDate}T12:00:00`))}</span>
          {selectedMatches.map((match) => <article className={`calendar-match-card calendar-match-card--${competitionTone(match)}`} key={match.id}><div className="calendar-card-top"><span>PLAYER CAREER · FIXTURE</span><b>{match.competitionName || "LIGA"}</b></div><div className="calendar-card-date">{new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(match.utcDate))}<small>{formatMatchTime(match.utcDate)} · TEMPORADA {seasonLabel}</small></div><div className="calendar-card-teams"><div><span className="calendar-card-crest">{match.homeTeam.crest ? <img src={match.homeTeam.crest} alt="" /> : match.homeTeam.tla || "DC"}</span><b>{match.homeTeam.shortName || match.homeTeam.name}</b><small>{String(match.homeTeam.id) === String(profile?.team?.id) ? "TU EQUIPO · LOCAL" : "LOCAL"}</small></div><strong>{match.homeScore ?? "–"}<i>:</i>{match.awayScore ?? "–"}</strong><div><span className="calendar-card-crest">{match.awayTeam.crest ? <img src={match.awayTeam.crest} alt="" /> : match.awayTeam.tla || "DC"}</span><b>{match.awayTeam.shortName || match.awayTeam.name}</b><small>{String(match.awayTeam.id) === String(profile?.team?.id) ? "TU EQUIPO · VISITANTE" : "VISITANTE"}</small></div></div><div className="calendar-card-bottom"><span>ESTADIO</span><b>{match.homeTeam.name}</b><span>JORNADA DE TEMPORADA</span></div></article>)}
          {!selectedMatches.length && <p className="calendar-empty-prompt">Elegí un día con partido para ver el resumen.</p>}
        </div></aside>
      </div>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>DATOS DE FOOTBALL-DATA.ORG <i>●</i></span></footer>
    </section> : <section className="career-home-content career-section-view">
      <div className="career-heading"><div><span className="career-eyebrow">MODO CARRERA <i>·</i> {clubName.toUpperCase()}</span><h1>{PLACEHOLDERS[section]?.[0] || "TU CARRERA"}</h1><p>{PLACEHOLDERS[section]?.[1]}</p></div></div>
      <article className="career-coming-card"><span className="coming-mark">DC</span><div className="career-eyebrow">PRÓXIMAMENTE EN DREAMCHASER</div><h2>{PLACEHOLDERS[section]?.[1]}</h2><button className="career-back-home" onClick={() => setSection("home")}>← Volver al inicio</button></article>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO EN LA NUBE <i>●</i></span></footer>
    </section>}
  </main>;
}
