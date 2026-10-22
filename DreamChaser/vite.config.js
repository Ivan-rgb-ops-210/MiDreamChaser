import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const API_ROOT = "https://api.football-data.org/v4";
const projectRoot = dirname(fileURLToPath(import.meta.url));

function footballDataOrgApi(apiKey) {
  const cache = new Map();
  const middleware = async (req, res, _next, route = "competition") => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    if (!apiKey) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: "Falta FOOTBALL_DATA_ORG_API_KEY en DreamChaser/.env. Copiá DreamChaser/.env.example y agregá tu token de football-data.org." }));
      return;
    }

    const requestUrl = new URL(req.url, "http://localhost");
    const leagueId = requestUrl.searchParams.get("leagueId");
    const teamId = requestUrl.searchParams.get("teamId");
    const playerId = requestUrl.searchParams.get("playerId");
    const numericId = (value) => /^\d+$/.test(value || "");
    const competitionId = (value) => /^[A-Za-z0-9]{2,10}$/.test(value || "");
    if ((route === "team" && !numericId(teamId)) || (route === "player" && !numericId(playerId)) || (route === "competition" && !competitionId(leagueId))) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Falta un identificador válido para consultar los datos." }));
      return;
    }

    const id = route === "team" ? teamId : route === "player" ? playerId : leagueId;
    const cacheKey = ["leagues", "nationalities"].includes(route) ? route : `${route}:${id}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 60 * 60 * 1000) {
      res.end(JSON.stringify(cached.data));
      return;
    }

    try {
      const get = async (path) => {
        const response = await fetch(`${API_ROOT}${path}`, { headers: { "X-Auth-Token": apiKey } });
        const text = await response.text();
        let body;
        try { body = JSON.parse(text); } catch { body = {}; }
        if (!response.ok) {
          const error = new Error(body.message || (response.status === 401
            ? "football-data.org rechazó el token. Copiá el API token completo de tu cuenta en DreamChaser/.env."
            : `football-data.org respondió ${response.status}.`));
          error.status = response.status;
          error.endpoint = path;
          throw error;
        }
        return body;
      };

      if (route === "leagues") {
        const response = await get("/competitions");
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
        res.end(JSON.stringify(data));
        return;
      }

      if (route === "nationalities") {
        const response = await get("/competitions/WC/teams");
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
        res.end(JSON.stringify(data));
        return;
      }

      if (route === "team") {
        const team = await get(`/teams/${teamId}`);
        const players = (team.squad || []).map((player) => ({ ...player, player_id: player.id, player_name: player.name, position: player.position || "", nationality: player.nationality || "" }));
        const data = { team: { ...team, team_id: team.id, team_name: team.name, team_logo: team.crest }, players };
        cache.set(cacheKey, { data, cachedAt: Date.now() });
        res.end(JSON.stringify(data));
        return;
      }

      if (route === "player") {
        const player = await get(`/persons/${playerId}`);
        const data = { player, stats: [] };
        cache.set(cacheKey, { data, cachedAt: Date.now() });
        res.end(JSON.stringify(data));
        return;
      }

      let response;
      try { response = await get(`/competitions/${leagueId}/standings`); }
      catch (error) {
        if (error.status === 401 || error.status === 403) throw error;
      }
      const competition = response?.competition;
      const season = response?.season;
      let rows = (response?.standings || []).flatMap((standing) => standing.table || []);
      const hasStandings = rows.length > 0;
      if (!rows.length) {
        const teamResponse = await get(`/competitions/${leagueId}/teams`);
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
      res.end(JSON.stringify(data));
    } catch (error) {
      res.statusCode = error.status || 502;
      res.end(JSON.stringify({ error: error.message, endpoint: error.endpoint }));
    }
  };

  return {
    name: "football-data-org-api",
    configureServer(server) {
      server.middlewares.use("/api/football/leagues", (req, res, next) => middleware(req, res, next, "leagues"));
      server.middlewares.use("/api/football/nationalities", (req, res, next) => middleware(req, res, next, "nationalities"));
      server.middlewares.use("/api/football/team", (req, res, next) => middleware(req, res, next, "team"));
      server.middlewares.use("/api/football/player", (req, res, next) => middleware(req, res, next, "player"));
      server.middlewares.use("/api/football/competition", middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/football/leagues", (req, res, next) => middleware(req, res, next, "leagues"));
      server.middlewares.use("/api/football/nationalities", (req, res, next) => middleware(req, res, next, "nationalities"));
      server.middlewares.use("/api/football/team", (req, res, next) => middleware(req, res, next, "team"));
      server.middlewares.use("/api/football/player", (req, res, next) => middleware(req, res, next, "player"));
      server.middlewares.use("/api/football/competition", middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  // Compatibilidad con el nombre que usaba la configuración anterior.
  const apiKey = env.FOOTBALL_DATA_ORG_API_KEY || env.FOOTBALL_DATA_IO_API_KEY;
  return { plugins: [react(), footballDataOrgApi(apiKey)] };
});
