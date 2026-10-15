import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const API_ROOT = 'https://api.football-data.org/v4';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function footballCompetitionApi(token) {
  const cache = new Map();
  let requestsRemaining = null;
  let quotaResetAt = 0;
  const middleware = async (_req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (!token) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'Falta el token de football-data.org.' }));
      return;
    }
    const url = new URL(_req.url, 'http://localhost');
    const code = (url.searchParams.get('code') || 'PL').toUpperCase();
    const freeCompetitions = new Set(['PPL', 'PL', 'DED', 'BL1', 'FL1', 'SA', 'PD', 'ELC', 'BSA']);
    if (!freeCompetitions.has(code)) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Competición no incluida en la lista de ligas gratuitas del prototipo.' }));
      return;
    }
    const cached = cache.get(code);
    if (cached && Date.now() - cached.cachedAt < 60 * 60 * 1000) {
      res.end(JSON.stringify(cached.data));
      return;
    }
    try {
      const get = async (path, retry = true, authenticated = true) => {
        if (requestsRemaining !== null && requestsRemaining <= 0) {
          await pause(Math.max(1000, quotaResetAt - Date.now() + 250));
        }
        const response = await fetch(`${API_ROOT}${path}`, {
          headers: authenticated ? { 'X-Auth-Token': token } : {},
        });
        const remaining = response.headers.get('X-Requests-Available-Minute');
        const reset = Number(response.headers.get('X-RequestCounter-Reset'));
        if (remaining !== null) requestsRemaining = Number(remaining);
        if (Number.isFinite(reset) && reset > 0) quotaResetAt = Date.now() + reset * 1000;
        if (response.status === 429 && retry) {
          await pause(Math.max(1000, quotaResetAt - Date.now() + 250));
          return get(path, false, authenticated);
        }
        if (!response.ok) {
          const error = new Error(`football-data.org respondió ${response.status}.`);
          error.status = response.status;
          error.endpoint = path;
          throw error;
        }
        return response.json();
      };
      const tableData = await get(`/competitions/${code}/standings`);
      const league = tableData.competition;
      const standings = tableData.standings?.find((item) => item.type === 'TOTAL') || tableData.standings?.[0];
      const teams = (standings?.table || []).map((row) => ({
        ...row.team,
        position: row.position,
        playedGames: row.playedGames,
        won: row.won,
        draw: row.draw,
        lost: row.lost,
        points: row.points,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
      }));
      const data = {
        competition: league,
        season: tableData.season?.startDate?.slice(0, 4),
        teams,
        standings: standings?.type || 'TOTAL',
        updatedAt: new Date().toISOString(),
      };
      cache.set(code, { data, cachedAt: Date.now() });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.statusCode = error.status || 502;
      res.end(JSON.stringify({ error: error.message, status: error.status, endpoint: error.endpoint, available: error.available }));
    }
  };
  return {
    name: 'football-data-api',
    configureServer(server) {
      server.middlewares.use('/api/football/competition', middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/football/competition', middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [react(), footballCompetitionApi(env.FOOTBALL_DATA_TOKEN)] };
});
