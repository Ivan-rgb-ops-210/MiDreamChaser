import { useEffect, useMemo, useRef, useState } from "react";
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
const FORMATIONS = [["ARQ", 1], ["DEF", 4], ["MED", 3], ["DEL", 3]];
const SAMPLE_NAMES = ["Mateo Ríos", "Lautaro Vera", "Bruno Acosta", "Tomás Sosa", "Nicolás Díaz", "Franco Molina", "Julián Costa", "Thiago López", "Santino Pereyra", "Benjamín Suárez", "Valentín Romero", "Lucas Méndez", "Facundo Torres", "Emiliano Castro", "Agustín Silva", "Ramiro Navarro", "Ignacio Gómez", "Dylan Herrera", "Máximo Fernández", "Gael Domínguez", "Bautista Ortiz"];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function seededRandom(seedText) {
  let seed = [...seedText].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 17);
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
function matchClockLabel(tick, firstHalfAdded) {
  if (tick <= 45) return `${tick}′`;
  if (tick <= 45 + firstHalfAdded) return `45+${tick - 45}′`;
  const secondHalfMinute = tick - firstHalfAdded;
  return secondHalfMinute <= 90 ? `${secondHalfMinute}′` : `90+${secondHalfMinute - 90}′`;
}
function regulationMinute(tick, firstHalfAdded) {
  if (tick <= 45) return tick;
  if (tick <= 45 + firstHalfAdded) return 45;
  return clamp(tick - firstHalfAdded, 45, 90);
}
function makeLineup(teamName, user, isUserTeam, seedText) {
  const random = seededRandom(seedText);
  const names = [...SAMPLE_NAMES].sort(() => random() - .5);
  const squad = [];
  let index = 0;
  FORMATIONS.forEach(([position, count]) => {
    for (let place = 0; place < count; place += 1) {
      if (isUserTeam && position === "DEL" && place === 0) squad.push({ name: user?.name || "Jugador", position, number: user?.number || 9, isUser: true });
      else squad.push({ name: names[index++], position, number: 1 + Math.floor(random() * 30), isUser: false });
    }
  });
  return { teamName, players: squad };
}
function simulateMatch({ home, away, userTeam, playerName, tempo, seedText, energy, firstHalfAdded, secondHalfAdded }) {
  const random = seededRandom(seedText);
  const events = [];
  let homeGoals = 0; let awayGoals = 0; let userGoals = 0; let userAssists = 0; let userShots = 0; let userRating = 6.2;
  const userSide = String(userTeam?.id) === String(home?.id) ? "home" : "away";
  const opponents = ["Mateo Ríos", "Lautaro Vera", "Bruno Acosta", "Tomás Sosa", "Nicolás Díaz", "Franco Molina", "Julián Costa", "Thiago López", "Santino Pereyra", "Benjamín Suárez", "Valentín Romero"];
  const teammates = [playerName, "Lautaro Vera", "Bruno Acosta", "Tomás Sosa", "Nicolás Díaz", "Franco Molina", "Julián Costa", "Thiago López", "Santino Pereyra", "Benjamín Suárez", "Valentín Romero"];
  const userChanceBoost = (tempo === "sacrificado" ? 1.55 : tempo === "competitivo" ? 1.22 : 1) * clamp(energy / 100, .45, 1);
  const duration = 90 + firstHalfAdded + secondHalfAdded;
  for (let tick = 1; tick <= duration; tick += 1) {
    if (random() < .20) {
      const minute = matchClockLabel(tick, firstHalfAdded);
      const side = random() < (userSide === "home" ? .52 : .48) ? "home" : "away";
      const ownTeam = side === "home" ? home : away;
      const ownNames = side === userSide ? teammates : opponents;
      let actor = ownNames[Math.floor(random() * ownNames.length)];
      if (side === userSide && random() < clamp(.09 * userChanceBoost, .04, .24)) actor = playerName;
      const roll = random();
      let type; let message; let involved = [actor];
      if (roll < .42) {
        type = "shot"; const onTarget = random() < .34; message = onTarget ? `${actor} remata al arco y el arquero contiene sin dar rebote.` : `${actor} busca el arco desde una buena posición, pero el remate se va desviado.`;
        if (actor === playerName) { userShots += 1; if (onTarget) userRating += .12; }
      } else if (roll < .60) {
        type = "danger"; message = random() < .22 ? `${actor} estrella el remate en el palo.` : `${actor} saca un remate muy cercano que pasa junto al poste.`;
        if (actor === playerName) { userShots += 1; userRating += .25; }
      } else if (roll < .72) {
        const scorer = side === userSide && random() < clamp(.25 * userChanceBoost, .12, .5) ? playerName : actor;
        const assist = scorer === playerName ? ownNames.find((name) => name !== playerName) : (side === userSide && random() < .15 ? playerName : ownNames[Math.floor(random() * ownNames.length)]);
        type = "goal"; involved = [scorer, assist]; message = `${scorer} define tras una buena combinación. Asiste ${assist}.`;
        if (scorer === playerName) userShots += 1;
        if (side === "home") homeGoals += 1; else awayGoals += 1;
        if (scorer === playerName) { userGoals += 1; userRating += 1.25; }
        if (assist === playerName && scorer !== playerName) { userAssists += 1; userRating += .8; }
      } else if (roll < .728) {
        type = "penalty"; const scored = random() < .76; message = scored ? `Penal convertido por ${actor}, con un remate cruzado.` : `${actor} ejecuta el penal y el arquero lo ataja.`;
        if (actor === playerName) userShots += 1;
        if (scored) { if (side === "home") homeGoals += 1; else awayGoals += 1; if (actor === playerName) { userGoals += 1; userRating += 1.1; } }
      } else if (roll < .908) {
        type = "foul"; message = `${actor} comete una falta táctica en la mitad de la cancha.`;
      } else if (roll < .968) {
        type = "card"; const red = random() < .045; message = `${actor} recibe ${red ? "tarjeta roja" : "tarjeta amarilla"} por una falta ${red ? "a destiempo" : "en la disputa"}.`;
      } else {
        type = "sub"; const outgoing = ownNames[Math.floor(random() * ownNames.length)]; const incoming = `${ownNames[Math.floor(random() * ownNames.length)]} (ingresa)`; involved = [outgoing, incoming]; message = `Cambio: ${incoming} reemplaza a ${outgoing}.`;
      }
      events.push({ minute, tick, scoreDelta: type === "goal" || (type === "penalty" && message.startsWith("Penal convertido")), side, team: ownTeam?.shortName || ownTeam?.name || (side === "home" ? "Local" : "Visitante"), type, message, involved });
    }
  }
  const homePossession = 43 + Math.floor(random() * 15);
  return { events: events.sort((a, b) => a.tick - b.tick), homeGoals, awayGoals, userGoals, userAssists, userShots, homePossession, firstHalfAdded, secondHalfAdded, userRating: clamp(userRating, 4.8, 10) };
}
function getLiveMatchStats(result, events, eventCount, minute) {
  if (!result || minute <= 0) return null;
  const shift = Math.round(Math.sin(minute / 10) * 3 + Math.sin(minute / 23) * 2);
  const homePossession = clamp(result.homePossession + shift, 35, 65);
  const totalShots = Math.floor(minute * .23);
  const homeShots = Math.round(totalShots * homePossession / 100);
  const totalFouls = Math.floor(minute * .25);
  const homeFouls = Math.round(totalFouls * (0.48 + Math.sin(minute / 16) * .04));
  const playedEvents = events.slice(0, eventCount);
  const countCards = (side, color) => playedEvents.filter((event) => event.side === side && event.type === "card" && (color === "red" ? event.message.includes("roja") : event.message.includes("amarilla"))).length;
  return {
    homePossession, awayPossession: 100 - homePossession,
    homeShots, awayShots: totalShots - homeShots,
    homeFouls, awayFouls: totalFouls - homeFouls,
    homeYellow: countCards("home", "yellow"), awayYellow: countCards("away", "yellow"),
    homeRed: countCards("home", "red"), awayRed: countCards("away", "red"),
  };
}
function AnimatedStatValue({ value, decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const duration = 1050;
    let startTime;
    let frameId;
    const animate = (time) => {
      startTime ??= time;
      const progress = clamp((time - startTime) / duration, 0, 1);
      const eased = 1 - (1 - progress) ** 4;
      setDisplayValue(target * eased);
      if (progress < 1) frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value]);
  return <strong>{decimals ? displayValue.toFixed(decimals) : Math.round(displayValue)}</strong>;
}
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

export default function CareerHomeScreen({ profile, screenPath = "/career", onNavigate = () => {}, onExit }) {
  const [section, setSection] = useState("home");
  const [leagueTeams, setLeagueTeams] = useState([]);
  const [leagueTeamsLoading, setLeagueTeamsLoading] = useState(false);
  const [leagueTeamsError, setLeagueTeamsError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(seasonStartFor(profile).getFullYear(), seasonStartFor(profile).getMonth(), 1));
  const [matches, setMatches] = useState([]);
  const [selectedCompetition, setSelectedCompetition] = useState("league");
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(seasonStartFor(profile)));
  const [matchMode, setMatchMode] = useState("preview");
  const [matchSpeed, setMatchSpeed] = useState(1);
  const [matchTempo, setMatchTempo] = useState("regulado");
  const [matchEvents, setMatchEvents] = useState([]);
  const [matchProgress, setMatchProgress] = useState(0);
  const [matchMinute, setMatchMinute] = useState(0);
  const [activeMatchEvent, setActiveMatchEvent] = useState(null);
  const [liveScore, setLiveScore] = useState({ home: 0, away: 0 });
  const [paused, setPaused] = useState(false);
  const [halftime, setHalftime] = useState(false);
  const [halftimeDone, setHalftimeDone] = useState(false);
  const [firstHalfAdded, setFirstHalfAdded] = useState(2);
  const [secondHalfAdded, setSecondHalfAdded] = useState(3);
  const [summaryVisibleCount, setSummaryVisibleCount] = useState(0);
  const visibleSection = screenPath === "/match" || screenPath === "/match-summary" ? "play" : section === "play" ? "home" : section;
  const [matchResult, setMatchResult] = useState(null);
  const energyKey = `dreamchaser.energy.${profile?.createdAt || profile?.name || "career"}`;
  const [energy, setEnergy] = useState(() => { try { return clamp(Number(localStorage.getItem(energyKey) || 100), 0, 100); } catch { return 100; } });
  const matchdayFeedRef = useRef(null);
  const followMatchEvents = useRef(true);
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
  const isUserHome = String(nextMatch?.homeTeam?.id) === String(profile?.team?.id);
  const homeLineup = useMemo(() => makeLineup(nextMatch?.homeTeam?.name || clubName, profile, isUserHome, `${profile?.createdAt || "career"}-home`), [nextMatch?.homeTeam?.name, profile?.name, profile?.number, profile?.createdAt, isUserHome, clubName]);
  const awayLineup = useMemo(() => makeLineup(nextMatch?.awayTeam?.name || "Rival", profile, !isUserHome, `${profile?.createdAt || "career"}-away`), [nextMatch?.awayTeam?.name, profile?.name, profile?.number, profile?.createdAt, isUserHome]);
  const liveMatchStats = useMemo(() => getLiveMatchStats(matchResult, matchEvents, matchProgress, regulationMinute(matchMinute, firstHalfAdded)), [matchResult, matchEvents, matchProgress, matchMinute, firstHalfAdded]);
  const matchDrain = matchTempo === "sacrificado" ? 35 : matchTempo === "competitivo" ? 24 : 15;
  const playerEnergy = matchMode === "simulation" ? clamp(energy - matchDrain * regulationMinute(matchMinute, firstHalfAdded) / 90, 0, 100) : energy;
  useEffect(() => {
    const feed = matchdayFeedRef.current;
    if (feed && followMatchEvents.current) feed.scrollTop = feed.scrollHeight;
  }, [matchProgress, matchMinute, activeMatchEvent, matchMode]);
  useEffect(() => { try { localStorage.setItem(energyKey, String(energy)); } catch { /* Storage can be unavailable in private browsing. */ } }, [energy, energyKey]);
  useEffect(() => { if (screenPath === "/match-summary" && !matchResult) onNavigate("/career", { replace: true }); }, [screenPath, matchResult, onNavigate]);
  useEffect(() => {
    if (matchMode !== "summary") return undefined;
    setSummaryVisibleCount(1);
    const timer = setInterval(() => setSummaryVisibleCount((count) => Math.min(4, count + 1)), 1150);
    return () => clearInterval(timer);
  }, [matchMode, matchResult]);
  useEffect(() => {
    if (matchMode !== "simulation") return undefined;
    if (paused || halftime) return undefined;
    if (activeMatchEvent) {
      const pause = setTimeout(() => setActiveMatchEvent(null), 2600);
      return () => clearTimeout(pause);
    }
    const halftimeMinute = 45 + firstHalfAdded;
    const matchDuration = 90 + firstHalfAdded + secondHalfAdded;
    if (!halftimeDone && matchMinute >= halftimeMinute) {
      setHalftime(true);
      return undefined;
    }
    if (matchMinute >= matchDuration) {
      setMatchMode("finished");
      setPaused(false);
      setEnergy((current) => clamp(current - matchDrain, 5, 100));
      return undefined;
    }
    const timer = setTimeout(() => {
      const nextMinute = matchMinute + 1;
      setMatchMinute(nextMinute);
      const event = matchEvents[matchProgress];
      if (event?.tick === nextMinute) {
        setActiveMatchEvent(event);
        setMatchProgress((current) => current + 1);
        if (event.scoreDelta) setLiveScore((score) => ({ ...score, [event.side]: score[event.side] + 1 }));
      }
    }, 1000 / matchSpeed);
    return () => clearTimeout(timer);
  }, [matchMode, matchMinute, matchEvents, matchProgress, activeMatchEvent, matchSpeed, paused, halftime, halftimeDone, firstHalfAdded, secondHalfAdded, matchDrain]);
  function startMatch() {
    const home = nextMatch?.homeTeam || profile?.team;
    const away = nextMatch?.awayTeam || { id: "opponent", name: "Rival", shortName: "Rival" };
    const runId = globalThis.crypto?.randomUUID?.() || String(Date.now());
    const seedText = `${profile?.createdAt || "career"}-${nextMatch?.id || "debut"}-${matchTempo}-${runId}`;
    const extraTimeRandom = seededRandom(`${seedText}-added-time`);
    const firstAdded = 1 + Math.floor(extraTimeRandom() * 4);
    const secondAdded = 2 + Math.floor(extraTimeRandom() * 4);
    const result = simulateMatch({ home, away, userTeam: profile?.team, playerName: profile?.name || "Jugador", tempo: matchTempo, energy, seedText, firstHalfAdded: firstAdded, secondHalfAdded: secondAdded });
    followMatchEvents.current = true;
    setFirstHalfAdded(firstAdded); setSecondHalfAdded(secondAdded); setLiveScore({ home: 0, away: 0 }); setPaused(false); setHalftime(false); setHalftimeDone(false);
    setMatchResult(result); setMatchEvents(result.events); setMatchProgress(0); setMatchMinute(0); setActiveMatchEvent(null); setMatchMode("simulation"); onNavigate("/match");
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


  return <main className={`career-shell ${screenPath === "/match" || screenPath === "/match-summary" ? "matchday-route" : ""}`}>
    <Stadium />
    <header className="career-topbar">
      <a className="career-brand" href="#inicio" onClick={(event) => { event.preventDefault(); setSection("home"); setMatchMode("preview"); onNavigate("/career"); }} aria-label="DreamChaser, inicio">
        <img src="/dreamchaser-logo.png" alt="" /><span>DREAMCHASER<small>PLAYER CAREER SIMULATOR</small></span>
      </a>
      <div className="career-season"><span className="career-live-dot" /> MODO CARRERA <i>/</i> TEMPORADA {seasonLabel}</div>
      <button className="career-user" onClick={screenPath === "/match" || screenPath === "/match-summary" ? () => { setSection("home"); setMatchMode("preview"); onNavigate("/career"); } : onExit} aria-label={screenPath === "/match" || screenPath === "/match-summary" ? "Volver a la carrera" : "Salir de la carrera"} title={screenPath === "/match" || screenPath === "/match-summary" ? "Volver a la carrera" : "Salir de la carrera"}><span className="career-user-avatar">{profile?.number || "DC"}</span><span>{profile?.name || "Jugador"}<small>{clubName}</small></span><b>{screenPath === "/match" || screenPath === "/match-summary" ? "←" : "↗"}</b></button>
    </header>

    <nav className="career-topnav" aria-label="Secciones de carrera">{NAV_ITEMS.map(([id, label]) => <button key={id} className={visibleSection === id ? "is-current" : ""} onClick={() => { setSection(id); setMatchMode("preview"); onNavigate("/career"); }} aria-current={visibleSection === id ? "page" : undefined}>{label}</button>)}</nav>

    {visibleSection === "home" ? <section className="career-home-content" id="inicio">
      <div className="home-competition-picker"><span>COMPETICIÓN</span>{competitionOptions.map((competition) => <button key={competition.id} type="button" className={`competition-choice competition-choice--${competition.id} ${selectedCompetition === competition.id ? "is-selected" : ""}`} onClick={() => setSelectedCompetition(competition.id)} aria-pressed={selectedCompetition === competition.id}>{competition.label}</button>)}</div>
      <div className="career-dashboard career-dashboard-sketch">
        <div className="career-left-stack">
          <button type="button" className="career-match-panel" onClick={() => { setMatchMode("preview"); setSection("play"); onNavigate("/match"); }} aria-label="Ver próximo partido">
            <span className="panel-kicker"><span>01</span> PRÓXIMO PARTIDO <b className="match-status">{nextMatch?.competitionName || "DEBUT PENDIENTE"}</b></span><span className="match-card-inner"><span className="match-club"><span className="match-crest">{nextMatch?.homeTeam?.crest ? <img src={nextMatch.homeTeam.crest} alt="" /> : "DC"}</span><strong>{nextMatch?.homeTeam?.shortName || nextMatch?.homeTeam?.name || clubName}</strong><small>{String(nextMatch?.homeTeam?.id) === String(profile?.team?.id) ? "LOCAL" : "VISITANTE"}</small></span><span className="match-center"><span>{nextMatch?.competitionName || leagueName}</span><strong>VS</strong><small>{nextMatch ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(new Date(nextMatch.utcDate)) : "INICIO DE TEMPORADA"}</small></span><span className="match-club opponent"><span className="match-crest opponent-crest">{nextMatch?.awayTeam?.crest ? <img src={nextMatch.awayTeam.crest} alt="" /> : "?"}</span><strong>{nextMatch?.awayTeam?.shortName || nextMatch?.awayTeam?.name || "RIVAL"}</strong><small>{String(nextMatch?.awayTeam?.id) === String(profile?.team?.id) ? "LOCAL" : "VISITANTE"}</small></span></span>
          </button>
          <article className="career-empty-feature career-lower-empty" aria-label="Espacio reservado"><span>DC</span></article>
        </div>
        <article className={`career-table-panel career-table-feature ${selectedCompetition !== "league" ? "is-hidden" : ""}`}><div className="panel-kicker"><span>02</span> TABLA DE {leagueName.toUpperCase()} <b>TODO EN CERO</b></div><div className="table-head career-zero-head"><span>#</span><span>CLUB</span><span>PJ</span><span>G</span><span>E</span><span>P</span><span>GF</span><span>GC</span><span>DG</span><span>PTS</span></div><div className="career-standings-list">{leagueTeamsLoading ? <div className="table-empty"><p>Cargando clubes…</p></div> : leagueTeamsError ? <div className="table-empty"><p>{leagueTeamsError}</p></div> : leagueTeams.length ? leagueTeams.map((team, index) => <div className={String(team.id) === String(profile?.team?.id) ? "zero-standing-row is-player-team" : "zero-standing-row"} key={team.id || team.name}><span>{index + 1}</span><span className="standing-team">{team.crest && <img src={team.crest} alt="" />}<b>{team.shortName || team.name}</b></span>{Array.from({ length: 8 }, (_, column) => <span className="zero-stat" key={column}>0</span>)}</div>) : <div className="table-empty"><p>No hay clubes disponibles para mostrar.<small>Revisá la conexión con la API de la liga.</small></p></div>}</div><div className="table-foot"><span>{leagueTeams.length} CLUBES</span><span>CLASIFICACIÓN INICIAL</span></div></article>
        {selectedCompetition !== "league" && <article className={`career-cup-bracket career-cup-bracket--${selectedCompetition}`}><div className="panel-kicker"><span>02</span> CUADRO · {competitionOptions.find((item) => item.id === selectedCompetition)?.label.toUpperCase()} <b>{selectedBracket.length ? "ELIMINACIÓN DIRECTA" : "EN PREPARACIÓN"}</b></div>{selectedBracket.length ? <div className="cup-bracket-rounds">{selectedBracket.map((round, roundIndex) => <section className="cup-round" key={`${round.label}-${roundIndex}`}><h3>{round.label}<small>RONDA {roundIndex + 1}</small></h3>{round.matches.map((match, matchIndex) => { const playerTie = [match.home, match.away].some((team) => String(team.id) === String(profile?.team?.id)); return <div className={`cup-tie ${playerTie ? "is-player-tie" : ""}`} key={`${roundIndex}-${matchIndex}`}><span>{match.home.shortName || match.home.name}</span><i>vs</i><span>{match.away.shortName || match.away.name}</span></div>; })}</section>)}</div> : <div className="cup-bracket-empty">{leagueTeamsLoading ? "Cargando cuadro…" : selectedCompetition === "cup" ? "El cuadro estará disponible cuando se carguen los equipos." : "Esta carrera no clasificó a la copa internacional."}</div>}<div className="table-foot"><span>{selectedCompetition === "international" ? "CLASIFICACIÓN SEGÚN PUESTO DE LIGA" : "SORTEO DE TEMPORADA"}</span><span>CAMINO DEL EQUIPO RESALTADO</span></div></article>}
      </div>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO EN LA NUBE <i>●</i></span></footer>
    </section> : visibleSection === "play" ? <section className="career-home-content career-section-view">
      <div className="career-heading"><div><span className="career-eyebrow">MODO CARRERA · {clubName.toUpperCase()}</span><h1>DÍA DE PARTIDO</h1><p>{nextMatch?.competitionName || leagueName} · Temporada {seasonLabel}</p></div></div>
      <article className={`matchday-board ${matchMode === "summary" ? "is-summary-screen" : ""}`}>
        <header className="matchday-scoreboard">
          <div className="matchday-club matchday-club--home">{nextMatch?.homeTeam?.crest ? <img src={nextMatch.homeTeam.crest} alt="" /> : <span>{homeLineup.teamName.slice(0, 2).toUpperCase()}</span>}<b>{homeLineup.teamName}</b></div>
          <div className="matchday-score"><strong>{matchMode === "preview" ? "·" : liveScore.home}</strong><i>–</i><strong>{matchMode === "preview" ? "·" : liveScore.away}</strong><small className={matchMode === "simulation" ? "is-live-minute" : ""}>{matchMode === "preview" ? "PRÓXIMO PARTIDO" : matchMode === "finished" || matchMode === "summary" ? "FINAL" : matchClockLabel(matchMinute, firstHalfAdded)}</small></div>
          <div className="matchday-club matchday-club--away">{nextMatch?.awayTeam?.crest ? <img src={nextMatch.awayTeam.crest} alt="" /> : <span>{awayLineup.teamName.slice(0, 2).toUpperCase()}</span>}<b>{awayLineup.teamName}</b></div>
          <p>{nextMatch?.competitionName || leagueName} · {nextMatch ? new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(nextMatch.utcDate)) : "TEMPORADA"}</p>
        </header>
        <div className="matchday-controls">
          {matchMode === "preview" ? <><label>RITMO<select value={matchTempo} onChange={(event) => setMatchTempo(event.target.value)}><option value="regulado">Regulado</option><option value="competitivo">Competitivo</option><option value="sacrificado">Sacrificado</option></select></label><span className="tempo-note">{matchTempo === "regulado" ? "Menor desgaste · menos protagonismo" : matchTempo === "competitivo" ? "Rendimiento y desgaste equilibrados" : "Más ocasiones personales · mayor desgaste"}</span><button className="simulate-match-button" onClick={startMatch}>SIMULAR PARTIDO <b>▶</b></button></> : <><span className="live-label">{matchMode === "finished" ? "PARTIDO FINALIZADO" : paused ? "SIMULACIÓN PAUSADA" : `EN JUEGO · ${matchTempo.toUpperCase()}`}</span><div className="speed-control"><span>VELOCIDAD</span>{[1, 2, 3].map((speed) => <button key={speed} className={matchSpeed === speed ? "is-selected" : ""} onClick={() => setMatchSpeed(speed)}>x{speed}</button>)}{matchMode === "simulation" && !halftime && <button className="match-pause-button" onClick={() => setPaused((value) => !value)}>{paused ? "▶ CONTINUAR" : "Ⅱ PAUSAR"}</button>}</div></>}
        </div>
        <div className="matchday-layout">
          {[homeLineup, awayLineup].map((lineup, teamIndex) => <aside className={`matchday-lineup ${teamIndex === 1 ? "matchday-lineup--away" : ""}`} key={lineup.teamName}><h3><span>{teamIndex === 0 ? "LOCAL" : "VISITANTE"}</span>{lineup.teamName}</h3>{FORMATIONS.map(([position]) => <section className="matchday-position" key={position}><b>{position === "ARQ" ? "ARQUEROS" : position === "DEF" ? "DEFENSORES" : position === "MED" ? "MEDIOCAMPISTAS" : "DELANTEROS"}</b>{lineup.players.filter((player) => player.position === position).map((player) => <div className={`matchday-player ${player.isUser ? "is-user-player" : ""}`} key={`${player.number}-${player.name}`}><span>{player.number}</span><strong>{player.name}</strong>{player.isUser && <em>TÚ</em>}</div>)}</section>)}</aside>)}
          <section className="matchday-pitch" aria-label="Relato de jugadas sobre la cancha"><div className="matchday-pitch-lines"><i className="pitch-box pitch-box--left"/><i className="pitch-box pitch-box--right"/><i className="pitch-midline"/></div><div className="matchday-feed" ref={matchdayFeedRef} onScroll={(event) => { const feed = event.currentTarget; followMatchEvents.current = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 60; }} aria-live="polite">{matchMode === "preview" ? <div className="feed-intro"><b>TODO LISTO PARA EL PARTIDO</b><span>Las jugadas aparecerán acá durante la simulación.</span></div> : <><div className="matchday-minute-marker">{matchMode === "finished" ? "FINAL DEL PARTIDO" : <>MINUTO <strong>{matchClockLabel(matchMinute, firstHalfAdded)}</strong> · {paused ? "PAUSADO" : matchMode === "simulation" ? "EN JUEGO" : "FINAL"}</>}</div>{matchEvents.slice(0, matchProgress).map((event) => <div className={`matchday-event matchday-event--${event.side} matchday-event--${event.type}`} key={`${event.minute}-${event.type}`}><b>{event.minute}</b><span><strong>{event.team}</strong>{event.message}</span></div>)}{matchMode === "simulation" && matchProgress === 0 && <div className="feed-intro">El árbitro está por dar inicio…</div>}</>}</div>          {activeMatchEvent && <div className="matchday-event-overlay" role="status" aria-live="assertive"><article key={`${activeMatchEvent.tick}-${activeMatchEvent.type}`} className={`matchday-event-banner matchday-event-banner--${activeMatchEvent.type} ${activeMatchEvent.side === "away" ? "is-away" : ""}`}><span className="event-banner-icon">{activeMatchEvent.type === "goal" ? "⚽" : activeMatchEvent.type === "card" ? "▰" : activeMatchEvent.type === "penalty" ? "◉" : activeMatchEvent.type === "sub" ? "↔" : activeMatchEvent.type === "shot" ? "➤" : "!"}</span><small>{activeMatchEvent.minute} · {activeMatchEvent.team}</small><b>{activeMatchEvent.type === "goal" ? "¡GOOOL!" : activeMatchEvent.type === "card" ? (activeMatchEvent.message.includes("roja") ? "TARJETA ROJA" : "TARJETA AMARILLA") : activeMatchEvent.type === "penalty" ? "PENAL" : activeMatchEvent.type === "sub" ? "SUSTITUCIÓN" : activeMatchEvent.type === "foul" ? "FALTA" : activeMatchEvent.type === "shot" ? "REMATE" : "¡OCASIÓN PELIGROSA!"}</b><p>{activeMatchEvent.message}</p></article></div>}</section>

          {halftime && <div className="matchday-intermission-overlay"><section><span>DESCANSO</span><h2>{homeLineup.teamName} <b>{liveScore.home} – {liveScore.away}</b> {awayLineup.teamName}</h2><p>Fin del primer tiempo · {firstHalfAdded}′ de tiempo añadido</p><button onClick={() => { setHalftimeDone(true); setHalftime(false); }}>COMENZAR SEGUNDO TIEMPO <b>→</b></button></section></div>}
        </div>
        {matchMode === "simulation" && <section className="matchday-player-energy"><div><b>ENERGÍA DE {profile?.name || "TU JUGADOR"}</b><strong>{Math.round(playerEnergy)}%</strong></div><i><u style={{ width: `${playerEnergy}%` }}/></i></section>}
        {liveMatchStats && matchMode !== "summary" && <section className="matchday-stats"><header><span>ESTADÍSTICAS DEL PARTIDO</span><b>{matchClockLabel(matchMinute, firstHalfAdded)}</b></header><div className="matchday-stats-head"><strong>{homeLineup.teamName}</strong><span>PARTIDO</span><strong>{awayLineup.teamName}</strong></div><div className="matchday-stat-row"><b>{liveMatchStats.homePossession}%</b><div><span>POSESIÓN</span><i><u style={{ width: `${liveMatchStats.homePossession}%` }}/><u style={{ width: `${liveMatchStats.awayPossession}%` }}/></i></div><b>{liveMatchStats.awayPossession}%</b></div>{[["REMATES", liveMatchStats.homeShots, liveMatchStats.awayShots], ["FALTAS", liveMatchStats.homeFouls, liveMatchStats.awayFouls], ["AMARILLAS", liveMatchStats.homeYellow, liveMatchStats.awayYellow], ["ROJAS", liveMatchStats.homeRed, liveMatchStats.awayRed]].map(([label, homeValue, awayValue]) => <div className="matchday-stat-row" key={label}><b>{homeValue}</b><div><span>{label}</span></div><b>{awayValue}</b></div>)}</section>}
        {matchMode === "finished" && <section className="player-match-summary"><span>PARTIDO FINALIZADO</span><h3>{homeLineup.teamName} {matchResult?.homeGoals} – {matchResult?.awayGoals} {awayLineup.teamName}</h3><p>El informe de tu rendimiento ya está listo.</p><button onClick={() => { setSummaryVisibleCount(0); setMatchMode("summary"); onNavigate("/match-summary"); }}>CONTINUAR</button></section>}
        {matchMode === "summary" && <section className="player-summary-screen"><header className="player-summary-header"><span className="player-summary-kicker">INFORME DEL ENTRENADOR</span><h2>{profile?.name || "Jugador"}</h2><p>{homeLineup.teamName} {matchResult?.homeGoals} – {matchResult?.awayGoals} {awayLineup.teamName}</p></header><div className="player-summary-list">{[
          { label: "REMATES", value: matchResult?.userShots || 0, note: "Intentos de gol durante el partido." },
          { label: "GOLES", value: matchResult?.userGoals || 0, note: matchResult?.userGoals ? "Aprovechaste tus oportunidades frente al arco." : "Seguiste buscando espacios para llegar al área." },
          { label: "ASISTENCIAS", value: matchResult?.userAssists || 0, note: matchResult?.userAssists ? "Tus pases ayudaron a definir el resultado." : "Buscaste conectar con tus compañeros en ataque." },
          { label: "CALIFICACIÓN", value: matchResult?.userRating || 0, note: "" },
        ].map((stat, index) => index < summaryVisibleCount && <article className={`player-summary-stat ${index === 3 ? "player-summary-stat--rating" : ""}`} key={stat.label} style={{ animationDelay: `${index * 35}ms` }}><div><span>{stat.label}</span>{index < 3 && <small>{stat.note}</small>}{index === 3 && <small>RENDIMIENTO DEL PARTIDO</small>}</div><AnimatedStatValue value={stat.value} decimals={index === 3 ? 1 : 0}/>{index === 3 && <p className="coach-message">{matchResult?.userRating >= 8 ? "Gran partido. Fuiste decisivo y marcaste la diferencia." : matchResult?.userRating >= 7 ? "Buen trabajo. Tu aporte fue importante para el equipo." : matchResult?.userRating >= 6 ? "Partido correcto. Seguí trabajando para influir más en el juego." : "No fue tu mejor tarde. Entrená y tendrás una nueva oportunidad."}</p>}</article>)}</div>{summaryVisibleCount === 4 && <button className="summary-return-button" onClick={() => { setMatchMode("preview"); setSection("home"); onNavigate("/career"); }}>VOLVER A LA CARRERA <b>✓</b></button>}</section>}
      </article>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>TEMPORADA {seasonLabel}</span></footer>
    </section> : visibleSection === "calendar" ? <section className="career-home-content career-section-view">
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
