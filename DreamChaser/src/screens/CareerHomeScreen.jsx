import { useEffect, useMemo, useRef, useState } from "react";
import { Stadium } from "../components/Brand.jsx";
import TrainingScreen, { TrainingResultScreen } from "./TrainingScreen.jsx";
import MatchChallenge from "./MatchChallenge.jsx";
import "../transfer.css";

const NAV_ITEMS = [
  ["home", "INICIO"], ["calendar", "CALENDARIO"],
  ["training", "ENTRENAMIENTO"],
  ["player", "MI JUGADOR"],
];
const PLACEHOLDERS = {
  calendar: ["CALENDARIO", "Acá vas a encontrar partidos, entrenamientos y los próximos eventos de tu carrera."],
  training: ["ENTRENAMIENTO", "Pronto vas a poder elegir sesiones, administrar tu energía y mejorar tus atributos."],
  career: ["CARRERA", "Contratos, objetivos, relaciones y transferencias van a vivir en esta sección."],
  player: ["MI JUGADOR", "Consultá tu perfil, tu club y las estadísticas con las que empieza esta carrera."],
  "player-stats": ["CARRERA", "El recorrido de tu jugador en clubes, selección y títulos."],
  "player-salary": ["SUELDO", "Tu contrato, salario y premios."],
  "player-transfers": ["TRANSFERENCIAS", "Tu situación en el mercado y el historial de pases."],
  "player-relations": ["RELACIONES", "Tus vínculos con el plantel, el cuerpo técnico y la afición."],
  "player-edit": ["EDITAR JUGADOR", "Personalizá los datos de tu jugador."],
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
const fixtureOutcome = (match, teamId) => {
  if (match.status !== "FINISHED") return "upcoming";
  if (match.homeScore === match.awayScore) return "draw";
  return (String(match.homeTeam?.id) === String(teamId) ? match.homeScore > match.awayScore : match.awayScore > match.homeScore) ? "win" : "loss";
};
const FORMATIONS = [["ARQ", 1], ["DEF", 4], ["MED", 3], ["DEL", 3]];
const PLAYER_CARD_STATS = [["pace", "Ritmo"], ["shooting", "Tiro"], ["passing", "Pase"], ["dribbling", "Regate"], ["defense", "Defensa"], ["physical", "Físico"]];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const salaryKeyFor = (profile) => `dreamchaser.contract.v1.${profile?.createdAt || profile?.team?.id || profile?.name || "career"}`;
const playerRating = (profile) => { const values = Object.values(profile?.stats || {}).map(Number).filter(Number.isFinite); return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 50; };
const initialContractFor = (profile) => { const start = new Date(profile?.createdAt || Date.now()); return { salary: Math.round((500 + playerRating(profile) * 25) / 50) * 50, start: start.toISOString(), end: new Date(start.getFullYear() + 3, start.getMonth(), start.getDate()).toISOString(), relations: { club: 60, teammates: 60, coach: 60, fans: 60 }, relationPenalty: 0, negotiation: null, notice: "" }; };
const money = (amount) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
const playerMarketValue = (profile, stats, career) => {
  const skillValues = Object.values(stats || {}).map(Number).filter(Number.isFinite);
  const rating = skillValues.length ? skillValues.reduce((sum, value) => sum + value, 0) / skillValues.length : 50;
  const appearances = Number(career?.matches) || 0;
  const contributions = (Number(career?.goals) || 0) + (Number(career?.assists) || 0);
  const contributionsPerMatch = contributions / Math.max(appearances, 12);
  const performanceFactor = clamp(0.78 + contributionsPerMatch * 1.2 + Math.min(appearances, 30) * .008, .78, 1.45);
  const ratingFactor = Math.exp((rating - 60) * .085);
  const age = Number(profile?.age) || (profile?.birthDate ? Math.floor((Date.now() - new Date(profile.birthDate)) / 31557600000) : 22);
  const ageFactor = age <= 20 ? 1.3 : age <= 24 ? 1.18 : age <= 28 ? 1 : age <= 31 ? .78 : age <= 34 ? .56 : .35;
  const contractYears = clamp((new Date(profile?.contractEnd || 0) - Date.now()) / (365.25 * 86400000), 0, 5);
  const contractFactor = .72 + Math.min(contractYears, 4) * .08;
  return Math.round(clamp(180000 * ratingFactor * performanceFactor * ageFactor * contractFactor, 50000, 180000000) / 25000) * 25000;
};
const clubInterest = (team, profile, value) => {
  const skillValues = Object.values(profile?.stats || {}).map(Number).filter(Number.isFinite);
  const rating = skillValues.length ? skillValues.reduce((sum, item) => sum + item, 0) / skillValues.length : 50;
  const clubElo = teamEloEstimate(team);
  const currentElo = teamEloEstimate(profile?.team);
  const fit = clamp(70 - Math.abs(clubElo - currentElo) * .045 + (rating - 60) * .45 + (value > 20000000 ? -8 : 0), 12, 93);
  const nameSeed = [...String(team?.id || team?.name)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return clamp(Math.round(fit + (nameSeed % 13) - 6), 8, 96);
};
const teamEloEstimate = (team) => { const name = `${team?.name || ""} ${team?.shortName || ""}`.toLowerCase(); const ratings = [[/real madrid/,2010],[/barcelona/,2033],[/manchester city|man city/,2003],[/arsenal/,1930],[/liverpool/,1935],[/bayern/,1975],[/paris saint|psg/,1945],[/inter milan|internazionale/,1920],[/atletico madrid|atlético madrid/,1870],[/chelsea/,1840],[/manchester united|man utd/,1820],[/tottenham/,1780],[/newcastle/,1800],[/aston villa/,1810],[/real sociedad/,1780],[/athletic bilbao/,1810],[/villarreal/,1780],[/sevilla/,1740],[/valencia/,1720],[/coventry/,1701],[/leicester/,1690],[/everton/,1710],[/west ham/,1730],[/brighton|bournemouth/,1760],[/brentford/,1710],[/fulham/,1710],[/wolves/,1700],[/crystal palace/,1710],[/nottingham forest/,1720],[/girona/,1760],[/betis/,1750],[/celta/,1690],[/osasuna/,1690],[/getafe/,1660],[/mallorca/,1670],[/sunderland/,1660],[/burnley/,1660],[/southampton/,1680],[/alaves|alavés/,1660],[/espanyol/,1690],[/las palmas/,1640],[/leganes|leganés/,1620],[/boca juniors/,1797],[/rosario central/,1762],[/river plate/,1749],[/argentinos juniors/,1747],[/velez|vélez/,1724],[/independiente rivadavia/,1721],[/estudiantes/,1715],[/lanus|lanús/,1707],[/gimnasia/,1703],[/instituto/,1701],[/racing club/,1693],[/independiente/,1692],[/belgrano/,1689],[/huracan|huracán/,1678],[/defensa y justicia/,1659],[/tigre/,1656],[/platense/,1653],[/barracas central/,1653],[/union de santa fe|unión de santa fe/,1647],[/san lorenzo/,1644],[/talleres/,1642],[/atletico tucuman|atlético tucumán/,1636],[/newell/,1634],[/sarmiento/,1613],[/central cordoba|central córdoba/,1600],[/riestra/,1596],[/banfield/,1594],[/aldosivi/,1552]]; return ratings.find(([pattern]) => pattern.test(name))?.[1] ?? (Number(team?.elo || team?.strength) || 1690); };
const objectivesFor = (profile, team, teamCount, seasonYear, inChampionsRace) => { const elo = teamEloEstimate(team); const tier = elo >= 1900 ? 1 : elo >= 1800 ? 2 : elo >= 1700 ? 3 : 4; const cycle = Number(seasonYear || new Date().getFullYear()) % 3; const collective = tier === 1 ? (cycle === 0 && inChampionsRace ? { kind:"international", target:2, label:"Llegar a semifinales de la Champions League" } : cycle === 1 ? { kind:"league", target:1, label:"Salir campeón de la liga" } : { kind:"league", target:3, label:"Terminar entre los 3 primeros de la liga" }) : tier === 2 ? (cycle % 2 ? { kind:"cup", target:3, label:"Llegar a la final de la copa doméstica" } : { kind:"league", target:4, label:"Terminar entre los 4 primeros de la liga" }) : tier === 3 ? (cycle % 2 ? { kind:"cup", target:2, label:"Llegar a semifinales de la copa doméstica" } : { kind:"league", target:Math.ceil((teamCount || 20)/2), label:"Terminar en la mitad superior de la tabla" }) : (cycle % 2 ? { kind:"league", target:Math.ceil((teamCount || 20)/2), label:"Terminar en la mitad superior de la tabla" } : { kind:"cup", target:2, label:"Llegar a semifinales de la copa doméstica" }); const rating = playerRating(profile); const goals = clamp(Math.round(4 + (rating - 50) * .55), 4, 28); const assists = clamp(Math.round(2 + (rating - 50) * .25), 2, 14); const stats = Object.fromEntries(Object.entries(profile?.stats || {}).map(([key,value]) => [key,Math.min(100,Number(value||0) + (cycle % 2 ? 3 : 2))])); return { tier, elo, collective, goals, assists, stats }; };
const OBJECTIVE_STAT_LABELS = { pace:"Ritmo", shooting:"Tiro", passing:"Pase", dribbling:"Regate", defense:"Defensa", physical:"Físico" };
const OBJECTIVE_TIER_LABELS = ["", "ÉLITE", "ALTO", "COMPETITIVO", "REVELACIÓN"];
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
function makeLineup(teamName, user, isUserTeam, roster = []) {
  const byPosition = { ARQ: [], DEF: [], MED: [], DEL: [] };
  roster.forEach((player) => {
    const rawPosition = player.position || "";
    const position = /goalkeeper|keeper/i.test(rawPosition) ? "ARQ" : /defen/i.test(rawPosition) ? "DEF" : /midf|centrocamp/i.test(rawPosition) ? "MED" : /forward|offen|offenc|attacker|strik/i.test(rawPosition) ? "DEL" : "MED";
    byPosition[position].push(player);
  });
  const players = FORMATIONS.flatMap(([position, count]) => byPosition[position].slice(0, count).map((player) => ({ name: player.name, position, number: player.shirtNumber || "–", isUser: false })));
  if (isUserTeam) {
    const strikerIndex = players.findLastIndex((player) => player.position === "DEL");
    if (strikerIndex >= 0) players.splice(strikerIndex, 1);
    players.push({ name: user?.name || "Jugador", position: "DEL", number: user?.number || 9, isUser: true });
  }
  return { teamName, players };
}
function simulateMatch({ home, away, userTeam, playerName, homeRoster, awayRoster, homeStarters, awayStarters, tempo, seedText, energy, firstHalfAdded, secondHalfAdded, stats = {} }) {
  const random = seededRandom(seedText);
  const events = [];
  let homeGoals = 0; let awayGoals = 0; let userGoals = 0; let userAssists = 0; let userShots = 0; let userRating = 6.2;
  const userSide = String(userTeam?.id) === String(home?.id) ? "home" : "away";
  const namesFrom = (roster) => roster.map((player) => player.name).filter(Boolean);
  let homeNames = namesFrom(homeStarters);
  let awayNames = namesFrom(awayStarters);
  const homeBench = namesFrom(homeRoster).filter((name) => !homeNames.includes(name));
  const awayBench = namesFrom(awayRoster).filter((name) => !awayNames.includes(name));
  const userOnHome = String(userTeam?.id) === String(home?.id);
  const userSideNames = userOnHome ? homeNames : awayNames;
  const userChanceBoost = tempo === "sacrificado" ? 2.15 : tempo === "competitivo" ? 1.45 : .82;
  const personalShare = tempo === "sacrificado" ? .34 : tempo === "competitivo" ? .23 : .13;
  const challengeCount = tempo === "sacrificado" ? 7 : tempo === "competitivo" ? 5 : 3;
  const playerExitMinute = tempo === "regulado" ? Infinity : (Number(energy) || 0) / 100 * (tempo === "sacrificado" ? 55 : 90);
  const challengeSkills = ["pace", "shooting", "passing", "dribbling", "physical", "defense"];
  const weights = challengeSkills.map((key) => Math.max(1, Number(stats[key]) || 50));
  const weightedSkill = () => { let pick = random() * weights.reduce((sum, weight) => sum + weight, 0); for (let i = 0; i < weights.length; i += 1) { pick -= weights[i]; if (pick <= 0) return challengeSkills[i]; } return challengeSkills[0]; };
  const challengeTicks = Array.from({ length: challengeCount }, (_, index) => Math.round((14 + index * (70 / challengeCount) + random() * 8) * (90 + firstHalfAdded + secondHalfAdded) / 90));
  challengeTicks.forEach((tick, index) => events.push({ minute: matchClockLabel(tick, firstHalfAdded), tick, side: userSide, team: userTeam?.shortName || userTeam?.name || "Tu equipo", type: "challenge", skill: weightedSkill(), involved: [playerName], message: "Tu oportunidad: resolvé la jugada." }));
  const duration = 90 + firstHalfAdded + secondHalfAdded;
  for (let tick = 1; tick <= duration; tick += 1) {
    if (random() < .20) {
      const minute = matchClockLabel(tick, firstHalfAdded);
      const playerActive = regulationMinute(tick, firstHalfAdded) <= playerExitMinute;
      const side = random() < (userSide === "home" ? .52 : .48) ? "home" : "away";
      const ownTeam = side === "home" ? home : away;
      const ownNames = side === "home" ? homeNames : awayNames;
      if (!ownNames.length) continue;
      const actors = ownNames.filter((name) => playerActive || name !== playerName);
      if (!actors.length) continue;
      let actor = actors[Math.floor(random() * actors.length)];
      if (side === userSide && playerActive && ownNames.includes(playerName) && random() < personalShare) actor = playerName;
      const roll = random();
      let type; let message; let involved = [actor];
      if (roll < .42) {
        type = "shot"; const onTarget = random() < .34; message = onTarget ? `${actor} remata al arco y el arquero contiene sin dar rebote.` : `${actor} busca el arco desde una buena posición, pero el remate se va desviado.`;
        if (actor === playerName) { userShots += 1; if (onTarget) userRating += .12; }
      } else if (roll < .60) {
        type = "danger"; message = random() < .22 ? `${actor} estrella el remate en el palo.` : `${actor} saca un remate muy cercano que pasa junto al poste.`;
        if (actor === playerName) { userShots += 1; userRating += .25; }
      } else if (roll < .72) {
        const scorer = side === userSide && playerActive && ownNames.includes(playerName) && actor === playerName && random() < clamp(.12 * userChanceBoost, .08, .28) ? playerName : actor;
        const assist = scorer === playerName ? (userSideNames.find((name) => name !== playerName) || playerName) : (side === userSide && playerActive && random() < .15 ? playerName : ownNames[Math.floor(random() * ownNames.length)]);
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
        const bench = side === "home" ? homeBench : awayBench;
        if (!bench.length) continue;
        type = "sub"; const outgoing = ownNames[Math.floor(random() * ownNames.length)]; const incoming = bench.splice(Math.floor(random() * bench.length), 1)[0]; involved = [outgoing, incoming]; message = `Cambio: ${incoming} ingresa por ${outgoing}.`;
        if (side === "home") homeNames = homeNames.map((name) => name === outgoing ? incoming : name);
        else awayNames = awayNames.map((name) => name === outgoing ? incoming : name);
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
function makeKnockoutBracket(teams, playerTeam, size, seedText, preserveOrder = false) {
  if (teams.length < size || !playerTeam) return [];
  let seed = [...seedText].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 11);
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const entrants = [...teams].sort(() => random() - .5).slice(0, size);
  if (preserveOrder) entrants.splice(0, entrants.length, ...teams.slice(0, size));
  if (!entrants.some((team) => String(team.id) === String(playerTeam.id))) entrants[entrants.length - 1] = playerTeam;
  const matches = [];
  for (let index = 0; index < entrants.length; index += 2) matches.push({ home: entrants[index], away: entrants[index + 1] });
  const rounds = [{ label: size === 16 ? "OCTAVOS" : size === 8 ? "CUARTOS" : "SEMIFINALES", matches }];
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
function fixturesFromBracket(rounds, playerTeam, start, idPrefix, competitionName, dayOffset, roundGap, results = {}) {
  return rounds.flatMap((round, index) => {
    const date = new Date(start); date.setDate(start.getDate() + dayOffset + index * roundGap); date.setHours(20, 0, 0, 0);
    const toClub = (team, tieIndex, side) => ({ id: team.id || `${idPrefix}-${index}-${tieIndex}-${side}`, name: team.name || team.shortName, shortName: team.shortName || team.name, crest: team.crest || "", tla: team.tla || "" });
    const resolveWinner = (team) => {
      const winnerNumber = /^Ganador (\d+)$/.exec(team?.name || "");
      if (!winnerNumber || index === 0) return team;
      const previousIndex = Number(winnerNumber[1]) - 1;
      const previousTie = rounds[index - 1]?.matches[previousIndex];
      if (!previousTie) return team;
      const fixture = { id: `${idPrefix}-${index - 1}-${previousIndex}`, homeTeam: toClub(previousTie.home, previousIndex, "home"), awayTeam: toClub(previousTie.away, previousIndex, "away") };
      const played = results[fixture.id] || simulateOtherFixture(fixture);
      return Number(played.homeScore) >= Number(played.awayScore) ? previousTie.home : previousTie.away;
    };
    return round.matches.map((tie, tieIndex) => {
      const home = resolveWinner(tie.home), away = resolveWinner(tie.away);
      return { id: `${idPrefix}-${index}-${tieIndex}`, matchday: index + 1, utcDate: date.toISOString(), status: "SCHEDULED", competitionName, homeTeam: toClub(home, tieIndex, "home"), awayTeam: toClub(away, tieIndex, "away"), homeScore: null, awayScore: null, roundName: round.label };
    });
  });
}
function championsLeagueFixtures(teams, playerTeam, start, seedText) {
  if (!playerTeam || teams.length < 36) return [];
  let seed = [...seedText].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 17);
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const entrants = [...teams].sort(() => random() - .5).slice(0, 36);
  if (!entrants.some((team) => String(team.id) === String(playerTeam.id))) entrants[31] = playerTeam;
  // UEFA's current format is one 36-club league phase, with eight distinct opponents per club.
  const rotation = [...entrants]; const fixtures = [];
  for (let round = 0; round < 8; round += 1) {
    const date = new Date(start); date.setDate(start.getDate() + 48 + round * 21); date.setHours(20, 0, 0, 0);
    for (let index = 0; index < 18; index += 1) {
      let home = rotation[index], away = rotation[35 - index];
      if ((round + index) % 2) [home, away] = [away, home];
      fixtures.push({ id: `international-group-${round}-${index}`, matchday: round + 1, stage: "LEAGUE_PHASE", roundName: `FASE DE LIGA · FECHA ${round + 1}`, utcDate: date.toISOString(), status: "SCHEDULED", competitionName: "Champions League", homeTeam: home, awayTeam: away, homeScore: null, awayScore: null });
    }
    rotation.splice(1, 0, rotation.pop());
  }
  return fixtures;
}
function emptyStanding(team) { return { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }; }
function applyFixtureResult(table, match) {
  const home = table.get(String(match.homeTeam.id)); const away = table.get(String(match.awayTeam.id));
  if (!home || !away || !Number.isFinite(match.homeScore) || !Number.isFinite(match.awayScore)) return;
  home.played += 1; away.played += 1; home.goalsFor += match.homeScore; home.goalsAgainst += match.awayScore; away.goalsFor += match.awayScore; away.goalsAgainst += match.homeScore;
  if (match.homeScore > match.awayScore) { home.won += 1; away.lost += 1; home.points += 3; }
  else if (match.homeScore < match.awayScore) { away.won += 1; home.lost += 1; away.points += 3; }
  else { home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1; }
}
function simulateOtherFixture(match) {
  const random = seededRandom(`fixture:${match.id}`);
  const goals = (strength, home) => { const chance = Math.max(.15, Math.min(.8, .37 + (strength - 70) * .009 + (home ? .07 : 0))); let count = 0; for (let i = 0; i < 7; i += 1) if (random() < chance / (i + 1)) count += 1; return Math.min(count, 6); };
  const homeScore = goals(Number(match.homeTeam.strength) || 70, true); const awayScore = goals(Number(match.awayTeam.strength) || 70, false);
  const names = ["Lucas González", "Mateo Fernández", "Tomás Rodríguez", "Santiago López", "Julián Romero", "Nicolás Martínez", "Franco Herrera", "Bruno Díaz", "Thiago Castro", "Valentín Acosta", "Lautaro Silva", "Benjamín Torres"];
  const scorerNames = (team, count) => Array.from({ length: count }, () => ({ team: team.shortName || team.name, player: names[Math.floor(random() * names.length)], minute: 1 + Math.floor(random() * 90) })).sort((a, b) => a.minute - b.minute);
  return { ...match, status: "FINISHED", homeScore, awayScore, scorers: [...scorerNames(match.homeTeam, homeScore), ...scorerNames(match.awayTeam, awayScore)].sort((a, b) => a.minute - b.minute) };
}

export default function CareerHomeScreen({ profile, screenPath = "/career", onNavigate = () => {}, onDeletePlayer = async () => {}, onUpdateProfile = async () => {}, onExit }) {
  const [section, setSection] = useState("home");
  const contractKey = salaryKeyFor(profile);
  const [contract, setContract] = useState(() => { try { const saved = JSON.parse(localStorage.getItem(contractKey)); return saved ? { ...initialContractFor(profile), ...saved } : initialContractFor(profile); } catch { return initialContractFor(profile); } });
  const [offerSalary, setOfferSalary] = useState("");
  const [offerYears, setOfferYears] = useState("3");
  const [transferSearch, setTransferSearch] = useState("");
  useEffect(() => { try { localStorage.setItem(contractKey, JSON.stringify(contract)); } catch {} }, [contractKey, contract]);
  useEffect(() => { setContract(() => { try { const saved = JSON.parse(localStorage.getItem(contractKey)); return saved ? { ...initialContractFor(profile), ...saved } : initialContractFor(profile); } catch { return initialContractFor(profile); } }); }, [contractKey, profile]);
  function startNegotiation(type) {
    const relations = contract.relations || {};
    if (type === "raise" && managementRelation < 100) { setContract(current => ({ ...current, relationPenalty: (current.relationPenalty || 0) + 15, relations: Object.fromEntries(Object.entries(current.relations).map(([key, value]) => [key, Math.max(0, value - 15)])), notice: "Solicitud rechazada: necesitás una relación del 100% con el club. Todas tus relaciones bajaron." })); return; }
    setContract(current => ({ ...current, notice: "", negotiation: { type, offerSalary: Number(offerSalary) || current.salary * 1.2, offerYears: clamp(Number(offerYears) || 3, 1, 5), tension: 0, round: 0, clubOffer: null } }));
  }
  function submitOffer() {
    setContract(current => { const n = current.negotiation; if (!n) return current; const salary = Math.max(0, Number(offerSalary) || 0); const years = clamp(Number(offerYears) || 1, 1, 5); const baseline = Math.max(current.salary, 1); if (salary <= baseline * 1.2) return { ...current, salary, start: new Date().toISOString(), end: new Date(new Date().getFullYear() + years, new Date().getMonth(), new Date().getDate()).toISOString(), negotiation: null, notice: `La dirigencia aceptó tu propuesta: ${money(salary)} semanales por ${years} años.` }; const tension = clamp(n.tension + (salary > baseline * 2 ? 30 : salary > baseline * 1.5 ? 20 : 8) + (n.round ? 8 : 0), 0, 100); const round = n.round + 1; if (tension >= 100) return { ...current, relationPenalty: (current.relationPenalty || 0) + 15, negotiation: null, relations: Object.fromEntries(Object.entries(current.relations).map(([key, value]) => [key, Math.max(0, value - 15)])), notice: "La tensión llegó al límite. La dirigencia dio por terminada la negociación y bajaron tus relaciones." }; const counterSalary = Math.round((salary * .72 + baseline * .28) / 50) * 50; return { ...current, negotiation: { ...n, offerSalary: salary, offerYears: years, clubOffer: { salary: counterSalary, years: clamp(years, 1, 5) }, tension, round }, notice: "La dirigencia respondió con una contraoferta." }; });
  }
  function acceptOffer(offer) { setContract(current => ({ ...current, salary: offer.salary, start: new Date().toISOString(), end: new Date(new Date().getFullYear() + offer.years, new Date().getMonth(), new Date().getDate()).toISOString(), negotiation: null, notice: `Acuerdo cerrado: ${money(offer.salary)} semanales por ${offer.years} años.` })); }
  function endNegotiation() { setContract(current => ({ ...current, negotiation: null, relationPenalty: (current.relationPenalty || 0) + 15, relations: Object.fromEntries(Object.entries(current.relations).map(([key, value]) => [key, Math.max(0, value - 15)])), notice: "Negociación terminada sin acuerdo. La relación con el club y el resto de tus vínculos bajó." })); }
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [leagueTeams, setLeagueTeams] = useState([]);
  const [internationalTeams, setInternationalTeams] = useState([]);
  const [homeRoster, setHomeRoster] = useState([]);
  const [awayRoster, setAwayRoster] = useState([]);
  const [leagueTeamsLoading, setLeagueTeamsLoading] = useState(false);
  const [leagueTeamsError, setLeagueTeamsError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(seasonStartFor(profile).getFullYear(), seasonStartFor(profile).getMonth(), 1));
  const [matches, setMatches] = useState([]);
  const seasonOffsetKey = `dreamchaser.season-offset.${profile?.createdAt || profile?.team?.id || profile?.name || "career"}`;
  const [seasonOffset, setSeasonOffset] = useState(() => { try { return Math.max(0, Number(localStorage.getItem(seasonOffsetKey)) || 0); } catch { return 0; } });
  const resultsKey = `dreamchaser.results.v3.${seasonStartFor(profile).getFullYear() + seasonOffset}.${profile?.createdAt || profile?.team?.id || profile?.name || "career"}`;
  const legacyResultsKey = `dreamchaser.results.v2.${profile?.createdAt || profile?.team?.id || profile?.name || "career"}`;
  const [savedResults, setSavedResults] = useState(() => { try { return JSON.parse(localStorage.getItem(resultsKey) || localStorage.getItem(legacyResultsKey) || "{}"); } catch { return {}; } });
  const [selectedCompetition, setSelectedCompetition] = useState("league");
  const [expandedCompetition, setExpandedCompetition] = useState(false);
  const [bracketRound, setBracketRound] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(seasonStartFor(profile)));
  const [matchMode, setMatchMode] = useState("preview");
  const [matchSpeed, setMatchSpeed] = useState(1);
  const [matchTempo, setMatchTempo] = useState("regulado");
  const [matchEvents, setMatchEvents] = useState([]);
  const [liveHomeXI, setLiveHomeXI] = useState(null);
  const [liveAwayXI, setLiveAwayXI] = useState(null);
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
  const [matchChallenge, setMatchChallenge] = useState(null);
  const energyKey = `dreamchaser.energy.${profile?.createdAt || profile?.name || "career"}`;
  const [energy, setEnergy] = useState(() => { try { return clamp(Number(localStorage.getItem(energyKey) || 100), 0, 100); } catch { return 100; } });
  const trainingUsedKey = `dreamchaser.training-used.${profile?.createdAt || profile?.name || "career"}`;
  const [trainingUsed, setTrainingUsed] = useState(() => { try { return localStorage.getItem(trainingUsedKey) === "true"; } catch { return false; } });
  const [trainingState, setTrainingState] = useState(null);
  const [trainingResult, setTrainingResult] = useState(null);
  const matchdayFeedRef = useRef(null);
  const followMatchEvents = useRef(true);
  const leagueName = profile?.league?.name || "Liga por definir";
  const clubName = profile?.team?.name || "Club por definir";
  const seasonStart = new Date(seasonStartFor(profile)); seasonStart.setFullYear(seasonStart.getFullYear() + seasonOffset);
  const seasonLabel = `${seasonStart.getFullYear()}/${String(seasonStart.getFullYear() + 1).slice(-2)}`;
  const leagueId = profile?.league?.id || profile?.league?.league_id;
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
  const firstSeasonMonth = new Date(seasonStart.getFullYear(), seasonStart.getMonth(), 1);
  const nextSeasonStart = new Date(seasonStart.getFullYear() + 1, seasonStart.getMonth(), 1);
  const lastSeasonMonth = new Date(nextSeasonStart.getFullYear(), nextSeasonStart.getMonth() - 1, 1);
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
    if (![match.homeTeam, match.awayTeam].some((team) => String(team.id) === String(profile?.team?.id))) return groups;
    const key = match.utcDate ? localDateKey(match.utcDate) : "";
    if (key) (groups[key] ||= []).push(match);
    return groups;
  }, {}), [matches, profile?.team?.id]);
  const selectedMatches = matchesByDate[selectedDate] || [];
  const leagueStandings = useMemo(() => {
    const table = new Map(leagueTeams.map((team) => [String(team.id), emptyStanding(team)]));
    matches.filter((match) => competitionTone(match) === "league").forEach((match) => applyFixtureResult(table, match));
    return [...table.values()].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor || a.team.name.localeCompare(b.team.name));
  }, [leagueTeams, matches]);
  const internationalStandings = useMemo(() => {
    const table = new Map(internationalTeams.map((team) => [String(team.id), emptyStanding(team)]));
    matches.filter((match) => match.id?.startsWith("international-group-")).forEach((match) => applyFixtureResult(table, match));
    return [...table.values()].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor || a.team.name.localeCompare(b.team.name));
  }, [internationalTeams, matches]);
  const playerPosition = leagueTeams.findIndex((team) => String(team.id) === String(profile?.team?.id));
  const competitionOptions = [{ id: "league", label: leagueName }, { id: "cup", label: /argentina/i.test(profile?.league?.country || "") ? "Copa nacional" : "Copa doméstica" }, ...(playerPosition >= 0 && playerPosition < 4 ? [{ id: "international", label: "Copa internacional" }] : [])];
  const cupBracket = useMemo(() => makeKnockoutBracket(leagueTeams, profile?.team, 16, `${profile?.team?.id}-domestic-cup-${seasonStart.getFullYear()}`), [leagueTeams, profile?.team?.id, seasonStart.getFullYear()]);
  const internationalPhaseComplete = matches.filter((match) => match.id?.startsWith("international-group-")).length === 144 && matches.filter((match) => match.id?.startsWith("international-group-")).every((match) => match.status === "FINISHED");
  const internationalBracket = useMemo(() => {
    if (!internationalPhaseComplete) return [];
    const qualified = internationalStandings.slice(0, 8).map((row) => row.team);
    if (!qualified.some((team) => String(team.id) === String(profile?.team?.id))) return [];
    const seeded = [qualified[0], qualified[7], qualified[3], qualified[4], qualified[1], qualified[6], qualified[2], qualified[5]];
    return makeKnockoutBracket(seeded, profile?.team, 8, `${profile?.team?.id}-international-${seasonStart.getFullYear()}`, true);
  }, [internationalPhaseComplete, internationalStandings, profile?.team?.id, seasonStart.getFullYear()]);
  const eliminated = (prefix) => {
    const played = matches.filter((match) => match.id?.startsWith(prefix) && savedResults[match.id]?.status === "FINISHED" && [match.homeTeam, match.awayTeam].some((team) => String(team.id) === String(profile?.team?.id)));
    const latest = played.at(-1); const result = latest && savedResults[latest.id];
    return Boolean(result && result.homeScore !== result.awayScore && (String(latest.homeTeam.id) === String(profile?.team?.id) ? result.homeScore < result.awayScore : result.awayScore < result.homeScore));
  };
  const nextMatch = matches.find((match) => match.status !== "FINISHED" && match.status !== "CANCELED" && (!match.id?.startsWith("cup-") || !eliminated("cup-")) && (!match.id?.startsWith("international-knockout-") || !eliminated("international-knockout-")) && [match.homeTeam, match.awayTeam].some((team) => String(team.id) === String(profile?.team?.id))) || null;
  const currentMatch = (matchMode === "finished" || matchMode === "summary") && matchResult?.matchId ? matches.find((match) => match.id === matchResult.matchId) || nextMatch : nextMatch;
  const selectedBracket = selectedCompetition === "international" ? internationalBracket : cupBracket;
  useEffect(() => { setBracketRound((round) => Math.min(round, Math.max(0, selectedBracket.length - 1))); }, [selectedCompetition, selectedBracket.length]);
  const playerCareerMatches = matches.filter((match) => savedResults[match.id]?.status === "FINISHED" && [match.homeTeam, match.awayTeam].some((team) => String(team.id) === String(profile?.team?.id)));
  const clubCareerStats = playerCareerMatches.reduce((total, match) => {
    const result = savedResults[match.id];
    total.matches += 1;
    total.goals += Number(result.playerGoals) || 0;
    total.assists += Number(result.playerAssists) || 0;
    return total;
  }, { matches: 0, goals: 0, assists: 0 });
  const transferValue = playerMarketValue(profile, profile?.stats, clubCareerStats);
  const transferTeams = useMemo(() => [...leagueTeams, ...internationalTeams].filter((team, index, all) => String(team.id) !== String(profile?.team?.id) && all.findIndex((item) => String(item.id) === String(team.id)) === index), [leagueTeams, internationalTeams, profile?.team?.id]);
  const transferMarket = useMemo(() => {
    const scored = transferTeams.map((team) => ({ team, interest: clubInterest(team, profile, transferValue) })).sort((a, b) => b.interest - a.interest);
    // The first market window favors modest clubs; the recruitment ceiling rises with the player's value.
    const maxRecruitmentElo = Math.min(2035, 1660 + Math.log1p(transferValue / 120000) * 55);
    const offerCandidates = scored.filter(({ team, interest }) => teamEloEstimate(team) <= maxRecruitmentElo && interest >= 48);
    const offers = offerCandidates.sort((a, b) => teamEloEstimate(b.team) - teamEloEstimate(a.team) || b.interest - a.interest).slice(0, 3).map(({ team, interest }) => {
      const elo = teamEloEstimate(team);
      const prestige = clamp(elo / 1800, .76, 1.12);
      const fee = Math.round(transferValue * (.88 + interest / 220) * prestige / 50000) * 50000;
      const weeklySalary = Math.round(clamp((Number(contract?.salary) || 2000) * (.72 + interest / 220) * prestige, 300, 300000) / 50) * 50;
      const years = interest > 82 ? 4 : interest > 70 ? 3 : 2;
      return { team, interest, fee, weeklySalary, years };
    });
    return { scored, offers, maxRecruitmentElo };
  }, [transferTeams, profile, transferValue, contract?.salary]);
  const filteredTransferTeams = transferMarket.scored.filter(({ team }) => `${team.name || ""} ${team.shortName || ""}`.toLocaleLowerCase("es").includes(transferSearch.trim().toLocaleLowerCase("es")));
  const objectiveSpec = objectivesFor(profile, profile?.team, leagueTeams.length, seasonStart.getFullYear(), playerPosition >= 0 && playerPosition < 4);
  const playerLeagueRow = leagueStandings.find((row) => String(row.team.id) === String(profile?.team?.id));
  const leagueFinished = Boolean(playerLeagueRow && playerLeagueRow.played >= Math.max(1, leagueTeams.length * 2 - 2));
  const leagueRank = playerLeagueRow ? leagueStandings.findIndex((row) => String(row.team.id) === String(profile?.team?.id)) + 1 : 0;
  const objectiveCompetitionPrefix = objectiveSpec.collective.kind === "international" ? "international-" : "cup-";
  const cupProgressMatches = matches.filter((match) => match.id?.startsWith(objectiveCompetitionPrefix) && [match.homeTeam, match.awayTeam].some((team) => String(team.id) === String(profile?.team?.id))).sort((a,b) => Number(a.id.split("-")[1]) - Number(b.id.split("-")[1]));
  const playedCupMatches = cupProgressMatches.filter((match) => savedResults[match.id]);
  const cupWins = playedCupMatches.filter((match) => { const result = savedResults[match.id]; return String(match.homeTeam.id) === String(profile?.team?.id) ? result.homeScore > result.awayScore : result.awayScore > result.homeScore; }).length;
  const lastCupMatch = playedCupMatches.at(-1);
  const lastCupResult = lastCupMatch && savedResults[lastCupMatch.id];
  const internationalRank = internationalStandings.findIndex((row) => String(row.team.id) === String(profile?.team?.id)) + 1;
  const cupEliminated = objectiveSpec.collective.kind === "international" ? internationalPhaseComplete && internationalRank > 8 || eliminated("international-knockout-") : Boolean(lastCupResult && lastCupResult.homeScore !== lastCupResult.awayScore && (String(lastCupMatch.homeTeam.id) === String(profile?.team?.id) ? lastCupResult.homeScore < lastCupResult.awayScore : lastCupResult.awayScore < lastCupResult.homeScore));
  const collectiveComplete = objectiveSpec.collective.kind === "league" ? leagueFinished && leagueRank > 0 && leagueRank <= objectiveSpec.collective.target : cupWins >= objectiveSpec.collective.target;
  const collectiveFailed = objectiveSpec.collective.kind === "league" ? leagueFinished && !collectiveComplete : cupEliminated && !collectiveComplete;
  const statisticalComplete = clubCareerStats.goals >= objectiveSpec.goals && clubCareerStats.assists >= objectiveSpec.assists;
  const personalComplete = Object.entries(objectiveSpec.stats).every(([key,target]) => Number(profile?.stats?.[key] || 0) >= target);
  const objectivesCompleted = [collectiveComplete, statisticalComplete, personalComplete].filter(Boolean).length;
  const managementRelation = clamp(55 + objectivesCompleted * 15 - (contract.relationPenalty || 0), 0, 100);
  const relationScale = (production, ratePerMatch, matches) => matches ? clamp(Math.round(35 + Math.min(1, production / Math.max(1, matches * ratePerMatch)) * 65), 35, 100) : 35;
  const supportersRelation = relationScale(clubCareerStats.goals, .4, clubCareerStats.matches);
  const teammatesRelation = relationScale(clubCareerStats.assists, .3, clubCareerStats.matches);
  const playerSkillAverage = PLAYER_CARD_STATS.reduce((sum, [key]) => sum + clamp(Number(profile?.stats?.[key]) || 0, 0, 100), 0) / PLAYER_CARD_STATS.length;
  const coachRelation = clamp(Math.round(35 + playerSkillAverage * .65), 35, 100);
  const relationCards = [
    { title: "HINCHADA", icon: "♡", value: supportersRelation, detail: `${clubCareerStats.goals} goles en ${clubCareerStats.matches} partidos`, need: clubCareerStats.matches ? `Para llegar al 100%: ${Math.max(0, Math.ceil(clubCareerStats.matches * .4) - clubCareerStats.goals)} goles más al ritmo actual de partidos.` : "Jugá partidos y convertí goles para ganarte a la hinchada.", mood: supportersRelation >= 85 ? "La hinchada te tiene como uno de sus favoritos." : supportersRelation >= 60 ? "La hinchada empieza a reconocer tu aporte." : "La hinchada espera más goles de tu parte." },
    { title: "COMPAÑEROS", icon: "⇢", value: teammatesRelation, detail: `${clubCareerStats.assists} asistencias en ${clubCareerStats.matches} partidos`, need: clubCareerStats.matches ? `Para llegar al 100%: ${Math.max(0, Math.ceil(clubCareerStats.matches * .3) - clubCareerStats.assists)} asistencias más al ritmo actual de partidos.` : "Jugá partidos y asistí a tus compañeros para fortalecer el vínculo.", mood: teammatesRelation >= 85 ? "El plantel confía mucho en vos y en tu juego colectivo." : teammatesRelation >= 60 ? "Tus compañeros valoran cuando los hacés jugar." : "El plantel espera más conexiones y asistencias." },
    { title: "ENTRENADOR", icon: "◎", value: coachRelation, detail: `Promedio de habilidades: ${Math.round(playerSkillAverage)}/100`, need: `Para llegar al 100%: subí ${Math.max(0, 100 - Math.round(playerSkillAverage))} puntos tu promedio de habilidades.`, mood: coachRelation >= 85 ? "El entrenador está muy conforme con tu nivel." : coachRelation >= 60 ? "El entrenador ve potencial y espera más crecimiento." : "El entrenador espera una mejora clara en tus habilidades." },
    { title: "DIRIGENCIA", icon: "▣", value: managementRelation, detail: `${objectivesCompleted}/3 objetivos cumplidos`, need: `Para llegar al 100%: cumplí los ${3 - objectivesCompleted} objetivos de temporada que quedan pendientes.`, mood: managementRelation >= 85 ? "La dirigencia está muy satisfecha con tu temporada." : managementRelation >= 60 ? "La dirigencia reconoce avances, pero espera más." : "La dirigencia necesita ver resultados en los objetivos." },
  ];
  const collectiveStatus = objectiveSpec.collective.kind === "league" ? (leagueFinished ? (collectiveComplete ? `Temporada finalizada · puesto ${leagueRank} de ${leagueTeams.length}` : `Temporada finalizada · puesto ${leagueRank} de ${leagueTeams.length}, fuera del objetivo`) : leagueRank ? `En curso · puesto ${leagueRank} de ${leagueTeams.length}` : "Esperando el inicio de la liga") : (collectiveComplete ? `Objetivo cumplido · ${objectiveSpec.collective.label.toLowerCase()}` : cupEliminated ? `Eliminado en ${lastCupMatch?.roundName?.toLowerCase() || "la copa"}` : `${cupWins}/${objectiveSpec.collective.target} victorias de fase · objetivo: ${objectiveSpec.collective.label.toLowerCase()}`);
  const clubStartYear = Number(String(profile?.createdAt || "").slice(0, 4)) || seasonStart.getFullYear();
  const clubYears = `${clubStartYear}–${new Date().getFullYear() > clubStartYear ? new Date().getFullYear() : "Actualidad"}`;
  async function deletePlayer() {
    setDeleteBusy(true); setDeleteError("");
    try {
      await onDeletePlayer();
      localStorage.removeItem(resultsKey);
      localStorage.removeItem(legacyResultsKey);
      localStorage.removeItem(contractKey);
      localStorage.removeItem(energyKey);
    } catch (error) {
      setDeleteError(error.message || "No pudimos borrar tu jugador. Intentá de nuevo.");
      setDeleteBusy(false);
    }
  }

  useEffect(() => {
    if (!leagueTeams.length || !profile?.team?.id) return;
    const playerIndex = leagueTeams.findIndex((team) => String(team.id) === String(profile.team.id));
    if (playerIndex < 0) { setMatches([]); return; }
    const start = new Date(seasonStartFor(profile)); start.setFullYear(start.getFullYear() + seasonOffset);
    let seed = [...`${profile.team.id}-${profile.createdAt || "career"}-${start.getFullYear()}`].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const entrants = [...leagueTeams].sort(() => random() - .5);
    if (entrants.length % 2) entrants.push(null);
    const rounds = [];
    for (let round = 0; round < entrants.length - 1; round += 1) {
      const fixtures = [];
      for (let pair = 0; pair < entrants.length / 2; pair += 1) {
        let home = entrants[pair]; let away = entrants[entrants.length - 1 - pair];
        if (!home || !away) continue;
        if ((round + pair) % 2) [home, away] = [away, home];
        fixtures.push({ homeTeam: home, awayTeam: away });
      }
      rounds.push(fixtures);
      entrants.splice(1, 0, entrants.pop());
    }
    const leagueFixtures = [...rounds, ...rounds.map((round) => round.map(({ homeTeam, awayTeam }) => ({ homeTeam: awayTeam, awayTeam: homeTeam })))].flatMap((round, roundIndex) => {
      const date = new Date(start);
      date.setDate(start.getDate() + roundIndex * 7);
      date.setHours(19 + Math.floor(random() * 3), random() < .5 ? 0 : 30, 0, 0);
      return round.map(({ homeTeam, awayTeam }, fixtureIndex) => ({ id: `career-${roundIndex}-${fixtureIndex}`, matchday: roundIndex + 1, utcDate: date.toISOString(), status: "SCHEDULED", competitionName: leagueName, homeTeam, awayTeam, homeScore: null, awayScore: null }));
    });
    const cupName = /argentina/i.test(profile.league?.country || "") ? "Copa nacional" : "Copa doméstica";
    const cupFixtures = fixturesFromBracket(cupBracket, profile.team, start, "cup", cupName, 50, 35, savedResults);
    const internationalFixtures = [
      ...championsLeagueFixtures(internationalTeams, profile.team, start, `${profile.team.id}-${profile.createdAt || "career"}-${start.getFullYear()}-champions`),
      ...fixturesFromBracket(internationalBracket, profile.team, start, "international-knockout", "Champions League", 245, 24, savedResults),
    ];
    const userLeagueDates = leagueFixtures.filter((match) => [match.homeTeam, match.awayTeam].some((team) => String(team.id) === String(profile.team.id))).map((match) => new Date(match.utcDate));
    const scheduledCups = [...cupFixtures, ...internationalFixtures].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)).map((match) => {
      const date = new Date(match.utcDate);
      for (let day = 0; day < 21 && userLeagueDates.some((leagueDate) => Math.abs(leagueDate - date) < 48 * 60 * 60 * 1000); day += 1) date.setDate(date.getDate() + 1);
      return { ...match, utcDate: date.toISOString() };
    });
    const userDates = [...userLeagueDates].sort((a, b) => a - b);
    scheduledCups.filter((match) => [match.homeTeam, match.awayTeam].some((team) => String(team.id) === String(profile.team.id))).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)).forEach((match) => {
      const date = new Date(match.utcDate);
      while (userDates.some((other) => Math.abs(other - date) < 48 * 60 * 60 * 1000)) date.setDate(date.getDate() + 1);
      match.utcDate = date.toISOString(); userDates.push(date); userDates.sort((a, b) => a - b);
    });
    const ordered = [...leagueFixtures, ...scheduledCups].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    setMatches(ordered.map((match) => savedResults[match.id] ? { ...match, ...savedResults[match.id], utcDate: match.utcDate, homeTeam: match.homeTeam, awayTeam: match.awayTeam } : match));
  }, [leagueTeams, internationalTeams, profile?.team?.id, profile?.createdAt, profile?.league?.country, leagueName, cupBracket, internationalBracket, savedResults, seasonOffset]);
  useEffect(() => {
    let active = true;
    fetch("/api/football/champions")
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudieron cargar los clubes de Champions League."); return data; })
      .then((data) => { if (active) setInternationalTeams(data.teams || []); })
      .catch(() => { if (active) setInternationalTeams([]); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const load = async (team, setter) => {
      if (!team?.id || !/^\d+$/.test(String(team.id))) { setter([]); return; }
      try {
        const response = await fetch(`/api/football/team?teamId=${team.id}`);
        const data = await response.json();
        setter(response.ok ? (data.players || []) : []);
      } catch { setter([]); }
    };
    load(nextMatch?.homeTeam, setHomeRoster);
    load(nextMatch?.awayTeam, setAwayRoster);
  }, [nextMatch?.homeTeam?.id, nextMatch?.awayTeam?.id]);
  function changeCalendarMonth(offset) {
    const requested = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
    const nextMonth = requested < firstSeasonMonth ? firstSeasonMonth : requested > lastSeasonMonth ? lastSeasonMonth : requested;
    setCalendarMonth(nextMonth);
    setSelectedDate(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`);
  }
  function beginNextSeason() {
    const nextOffset = seasonOffset + 1;
    try { localStorage.setItem(seasonOffsetKey, String(nextOffset)); } catch { /* La temporada sigue en memoria si el almacenamiento no está disponible. */ }
    setSavedResults({}); setMatchResult(null); setMatchMode("preview"); setSeasonOffset(nextOffset);
    const nextStart = new Date(seasonStart); nextStart.setFullYear(nextStart.getFullYear() + 1);
    setCalendarMonth(new Date(nextStart.getFullYear(), nextStart.getMonth(), 1));
    setSelectedDate(localDateKey(nextStart));
  }
  const isUserHome = String(currentMatch?.homeTeam?.id) === String(profile?.team?.id);
  const homeLineup = useMemo(() => makeLineup(currentMatch?.homeTeam?.name || clubName, profile, isUserHome, homeRoster), [currentMatch?.id, currentMatch?.homeTeam?.name, profile?.name, profile?.number, isUserHome, clubName, homeRoster]);
  const awayLineup = useMemo(() => makeLineup(currentMatch?.awayTeam?.name || "Rival", profile, !isUserHome, awayRoster), [currentMatch?.id, currentMatch?.awayTeam?.name, profile?.name, profile?.number, isUserHome, awayRoster]);
  const displayedHomeLineup = { ...homeLineup, players: liveHomeXI || homeLineup.players };
  const displayedAwayLineup = { ...awayLineup, players: liveAwayXI || awayLineup.players };
  const liveMatchStats = useMemo(() => getLiveMatchStats(matchResult, matchEvents, matchProgress, regulationMinute(matchMinute, firstHalfAdded)), [matchResult, matchEvents, matchProgress, matchMinute, firstHalfAdded]);
  const matchDrain = matchTempo === "regulado" ? 70 : matchTempo === "sacrificado" ? 160 : 100;
  const playerEnergy = matchMode === "simulation" ? clamp(energy - matchDrain * regulationMinute(matchMinute, firstHalfAdded) / 90, 0, 100) : energy;
  useEffect(() => {
    const feed = matchdayFeedRef.current;
    if (feed && followMatchEvents.current) feed.scrollTop = feed.scrollHeight;
  }, [matchProgress, matchMinute, activeMatchEvent, matchMode]);
  useEffect(() => { try { localStorage.setItem(energyKey, String(energy)); } catch { /* Storage can be unavailable in private browsing. */ } }, [energy, energyKey]);
  useEffect(() => { try { localStorage.setItem(trainingUsedKey, String(trainingUsed)); } catch {} }, [trainingUsed, trainingUsedKey]);
  useEffect(() => { try { localStorage.setItem(resultsKey, JSON.stringify(savedResults)); } catch { /* Storage can be unavailable in private browsing. */ } }, [resultsKey, savedResults]);
  useEffect(() => {
    const playedMatchId = matchResult?.matchId;
    const playedMatch = matches.find((match) => match.id === playedMatchId);
    if (matchMode !== "finished" || !playedMatch || !playedMatchId || savedResults[playedMatchId]) return;
    const result = { status: "FINISHED", homeScore: matchResult?.homeGoals || 0, awayScore: matchResult?.awayGoals || 0, playerGoals: matchResult?.userGoals || 0, playerAssists: matchResult?.userAssists || 0, scorers: (matchResult?.events || []).filter((event) => event.scoreDelta).map((event) => ({ minute: event.minute, team: event.team, names: event.involved })) };
    const updated = { ...savedResults, [playedMatchId]: result };
    const sameDay = matches.filter((match) => match.id !== playedMatchId && match.matchday === playedMatch.matchday && competitionTone(match) === competitionTone(playedMatch) && !updated[match.id]);
    sameDay.forEach((match) => { updated[match.id] = simulateOtherFixture(match); });
    setSavedResults(updated);
    setMatches((current) => current.map((match) => updated[match.id] ? { ...match, ...updated[match.id] } : match));
  }, [matchMode, matchResult, matches, savedResults]);
  useEffect(() => { if (screenPath === "/match-summary" && !matchResult) onNavigate("/career", { replace: true }); }, [screenPath, matchResult, onNavigate]);
  useEffect(() => {
    if (matchMode !== "summary") return undefined;
    setSummaryVisibleCount(1);
    const timer = setInterval(() => setSummaryVisibleCount((count) => Math.min(4, count + 1)), 1150);
    return () => clearInterval(timer);
  }, [matchMode, matchResult]);
  useEffect(() => {
    if (matchMode !== "simulation") return undefined;
    if (paused || halftime || matchChallenge) return undefined;
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
      setEnergy(100);
      setTrainingUsed(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      const nextMinute = matchMinute + 1;
      setMatchMinute(nextMinute);
      const energyAtNextMinute = clamp(energy - (matchDrain / 90) * regulationMinute(nextMinute, firstHalfAdded), 0, 100);
      if (energyAtNextMinute === 0) {
        const replaceUser = (lineup, roster) => {
          if (!lineup?.some((player) => player.isUser)) return lineup;
          const replacement = roster.find((player) => !lineup.some((starter) => starter.name === player.name));
          if (!replacement) return lineup.filter((player) => !player.isUser);
          return lineup.map((player) => player.isUser ? { ...player, name: replacement.name, isUser: false, number: replacement.shirtNumber || "–" } : player);
        };
        setLiveHomeXI((lineup) => replaceUser(lineup, homeRoster));
        setLiveAwayXI((lineup) => replaceUser(lineup, awayRoster));
      }
      const event = matchEvents[matchProgress];
      if (event?.tick === nextMinute) {
        setMatchProgress((current) => current + 1);
        if (event.type === "challenge") setMatchChallenge(event);
        else setActiveMatchEvent(event);
        if (event.scoreDelta) setLiveScore((score) => ({ ...score, [event.side]: score[event.side] + 1 }));
        if (event.type === "sub" && event.involved?.length === 2) {
          const [outgoing, incoming] = event.involved;
          const updateXI = (lineup) => lineup.map((player) => player.name === outgoing ? { ...player, name: incoming, isUser: false } : player);
          if (event.side === "home") setLiveHomeXI(updateXI);
          else setLiveAwayXI(updateXI);
        }
      }
    }, 1000 / matchSpeed);
    return () => clearTimeout(timer);
  }, [matchMode, matchMinute, matchEvents, matchProgress, activeMatchEvent, matchChallenge, matchSpeed, paused, halftime, halftimeDone, firstHalfAdded, secondHalfAdded, matchDrain, energy, homeRoster, awayRoster]);
  function startMatch() {
    const home = nextMatch?.homeTeam || profile?.team;
    const away = nextMatch?.awayTeam || { id: "opponent", name: "Rival", shortName: "Rival" };
    const runId = globalThis.crypto?.randomUUID?.() || String(Date.now());
    const seedText = `${profile?.createdAt || "career"}-${nextMatch?.id || "debut"}-${matchTempo}-${runId}`;
    const extraTimeRandom = seededRandom(`${seedText}-added-time`);
    const firstAdded = 1 + Math.floor(extraTimeRandom() * 4);
    const secondAdded = 2 + Math.floor(extraTimeRandom() * 4);
    const startingHome = homeLineup.players;
    const startingAway = awayLineup.players;
    const result = { ...simulateMatch({ home, away, userTeam: profile?.team, playerName: profile?.name || "Jugador", homeRoster, awayRoster, homeStarters: startingHome, awayStarters: startingAway, tempo: matchTempo, energy, stats: profile?.stats, seedText, firstHalfAdded: firstAdded, secondHalfAdded: secondAdded }), matchId: nextMatch?.id };
    followMatchEvents.current = true;
    setFirstHalfAdded(firstAdded); setSecondHalfAdded(secondAdded); setLiveScore({ home: 0, away: 0 }); setPaused(false); setHalftime(false); setHalftimeDone(false);
    setLiveHomeXI(startingHome); setLiveAwayXI(startingAway); setMatchResult(result); setMatchEvents(result.events); setMatchProgress(0); setMatchMinute(0); setActiveMatchEvent(null); setMatchChallenge(null); setMatchMode("simulation"); onNavigate("/match");
  }

  function resolveMatchChallenge(success, quality = 0) {
    const challenge = matchChallenge;
    if (!challenge) return;
    const names = { pace: "Ritmo", shooting: "Tiro", passing: "Pase", dribbling: "Regate", physical: "Físico", defense: "Defensa" };
    let outcome = success ? "Superaste el desafío." : "La jugada no salió.";
    let scoreDelta = 0;
    if (success && challenge.skill === "shooting" && Math.random() < .18) { scoreDelta = 1; outcome = "¡Gol! Definición precisa en una oportunidad difícil."; }
    else if (success && challenge.skill === "passing" && Math.random() < .22) { outcome = "Pase clave: tu compañero convierte la ocasión."; scoreDelta = 1; }
    setMatchResult((current) => current ? { ...current, homeGoals: current.homeGoals + (scoreDelta && challenge.side === "home" ? 1 : 0), awayGoals: current.awayGoals + (scoreDelta && challenge.side === "away" ? 1 : 0), userGoals: current.userGoals + (challenge.skill === "shooting" ? scoreDelta : 0), userAssists: current.userAssists + (challenge.skill === "passing" ? scoreDelta : 0), userShots: current.userShots + (challenge.skill === "shooting" ? 1 : 0), userRating: clamp(current.userRating + (success ? .18 + quality * .2 : -.04), 4.8, 10) } : current);
    setLiveScore((current) => ({ ...current, [challenge.side]: current[challenge.side] + scoreDelta }));
    setActiveMatchEvent({ ...challenge, type: scoreDelta ? "goal" : "shot", message: `${names[challenge.skill]}: ${outcome}`, minute: challenge.minute, tick: challenge.tick });
    setMatchChallenge(null);
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

  const renderCompetitionPanel = (expanded = false) => {
    const showLeague = selectedCompetition === "league";
    const showChampionsTable = selectedCompetition === "international" && !internationalPhaseComplete;
    const leagueRows = showLeague ? leagueStandings : internationalStandings;
    const rows = showLeague ? leagueTeams : internationalTeams;
    const competitionTitle = showLeague ? leagueName.toUpperCase() : showChampionsTable ? "CHAMPIONS LEAGUE" : "COPA DOMÉSTICA";
    const round = selectedBracket[bracketRound];
    return <article className={`career-table-panel competition-panel ${showLeague ? "career-table-feature" : `career-cup-bracket career-cup-bracket--${selectedCompetition}`} ${expanded ? "is-expanded" : ""}`}>
      <div className="competition-panel-toolbar"><div className="competition-picker-inline" role="group" aria-label="Elegir competición">{competitionOptions.map((competition) => <button key={competition.id} type="button" className={`competition-choice competition-choice--${competition.id} ${selectedCompetition === competition.id ? "is-selected" : ""}`} onClick={() => { setSelectedCompetition(competition.id); setBracketRound(0); }} aria-pressed={selectedCompetition === competition.id}>{competition.label}</button>)}</div>{expanded ? <button type="button" className="competition-expand" onClick={() => setExpandedCompetition(false)}>CERRAR <span>×</span></button> : <button type="button" className="competition-expand" onClick={() => setExpandedCompetition(true)}>AMPLIAR <span>⛶</span></button>}</div>
      <div className="panel-kicker"><span>02</span> {competitionTitle}{showLeague || showChampionsTable ? <b>CLASIFICACIÓN EN VIVO</b> : <b>{round?.label || (internationalPhaseComplete ? "NO CLASIFICADO" : "EN PREPARACIÓN")}</b>}</div>
      {(showLeague || showChampionsTable) && <><div className="competition-table-scroll"><div className="table-head career-zero-head"><span>#</span><span>CLUB</span><span>PJ</span><span>G</span><span>E</span><span>P</span><span>GF</span><span>GC</span><span>DG</span><span>PTS</span></div><div className="career-standings-list competition-standings">{showLeague && leagueTeamsLoading ? <div className="table-empty"><p>Cargando clubes…</p></div> : showLeague && leagueTeamsError ? <div className="table-empty"><p>{leagueTeamsError}</p></div> : leagueRows.length ? leagueRows.map((row, index) => <div className={String(row.team.id) === String(profile?.team?.id) ? "zero-standing-row is-player-team" : "zero-standing-row"} key={row.team.id || row.team.name}><span>{index + 1}</span><span className="standing-team">{row.team.crest && <img src={row.team.crest} alt="" />}<b>{row.team.shortName || row.team.name}</b></span>{[row.played,row.won,row.drawn,row.lost,row.goalsFor,row.goalsAgainst,row.goalsFor-row.goalsAgainst,row.points].map((value, column) => <span className="zero-stat" key={column}>{value}</span>)}</div>) : <div className="table-empty"><p>{rows.length ? "La tabla se actualizará al jugar los partidos." : "Cargando equipos de la competición…"}</p></div>}</div></div><div className="table-foot"><span>{rows.length} CLUBES</span><span>{showChampionsTable ? "36 CLUBES · 8 FECHAS · TOP 8 A OCTAVOS" : "SE ACTUALIZA AL FINALIZAR CADA PARTIDO"}</span></div></>}
      {!showLeague && !showChampionsTable && round && <><div className="bracket-phase-controls"><button type="button" aria-label="Fase anterior" disabled={bracketRound <= 0} onClick={() => setBracketRound((value) => Math.max(0, value - 1))}>←</button><b>{round.label} <small>FASE {bracketRound + 1} DE {selectedBracket.length}</small></b><button type="button" aria-label="Fase siguiente" disabled={bracketRound >= selectedBracket.length - 1} onClick={() => setBracketRound((value) => Math.min(selectedBracket.length - 1, value + 1))}>→</button></div><div className="cup-round-matches">{round.matches.map((match, matchIndex) => { const playerTie = [match.home, match.away].some((team) => String(team.id) === String(profile?.team?.id)); return <div className={`cup-tie ${playerTie ? "is-player-tie" : ""}`} key={`${bracketRound}-${matchIndex}`}><span className="cup-tie-team">{match.home.crest ? <img src={match.home.crest} alt="" /> : <i>{match.home.tla || "DC"}</i>}<b>{match.home.shortName || match.home.name}</b></span><span className="cup-tie-vs">VS</span><span className="cup-tie-team">{match.away.crest ? <img src={match.away.crest} alt="" /> : <i>{match.away.tla || "DC"}</i>}<b>{match.away.shortName || match.away.name}</b></span></div>; })}</div><div className="table-foot"><span>{selectedCompetition === "international" ? "TOP 8 DE LA FASE DE LIGA" : "SORTEO DE TEMPORADA"}</span><span>CRUCES DE {round.label}</span></div></>}
      {!showLeague && !showChampionsTable && !round && <div className="cup-bracket-empty">{selectedCompetition === "cup" ? "El cuadro estará disponible cuando se carguen los equipos." : internationalPhaseComplete ? "Tu equipo terminó fuera de los ocho puestos de clasificación directa." : "La fase eliminatoria empieza al terminar la fase de liga."}</div>}
    </article>;
  };

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
      <div className="career-dashboard career-dashboard-sketch">
        <div className="career-left-stack">
          <button type="button" className="career-match-panel" onClick={() => { setMatchMode("preview"); setSection("play"); onNavigate("/match"); }} aria-label="Ver próximo partido">
            <span className="panel-kicker"><span>01</span> PRÓXIMO PARTIDO <b className="match-status">{nextMatch?.competitionName || "DEBUT PENDIENTE"}</b></span><span className="match-card-inner"><span className="match-club"><span className="match-crest">{nextMatch?.homeTeam?.crest ? <img src={nextMatch.homeTeam.crest} alt="" /> : "DC"}</span><strong>{nextMatch?.homeTeam?.shortName || nextMatch?.homeTeam?.name || clubName}</strong><small>{String(nextMatch?.homeTeam?.id) === String(profile?.team?.id) ? "LOCAL" : "VISITANTE"}</small></span><span className="match-center"><span>{nextMatch?.competitionName || leagueName}</span><strong>VS</strong><small>{nextMatch ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(new Date(nextMatch.utcDate)) : "INICIO DE TEMPORADA"}</small></span><span className="match-club opponent"><span className="match-crest opponent-crest">{nextMatch?.awayTeam?.crest ? <img src={nextMatch.awayTeam.crest} alt="" /> : "?"}</span><strong>{nextMatch?.awayTeam?.shortName || nextMatch?.awayTeam?.name || "RIVAL"}</strong><small>{String(nextMatch?.awayTeam?.id) === String(profile?.team?.id) ? "LOCAL" : "VISITANTE"}</small></span></span>
          </button>
          <article className="career-empty-feature career-lower-empty" aria-label="Espacio reservado"><span>DC</span></article>
        </div>
        {renderCompetitionPanel()}
      </div>
      {expandedCompetition && <div className="competition-modal" role="dialog" aria-modal="true" aria-label={`Vista ampliada: ${selectedCompetition === "league" ? leagueName : selectedCompetition === "cup" ? "Copa doméstica" : "Champions League"}`}><button className="competition-modal-backdrop" aria-label="Cerrar vista ampliada" onClick={() => setExpandedCompetition(false)} />{renderCompetitionPanel(true)}</div>}
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO EN LA NUBE <i>●</i></span></footer>
    </section> : visibleSection === "play" ? <section className="career-home-content career-section-view">
      <div className="career-heading"><div><span className="career-eyebrow">MODO CARRERA · {clubName.toUpperCase()}</span><h1>DÍA DE PARTIDO</h1><p>{currentMatch?.competitionName || leagueName} · Temporada {seasonLabel}</p></div></div>
      <article className={`matchday-board ${matchMode === "summary" ? "is-summary-screen" : ""}`}>
        <header className="matchday-scoreboard">
          <div className="matchday-club matchday-club--home">{currentMatch?.homeTeam?.crest ? <img src={currentMatch.homeTeam.crest} alt="" /> : <span>{homeLineup.teamName.slice(0, 2).toUpperCase()}</span>}<b>{homeLineup.teamName}</b></div>
          <div className="matchday-score"><strong>{matchMode === "preview" ? "·" : liveScore.home}</strong><i>–</i><strong>{matchMode === "preview" ? "·" : liveScore.away}</strong><small className={matchMode === "simulation" ? "is-live-minute" : ""}>{matchMode === "preview" ? "PRÓXIMO PARTIDO" : matchMode === "finished" || matchMode === "summary" ? "FINAL" : matchClockLabel(matchMinute, firstHalfAdded)}</small></div>
          <div className="matchday-club matchday-club--away">{currentMatch?.awayTeam?.crest ? <img src={currentMatch.awayTeam.crest} alt="" /> : <span>{awayLineup.teamName.slice(0, 2).toUpperCase()}</span>}<b>{awayLineup.teamName}</b></div>
          <p>{currentMatch?.competitionName || leagueName} · {currentMatch ? new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(currentMatch.utcDate)) : "TEMPORADA"}</p>
        </header>
        <div className="matchday-controls">
          {matchMode === "preview" ? <><label>RITMO<select value={matchTempo} onChange={(event) => setMatchTempo(event.target.value)}><option value="regulado">Regulado</option><option value="competitivo">Normal</option><option value="sacrificado">Sacrificado</option></select></label><span className="tempo-note">{matchTempo === "regulado" ? "Menos acciones · podés terminar incluso después de entrenar" : matchTempo === "competitivo" ? "Más acciones · con menos de 100% salís antes del final" : "Muchas acciones · el DT te reemplazará antes del final"}</span><button className="simulate-match-button" onClick={startMatch}>SIMULAR PARTIDO <b>▶</b></button></> : <><span className="live-label">{matchMode === "finished" ? "PARTIDO FINALIZADO" : paused ? "SIMULACIÓN PAUSADA" : `EN JUEGO · ${matchTempo === "competitivo" ? "NORMAL" : matchTempo.toUpperCase()}`}</span><div className="speed-control"><span>VELOCIDAD</span>{[1, 2, 3].map((speed) => <button key={speed} className={matchSpeed === speed ? "is-selected" : ""} onClick={() => setMatchSpeed(speed)}>x{speed}</button>)}{matchMode === "simulation" && !halftime && <button className="match-pause-button" onClick={() => setPaused((value) => !value)}>{paused ? "▶ CONTINUAR" : "Ⅱ PAUSAR"}</button>}</div></>}
        </div>
        <div className="matchday-layout">
          {[displayedHomeLineup, displayedAwayLineup].map((lineup, teamIndex) => <aside className={`matchday-lineup ${teamIndex === 1 ? "matchday-lineup--away" : ""}`} key={lineup.teamName}><h3><span>{teamIndex === 0 ? "LOCAL" : "VISITANTE"}</span>{lineup.teamName}</h3>{FORMATIONS.map(([position]) => <section className="matchday-position" key={position}><b>{position === "ARQ" ? "ARQUEROS" : position === "DEF" ? "DEFENSORES" : position === "MED" ? "MEDIOCAMPISTAS" : "DELANTEROS"}</b>{lineup.players.filter((player) => player.position === position).map((player) => <div className={`matchday-player ${player.isUser ? "is-user-player" : ""}`} key={`${player.number}-${player.name}`}><span>{player.number}</span><strong>{player.name}</strong>{player.isUser && <em>TÚ</em>}</div>)}</section>)}</aside>)}
          <section className="matchday-pitch" aria-label="Relato de jugadas sobre la cancha"><div className="matchday-pitch-lines"><i className="pitch-box pitch-box--left"/><i className="pitch-box pitch-box--right"/><i className="pitch-midline"/></div><div className="matchday-feed" ref={matchdayFeedRef} onScroll={(event) => { const feed = event.currentTarget; followMatchEvents.current = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 60; }} aria-live="polite">{matchMode === "preview" ? <div className="feed-intro"><b>TODO LISTO PARA EL PARTIDO</b><span>Las jugadas aparecerán acá durante la simulación.</span></div> : <><div className="matchday-minute-marker">{matchMode === "finished" ? "FINAL DEL PARTIDO" : <>MINUTO <strong>{matchClockLabel(matchMinute, firstHalfAdded)}</strong> · {paused ? "PAUSADO" : matchMode === "simulation" ? "EN JUEGO" : "FINAL"}</>}</div>{matchEvents.slice(0, matchProgress).map((event, index) => <div className={`matchday-event matchday-event--${event.side} matchday-event--${event.type}`} key={`${event.minute}-${event.type}-${index}`}><b>{event.minute}</b><span><strong>{event.team}</strong>{event.message}</span></div>)}{matchMode === "simulation" && matchProgress === 0 && <div className="feed-intro">El árbitro está por dar inicio…</div>}</>}</div>{matchChallenge && <MatchChallenge challenge={matchChallenge} onResolve={resolveMatchChallenge}/>}          {activeMatchEvent && <div className="matchday-event-overlay" role="status" aria-live="assertive"><article key={`${activeMatchEvent.tick}-${activeMatchEvent.type}`} className={`matchday-event-banner matchday-event-banner--${activeMatchEvent.type} ${activeMatchEvent.side === "away" ? "is-away" : ""}`}><span className="event-banner-icon">{activeMatchEvent.type === "goal" ? "⚽" : activeMatchEvent.type === "card" ? "▰" : activeMatchEvent.type === "penalty" ? "◉" : activeMatchEvent.type === "sub" ? "↔" : activeMatchEvent.type === "shot" ? "➤" : "!"}</span><small>{activeMatchEvent.minute} · {activeMatchEvent.team}</small><b>{activeMatchEvent.type === "goal" ? "¡GOOOL!" : activeMatchEvent.type === "card" ? (activeMatchEvent.message.includes("roja") ? "TARJETA ROJA" : "TARJETA AMARILLA") : activeMatchEvent.type === "penalty" ? "PENAL" : activeMatchEvent.type === "sub" ? "SUSTITUCIÓN" : activeMatchEvent.type === "foul" ? "FALTA" : activeMatchEvent.type === "shot" ? "REMATE" : "¡OCASIÓN PELIGROSA!"}</b><p>{activeMatchEvent.message}</p></article></div>}</section>

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
    </section> : visibleSection === "training" ? <TrainingScreen profile={profile} energy={energy} trainingUsed={trainingUsed} onBack={() => setSection("home")} onStart={(skill) => setTrainingState({ skill, startedAt: Date.now() })} trainingState={trainingState} onComplete={async ({ skill, points, energyCost }) => { const before = Number(profile.stats?.[skill] || 0); const after = clamp(before + points, 0, 100); setEnergy((value) => clamp(value - energyCost, 0, 100)); setTrainingUsed(true); setTrainingState(null); setSection("training-result"); setTrainingResult({ skill, points, before, after }); if (points) await onUpdateProfile({ ...profile, stats: { ...profile.stats, [skill]: after } }); }} /> : section === "training-result" ? <TrainingResultScreen result={trainingResult} onBack={() => { setSection("training"); onNavigate("/career"); }} /> : visibleSection === "calendar" ? <section className="career-home-content career-section-view">
      <div className="calendar-layout">
        <div className="calendar-main">
          <header className="calendar-title"><div><span className="career-eyebrow">MODO CARRERA · {leagueName.toUpperCase()} · {seasonLabel}</span><h1>CALENDARIO <span>{profile?.league?.emblem ? <img src={profile.league.emblem} alt="" /> : "DC"}</span></h1></div><div className="calendar-controls">{leagueFinished && !nextMatch && <button type="button" className="next-season-button" onClick={beginNextSeason}>NUEVA TEMPORADA ↗</button>}<button aria-label="Mes anterior" disabled={monthStart <= firstSeasonMonth} onClick={() => changeCalendarMonth(-1)}>‹</button><button aria-label="Mes siguiente" disabled={monthStart >= lastSeasonMonth} onClick={() => changeCalendarMonth(1)}>›</button></div></header>
          <div className="calendar-grid" aria-label={`Calendario de ${monthLabel} de ${calendarMonth.getFullYear()}`}>
            {["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"].map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
            {calendarDays.map(({ date, inMonth, key }) => {
              const dayMatches = matchesByDate[key] || [];
              return <button type="button" key={key} className={`calendar-day ${inMonth ? "" : "is-outside"} ${key === selectedDate ? "is-selected" : ""} ${dayMatches.length ? "has-match" : ""} ${[...new Set(dayMatches.map(competitionTone))].map((tone) => `has-${tone}`).join(" ")}`} onClick={() => setSelectedDate(key)}>
                <span className="calendar-day-number">{date.getDate()}</span>
                {dayMatches.slice(0, 2).map((match) => <span className={`calendar-fixture calendar-fixture--${competitionTone(match)} calendar-fixture--${fixtureOutcome(match, profile?.team?.id)}`} key={match.id}><span className="fixture-crests">{match.homeTeam.crest ? <img src={match.homeTeam.crest} alt="" /> : <i>{match.homeTeam.tla || "L"}</i>}{match.awayTeam.crest ? <img src={match.awayTeam.crest} alt="" /> : <i>{match.awayTeam.tla || "V"}</i>}</span><span className="fixture-info"><b>{match.homeTeam.shortName} <em>{match.homeScore ?? "·"}–{match.awayScore ?? "·"} {match.awayTeam.shortName}</em></b><small>{match.competitionName || "LIGA"}</small></span></span>)}
              </button>;
            })}
          </div>
          <div className="calendar-feedback" role="status">{matches.length ? `${matches.filter((match) => localDateKey(match.utcDate).startsWith(`${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`)).length} PARTIDOS EN ${monthLabel.toUpperCase()}` : "CARGANDO CALENDARIO…"}</div>
          <div className="calendar-legend" aria-label="Colores por competición"><span className="legend-league">Liga</span><span className="legend-cup">Copa doméstica</span><span className="legend-international">Copa internacional</span></div>
        </div>
        <aside className="calendar-aside"><div className="calendar-date-block"><strong>{calendarMonth.getFullYear()}</strong><span>{monthLabel}</span></div><div className="calendar-aside-section"><b>PARTIDOS DEL DÍA</b><span>{new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long" }).format(new Date(`${selectedDate}T12:00:00`))}</span>
          {selectedMatches.map((match) => <article className={`calendar-match-card calendar-match-card--${competitionTone(match)} calendar-match-card--${fixtureOutcome(match, profile?.team?.id)}`} key={match.id}><div className="calendar-card-top"><span>{match.status === "FINISHED" ? (fixtureOutcome(match, profile?.team?.id) === "win" ? "VICTORIA" : fixtureOutcome(match, profile?.team?.id) === "loss" ? "DERROTA" : "EMPATE") : "PRÓXIMO PARTIDO"}</span><b>{match.competitionName || "LIGA"}</b></div><div className="calendar-card-date">{new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(match.utcDate))}<small>{formatMatchTime(match.utcDate)} · TEMPORADA {seasonLabel}</small></div><div className="calendar-card-teams"><div><span className="calendar-card-crest">{match.homeTeam.crest ? <img src={match.homeTeam.crest} alt="" /> : match.homeTeam.tla || "DC"}</span><b>{match.homeTeam.shortName || match.homeTeam.name}</b><small>{String(match.homeTeam.id) === String(profile?.team?.id) ? "TU EQUIPO · LOCAL" : "LOCAL"}</small></div><strong>{match.homeScore ?? "–"}<i>:</i>{match.awayScore ?? "–"}</strong><div><span className="calendar-card-crest">{match.awayTeam.crest ? <img src={match.awayTeam.crest} alt="" /> : match.awayTeam.tla || "DC"}</span><b>{match.awayTeam.shortName || match.awayTeam.name}</b><small>{String(match.awayTeam.id) === String(profile?.team?.id) ? "TU EQUIPO · VISITANTE" : "VISITANTE"}</small></div></div>{match.scorers?.length > 0 && <div className="calendar-card-scorers">{match.scorers.map((goal, index) => <span key={`${goal.minute}-${index}`}>⚽ {goal.minute}′ {goal.player || goal.names?.join(", ")} · {goal.team}</span>)}</div>}<div className="calendar-card-bottom"><span>ESTADIO</span><b>{match.homeTeam.name}</b><span>JORNADA {match.matchday || "DE TEMPORADA"}</span></div></article>)}
          {!selectedMatches.length && <p className="calendar-empty-prompt">Elegí un día con partido para ver el resumen.</p>}
        </div></aside>
      </div>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>DATOS DE FOOTBALL-DATA.ORG <i>●</i></span></footer>
    </section> : section === "player" ? <section className="career-home-content career-section-view">
      <div className="my-player-layout">
        <aside className="player-card my-player-card"><div className="card-top"><span>PLAYER CARD</span><span>DC · 01</span></div><div className="card-silhouette"><span className="silhouette-number">{profile?.number || "10"}</span><div className="player-orb">{profile?.image ? <img className="player-photo" src={profile.image} alt={`Foto de ${profile?.name || "tu jugador"}`} /> : "-"}</div></div><div className="card-emblems"><div className="card-emblem"><span className="emblem-label">SELECCIÓN</span>{profile?.nationalityFlag && /^https?:\/\//i.test(profile.nationalityFlag) ? <img className="national-flag" src={profile.nationalityFlag} alt="" /> : profile?.nationalityFlag ? <span className="national-flag-emoji">{profile.nationalityFlag}</span> : <span className="emblem-placeholder">—</span>}<span className="emblem-name">{profile?.nationality || "PAÍS"}</span></div><div className="emblem-divider"/><div className="card-emblem"><span className="emblem-label">CLUB</span>{profile?.team?.crest ? <img className="team-crest" src={profile.team.crest} alt="" /> : <span className="emblem-placeholder">DC</span>}<span className="emblem-name">{clubName}</span></div></div><div className="card-data"><strong>{profile?.name || "TU NOMBRE"}</strong><div className="card-stats" aria-label="Estadísticas del jugador">{PLAYER_CARD_STATS.map(([key, label]) => <div key={key}><span>{label}</span><b>{profile?.stats?.[key] ?? "—"}</b></div>)}</div></div><div className="card-bottom"><b>DC</b></div></aside>
        <div className="my-player-options"><div className="my-player-options-heading"><span>PERFIL DEL JUGADOR</span><small>SELECCIONÁ UN APARTADO <i>→</i></small></div>{[["player-stats","Carrera","Clubes, selección y títulos","↗"],["player-salary","Sueldo","Contrato y remuneración","$"],["player-transfers","Transferencias","Mercado e historial","⇄"],["player-relations","Relaciones","Vínculos dentro y fuera del club","♡"],["player-edit","Editar","Actualizá los datos de tu jugador","✎"]].map(([id,label,detail,icon],index)=><button className="my-player-option" key={id} onClick={()=>setSection(id)}><span className="my-player-option-index">0{index+1}</span><span className="my-player-option-icon">{icon}</span><span className="my-player-option-copy"><b>{label}</b><small>{detail}</small></span><span className="my-player-option-arrow">→</span></button>)}<button className="my-player-delete" onClick={() => { setDeleteError(""); setShowDeleteConfirmation(true); }}><span aria-hidden="true">×</span><span><b>Borrar jugador</b><small>Eliminá el perfil y su progreso guardado</small></span><i>→</i></button></div>
      </div>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO EN LA NUBE <i>●</i></span></footer>
    </section> : section === "player-relations" ? <section className="career-home-content career-section-view relations-page">
      <div className="career-heading"><div><span className="career-eyebrow">MI JUGADOR <i>·</i> {clubName.toUpperCase()}</span><h1>RELACIONES</h1><p>Cómo evoluciona el vínculo con quienes te rodean, según tu temporada.</p></div><button className="career-back-home" onClick={() => setSection("player")}>← Volver a Mi jugador</button></div>
      <div className="relations-context"><b>{clubCareerStats.matches} PARTIDOS JUGADOS</b><span>Las relaciones se ajustan según tus partidos y el rendimiento acumulado.</span></div>
      <div className="relations-grid">{relationCards.map((relation) => <article className="player-career-panel relation-card" key={relation.title}><div className="relation-card-heading"><span>{relation.icon}</span><div><b>{relation.title}</b><small>{relation.detail}</small></div><strong>{relation.value}%</strong></div><div className="relation-track"><i style={{width:`${relation.value}%`}} /></div><p>{relation.mood}</p><small className="relation-need">{relation.need}</small></article>)}</div>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>RELACIONES ACTUALIZADAS CON TU RENDIMIENTO <i>●</i></span></footer>
    </section> : section === "player-stats" ? <section className="career-home-content career-section-view">
      <div className="career-heading"><div><span className="career-eyebrow">MI JUGADOR <i>·</i> {clubName.toUpperCase()}</span><h1>CARRERA</h1><p>El recorrido, los números y los logros de {profile?.name || "tu jugador"}.</p></div><button className="career-back-home" onClick={() => setSection("player")}>← Volver a Mi jugador</button></div>
      <div className="player-career-content">
        <article className="player-career-panel"><div className="player-career-panel-title"><span>01</span><div><b>TRAYECTORIA EN CLUBES</b><small>LÍNEA DEL TIEMPO</small></div></div>{clubCareerStats.matches ? <div className="player-career-timeline"><span className="player-career-line"/><article className="player-career-club"><span className="player-career-marker">{profile?.team?.crest ? <img src={profile.team.crest} alt=""/> : "DC"}</span><div className="player-career-club-main"><div><small>{clubYears}</small><h2>{clubName}</h2></div><div className="player-career-numbers"><span><b>{clubCareerStats.matches}</b><small>PARTIDOS</small></span><span><b>{clubCareerStats.goals}/{clubCareerStats.assists}</b><small>G/A</small></span></div></div></article></div> : <p className="player-career-empty">Tu trayectoria en {clubName} aparecerá cuando juegues tus primeros partidos.</p>}</article>
        <article className="player-career-panel"><div className="player-career-panel-title"><span>02</span><div><b>CARRERA COMPLETA</b><small>TODOS LOS CLUBES</small></div></div><div className="player-career-total"><div><b>{clubCareerStats.matches}</b><small>PARTIDOS JUGADOS</small></div><div><b>{clubCareerStats.goals}<i>/</i>{clubCareerStats.assists}</b><small>GOLES / ASISTENCIAS</small></div></div></article>
        <article className="player-career-panel"><div className="player-career-panel-title"><span>03</span><div><b>SELECCIÓN</b><small>{profile?.nationality?.toUpperCase() || "PAÍS"}</small></div></div><p className="player-career-empty">Todavía no hay convocatorias registradas.</p></article>
        <article className="player-career-panel"><div className="player-career-panel-title"><span>04</span><div><b>TÍTULOS</b><small>LOGROS OBTENIDOS</small></div></div><p className="player-career-empty">Los títulos aparecerán cuando tu equipo los consiga.</p></article>
      </div>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO EN LA NUBE <i>●</i></span></footer>
    </section> : section === "player-salary" ? <section className="career-home-content career-section-view">
      <div className="career-heading"><div><span className="career-eyebrow">MI JUGADOR <i>·</i> {clubName.toUpperCase()}</span><h1>SUELDO Y CONTRATO</h1></div><button className="career-back-home" onClick={() => setSection("player")}>← Volver a Mi jugador</button></div>
      <div className="salary-layout"><article className="salary-contract-wrap"><div className="salary-contract-paper"><div className="salary-contract-top"><span>DREAMCHASER · CONTRATO OFICIAL</span><div className="salary-contract-crest">{profile?.team?.crest ? <img src={profile.team.crest} alt={`Escudo de ${clubName}`} /> : <b>{profile?.team?.tla || "DC"}</b>}</div></div><div className="salary-contract-club">{clubName.toUpperCase()}</div><div className="salary-contract-heading">CONTRATO<br/><b>PROFESIONAL</b></div><div className="salary-contract-player"><small>JUGADOR</small><b>{profile?.name || "TU JUGADOR"}</b></div><div className="salary-amount">{money(contract.salary)}<small>SUELDO SEMANAL</small></div><div className="salary-contract-dates"><span><small>FIRMA</small><b>{new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(contract.start))}</b></span><span><small>VENCE</small><b>{new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(contract.end))}</b></span></div><div className="salary-contract-sign"><span>FIRMA DEL JUGADOR</span><b>{profile?.name || "Jugador"}</b><i aria-hidden="true" /></div><div className="salary-contract-seal">DC</div></div></article>
        <article className="player-career-panel salary-objectives"><div className="player-career-panel-title"><span>◎</span><div><b>OBJETIVOS DE LA DIRIGENCIA</b><small>TEMPORADA {seasonLabel} · NIVEL {OBJECTIVE_TIER_LABELS[objectiveSpec.tier]} · ELO REF. {objectiveSpec.elo}</small></div><strong className="objectives-relation">RELACIÓN {managementRelation}%</strong></div><div className="objectives-grid">
          <section className={`objective-card ${collectiveComplete ? "is-complete" : collectiveFailed ? "is-failed" : ""}`}><div className="objective-card-top"><span>01 · COLECTIVO</span><b>{collectiveComplete ? "CUMPLIDO" : collectiveFailed ? "NO CUMPLIDO" : "EN CURSO"}</b></div><h3>{objectiveSpec.collective.label}</h3><p>{collectiveStatus}</p>{objectiveSpec.collective.kind === "league" && <div className="objective-progress-track"><i style={{ width: `${leagueRank ? clamp((objectiveSpec.collective.target + 1 - leagueRank) / objectiveSpec.collective.target * 100, 8, 100) : 0}%` }}/></div>}</section>
          <section className={`objective-card ${statisticalComplete ? "is-complete" : ""}`}><div className="objective-card-top"><span>02 · ESTADÍSTICO</span><b>{statisticalComplete ? "CUMPLIDO" : "EN CURSO"}</b></div><h3>Alcanzar {objectiveSpec.goals} goles y {objectiveSpec.assists} asistencias</h3><div className="objective-stat-row"><span>Goles <b>{clubCareerStats.goals}/{objectiveSpec.goals}</b></span><i><em style={{ width: `${clamp(clubCareerStats.goals / objectiveSpec.goals * 100,0,100)}%` }}/></i><span>Asistencias <b>{clubCareerStats.assists}/{objectiveSpec.assists}</b></span><i><em style={{ width: `${clamp(clubCareerStats.assists / objectiveSpec.assists * 100,0,100)}%` }}/></i></div></section>
          <section className={`objective-card objective-personal ${personalComplete ? "is-complete" : ""}`}><div className="objective-card-top"><span>03 · PERSONAL</span><b>{personalComplete ? "CUMPLIDO" : "EN CURSO"}</b></div><h3>Mejorar tus seis estadísticas</h3><div className="objective-attributes">{Object.entries(objectiveSpec.stats).map(([key,target]) => <span key={key}>{OBJECTIVE_STAT_LABELS[key]} <b>{profile?.stats?.[key] || 0}/{target}</b></span>)}</div></section>
        </div><div className="objectives-footnote">El nivel del club se estima con referencias Elo de fuerza deportiva. Los objetivos estadísticos escalan con la valoración inicial del jugador.</div></article>
        <article className="player-career-panel salary-negotiation"><div className="player-career-panel-title"><span>↔</span><div><b>{contract.negotiation ? "NEGOCIACIÓN EN CURSO" : "NEGOCIAR CON LA DIRIGENCIA"}</b><small>SUELDO Y DURACIÓN DEL CONTRATO</small></div></div>{contract.notice && <p className="salary-notice" role="status">{contract.notice}</p>}{!contract.negotiation ? <><p className="player-career-empty">Proponé tu sueldo semanal y los años de contrato. La dirigencia responderá con una contraoferta.</p><div className="salary-offer-fields"><label>Sueldo semanal (€)<input type="number" min="0" step="50" value={offerSalary} onChange={event => setOfferSalary(event.target.value)} placeholder={String(contract.salary)} /></label><label>Años de extensión<input type="number" min="1" max="5" value={offerYears} onChange={event => setOfferYears(event.target.value)} /></label></div><div className="salary-actions"><button type="button" onClick={() => startNegotiation("raise")}>Solicitar aumento</button><button type="button" onClick={() => startNegotiation("renewal")} disabled={new Date(contract.end) > new Date()}>Negociar renovación</button></div>{new Date(contract.end) > new Date() && <small className="salary-lock-note">La renovación estará disponible al terminar tu contrato.</small>}</> : <><div className="salary-tension"><span>TENSIÓN</span><b>{contract.negotiation.tension}%</b><i><span style={{ width: `${contract.negotiation.tension}%` }}/></i></div><div className="salary-offer-fields"><label>Tu nueva propuesta (€ / semana)<input type="number" min="0" step="50" value={offerSalary} onChange={event => setOfferSalary(event.target.value)} /></label><label>Años de extensión<input type="number" min="1" max="5" value={offerYears} onChange={event => setOfferYears(event.target.value)} /></label></div><button type="button" className="salary-submit" onClick={submitOffer}>Enviar propuesta a la dirigencia</button>{contract.negotiation.clubOffer && <div className="salary-counter"><b>CONTRAOFERTA DE LA DIRIGENCIA</b><span>{money(contract.negotiation.clubOffer.salary)} semanales · {contract.negotiation.clubOffer.years} años</span><button type="button" onClick={() => acceptOffer(contract.negotiation.clubOffer)}>Aceptar contraoferta</button></div>}<button type="button" className="salary-end-talks" onClick={endNegotiation}>Terminar negociación</button></>}</article>
      </div><footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO EN LA NUBE <i>●</i></span></footer>
    </section> : section === "player-transfers" ? <section className="career-home-content career-section-view transfer-page">
      <div className="career-heading transfer-heading"><div><span className="career-eyebrow">MI JUGADOR <i>·</i> MERCADO DE PASES</span><h1>TRANSFERENCIAS</h1><p>Tu rendimiento abre puertas. Seguí creciendo para despertar el interés de clubes más grandes.</p></div><button className="career-back-home" onClick={() => setSection("player")}>← Volver a Mi jugador</button></div>
      <div className="transfer-layout">
        <article className="player-career-panel transfer-value-panel"><div className="transfer-panel-label"><span>01</span> TU VALOR EN EL MERCADO</div><div className="transfer-value-top"><div><small>VALUACIÓN ESTIMADA</small><strong className="transfer-value">{money(transferValue)}</strong></div><span className="transfer-value-badge">{Math.round(playerRating(profile))}<small>MEDIA</small></span></div><div className="transfer-value-details"><span>Goles + asistencias <b>{clubCareerStats.goals + clubCareerStats.assists}</b></span><span>Partidos disputados <b>{clubCareerStats.matches}</b></span><span>Club actual <b>{clubName}</b></span></div><p className="transfer-method-note">La valuación considera habilidades, producción ofensiva, edad y contrato. El crecimiento dentro de la cancha amplía el mercado disponible.</p><div className="transfer-growth-hint"><span>↗</span><p>Mejor rendimiento<br/><b>mejores oportunidades</b></p></div></article>
        <article className="player-career-panel transfer-offers-panel"><div className="transfer-section-heading"><div><div className="transfer-panel-label"><span>02</span> PROPUESTAS RECIBIDAS</div><h2>Ofertas por tu pase</h2></div><span className="transfer-count">{transferMarket.offers.length}<small>/ 3</small></span></div>{transferMarket.offers.length ? <><p className="transfer-market-note">Los clubes que pueden competir por tu pase cambian a medida que crecen tu valor y rendimiento.</p><div className="transfer-offer-list">{transferMarket.offers.map(({ team, interest, fee, weeklySalary, years }, index) => <section className="transfer-offer-card" key={team.id}><div className="transfer-offer-club">{team.crest ? <img src={team.crest} alt=""/> : <span>{team.tla || "FC"}</span>}<div><small>PROPUESTA 0{index + 1}</small><b>{team.name}</b></div><i>OFERTA FORMAL</i></div><div className="transfer-offer-terms"><span>Precio del pase <b>{money(fee)}</b></span><span>Salario semanal <b>{money(weeklySalary)}</b></span><span>Contrato <b>{years} temporadas</b></span></div><div className="transfer-offer-interest"><span>Interés del club <b>{interest}%</b></span><i><em style={{ width: `${interest}%` }}/></i></div></section>)}</div></> : <div className="transfer-empty"><span>↗</span><b>Todavía no llegaron ofertas</b><p>Sumá minutos y buenas actuaciones para llamar la atención de otros clubes.</p></div>}</article>
        <article className="player-career-panel transfer-scouting-panel"><div className="transfer-section-heading"><div><div className="transfer-panel-label"><span>03</span> INFORMES DE SCOUTING</div><h2>¿Quién te está siguiendo?</h2></div><span className="transfer-live"><i/> EN VIVO</span></div><label className="transfer-search"><span>BUSCAR CLUB</span><div><span>⌕</span><input type="search" value={transferSearch} onChange={(event) => setTransferSearch(event.target.value)} placeholder="Buscar por nombre del equipo" /></div></label><div className="transfer-team-list">{filteredTransferTeams.slice(0, 8).map(({ team, interest }) => <div className="transfer-team-row" key={team.id}>{team.crest ? <img src={team.crest} alt=""/> : <span>{team.tla || "FC"}</span>}<b>{team.name}</b><div><i><em style={{ width: `${interest}%` }}/></i><strong>{interest}%</strong></div></div>)}{!filteredTransferTeams.length && <p className="player-career-empty">No encontramos ese equipo en las competiciones disponibles.</p>}</div><small className="transfer-availability-note">Equipos disponibles de tu liga y de la competición internacional.</small></article>
      </div><footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>MERCADO ACTUALIZADO CON TU RENDIMIENTO <i>●</i></span></footer>
    </section> : section.startsWith("player-") ? <section className="career-home-content career-section-view">
      <div className="career-heading"><div><span className="career-eyebrow">MI JUGADOR <i>·</i> {clubName.toUpperCase()}</span><h1>{PLACEHOLDERS[section]?.[0]}</h1><p>{PLACEHOLDERS[section]?.[1]}</p></div><button className="career-back-home" onClick={() => setSection("player")}>← Volver a Mi jugador</button></div>
      <article className="career-coming-card my-player-subsection"><span className="coming-mark">{section === "player-salary" ? "$" : "DC"}</span><div className="career-eyebrow">{profile?.name?.toUpperCase() || "TU JUGADOR"} · {clubName.toUpperCase()}</div><h2>{PLACEHOLDERS[section]?.[1]}</h2><p>Este apartado ya está listo para que pronto puedas gestionar esta parte de tu carrera.</p><button className="career-back-home" onClick={() => setSection("player")}>Volver a Mi jugador <b>→</b></button></article>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO EN LA NUBE <i>●</i></span></footer>
    </section> : <section className="career-home-content career-section-view">
      <div className="career-heading"><div><span className="career-eyebrow">MODO CARRERA <i>·</i> {clubName.toUpperCase()}</span><h1>{PLACEHOLDERS[section]?.[0] || "TU CARRERA"}</h1><p>{PLACEHOLDERS[section]?.[1]}</p></div></div>
      <article className="career-coming-card"><span className="coming-mark">DC</span><div className="career-eyebrow">PRÓXIMAMENTE EN DREAMCHASER</div><h2>{PLACEHOLDERS[section]?.[1]}</h2><button className="career-back-home" onClick={() => setSection("home")}>← Volver al inicio</button></article>
      <footer className="career-footer"><span>UNA CARRERA. INFINITAS HISTORIAS.</span><span>GUARDADO EN LA NUBE <i>●</i></span></footer>
    </section>}
    {showDeleteConfirmation && <div className="player-delete-overlay"><section className="player-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="player-delete-title" aria-describedby="player-delete-description"><span className="career-eyebrow">CONFIRMAR ACCIÓN</span><h2 id="player-delete-title">¿Borrar a {profile?.name || "tu jugador"}?</h2><p id="player-delete-description">Se eliminarán el perfil y el progreso guardado de esta carrera. Esta acción no se puede deshacer.</p>{deleteError && <p className="player-delete-error" role="alert">{deleteError}</p>}<div><button type="button" disabled={deleteBusy} onClick={() => setShowDeleteConfirmation(false)}>Cancelar</button><button type="button" className="player-delete-confirm" disabled={deleteBusy} onClick={deletePlayer}>{deleteBusy ? "Borrando…" : "Sí, borrar jugador"}</button></div></section></div>}
  </main>;
}
