import { useEffect, useState } from "react";
import { Mark, Stadium } from "../components/Brand.jsx";

export default function PlayerSetupScreen({ onClose }) {
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
      </form><aside className="player-card"><div className="card-top"><span>PLAYER CARD</span><span>DC · 01</span></div><div className="card-silhouette"><span className="silhouette-number">{previewNumber || "10"}</span><div className="player-orb">✳</div></div><div className="card-emblems"><div className="card-emblem"><span className="emblem-label">SELECCIÓN</span>{nationalityFlagIsUrl ? <img className="national-flag" src={chosenNationality.flag} alt={`Bandera de ${selectedNationality}`} /> : chosenNationality?.flag ? <span className="national-flag-emoji">{chosenNationality.flag}</span> : <span className="emblem-placeholder">—</span>}<span className="emblem-name">{selectedNationality || "PAÍS"}</span></div><div className="emblem-divider"/><div className="card-emblem"><span className="emblem-label">CLUB</span>{chosenTeam?.crest ? <img className="team-crest" src={chosenTeam.crest} alt={`Escudo de ${chosenTeam.name}`} /> : <span className="emblem-placeholder">DC</span>}<span className="emblem-name">{chosenTeam?.name || "EQUIPO"}</span></div></div><div className="card-data"><strong>{previewName || "TU NOMBRE"}</strong></div><div className="card-bottom"><b>DC</b></div></aside></div>
    </>}
  </div>;
}

