import { useEffect, useState } from "react";

const TITLES = { pace: "RITMO", shooting: "TIRO", passing: "PASE", dribbling: "REGATE", physical: "FÍSICO", defense: "DEFENSA" };
export default function MatchChallenge({ challenge, onResolve }) {
  const [power, setPower] = useState(0);
  const [direction, setDirection] = useState(0);
  const [receiver, setReceiver] = useState(20);
  const [lane, setLane] = useState(0);
  const [target, setTarget] = useState(50);
  const [clicks, setClicks] = useState(0);
  useEffect(() => {
    if (challenge.skill === "shooting") { const timer = setInterval(() => setPower((value) => value >= 100 ? 0 : value + 5), 30); return () => clearInterval(timer); }
    if (challenge.skill === "passing") { const timer = setInterval(() => setReceiver((value) => (value + 4) % 100), 30); return () => clearInterval(timer); }
    if (challenge.skill === "defense") { const timer = setInterval(() => setLane((value) => (value + 1) % 3), 520); return () => clearInterval(timer); }
    if (challenge.skill === "physical") { const timer = setInterval(() => setTarget((value) => 20 + ((value + 19) % 60)), 470); return () => clearInterval(timer); }
    return undefined;
  }, [challenge.skill]);
  useEffect(() => {
    if (challenge.skill !== "pace" && challenge.skill !== "dribbling") return undefined;
    const timer = setTimeout(() => onResolve(challenge.skill === "pace" ? clicks >= 5 : direction >= 2, challenge.skill === "pace" ? clicks / 10 : direction / 5), 3200);
    return () => clearTimeout(timer);
  }, [challenge.skill, clicks, direction, onResolve]);
  const title = TITLES[challenge.skill];
  function shoot() { const good = power >= 48 && power <= 68; const goal = good && Math.random() < .38; onResolve(goal, good ? .7 : .1); }
  function pass() { const good = receiver > 42 && receiver < 58; onResolve(good && Math.random() < .72, good ? .7 : .1); }
  return <div className="match-challenge-shade"><section className="match-challenge-card"><span>OPORTUNIDAD DE PARTIDO · {challenge.minute}</span><h2>{title}</h2>
    {challenge.skill === "pace" && <div className="match-challenge-action"><p>¡Acelerá! Tocá lo más rápido posible durante 3 segundos.</p><button onClick={() => setClicks((n) => n + 1)}>¡YA!<small>{clicks}</small></button></div>}
    {challenge.skill === "shooting" && <div className="match-challenge-action"><p>Un remate, potencia precisa.</p><div className="match-power"><i style={{ height: `${power}%` }}/></div><button onClick={shoot}>DISPARAR</button></div>}
    {challenge.skill === "passing" && <div className="match-challenge-action"><p>Soltá el pase cuando el compañero cruce la ventana.</p><div className="match-pass-track"><i style={{ left: `${receiver}%` }}/><b/></div><button onClick={pass}>PASAR</button></div>}
    {challenge.skill === "dribbling" && <div className="match-challenge-action"><p>Esquivá al marcador con cambios rápidos de dirección.</p><div className="match-dribble"><b style={{ left: `${50 + Math.sin(direction) * 23}%` }}>⚽</b></div><div className="match-challenge-pair"><button onClick={() => setDirection((n) => n + 1)}>← IZQUIERDA</button><button onClick={() => setDirection((n) => n + 1)}>DERECHA →</button></div></div>}
    {challenge.skill === "physical" && <div className="match-challenge-action"><p>¡Reaccioná! Tocá cuando el indicador esté en la zona verde.</p><div className="match-reaction-track"><i style={{ left: `${target}%` }}/><b/></div><button onClick={() => onResolve(target > 43 && target < 57, .6)}>SALTAR</button></div>}
    {challenge.skill === "defense" && <div className="match-challenge-action"><p>Leé al atacante y cerrá el carril.</p><div className="match-challenge-pair">{[0,1,2].map((item)=><button key={item} className={item===lane?"is-threat":""} onClick={()=>onResolve(item===lane,.6)}>{["IZQ.","CENTRO","DER."][item]}</button>)}</div></div>}
  </section></div>;
}
