import { Mark, Stadium } from "../components/Brand.jsx";

export default function HomeScreen({ onLogin, onSignup }) {
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
          <button className="nav-login" onClick={() => onLogin()}>
            Iniciar sesión
          </button>
          <button className="small-cta" onClick={() => onSignup()}>
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
          <div className="hero-title-row">
            <h1>
              Dream
              <br />
              <i>Chaser.</i>
            </h1>
            <div className="hero-logo-frame">
              <img src="/dreamchaser-logo.png" alt="" />
            </div>
          </div>
          <p className="intro">
            El fútbol no se mira desde la tribuna. Se vive desde adentro. Creá
            tu jugador, ganate un lugar y escribí una carrera que sea solo tuya.
          </p>
          <div className="hero-actions">
            <button className="cta" onClick={() => onSignup()}>
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
            </div>
          </article>
        </div>
      </section>
      <section className="bottom-cta">
        <span className="eyebrow">TU HISTORIA TODAVÍA NO ESTÁ ESCRITA</span>
        <h2>
          ¿Listo para <i>debutar?</i>
        </h2>
        <button className="cta" onClick={() => onSignup()}>
          Empezar mi carrera <b>↗</b>
        </button>
        <div className="cta-grass">DC</div>
      </section>
      <footer>
        <Mark />
        <span>UNA CARRERA. INFINITAS HISTORIAS.</span>
        <span>© DREAMCHASER 2026</span>
      </footer>

    </main>
  );
}

