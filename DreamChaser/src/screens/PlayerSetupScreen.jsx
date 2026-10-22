import { useEffect, useState } from "react";
import { Mark, Stadium } from "../components/Brand.jsx";

const STAT_DEFINITIONS = [
  { key: "pace", label: "Ritmo", initial: 60 },
  { key: "shooting", label: "Tiro", initial: 60 },
  { key: "passing", label: "Pase", initial: 60 },
  { key: "dribbling", label: "Regate", initial: 60 },
  { key: "defense", label: "Defensa", initial: 30 },
  { key: "physical", label: "Físico", initial: 60 },
];
const BONUS_POINTS = 20;

export default function PlayerSetupScreen({ onClose, onComplete }) {
  const [leagueId, setLeagueId] = useState("");
  const [leagues, setLeagues] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [selectedNationality, setSelectedNationality] = useState("");
  const [teams, setTeams] = useState([]);
  const [previewName, setPreviewName] = useState("");
  const [previewNumber, setPreviewNumber] = useState("");
  const [step, setStep] = useState(1);
  const [playerImage, setPlayerImage] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [nationalityLoading, setNationalityLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(() => Object.fromEntries(STAT_DEFINITIONS.map(({ key, initial }) => [key, initial])));
  const spentPoints = STAT_DEFINITIONS.reduce((total, stat) => total + stats[stat.key] - stat.initial, 0);
  const remainingPoints = BONUS_POINTS - spentPoints;
  useEffect(() => {
    fetch("/api/football/leagues").then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No pudimos cargar las ligas.");
        return data;
      })
      .then((leagueData) => setLeagues((leagueData.leagues || []).filter((item) => /la\s*liga|primera division|premier league/i.test(item.league_name || item.name || "")).map((item) => ({ ...item, id: item.league_id || item.id, name: item.league_name || item.name }))))
      .catch((reason) => setError(reason.message));
    fetch("/api/football/nationalities").then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No pudimos cargar las selecciones del Mundial.");
        return data;
      })
      .then((nationalityData) => {
        setNationalities(nationalityData.nationalities || []);
        if (!(nationalityData.nationalities || []).length) setError("La API no devolvió selecciones participantes del Mundial.");
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setNationalityLoading(false));
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
    if (remainingPoints !== 0) return;
    const team = teams.find((item) => String(item.id) === selectedTeamId);
    const nationality = nationalities.find((item) => item.name === selectedNationality);
    const profile = {
      name: previewName,
      number: Number(previewNumber), nationality: selectedNationality,
      nationalityFlag: nationality?.flag || "",
      stats,
      image: playerImage,
      league: leagues.find((league) => String(league.id) === leagueId), team,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("dreamchaser.player", JSON.stringify(profile));
    onComplete();
  }
  function continueSetup(event) {
    event.preventDefault();
    if (event.currentTarget.form.reportValidity()) setStep(2);
  }
  function selectPlayerImage(event) {
    const file = event.target.files?.[0];
    setPhotoError("");
    if (!file) return;
    if (file.type !== "image/png") {
      setPhotoError("Elegí una imagen en formato PNG.");
      event.target.value = "";
      return;
    }
    if (file.size > 1024 * 1024) {
      setPhotoError("La imagen debe pesar menos de 1 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPlayerImage(String(reader.result || ""));
    reader.onerror = () => setPhotoError("No pudimos leer la imagen. Probá con otro archivo PNG.");
    reader.readAsDataURL(file);
  }
  const chosenTeam = teams.find((item) => String(item.id) === selectedTeamId);
  const chosenNationality = nationalities.find((item) => item.name === selectedNationality);
  const nationalityFlagIsUrl = /^https?:\/\//i.test(chosenNationality?.flag || "");
  return <main className="player-creation"><Stadium />
    <header className="creation-nav"><Mark /><button onClick={onClose} aria-label="Volver al inicio">×</button></header>
    <>
      <div className="creation-layout"><form className="creation-form" onSubmit={savePlayer}>
        <div className="setup-progress" aria-label={`Paso ${step} de 2`}><span className={step === 1 ? "is-active" : "is-complete"}>1</span><i /><span className={step === 2 ? "is-active" : ""}>2</span><small>{step === 1 ? "IDENTIDAD Y CLUB" : "FOTO Y ESTADÍSTICAS"}</small></div>
        {step === 1 && <>
        <div className="form-section-title"><span>01</span> IDENTIDAD DEL JUGADOR</div>
        <label>Nombre y apellido<input name="name" placeholder="Ej. Mateo González" autoComplete="name" required maxLength="40" value={previewName} onChange={(e) => setPreviewName(e.target.value)} /></label>
        <label>Dorsal<input name="number" type="number" min="1" max="99" placeholder="10" required value={previewNumber} onChange={(e) => setPreviewNumber(e.target.value)} /></label>
        <div className="form-section-title club-title"><span>02</span> TU PRIMER CLUB</div>
        <div className="setup-row"><label>Liga<select value={leagueId} onChange={(e) => { setLeagueId(e.target.value); setSelectedTeamId(""); }} required><option value="">Elegí una liga</option>{leagues.map((league) => <option key={league.id} value={league.id}>{league.name} · {league.country}</option>)}</select></label><label>Equipo<select name="teamId" value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} required disabled={!leagueId || loading || !teams.length}><option value="">{loading ? "Cargando…" : "Elegí tu equipo"}</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label></div>
        <label>Selección nacional<select name="nationality" required value={selectedNationality} onChange={(event) => setSelectedNationality(event.target.value)} disabled={nationalityLoading || !nationalities.length}><option value="">{nationalityLoading ? "Cargando selecciones del Mundial…" : "Elegí una selección"}</option>{nationalities.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}</select></label>
        {error && <div className="setup-error" role="alert">{error}</div>}
        <button className="cta form-cta" type="button" onClick={continueSetup}>Continuar <b>→</b></button>
        </>}
        {step === 2 && <>
        <div className="form-section-title photo-title"><span>03</span> TU FOTO DE JUGADOR</div>
        <label className="photo-upload">Imagen PNG (opcional)<input type="file" accept="image/png,.png" onChange={selectPlayerImage} /><small>PNG de hasta 1 MB. Se mostrará en tu Player Card.</small></label>
        <div className="form-section-title stats-title"><span>04</span> PERSONALIZÁ TUS ESTADÍSTICAS</div>
        <div className="stats-budget"><div><strong>Puntos iniciales disponibles</strong><small>Distribuí tus puntos entre las seis estadísticas como prefieras.</small></div><span className={remainingPoints === 0 ? "is-complete" : ""}>{remainingPoints}/{BONUS_POINTS} libres</span></div>
        <div className="stats-grid">{STAT_DEFINITIONS.map((stat) => <label className="stat-control" key={stat.key}>
          <span className="stat-heading">{stat.label}</span>
          <span className="stat-stepper">
            <button type="button" aria-label={`Restar un punto de ${stat.label}`} disabled={stats[stat.key] <= stat.initial} onClick={() => setStats((current) => ({ ...current, [stat.key]: current[stat.key] - 1 }))}>−</button>
            <b aria-live="polite">{stats[stat.key]}</b>
            <button type="button" aria-label={`Sumar un punto a ${stat.label}`} disabled={remainingPoints === 0 || stats[stat.key] >= 100} onClick={() => setStats((current) => ({ ...current, [stat.key]: current[stat.key] + 1 }))}>+</button>
          </span>
        </label>)}</div>
        {remainingPoints !== 0 && <p className="stats-hint" role="status">{remainingPoints > 0 ? `Te quedan ${remainingPoints} puntos por repartir.` : "Repartiste más puntos de los disponibles."}</p>}
        {photoError && <div className="setup-error" role="alert">{photoError}</div>}
        {error && <div className="setup-error" role="alert">{error}</div>}
        <div className="setup-actions"><button className="setup-back" type="button" onClick={() => setStep(1)}>← Volver</button><button className="cta form-cta" type="submit" disabled={loading || nationalityLoading || !teams.length || !nationalities.length || remainingPoints !== 0}>Empezar mi carrera <b>↗</b></button></div><div className="fineprint">UNA CARRERA. INFINITAS HISTORIAS.</div>
        </>}
      </form><aside className="player-card"><div className="card-top"><span>PLAYER CARD</span><span>DC · 01</span></div><div className="card-silhouette"><span className="silhouette-number">{previewNumber || "10"}</span><div className="player-orb">{playerImage ? <img className="player-photo" src={playerImage} alt={previewName ? `Foto de ${previewName}` : "Foto del jugador"} /> : "✳"}</div></div><div className="card-emblems"><div className="card-emblem"><span className="emblem-label">SELECCIÓN</span>{nationalityFlagIsUrl ? <img className="national-flag" src={chosenNationality.flag} alt={`Bandera de ${selectedNationality}`} /> : chosenNationality?.flag ? <span className="national-flag-emoji">{chosenNationality.flag}</span> : <span className="emblem-placeholder">—</span>}<span className="emblem-name">{selectedNationality || "PAÍS"}</span></div><div className="emblem-divider"/><div className="card-emblem"><span className="emblem-label">CLUB</span>{chosenTeam?.crest ? <img className="team-crest" src={chosenTeam.crest} alt={`Escudo de ${chosenTeam.name}`} /> : <span className="emblem-placeholder">DC</span>}<span className="emblem-name">{chosenTeam?.name || "EQUIPO"}</span></div></div><div className="card-data"><strong>{previewName || "TU NOMBRE"}</strong><div className="card-stats" aria-label="Estadísticas del jugador">{STAT_DEFINITIONS.map((stat) => <div key={stat.key}><span>{stat.label}</span><b>{stats[stat.key]}</b></div>)}</div></div><div className="card-bottom"><b>DC</b></div></aside></div>
    </>
  </main>;
}

