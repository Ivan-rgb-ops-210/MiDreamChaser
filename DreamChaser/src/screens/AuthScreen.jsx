export default function AuthScreen({ mode, onClose, onMode, onSubmit, busy, error, notice }) {
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
        <form onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSubmit({
            username: String(form.get("username") || "").trim(),
            email: String(form.get("email") || "").trim(),
            password: String(form.get("password") || ""),
          });
        }}>
          {signup && (
            <label>
              Nombre de usuario
              <input
                name="username"
                placeholder="El nombre en tu camiseta"
                autoComplete="nickname"
                required
                maxLength="40"
              />
            </label>
          )}
          <label>
            Email
            <input
              name="email"
              type="email"
              placeholder="jugador@ejemplo.com"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete={signup ? "new-password" : "current-password"}
              minLength="8"
              required
            />
          </label>
          {error && <div className="auth-message auth-error" role="alert">{error}</div>}
          {notice && <div className="auth-message" role="status">{notice}</div>}
          <button className="cta form-cta" type="submit" disabled={busy}>
            {busy ? "Conectando…" : signup ? "Crear mi carrera" : "Iniciar sesión"} <b>↗</b>
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

