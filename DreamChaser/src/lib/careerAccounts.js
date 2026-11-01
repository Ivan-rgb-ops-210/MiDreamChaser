const ACCOUNTS_KEY = "dreamchaser.careers.v1";
const SESSION_KEY = "dreamchaser.session.v1";
const normalize = (value) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
const readAccounts = () => JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
const encode = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return encode(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 120000, hash: "SHA-256" }, key, 256));
}
export function getCareerSession() {
  try {
    const id = sessionStorage.getItem(SESSION_KEY);
    const account = Object.values(readAccounts()).find((entry) => entry.id === id);
    return account ? { id, firstName: account.firstName, lastName: account.lastName } : null;
  } catch { return null; }
}
export async function createCareer({ firstName, lastName, password }) {
  const key = normalize(lastName);
  const accounts = readAccounts();
  if (accounts[key]) throw new Error("Ya existe una carrera con ese apellido. Iniciá sesión o elegí otro apellido.");
  const id = crypto.randomUUID();
  const salt = crypto.randomUUID();
  accounts[key] = { id, firstName: firstName.trim(), lastName: lastName.trim(), salt, passwordHash: await passwordHash(password, salt), profile: null };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  sessionStorage.setItem(SESSION_KEY, id);
  return { id, firstName: accounts[key].firstName, lastName: accounts[key].lastName };
}
export async function loginCareer({ lastName, password }) {
  const account = readAccounts()[normalize(lastName)];
  if (!account || await passwordHash(password, account.salt) !== account.passwordHash) throw new Error("Apellido o contraseña incorrectos.");
  sessionStorage.setItem(SESSION_KEY, account.id);
  return { id: account.id, firstName: account.firstName, lastName: account.lastName };
}
export function logoutCareer() { sessionStorage.removeItem(SESSION_KEY); }
export function loadCareerProfile(id) { return Object.values(readAccounts()).find((account) => account.id === id)?.profile || null; }
export function saveCareerProfile(id, profile) {
  const accounts = readAccounts();
  const entry = Object.values(accounts).find((account) => account.id === id);
  if (!entry) throw new Error("No encontramos esta carrera en este dispositivo.");
  entry.profile = profile;
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}
