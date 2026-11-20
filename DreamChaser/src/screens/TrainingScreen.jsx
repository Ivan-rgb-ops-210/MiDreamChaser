import { useEffect, useRef, useState } from "react";
import "../training.css";

const SKILLS = [
  ["pace", "RITMO", "⚡", "Aceleración y velocidad"], ["shooting", "TIRO", "◎", "Precisión y potencia"],
  ["passing", "PASE", "⌁", "Visión y precisión"], ["dribbling", "REGATE", "◉", "Control de pelota"],
  ["physical", "FÍSICO", "↗", "Resistencia y reacción"], ["defense", "DEFENSA", "◈", "Lectura e intercepción"],
];
const SKILL_KEY = Object.fromEntries(SKILLS.map(([key, label]) => [key, label]));
const scoreTier = (skill, score) => {
  if (skill === "pace") return score >= 38 ? 3 : score >= 27 ? 2 : score >= 16 ? 1 : 0;
  if (skill === "shooting") return score >= 3 ? 3 : score >= 2 ? 2 : score >= 1 ? 1 : 0;
  if (skill === "passing") return score >= 3 ? 3 : score >= 2 ? 2 : score >= 1 ? 1 : 0;
  if (skill === "dribbling" || skill === "physical") return score >= 18 ? 3 : score >= 12 ? 2 : score >= 7 ? 1 : 0;
  return score >= 3 ? 3 : score >= 2 ? 2 : score >= 1 ? 1 : 0;
};
const tierName = ["SIN PUNTOS", "SUFICIENTE", "BUENO", "SOBRESALIENTE"];

export default function TrainingScreen({ profile, energy, trainingUsed = false, onBack, onStart, trainingState, onComplete }) {
  const [skill, setSkill] = useState(trainingState?.skill || null);
  const [seconds, setSeconds] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [hits, setHits] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [power, setPower] = useState(0);
  const [target, setTarget] = useState(0);
  const [keeper, setKeeper] = useState(0);
  const [ballX, setBallX] = useState(50);
  const [lane, setLane] = useState(0);
  const [sequence, setSequence] = useState(0);
  const [message, setMessage] = useState("");
  const [pacePosition, setPacePosition] = useState([50, 50]);
  const [done, setDone] = useState(false);
  const started = useRef(false);
  const stat = Number(profile?.stats?.[skill] || 50);
  const difficulty = Math.max(0, stat - 50);
  useEffect(() => {
    if (!skill || done) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [skill, done]);
  useEffect(() => {
    if (!skill || done) return;
    if ((skill === "pace" && seconds >= 10) || (skill === "shooting" && attempts >= 3) || (skill === "passing" && attempts >= 3) || (skill === "dribbling" && seconds >= 25) || (skill === "physical" && seconds >= 20) || (skill === "defense" && attempts >= 5)) finish();
  }, [seconds, attempts, skill, done]);
  useEffect(() => {
    if (!skill || done || skill !== "pace") return undefined;
    const timer = window.setInterval(() => setPacePosition([12 + Math.random() * 76, 18 + Math.random() * 64]), Math.max(270, 1050 - difficulty * 11));
    return () => window.clearInterval(timer);
  }, [skill, done, difficulty]);
  useEffect(() => {
    if (!skill || done || skill !== "shooting") return undefined;
    const timer = window.setInterval(() => setPower((value) => (value >= 100 ? 0 : value + 3 + difficulty * .055)), 32);
    return () => window.clearInterval(timer);
  }, [skill, done, difficulty]);
  useEffect(() => {
    if (!skill || done || skill !== "passing") return undefined;
    const timer = window.setInterval(() => setTarget((value) => (value + 2.7 + difficulty * .035) % 100), 35);
    return () => window.clearInterval(timer);
  }, [skill, done, difficulty]);
  useEffect(() => {
    if (!skill || done || skill !== "defense") return undefined;
    const timer = window.setInterval(() => setLane((value) => (value + 1) % 3), Math.max(430, 1050 - difficulty * 8));
    return () => window.clearInterval(timer);
  }, [skill, done, difficulty]);
  useEffect(() => {
    if (!skill || done) return undefined;
    const handle = (event) => {
      if (skill === "dribbling" || skill === "physical") {
        if (["ArrowLeft", "a", "A"].includes(event.key)) { event.preventDefault(); setBallX((x) => Math.max(5, x - 6)); }
        if (["ArrowRight", "d", "D"].includes(event.key)) { event.preventDefault(); setBallX((x) => Math.min(95, x + 6)); }
        if (skill === "physical" && ["ArrowUp", "w", "W"].includes(event.key)) { event.preventDefault(); setSequence((n) => n + 1); setHits((n) => n + 1); }
      }
      if (skill === "defense" && event.key === " ") { event.preventDefault(); defend(lane); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [skill, done, lane]);
  function finish() {
    if (done || !skill) return;
    setDone(true);
    const achieved = scoreTier(skill, skill === "pace" ? clicks : skill === "shooting" || skill === "passing" ? hits : skill === "dribbling" ? seconds : skill === "physical" ? Math.min(sequence, seconds) : hits);
    window.setTimeout(() => onComplete({ skill, points: achieved, energyCost: 18 }), 900);
  }
  function selectSkill(key) { if (energy < 18 || trainingUsed) return; setSkill(key); setDone(false); onStart(key); }
  function shoot() {
    if (attempts >= 3) return;
    const goaliePick = Math.floor(Math.random() * 8);
    const accurate = Math.abs(power - 62) <= Math.max(9, 22 - difficulty * .22);
    const scored = accurate && target !== goaliePick;
    setKeeper(goaliePick); setAttempts((n) => n + 1); if (scored) setHits((n) => n + 1);
    setMessage(!accurate ? (power > 62 ? "Muy fuerte: la pelota se fue por arriba." : "Faltó potencia: no llegó al arco.") : target === goaliePick ? "¡El arquero adivinó tu objetivo!" : "¡Gol! Buena potencia y dirección.");
    setPower(0);
  }
  function pass() { if (attempts >= 3) return; setAttempts((n) => n + 1); if (target > 22 && target < 78) setHits((n) => n + 1); setTarget((n) => (n + 37) % 100); }
  function defend(choice) { if (attempts >= 5) return; const correct = choice === lane; if (correct) setHits((n) => n + 1); setAttempts((n) => n + 1); setMessage(correct ? "¡Intercepción! Leíste la jugada." : "El atacante encontró espacio."); }
  const count = skill === "pace" ? clicks : skill === "shooting" || skill === "passing" || skill === "defense" ? hits : skill === "dribbling" ? seconds : Math.min(sequence, seconds);
  if (!skill) return <section className="career-home-content career-section-view training-page">
    <div className="career-heading"><div><span className="career-eyebrow">MODO CARRERA · PREPARACIÓN</span><h1>ENTRENAMIENTO</h1><p>Una sesión antes del próximo partido. Elegí qué habilidad querés llevar al siguiente nivel.</p></div><button className="career-back-home" onClick={onBack}>← Volver</button></div>
    <div className="training-energy"><div><span>ENERGÍA DISPONIBLE</span><b>{energy}%</b></div><i><u style={{ width: `${energy}%` }}/></i><small>Cada sesión consume 18 puntos de energía · al terminar el partido, vuelve al 100%.</small></div>
    {trainingUsed && <p className="training-warning">Ya completaste tu sesión antes del próximo partido. Después del encuentro vas a poder entrenar otra vez.</p>}
    <div className="training-grid">{SKILLS.map(([key, label, icon, description]) => <button className="training-skill" key={key} onClick={() => selectSkill(key)} disabled={energy < 18 || trainingUsed}><span className="training-icon">{icon}</span><span><b>{label}</b><small>{description}</small></span><strong>{profile?.stats?.[key] ?? 50}<i>→</i></strong></button>)}</div>
    {energy < 18 && <p className="training-warning">Necesitás al menos 18% de energía para entrenar. Jugá un partido para recuperarla.</p>}
  </section>;
  return <section className="career-home-content career-section-view training-page"><div className="career-heading"><div><span className="career-eyebrow">SESIÓN DE ENTRENAMIENTO · {SKILL_KEY[skill]}</span><h1>{SKILL_KEY[skill]}</h1><p>Habilidad actual {stat} · {difficulty > 0 ? "La dificultad aumenta según tu nivel." : "Calentamiento inicial."}</p></div><button className="career-back-home" onClick={() => { setSkill(null); setDone(false); }}>← Salir de la sesión</button></div>
    <div className="training-game"><div className="training-hud"><span>TIEMPO <b>{skill === "pace" ? Math.max(0, 10-seconds) : skill === "dribbling" ? Math.max(0,25-seconds) : skill === "physical" ? Math.max(0,20-seconds) : Math.max(0, (skill === "defense" ? 5 : 3)-attempts)}{skill === "pace" || skill === "dribbling" || skill === "physical" ? "s" : " intentos"}</b></span><span>RESULTADO <b>{count}</b></span></div>
    {skill === "pace" && <div className="training-click-game"><div><b>¡PIES RÁPIDOS!</b><small>Hacé todos los clics que puedas en 10 segundos</small></div><button style={{ left:`${pacePosition[0]}%`, top:`${pacePosition[1]}%` }} onClick={() => setClicks((n) => n + 1)}>TOCÁ<br/>¡YA!</button></div>}
    {skill === "shooting" && <div className="training-shoot-game"><div className="target-grid">{Array.from({length:8},(_,i)=><button key={i} className={target===i?"is-selected":""} onClick={()=>setTarget(i)}>{keeper===i&&message?(hits>0&&attempts===hits?"✓":"✕"):i+1}</button>)}</div><div className="power-meter"><div><i style={{height:`${power}%`}}/></div><span>POTENCIA</span><button onClick={shoot}>FRENAR Y DISPARAR</button></div>{message&&<p className="training-feedback">{message}</p>}</div>}
    {skill === "passing" && <div className="passing-field"><div className="moving-target" style={{left:`${target}%`}}/><button className="passing-kick" onClick={pass}>PASAR</button><small>Hacé 3 pases y acertá al objetivo en movimiento</small></div>}
    {skill === "dribbling" && <div className="dribble-field" onPointerMove={(e)=>{if(e.buttons)setBallX(Math.max(5,Math.min(95,(e.clientX-e.currentTarget.getBoundingClientRect().left)/e.currentTarget.clientWidth*100)))}}><div className="dribble-path"/><span className="dribble-ball" style={{left:`${ballX}%`,top:`${48+Math.sin(seconds*.55)*25}%`}}>⚽</span><small>Seguí el camino con ← → o A / D · también podés arrastrar la pelota</small></div>}
    {skill === "physical" && <div className="physical-game"><div className="reaction-track"><span style={{left:`${20+(sequence*31)%65}%`}}>●</span></div><b>{sequence} TOQUES</b><button onClick={()=>{setSequence(n=>n+1);setHits(n=>n+1)}}>↑ SALTAR</button><small>Completá la secuencia de saltos y mantenete en movimiento con A / D durante 20 segundos.</small></div>}
    {skill === "defense" && <div className="defense-game"><b>¿POR DÓNDE ATACA?</b><div className="attack-lanes">{[0,1,2].map((n)=><button className={lane===n?"lane-threat":""} key={n} onClick={()=>defend(n)}>{lane===n?"⚽":"·"}<small>{["IZQUIERDA","CENTRO","DERECHA"][n]}</small></button>)}</div><small>Leé la jugada y tocá el carril con la pelota · 5 jugadas</small>{message&&<p>{message}</p>}</div>}
    <div className="training-resultline">{done ? "SESIÓN COMPLETADA" : skill === "shooting" || skill === "passing" || skill === "defense" ? `Aciertos: ${hits}` : `Nivel de habilidad: ${stat}`}</div></div></section>;
}

export function TrainingResultScreen({ result, onBack }) {
  const points = result?.points || 0;
  return <section className="career-home-content career-section-view training-page"><div className="career-heading"><div><span className="career-eyebrow">SESIÓN FINALIZADA</span><h1>{tierName[points]}</h1><p>{points ? `Sumaste +${points} puntos de ${SKILL_KEY[result.skill]}.` : "No alcanzaste el nivel suficiente esta vez. La próxima sesión será mejor."}</p></div></div><article className="training-result-card"><b>{SKILL_KEY[result?.skill]}</b><strong>{result?.before ?? "–"} → {result?.after ?? "–"}</strong><span>{points ? `+${points} · ${tierName[points]}` : "0 · SIN PUNTOS"}</span><button onClick={onBack}>VOLVER A ENTRENAMIENTO →</button></article></section>;
}
