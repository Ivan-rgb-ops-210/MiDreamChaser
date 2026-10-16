import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const API_ROOT = 'https://footballdata.io/api/v1';

function footballDataApi(apiKey) {
  const cache = new Map();

  const middleware = async (req, res, _next, route = 'competition') => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    if (!apiKey) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'Falta FOOTBALL_DATA_IO_API_KEY en el archivo .env.' }));
      return;
    }

    const requestUrl = new URL(req.url, 'http://localhost');
    const leagueId = requestUrl.searchParams.get('leagueId');
    const teamId = requestUrl.searchParams.get('teamId');
    const playerId = requestUrl.searchParams.get('playerId');
    const idIsValid = (value) => /^\d+$/.test(value || '');
    if (route === 'team' && !idIsValid(teamId) || route === 'player' && !idIsValid(playerId) || route === 'competition' && !idIsValid(leagueId)) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Falta un identificador válido para consultar los datos.' }));
      return;
    }

    const cacheId = route === 'team' ? teamId : route === 'player' ? playerId : leagueId;
    const cacheKey = route === 'leagues' ? 'leagues' : `${route}:${cacheId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 60 * 60 * 1000) {
      res.end(JSON.stringify(cached.data));
      return;
    }

    try {
      const get = async (path) => {
        const response = await fetch(`${API_ROOT}${path}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const bodyText = await response.text();
        let body;
        try {
          body = JSON.parse(bodyText);
        } catch {
          body = null;
        }
        if (!response.ok || body?.success === false) {
          const message = body?.message || body?.error?.message || (typeof body?.error === 'string' ? body.error : null);
          const error = new Error(message || `Footballdata.io respondió ${response.status}.`);
          error.status = response.status === 200 ? 502 : response.status;
          error.endpoint = path;
          throw error;
        }
        return body;
      };

      if (route === 'leagues') {
        const response = await get('/leagues?lang=es');
        const data = { leagues: Array.isArray(response.data) ? response.data : [], meta: response.meta || {} };
        cache.set(cacheKey, { data, cachedAt: Date.now() });
        res.end(JSON.stringify(data));
        return;
      }

      if (route === 'team') {
        const search = new URLSearchParams({ limit: '100' });
        if (leagueId) search.set('league_id', leagueId);
        const seasonId = requestUrl.searchParams.get('seasonId');
        if (seasonId && /^\d+$/.test(seasonId)) search.set('season_id', seasonId);
        const [teamResponse, playersResponse] = await Promise.all([
          get(`/teams/${teamId}`),
          get(`/teams/${teamId}/players?${search.toString()}`),
        ]);
        const team = teamResponse.data || {};
        const playersData = playersResponse.data;
        const playerRows = Array.isArray(playersData) ? playersData : Array.isArray(playersData?.players) ? playersData.players : [];
        const data = {
          team,
          players: playerRows.map((row, index) => {
            const player = row.player || row;
            return {
              ...player,
              player_id: player.player_id || player.id || `${teamId}-${index}`,
              player_name: player.player_name || player.name || player.full_name || 'Jugador',
              position: player.position || player.role || '',
              nationality: player.nationality || player.country || '',
              age: player.age,
              image: player.player_image || player.profile_image || player.photo || player.image || '',
            };
          }),
        };
        cache.set(cacheKey, { data, cachedAt: Date.now() });
        res.end(JSON.stringify(data));
        return;
      }

      if (route === 'player') {
        const statsQuery = new URLSearchParams();
        for (const key of ['leagueId', 'teamId', 'seasonId']) {
          const value = requestUrl.searchParams.get(key);
          if (value && /^\d+$/.test(value)) statsQuery.set(key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), value);
        }
        const profile = await get(`/players/${playerId}`);
        let stats = [];
        try {
          const statsResponse = await get(`/players/${playerId}/stats${statsQuery.size ? `?${statsQuery.toString()}` : ''}`);
          const statsData = statsResponse.data;
          stats = Array.isArray(statsData?.stats) ? statsData.stats : Array.isArray(statsData) ? statsData : [];
        } catch {
          // The profile remains useful when the account has no access to player statistics.
        }
        const data = { player: profile.data || {}, stats };
        cache.set(cacheKey, { data, cachedAt: Date.now() });
        res.end(JSON.stringify(data));
        return;
      }

      let response;
      let hasStandings = true;
      try {
        response = await get(`/leagues/${leagueId}/standings?lang=es`);
      } catch (error) {
        if (error.status === 401 || error.status === 403) throw error;
        hasStandings = false;
      }

      let payload = response?.data || {};
      let rows = Array.isArray(payload.standings) ? payload.standings : [];
      if (!rows.length) {
        hasStandings = false;
        const teamResponse = await get(`/leagues/${leagueId}/teams?limit=100&lang=es`);
        const teamData = teamResponse.data;
        rows = Array.isArray(teamData) ? teamData : Array.isArray(teamData?.teams) ? teamData.teams : [];
        if (!payload.league && rows.length) {
          const firstTeam = rows[0];
          payload = { ...payload, league: { league_id: Number(leagueId), name: firstTeam.league_name, country: firstTeam.country } };
        }
      }

      const teams = rows.map((row, index) => {
        const team = row.team || row;
        return {
          id: team.team_id || team.id || `${leagueId}-${index}`,
          name: team.team_name || team.name || team.full_name || 'Club',
          shortName: team.short_name || team.shortName || team.team_name || team.name,
          tla: team.tla || team.short_name,
          crest: team.team_logo || team.logo || team.crest || '',
          position: row.position,
          playedGames: row.played ?? row.played_games ?? row.playedGames,
          won: row.won,
          draw: row.drawn ?? row.draw,
          lost: row.lost,
          points: row.points,
          goalsFor: row.goals_for ?? row.goalsFor,
          goalsAgainst: row.goals_against ?? row.goalsAgainst,
          goalDifference: row.goal_difference ?? row.goalDifference,
        };
      });
      const result = {
        competition: payload.league || { league_id: Number(leagueId) },
        season: payload.season?.year || payload.season?.name || '',
        seasonId: payload.season?.season_id || '',
        teams,
        standings: hasStandings,
        meta: response?.meta || {},
      };
      cache.set(cacheKey, { data: result, cachedAt: Date.now() });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.statusCode = error.status || 502;
      res.end(JSON.stringify({ error: error.message, endpoint: error.endpoint }));
    }
  };

  return {
    name: 'footballdata-io-api',
    configureServer(server) {
      server.middlewares.use('/api/football/leagues', (req, res, next) => middleware(req, res, next, 'leagues'));
      server.middlewares.use('/api/football/team', (req, res, next) => middleware(req, res, next, 'team'));
      server.middlewares.use('/api/football/player', (req, res, next) => middleware(req, res, next, 'player'));
      server.middlewares.use('/api/football/competition', middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/football/leagues', (req, res, next) => middleware(req, res, next, 'leagues'));
      server.middlewares.use('/api/football/team', (req, res, next) => middleware(req, res, next, 'team'));
      server.middlewares.use('/api/football/player', (req, res, next) => middleware(req, res, next, 'player'));
      server.middlewares.use('/api/football/competition', middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [react(), footballDataApi(env.FOOTBALL_DATA_IO_API_KEY)] };
});
