import { supabase } from "./supabase.js";

const SESSION_KEY = "dreamchaser.session.v2";
const normalize = (value) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
const getToken = () => localStorage.getItem(SESSION_KEY);

function sessionFrom(data) {
  if (!data?.session_token || !data?.id) throw new Error("Supabase no devolvió una sesión válida.");
  localStorage.setItem(SESSION_KEY, data.session_token);
  return { id: data.id, token: data.session_token, firstName: data.first_name, lastName: data.last_name };
}

export async function getCareerSession() {
  const token = getToken();
  if (!token) return null;
  const { data, error } = await supabase.rpc("dreamchaser_resume_career", { p_session_token: token });
  if (error || !data?.id) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return { id: data.id, token, firstName: data.first_name, lastName: data.last_name };
}

export async function createCareer({ firstName, lastName, password }) {
  const { data, error } = await supabase.rpc("dreamchaser_create_career", {
    p_first_name: firstName.trim(),
    p_last_name: lastName.trim(),
    p_last_name_key: normalize(lastName),
    p_password: password,
  });
  if (error) {
    if (error.message?.includes("CAREER_EXISTS")) throw new Error("Ya existe una carrera con ese apellido. Iniciá sesión o elegí otro apellido.");
    throw error;
  }
  return sessionFrom(data);
}

export async function loginCareer({ lastName, password }) {
  const { data, error } = await supabase.rpc("dreamchaser_login_career", {
    p_last_name_key: normalize(lastName),
    p_password: password,
  });
  if (error) {
    if (error.message?.includes("INVALID_CREDENTIALS")) throw new Error("Apellido o contraseña incorrectos.");
    throw error;
  }
  return sessionFrom(data);
}

export async function logoutCareer() {
  const token = getToken();
  localStorage.removeItem(SESSION_KEY);
  if (token) {
    try { await supabase.rpc("dreamchaser_logout_career", { p_session_token: token }); }
    catch { /* La sesión local queda cerrada aunque no haya conexión. */ }
  }
}

export async function loadCareerProfile(token) {
  const { data, error } = await supabase.rpc("dreamchaser_load_player_profile", { p_session_token: token });
  if (error) throw error;
  if (!data) return null;
  try {
    const savedStats = JSON.parse(localStorage.getItem(`dreamchaser.training-stats.${data.createdAt || data.team?.id || data.name || "career"}`) || "{}");
    return { ...data, stats: Object.fromEntries(Object.entries({ ...data.stats, ...savedStats }).map(([key, value]) => [key, Math.max(Number(data.stats?.[key]) || 0, Number(value) || 0)])) };
  } catch { return data; }
}

export async function saveCareerProfile(token, profile) {
  try { localStorage.setItem(`dreamchaser.training-stats.${profile.createdAt || profile.team?.id || profile.name || "career"}`, JSON.stringify(profile.stats || {})); } catch { /* El perfil remoto sigue siendo la fuente principal. */ }
  const { error } = await supabase.rpc("dreamchaser_save_player_profile", {
    p_session_token: token,
    p_profile: profile,
  });
  if (error) throw error;
}

export async function deleteCareerProfile(token) {
  const { error } = await supabase.rpc("dreamchaser_delete_player_profile", {
    p_session_token: token,
  });
  if (error) throw error;
}
