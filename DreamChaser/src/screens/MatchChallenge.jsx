import { useEffect, useRef, useState } from "react";

const TITLES = { pace: "RITMO", shooting: "TIRO", passing: "PASE", dribbling: "REGATE", physical: "FÍSICO", defense: "DEFENSA" };
const DURATIONS = { pace: 4, dribbling: 8, physical: 7 };
const ATTEMPTS = { shooting: 1, passing: 1, defense: 2 };

export default function MatchChallenge({ challenge, onResolve }) {
  const { skill } = challenge;
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
  const resolved = useRef(false);
  const resolveRef = useRef(onResolve);
  resolveRef.current = onResolve;

  function finish() {
    if (resolved.current) return;
    resolved.current = true;
    const duration = DURATIONS[skill] || 1;
    const totalAttempts = ATTEMPTS[skill] || 1;
    const performance = skill === "pace" ? clicks / 12
      : skill === "shooting" || skill === "passing" || skill === "defense" ? hits / totalAttempts
        : skill === "dribbling" ? Math.min(seconds, duration) / duration
          : Math.min(sequence, seconds) / duration;
    const quality = Math.max(0, Math.min(1, performance));
    resolveRef.current(quality >= (skill === "pace" ? .35 : skill === "dribbling" ? .5 : .5), quality);
  }

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (DURATIONS[skill] && seconds >= DURATIONS[skill]) finish();
    if (ATTEMPTS[skill] && attempts >= ATTEMPTS[skill]) finish();
  }, [seconds, attempts, skill]);
  useEffect(() => {
    if (skill !== "pace") return undefined;
    const timer = window.setInterval(() => setPacePosition([12 + Math.random() * 76, 18 + Math.random() * 64]), 850);
    return () => window.clearInterval(timer);
  }, [skill]);
  useEffect(() => {
    if (skill !== "shooting") return undefined;
    const timer = window.setInterval(() => setPower((value) => (value >= 100 ? 0 : value + 3)), 32);
    return () => window.clearInterval(timer);
  }, [skill]);
  useEffect(() => {
    if (skill !== "passing") return undefined;
    const timer = window.setInterval(() => setTarget((value) => (value + 2.7) % 100), 35);
    return () => window.clearInterval(timer);
  }, [skill]);
  useEffect(() => {
    if (skill !== "defense") return undefined;
    const timer = window.setInterval(() => setLane((value) => (value + 1) % 3), 850);
    return () => window.clearInterval(timer);
  }, [skill]);
  useEffect(() => {
    const handle = (event) => {
      if (skill === "dribbling" || skill === "physical") {
        if (["ArrowLeft", "a", "A"].includes(event.key)) { event.preventDefault(); setBallX((x) => Math.max(5, x - 6)); }
        if (["ArrowRight", "d", "D"].includes(event.key)) { event.preventDefault(); setBallX((x) => Math.min(95, x + 6)); }
        if (skill === "physical" && ["ArrowUp", "w", "W"].includes(event.key)) { event.preventDefault(); setSequence((n) => n + 1); }
      }
      if (skill === "defense" && event.key === " ") { event.preventDefault(); defend(lane); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [skill, lane]);

  function shoot() {
    if (resolved.current) return;
    const goaliePick = Math.floor(Math.random() * 8);
    const accurate = Math.abs(power - 62) <= 22;
    const scored = accurate && target !== goaliePick;
    setKeeper(goaliePick); setAttempts((n) => n + 1); if (scored) setHits((n) => n + 1);
    setMessage(!accurate ? (power > 62 ? "Muy fuerte: la pelota se fue por arriba." : "Faltó potencia: no llegó al arco.") : target === goaliePick ? "¡El arquero adivinó tu objetivo!" : "¡Gol! Buena potencia y dirección.");
    setPower(0);
  }
  function pass() { if (resolved.current) return; setAttempts((n) => n + 1); if (target > 22 && target < 78) setHits((n) => n + 1); setTarget((n) => (n + 37) % 100); }
  function defend(choice) { if (resolved.current || attempts >= ATTEMPTS.defense) return; if (choice === lane) setHits((n) => n + 1); setAttempts((n) => n + 1); setMessage(choice === lane ? "¡Intercepción! Leíste la jugada." : "El atacante encontró espacio."); }

  const count = skill === "pace" ? clicks : ["shooting", "passing", "defense"].includes(skill) ? hits : skill === "dribbling" ? seconds : Math.min(sequence, seconds);
  const remaining = DURATIONS[skill] ? Math.max(0, DURATIONS[skill] - seconds) : Math.max(0, (ATTEMPTS[skill] || 1) - attempts);
  return <div className="match-challenge-shade"><section className="match-challenge-card"><span>OPORTUNIDAD DE PARTIDO · {challenge.minute}</span><h2>{TITLES[skill]}</h2>
    <div className="training-game match-training-game"><div className="training-hud"><span>TIEMPO <b>{remaining}{DURATIONS[skill] ? "s" : " intentos"}</b></span><span>RESULTADO <b>{count}</b></span></div>
      {skill === "pace" && <div className="training-click-game"><div><b>¡PIES RÁPIDOS!</b><small>Hacé todos los clics que puedas en 4 segundos</small></div><button style={{ left: `${pacePosition[0]}%`, top: `${pacePosition[1]}%` }} onClick={() => setClicks((n) => n + 1)}>TOCÁ<br/>¡YA!</button></div>}
      {skill === "shooting" && <div className="training-shoot-game"><div className="target-grid">{Array.from({ length: 8 }, (_, i) => <button key={i} className={target === i ? "is-selected" : ""} onClick={() => setTarget(i)}>{keeper === i && message ? (hits > 0 ? "✓" : "✕") : i + 1}</button>)}</div><div className="power-meter"><div><i style={{ height: `${power}%` }}/></div><span>POTENCIA</span><button onClick={shoot}>FRENAR Y DISPARAR</button></div>{message && <p className="training-feedback">{message}</p>}</div>}
      {skill === "passing" && <div className="passing-field"><div className="moving-target" style={{ left: `${target}%` }}/><button className="passing-kick" onClick={pass}>PASAR</button><small>Acertá el pase al objetivo en movimiento</small></div>}
      {skill === "dribbling" && <div className="dribble-field" onPointerMove={(e) => { if (e.buttons) setBallX(Math.max(5, Math.min(95, (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.clientWidth * 100))); }}><div className="dribble-path"/><span className="dribble-ball" style={{ left: `${ballX}%`, top: `${48 + Math.sin(seconds * .55) * 25}%` }}>⚽</span><small>Seguí el camino con ← → o A / D · arrastrá la pelota durante 8 segundos</small></div>}
      {skill === "physical" && <div className="physical-game"><div className="reaction-track"><span style={{ left: `${20 + (sequence * 31) % 65}%` }}>●</span></div><b>{sequence} TOQUES</b><button onClick={() => setSequence((n) => n + 1)}>↑ SALTAR</button><small>Mantenete en movimiento con A / D y completá los saltos durante 7 segundos.</small></div>}
      {skill === "defense" && <div className="defense-game"><b>¿POR DÓNDE ATACA?</b><div className="attack-lanes">{[0, 1, 2].map((n) => <button className={lane === n ? "lane-threat" : ""} key={n} onClick={() => defend(n)}>{lane === n ? "⚽" : "·"}<small>{["IZQUIERDA", "CENTRO", "DERECHA"][n]}</small></button>)}</div><small>Leé la jugada y tocá el carril con la pelota · 2 jugadas</small>{message && <p>{message}</p>}</div>}
    </div></section></div>;
}
