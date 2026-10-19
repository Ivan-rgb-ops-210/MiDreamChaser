export default function AuthScreen({ mode, onClose, onMode, onCreated }) {
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
        <form onSubmit={(e) => { e.preventDefault(); if (signup) onCreated(); else onClose(); }}>
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

