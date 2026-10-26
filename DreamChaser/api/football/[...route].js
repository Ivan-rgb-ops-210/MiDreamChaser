const API_ROOT = "https://api.football-data.org/v4";
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

async function fetchFootballData(path, apiKey) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { "X-Auth-Token": apiKey },
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = {};
  }

  if (!response.ok) {
    const error = new Error(body.message || (response.status === 401
      ? "football-data.org rechazó el token. Revisá FOOTBALL_DATA_ORG_API_KEY en Vercel."
      : `football-data.org respondió ${response.status}.`));
    error.status = response.status;
    error.endpoint = path;
    throw error;
  }
  return body;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request) {
  if (request.method !== "GET") return json({ error: "Método no permitido." }, 405);

  const apiKey = process.env.FOOTBALL_DATA_ORG_API_KEY || process.env.FOOTBALL_DATA_IO_API_KEY;
  if (!apiKey) return json({ error: "Falta configurar FOOTBALL_DATA_ORG_API_KEY en las variables de entorno de Vercel." }, 503);

  const url = new URL(request.url);
  const route = url.pathname.split("/").filter(Boolean).at(-1);
  const leagueId = url.searchParams.get("leagueId");
  const teamId = url.searchParams.get("teamId");
  const playerId = url.searchParams.get("playerId");
  const numericId = (value) => /^\d+$/.test(value || "");
  const competitionId = (value) => /^[A-Za-z0-9]{2,10}$/.test(value || "");

  if (!["leagues", "nationalities", "team", "player", "competition", "matches"].includes(route)) {
    return json({ error: "Ruta no encontrada." }, 404);
  }
  if ((route === "team" && !numericId(teamId)) || (route === "player" && !numericId(playerId)) || (["competition", "matches"].includes(route) && !competitionId(leagueId))) {
    return json({ error: "Falta un identificador válido para consultar los datos." }, 400);
  }

  const id = route === "team" ? teamId : route === "player" ? playerId : leagueId;
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  if (route === "matches" && ((dateFrom && !validDate(dateFrom)) || (dateTo && !validDate(dateTo)))) {
    return json({ error: "El rango de fechas no es válido." }, 400);
  }
  const cacheKey = ["leagues", "nationalities"].includes(route) ? route : route === "matches" ? `matches:${id}:${dateFrom || ""}:${dateTo || ""}` : `${route}:${id}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return json(cached.data);

  try {
    if (route === "matches") {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const response = await fetchFootballData(`/competitions/${leagueId}/matches${params.size ? `?${params}` : ""}`, apiKey);
      const matches = (response.matches || []).map((match) => ({
        id: match.id,
        utcDate: match.utcDate,
        status: match.status,
        matchday: match.matchday,
        homeTeam: { id: match.homeTeam?.id, name: match.homeTeam?.name || "Local", shortName: match.homeTeam?.shortName || match.homeTeam?.tla || match.homeTeam?.name || "Local", tla: match.homeTeam?.tla || "", crest: match.homeTeam?.crest || "" },
        awayTeam: { id: match.awayTeam?.id, name: match.awayTeam?.name || "Visitante", shortName: match.awayTeam?.shortName || match.awayTeam?.tla || match.awayTeam?.name || "Visitante", tla: match.awayTeam?.tla || "", crest: match.awayTeam?.crest || "" },
        homeScore: match.score?.fullTime?.home,
        awayScore: match.score?.fullTime?.away,
        competition: response.competition?.name || "",
      }));
      const data = { competition: response.competition, season: response.filters?.season || response.resultSet?.first?.slice(0, 4) || "", matches };
      cache.set(cacheKey, { data, cachedAt: Date.now() });
      return json(data);
    }

    if (route === "leagues") {
      const response = await fetchFootballData("/competitions", apiKey);
      const leagues = (response.competitions || []).map((competition) => ({
        id: competition.code || competition.id,
        league_id: competition.code || competition.id,
        name: competition.name,
        league_name: competition.name,
        country: competition.area?.name || "",
        emblem: competition.emblem || "",
      }));
      const data = { leagues, meta: { count: leagues.length } };
      cache.set(cacheKey, { data, cachedAt: Date.now() });
      return json(data);
    }

    if (route === "nationalities") {
      const response = await fetchFootballData("/competitions/WC/teams", apiKey);
      const unique = new Map((response.teams || [])
        .filter((team) => team.name)
        .map((team) => [team.name.toLocaleLowerCase(), {
          name: team.name,
          code: team.tla || String(team.id),
          flag: team.area?.flag || team.crest || "",
        }]));
      const nationalities = [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
      const data = { nationalities, meta: { count: nationalities.length } };
      cache.set(cacheKey, { data, cachedAt: Date.now() });
      return json(data);
    }

    if (route === "team") {
      const team = await fetchFootballData(`/teams/${teamId}`, apiKey);
      const players = (team.squad || []).map((player) => ({
        ...player,
        player_id: player.id,
        player_name: player.name,
        position: player.position || "",
        nationality: player.nationality || "",
      }));
      const data = { team: { ...team, team_id: team.id, team_name: team.name, team_logo: team.crest }, players };
      cache.set(cacheKey, { data, cachedAt: Date.now() });
      return json(data);
    }

    if (route === "player") {
      const player = await fetchFootballData(`/persons/${playerId}`, apiKey);
      const data = { player, stats: [] };
      cache.set(cacheKey, { data, cachedAt: Date.now() });
      return json(data);
    }

    let response;
    try {
      response = await fetchFootballData(`/competitions/${leagueId}/standings`, apiKey);
    } catch (error) {
      if (error.status === 401 || error.status === 403) throw error;
    }
    const competition = response?.competition;
    const season = response?.season;
    let rows = (response?.standings || []).flatMap((standing) => standing.table || []);
    const hasStandings = rows.length > 0;
    if (!rows.length) {
      const teamResponse = await fetchFootballData(`/competitions/${leagueId}/teams`, apiKey);
      rows = teamResponse.teams || [];
    }
    const teams = rows.map((row, index) => {
      const team = row.team || row;
      return {
        id: team.id || `${leagueId}-${index}`,
        name: team.name || "Club",
        shortName: team.shortName || team.name,
        tla: team.tla || "",
        crest: team.crest || "",
        position: row.position,
        playedGames: row.playedGames,
        won: row.won,
        draw: row.draw,
        lost: row.lost,
        points: row.points,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
      };
    });
    const data = {
      competition: competition || { code: leagueId },
      season: season?.startDate?.slice(0, 4) || "",
      seasonId: season?.id || "",
      teams,
      standings: hasStandings,
    };
    cache.set(cacheKey, { data, cachedAt: Date.now() });
    return json(data);
  } catch (error) {
    return json({ error: error.message, endpoint: error.endpoint }, error.status || 502);
  }
  },
};
