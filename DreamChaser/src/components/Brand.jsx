export function Mark() {
  return (
    <a className="brand" href="#home" aria-label="Dreamchaser inicio">
      <img className="brand-logo" src="/dreamchaser-logo.png" alt="" />
      <span>
        DREAMCHASER<small>PLAYER CAREER SIMULATOR</small>
      </span>
    </a>
  );
}
export function Stadium() {
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

