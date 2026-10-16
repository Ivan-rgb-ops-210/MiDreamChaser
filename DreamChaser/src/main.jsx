import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function Mark() {
  return (
    <a className="brand" href="#home" aria-label="Dreamchaser inicio">
      <span className="brand-icon">
        D<span></span>
      </span>
      <span>
        DREAMCHASER<small>PLAYER CAREER SIMULATOR</small>
      </span>
    </a>
  );
}
function Stadium() {
  return (
    <div
      className="stadium"
      aria-label="Estadio de fútbol iluminado de noche"
      role="img"
    >
      <div className="stadium-lights lights-a" />
      <div className="stadium-lights lights-b" />
      <div className="stadium-roof" />
      <div className="stands">
        <div className="crowd" />
        <div className="crowd crowd-two" />
        <div className="adboard">
          DREAM BIG · PLAY YOUR STORY · DREAM BIG · PLAY YOUR STORY
        </div>
      </div>
      <div className="pitch">
        <div className="pitch-lines">
          <i />
          <b />
          <em />
        </div>
      </div>
      <div className="stadium-shade" />
    </div>
  );
}
function Auth({ mode, onClose, onMode }) {
  if (!mode) return null;
  const signup = mode === "signup";
  return (
    <div
      className="veil"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="auth"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button className="close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <div className="auth-kicker">
          <span /> TU CARRERA EMPIEZA HOY
        </div>
        <h2 id="auth-title">
          {signup ? "Creá tu" : "Volvé al"}
          <br />
          <i>{signup ? "futbolista." : "vestuario."}</i>
        </h2>
        <p>
          {signup
            ? "El primer paso hacia una carrera legendaria."
            : "Tu próxima convocatoria te espera."}
        </p>
        <form onSubmit={(e) => e.preventDefault()}>
          {signup && (
            <label>
              Nombre de usuario
              <input
                placeholder="El nombre en tu camiseta"
                autoComplete="nickname"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              placeholder="jugador@ejemplo.com"
              autoComplete="email"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete={signup ? "new-password" : "current-password"}
            />
          </label>
          <button className="cta form-cta" type="submit">
            {signup ? "Crear mi carrera" : "Iniciar sesión"} <b>↗</b>
          </button>
        </form>
        <div className="switch">
          {signup ? "¿Ya tenés una cuenta?" : "¿Todavía no tenés cuenta?"}{" "}
          <button onClick={() => onMode(signup ? "login" : "signup")}>
            {signup ? "Iniciá sesión" : "Registrate"}
          </button>
        </div>
        <div className="fineprint">
          SIMULACIÓN DE CARRERA · TU HISTORIA, TUS DECISIONES
        </div>
      </section>
    </div>
  );
}
function App() {
  const [auth, setAuth] = useState(null);
  return (
    <main id="home" className="site">
      <header className="nav">
        <Mark />
        <nav>
          <a href="#experiencia">La experiencia</a>
          <a href="#features">Tu carrera</a>
          <a href="#noticias">En el mundo</a>
        </nav>
        <div className="nav-cta">
          <button className="nav-login" onClick={() => setAuth("login")}>
            Iniciar sesión
          </button>
          <button className="small-cta" onClick={() => setAuth("signup")}>
            Crear jugador <b>↗</b>
          </button>
        </div>
      </header>
      <section className="hero">
        <Stadium />
        <div className="hero-content">
          <div className="overline">
            <span className="live-dot" /> TU CARRERA. TUS REGLAS.{" "}
            <span className="overline-line" />
          </div>
          <h1>
            Dream
            <br />
            <i>Chaser.</i>
          </h1>
          <p className="intro">
            El fútbol no se mira desde la tribuna. Se vive desde adentro. Creá
            tu jugador, ganate un lugar y escribí una carrera que sea solo tuya.
          </p>
          <div className="hero-actions">
            <button className="cta" onClick={() => setAuth("signup")}>
              Crear mi futbolista <b>↗</b>
            </button>
            <a href="#experiencia" className="watch">
              <span>▶</span> Conocé el modo carrera
            </a>
          </div>
          <div className="hero-stats">
            <div>
              <strong>01</strong>
              <span>CREÁ TU JUGADOR</span>
            </div>
            <i />
            <div>
              <strong>
                90<span>′</span>
              </strong>
              <span>CADA PARTIDO CUENTA</span>
            </div>
            <i />
            <div>
              <strong>∞</strong>
              <span>UNA CARRERA, MILES DE HISTORIAS</span>
            </div>
          </div>
        </div>
        <div className="hero-tag">
          <span>01 / 90</span>
          <span>EL SUEÑO EMPIEZA EN LA CANCHA</span>
        </div>
        <div className="vertical-label">
          DREAMCHASER — PLAYER CAREER SIMULATOR
        </div>
        <div className="match-float">
          <div className="mf-top">
            <span>DEBUT PROFESIONAL</span>
            <span className="mf-live">● EN VIVO</span>
          </div>
          <div className="scoreline">
            <div className="shield">DC</div>
            <strong>
              1 <small>—</small> 0
            </strong>
            <div className="shield away">FC</div>
          </div>
          <div className="mf-bottom">
            <span>MIN. 67</span>
            <span>Vas a entrar.</span>
            <b>↗</b>
          </div>
        </div>
      </section>
      <section className="intro-band" id="experiencia">
        <div className="band-label">
          [ EL JUEGO CAMBIA CUANDO SOS VOS EL PROTAGONISTA ]
        </div>
        <div className="band-main">
          <h2>
            No necesitás una consola.
            <br />
            <i>Solo ganas de jugar.</i>
          </h2>
          <p>
            Viví el modo carrera desde tu navegador. Empezá en un club, entrená,
            competí y tomá las decisiones que definen a un futbolista dentro y
            fuera de la cancha.
          </p>
        </div>
        <div className="band-mark">
          DC<span>®</span>
        </div>
      </section>
      <section className="career" id="features">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MÁS QUE NOVENTA MINUTOS</span>
            <h2>
              La carrera <i>es tuya.</i>
            </h2>
          </div>
          <span className="section-count">02 — 04</span>
        </div>
        <div className="feature-grid">
          <article className="feature feature-big">
            <div className="feature-icon">✳</div>
            <div className="feature-number">01 / EL JUGADOR</div>
            <h3>Primero, vos.</h3>
            <p>
              Elegí tu posición, nacionalidad y club. Definí tu estilo, entrená
              tus habilidades y ganate cada oportunidad.
            </p>
            <div className="player-attributes">
              <span>
                RITMO <b>82</b>
                <i>
                  <u style={{ width: "82%" }} />
                </i>
              </span>
              <span>
                TIRO <b>74</b>
                <i>
                  <u style={{ width: "74%" }} />
                </i>
              </span>
              <span>
                VISIÓN <b>88</b>
                <i>
                  <u style={{ width: "88%" }} />
                </i>
              </span>
            </div>
            <div className="feature-watermark">09</div>
          </article>
          <article className="feature feature-match">
            <div className="feature-icon">◉</div>
            <div className="feature-number">02 / DÍA DE PARTIDO</div>
            <h3>
              Que hablen
              <br />
              tus <i>botines.</i>
            </h3>
            <p>
              Simulá partidos, peleá por la titularidad y convertí cada
              calificación en el próximo capítulo.
            </p>
            <div className="rating">
              8.7<small>CALIFICACIÓN</small>
              <span>★ ★ ★ ★ ★</span>
            </div>
          </article>
          <article className="feature feature-world" id="noticias">
            <div className="feature-icon">↗</div>
            <div className="feature-number">03 / AFUERA DE LA CANCHA</div>
            <h3>
              El mundo
              <br />
              también <i>juega.</i>
            </h3>
            <p>
              Construí relaciones, negociá tu futuro y decidí cómo responder
              cuando todos miran.
            </p>
            <div className="news-chip">
              <span className="news-pulse" /> RUMOR DE MERCADO{" "}
              <b>“¿Nuevo destino?”</b>
              <small></small>
            </div>
          </article>
        </div>
      </section>
      <section className="bottom-cta">
        <span className="eyebrow">TU HISTORIA TODAVÍA NO ESTÁ ESCRITA</span>
        <h2>
          ¿Listo para <i>debutar?</i>
        </h2>
        <button className="cta" onClick={() => setAuth("signup")}>
          Empezar mi carrera <b>↗</b>
        </button>
        <div className="cta-grass">DC</div>
      </section>
      <footer>
        <Mark />
        <span>UNA CARRERA. INFINITAS HISTORIAS.</span>
        <span>© DREAMCHASER 2026</span>
      </footer>
      <Auth mode={auth} onClose={() => setAuth(null)} onMode={setAuth} />
    </main>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
