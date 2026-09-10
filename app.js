import "./config.js";

const config = window.ANTONELLA_CONFIG || {};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const CATEGORIES = {
  mamadeira: {
    label: "Mamadeira",
    icon: "\ud83c\udf7c",
    subtitle: "Hor\u00e1rio, quantidade e tipo",
    fields: [
      ["amount", "Quantidade (ml)", "number", "Ex.: 120"],
      ["milkType", "Tipo", "text", "F\u00f3rmula, leite materno..."]
    ]
  },
  refeicao: {
    label: "Refei\u00e7\u00e3o",
    icon: "\ud83c\udf7d\ufe0f",
    subtitle: "O que foi oferecido e aceito",
    fields: [
      ["meal", "Refei\u00e7\u00e3o", "text", "Caf\u00e9, almo\u00e7o, lanche..."],
      ["foods", "Alimentos oferecidos", "text", "Ex.: banana, arroz, frango"]
    ]
  },
  rejeicao: {
    label: "Rejei\u00e7\u00e3o",
    icon: "\ud83e\udd55",
    subtitle: "Alimento ou item rejeitado",
    fields: [
      ["item", "O que foi rejeitado?", "text", "Ex.: cenoura"],
      ["reaction", "Como reagiu?", "text", "Ex.: recusou, cuspiu, chorou"]
    ]
  },
  consulta: {
    label: "Consulta",
    icon: "\ud83e\ude7a",
    subtitle: "Agenda e acompanhamento m\u00e9dico",
    fields: [
      ["professional", "Profissional", "text", "Pediatra, dentista..."],
      ["location", "Local", "text", "Cl\u00ednica ou endere\u00e7o"]
    ]
  },
  vacina: {
    label: "Vacina",
    icon: "\ud83d\udc89",
    subtitle: "Vacina, dose e observa\u00e7\u00f5es",
    fields: [
      ["vaccine", "Vacina", "text", "Nome da vacina"],
      ["dose", "Dose", "text", "Ex.: 1\u00aa dose"]
    ]
  },
  remedio: {
    label: "Rem\u00e9dio",
    icon: "\ud83d\udc8a",
    subtitle: "Medicamento, dose e hor\u00e1rio",
    fields: [
      ["medicine", "Medicamento", "text", "Nome do medicamento"],
      ["dosage", "Dose administrada", "text", "Ex.: 2,5 ml"]
    ]
  },
  banho: {
    label: "Banho",
    icon: "\ud83d\udec1",
    subtitle: "Hor\u00e1rio e observa\u00e7\u00f5es",
    fields: [
      ["bathType", "Tipo de banho", "text", "Ex.: banho completo"],
      ["temperature", "Temperatura (opcional)", "text", "Ex.: 37\u00b0C"]
    ]
  },
  observacao: {
    label: "Observa\u00e7\u00e3o",
    icon: "\u2728",
    subtitle: "Qualquer cuidado importante",
    fields: [
      ["subject", "Assunto", "text", "Ex.: soninho, passeio, humor"],
      ["detail", "Resumo", "text", "O que aconteceu?"]
    ]
  }
};

const ROLE_LABEL = {
  mae: "M\u00e3e",
  pai: "Pai",
  responsavel: "Respons\u00e1vel"
};

const state = {
  mode: "local",
  supabase: null,
  supabaseChannel: null,
  currentUser: null,
  family: null,
  members: [],
  entries: [],
  selectedEntryId: null,
  localStore: null,
  registrationInProgress: false,
  inactivityTimer: null,
  unsubscribers: []
};

const LOCAL_KEY = "antonella-family-demo-v2";

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function resetInactivityTimer() {
  clearTimeout(state.inactivityTimer);
  const minutes = Number(config.inactivityMinutes || 0);
  if (state.mode !== "online" || !minutes || minutes < 1) return;
  state.inactivityTimer = setTimeout(() => {
    showToast("Sessao encerrada por inatividade.");
    logout().catch(console.error);
  }, minutes * 60 * 1000);
}

function toLocalInputValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDateKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDayLabel(date = new Date()) {
  const text = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function uid(prefix = "id") {
  if (crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function generateFamilyCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function supabaseConfigured() {
  return Boolean(
    config?.supabaseUrl &&
    config?.supabasePublishableKey &&
    !String(config.supabaseUrl).includes("SEU-PROJETO") &&
    !String(config.supabasePublishableKey).includes("SUA-CHAVE")
  );
}

function avatarClass(role) {
  if (role === "mae") return "mother";
  if (role === "pai") return "father";
  return "father";
}

function applyAvatar(el, user) {
  el.classList.remove("mother", "father", "custom");
  if (user?.photo) {
    el.classList.add("custom");
    el.style.backgroundImage = `url(${JSON.stringify(user.photo).slice(1, -1)})`;
  } else {
    el.style.backgroundImage = "";
    el.classList.add(avatarClass(user?.role));
  }
}

function imageSrc(photo, fallback) {
  return photo || fallback;
}

async function resizeImage(file, maxSize = 640, quality = 0.78) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function createDemoStore() {
  const today = new Date();
  const at = (h, m) => {
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  return {
    family: {
      id: "demo-family",
      babyName: "Maria Antonella",
      babyPhoto: "assets/anime-baby.jpg",
      birthDate: "",
      code: "ANTONELLA"
    },
    members: [
      { id: "demo-mae", displayName: "M\u00e3e", role: "mae", photo: "", familyId: "demo-family" },
      { id: "demo-pai", displayName: "Pai", role: "pai", photo: "", familyId: "demo-family" }
    ],
    entries: [
      {
        id: uid("demo"),
        category: "mamadeira",
        when: at(8, 10),
        fields: { amount: "120", milkType: "Leite" },
        notes: "Tomou bem.",
        authorId: "demo-mae",
        authorName: "M\u00e3e",
        authorRole: "mae"
      },
      {
        id: uid("demo"),
        category: "banho",
        when: at(9, 35),
        fields: { bathType: "Banho completo", temperature: "37\u00b0C" },
        notes: "",
        authorId: "demo-pai",
        authorName: "Pai",
        authorRole: "pai"
      },
      {
        id: uid("demo"),
        category: "refeicao",
        when: at(11, 50),
        fields: { meal: "Almo\u00e7o", foods: "Arroz, frango e banana" },
        notes: "Aceitou bem a banana.",
        authorId: "demo-mae",
        authorName: "M\u00e3e",
        authorRole: "mae"
      }
    ]
  };
}

function loadDemoStore() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    state.localStore = raw ? JSON.parse(raw) : createDemoStore();
  } catch {
    state.localStore = createDemoStore();
  }
  persistDemoStore();
}

function persistDemoStore() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state.localStore));
}

function enterDemo(role) {
  loadDemoStore();
  state.mode = "local";
  state.family = state.localStore.family;
  state.members = state.localStore.members;
  state.entries = state.localStore.entries;
  state.currentUser = state.members.find((m) => m.role === role) || state.members[0];
  showApp();
  showToast("Modo demonstra\u00e7\u00e3o: dados salvos neste aparelho.");
}

async function clearSubscriptions() {
  if (state.supabase && state.supabaseChannel) {
    try { await state.supabase.removeChannel(state.supabaseChannel); } catch {}
  }
  state.supabaseChannel = null;
  state.unsubscribers = [];
}

async function initSupabase() {
  if (!supabaseConfigured()) {
    $("#onlineAuthHint").textContent = "O Supabase ainda nao esta conectado. Preencha config.js para ativar login e sincronizacao entre os dois celulares.";
    return;
  }
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    state.supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    $("#onlineAuthHint").textContent = "Supabase conectado: login seguro e sincronizacao em tempo real disponiveis.";

    const { data: { session } } = await state.supabase.auth.getSession();
    if (session?.user) {
      try { await loadRemoteSession(session.user); } catch (error) { console.error(error); }
    }

    state.supabase.auth.onAuthStateChange((event, session) => {
      if (state.registrationInProgress) return;
      if (event === "SIGNED_OUT") {
        state.currentUser = null;
        state.family = null;
        state.members = [];
        state.entries = [];
        showAuth();
        return;
      }
      if (session?.user && ["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "INITIAL_SESSION"].includes(event)) {
        setTimeout(() => loadRemoteSession(session.user).catch((error) => {
          console.error(error);
          showToast(friendlyAuthError(error));
        }), 0);
      }
    });
  } catch (error) {
    console.error(error);
    $("#onlineAuthHint").textContent = "Nao foi possivel iniciar o Supabase. O modo demonstracao continua disponivel.";
  }
}

function loginEmail(identifier) {
  const text = String(identifier || "").trim().toLowerCase();
  if (text.includes("@")) return text;
  const safe = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9._-]/g, "").slice(0, 60);
  return `u-${safe}@login.mariaantonella.app`;
}

async function remoteLogin(identifier, password) {
  if (!state.supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { error } = await state.supabase.auth.signInWithPassword({
    email: loginEmail(identifier),
    password
  });
  if (error) throw error;
}

function normalizedUsername(identifier) {
  const text = String(identifier || "").trim();
  if (text.includes("@")) return null;
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 60).toLowerCase() || null;
}

async function remoteRegister({ displayName, role, identifier, password, familyMode, familyCode }) {
  if (!state.supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  state.registrationInProgress = true;
  try {
    const syntheticUsername = normalizedUsername(identifier);
    const email = loginEmail(identifier);
    const redirect = config.authRedirectUrl && !config.authRedirectUrl.includes("SEU-USUARIO")
      ? config.authRedirectUrl
      : location.href.split("#")[0].split("?")[0];

    const { data, error } = await state.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirect,
        data: {
          display_name: displayName,
          role,
          username: syntheticUsername,
          family_mode: familyMode,
          family_code: String(familyCode || "").trim().toUpperCase()
        }
      }
    });
    if (error) throw error;

    if (data.session?.user) {
      await loadRemoteSession(data.session.user);
      return { needsConfirmation: false, syntheticUsername: Boolean(syntheticUsername) };
    }

    return { needsConfirmation: true, syntheticUsername: Boolean(syntheticUsername) };
  } finally {
    state.registrationInProgress = false;
  }
}

async function ensureRemoteProfile(authUser) {
  const meta = authUser.user_metadata || {};
  const fallbackName = String(authUser.email || "Responsavel").split("@")[0];
  const displayName = String(meta.display_name || fallbackName || "Responsavel").trim().slice(0, 120);
  const role = ["mae", "pai", "responsavel"].includes(meta.role) ? meta.role : "responsavel";
  const username = meta.username || null;

  const { data: existing, error: existingError } = await state.supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", authUser.id)
    .maybeSingle();
  if (existingError) throw existingError;

  if (!existing) {
    const { error } = await state.supabase.from("profiles").insert({
      user_id: authUser.id,
      display_name: displayName,
      role,
      username,
      photo: null
    });
    if (error) throw error;
  }

  const { data: memberships, error: memberError } = await state.supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", authUser.id)
    .limit(1);
  if (memberError) throw memberError;
  if (memberships?.length) return memberships[0].family_id;

  if (meta.family_mode === "join") {
    const code = String(meta.family_code || "").trim().toUpperCase();
    if (!code) throw new Error("INVALID_FAMILY_CODE");
    const { data, error } = await state.supabase.rpc("join_family_by_code", { p_code: code });
    if (error) throw error;
    return data;
  }

  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = generateFamilyCode();
    const { data: family, error } = await state.supabase
      .from("families")
      .insert({
        invite_code: code,
        baby_name: "Maria Antonella",
        baby_photo: "assets/anime-baby.jpg",
        created_by: authUser.id
      })
      .select("id")
      .single();
    if (error) {
      lastError = error;
      if (String(error.code) === "23505") continue;
      throw error;
    }
    const { error: linkError } = await state.supabase.from("family_members").insert({
      family_id: family.id,
      user_id: authUser.id
    });
    if (linkError) throw linkError;
    return family.id;
  }
  throw lastError || new Error("FAMILY_CREATE_FAILED");
}

function mapFamily(row) {
  return {
    id: row.id,
    babyName: row.baby_name,
    babyPhoto: row.baby_photo || "assets/anime-baby.jpg",
    birthDate: row.baby_birth_date || "",
    code: row.invite_code
  };
}

function mapProfile(row, familyId) {
  return {
    id: row.user_id,
    displayName: row.display_name,
    role: row.role,
    photo: row.photo || "",
    familyId
  };
}

function mapEntry(row) {
  return {
    id: row.id,
    category: row.category,
    when: row.happened_at,
    fields: row.fields || {},
    notes: row.notes || "",
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    createdAt: row.created_at
  };
}

async function refreshFamily() {
  if (!state.supabase || !state.family?.id) return;
  const { data, error } = await state.supabase.from("families").select("*").eq("id", state.family.id).single();
  if (error) throw error;
  state.family = mapFamily(data);
  renderAll();
}

async function refreshEntries() {
  if (!state.supabase || !state.family?.id) return;
  const { data, error } = await state.supabase
    .from("family_entries")
    .select("*")
    .eq("family_id", state.family.id)
    .order("happened_at", { ascending: false })
    .limit(150);
  if (error) throw error;
  state.entries = (data || []).map(mapEntry);
  renderAll();
}

async function refreshMembers() {
  if (!state.supabase || !state.family?.id) return;
  const { data: links, error: linkError } = await state.supabase
    .from("family_members")
    .select("user_id")
    .eq("family_id", state.family.id);
  if (linkError) throw linkError;
  const ids = (links || []).map((item) => item.user_id);
  if (!ids.length) {
    state.members = [];
    return;
  }
  const { data, error } = await state.supabase.from("profiles").select("*").in("user_id", ids);
  if (error) throw error;
  state.members = (data || []).map((row) => mapProfile(row, state.family.id));
  const freshCurrent = state.members.find((member) => member.id === state.currentUser?.id);
  if (freshCurrent) state.currentUser = freshCurrent;
  renderAll();
}

async function subscribeRemote(familyId) {
  await clearSubscriptions();
  if (!state.supabase) return;
  const channel = state.supabase
    .channel(`antonella-family-${familyId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "families", filter: `id=eq.${familyId}` }, () => refreshFamily().catch(console.error))
    .on("postgres_changes", { event: "*", schema: "public", table: "family_entries", filter: `family_id=eq.${familyId}` }, () => refreshEntries().catch(console.error))
    .on("postgres_changes", { event: "*", schema: "public", table: "family_members", filter: `family_id=eq.${familyId}` }, () => refreshMembers().catch(console.error))
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => refreshMembers().catch(console.error))
    .subscribe();
  state.supabaseChannel = channel;
}

async function loadRemoteSession(authUser) {
  if (!state.supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const familyId = await ensureRemoteProfile(authUser);

  const { data: profileRow, error: profileError } = await state.supabase
    .from("profiles")
    .select("*")
    .eq("user_id", authUser.id)
    .single();
  if (profileError) throw profileError;

  const { data: familyRow, error: familyError } = await state.supabase
    .from("families")
    .select("*")
    .eq("id", familyId)
    .single();
  if (familyError) throw familyError;

  state.mode = "online";
  state.family = mapFamily(familyRow);
  state.currentUser = mapProfile(profileRow, familyId);

  await Promise.all([refreshMembers(), refreshEntries()]);
  await subscribeRemote(familyId);
  showApp();
}

function showApp() {
  $("#authView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  $("#dateFilter").value = localDateKey();
  renderAll();
  resetInactivityTimer();
}

function showAuth() {
  $("#appView").classList.add("hidden");
  $("#authView").classList.remove("hidden");
}

function renderAll() {
  if (!state.currentUser || !state.family) return;
  renderHeader();
  renderSummary();
  renderTimeline();
  renderFamily();
}

function renderHeader() {
  $("#headerBabyName").textContent = state.family.babyName || "Maria Antonella";
  $("#headerBabyPhoto").src = imageSrc(state.family.babyPhoto, "assets/anime-baby.jpg");
  $("#heroBabyPhoto").src = imageSrc(state.family.babyPhoto, "assets/anime-baby.jpg");
  $("#profileName").textContent = state.currentUser.displayName || ROLE_LABEL[state.currentUser.role] || "Respons\u00e1vel";
  $("#profileRole").textContent = ROLE_LABEL[state.currentUser.role] || "Respons\u00e1vel";
  applyAvatar($("#profileAvatar"), state.currentUser);
  $("#todayLabel").textContent = formatDayLabel();
  $("#welcomeTitle").textContent = `Tudo da ${firstName(state.family.babyName)} em um s\u00f3 lugar.`;
  $("#welcomeSubtitle").textContent = state.mode === "online"
    ? "Cada novo cuidado aparece para os dois respons\u00e1veis em tempo real."
    : "Modo demonstra\u00e7\u00e3o: os registros ficam salvos somente neste aparelho.";
  const badge = $("#syncBadge");
  badge.classList.toggle("online", state.mode === "online");
  badge.classList.toggle("local", state.mode !== "online");
  badge.innerHTML = `<span class="status-dot"></span>${state.mode === "online" ? "Sincronizado" : "Local"}`;
}

function firstName(name) {
  return String(name || "Antonella").trim().split(/\s+/)[0];
}

function entriesByCategory(category) {
  return state.entries.filter((entry) => entry.category === category);
}

function renderSummary() {
  const now = Date.now();
  const latestPast = (category) => entriesByCategory(category)
    .filter((e) => new Date(e.when).getTime() <= now)
    .sort((a, b) => new Date(b.when) - new Date(a.when))[0];
  const nextFuture = (category) => entriesByCategory(category)
    .filter((e) => new Date(e.when).getTime() >= now)
    .sort((a, b) => new Date(a.when) - new Date(b.when))[0];

  const bottle = latestPast("mamadeira");
  $("#lastBottle").textContent = bottle
    ? `${formatTime(bottle.when)}${bottle.fields?.amount ? ` \u00b7 ${bottle.fields.amount} ml` : ""}`
    : "Ainda n\u00e3o registrada";

  const meal = latestPast("refeicao");
  $("#lastMeal").textContent = meal
    ? `${formatTime(meal.when)}${meal.fields?.meal ? ` \u00b7 ${meal.fields.meal}` : ""}`
    : "Ainda n\u00e3o registrada";

  const appointment = nextFuture("consulta");
  $("#nextAppointment").textContent = appointment
    ? `${formatDateTime(appointment.when)}${appointment.fields?.professional ? ` \u00b7 ${appointment.fields.professional}` : ""}`
    : "Nenhuma agendada";

  const medicine = latestPast("remedio");
  $("#lastMedicine").textContent = medicine
    ? `${formatTime(medicine.when)}${medicine.fields?.medicine ? ` \u00b7 ${medicine.fields.medicine}` : ""}`
    : "Nenhum registro";
}

function renderQuickGrid() {
  const grid = $("#quickGrid");
  grid.innerHTML = "";
  Object.entries(CATEGORIES).forEach(([key, category]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-card";
    button.innerHTML = `
      <span class="quick-icon">${category.icon}</span>
      <span><strong>${category.label}</strong><small>${category.subtitle}</small></span>
    `;
    button.addEventListener("click", () => openEntryDialog(key));
    grid.appendChild(button);
  });
}

function entryDescription(entry) {
  const f = entry.fields || {};
  switch (entry.category) {
    case "mamadeira": return [f.amount ? `${f.amount} ml` : "", f.milkType].filter(Boolean).join(" \u00b7 ") || entry.notes || "Mamadeira registrada";
    case "refeicao": return [f.meal, f.foods].filter(Boolean).join(" \u00b7 ") || entry.notes || "Refei\u00e7\u00e3o registrada";
    case "rejeicao": return [f.item, f.reaction].filter(Boolean).join(" \u00b7 ") || entry.notes || "Rejei\u00e7\u00e3o registrada";
    case "consulta": return [f.professional, f.location].filter(Boolean).join(" \u00b7 ") || entry.notes || "Consulta registrada";
    case "vacina": return [f.vaccine, f.dose].filter(Boolean).join(" \u00b7 ") || entry.notes || "Vacina registrada";
    case "remedio": return [f.medicine, f.dosage].filter(Boolean).join(" \u00b7 ") || entry.notes || "Rem\u00e9dio registrado";
    case "banho": return [f.bathType, f.temperature].filter(Boolean).join(" \u00b7 ") || entry.notes || "Banho registrado";
    case "observacao": return [f.subject, f.detail].filter(Boolean).join(" \u00b7 ") || entry.notes || "Observa\u00e7\u00e3o registrada";
    default: return entry.notes || "Registro";
  }
}

function renderTimeline() {
  const timeline = $("#timeline");
  const date = $("#dateFilter").value;
  const category = $("#categoryFilter").value;
  const filtered = [...state.entries]
    .filter((entry) => !date || localDateKey(new Date(entry.when)) === date)
    .filter((entry) => category === "all" || entry.category === category)
    .sort((a, b) => new Date(b.when) - new Date(a.when));

  if (!filtered.length) {
    timeline.innerHTML = `<div class="empty-state"><strong>Nenhum registro neste filtro.</strong><span>Use os atalhos acima para adicionar o primeiro cuidado.</span></div>`;
    return;
  }

  timeline.innerHTML = "";
  filtered.forEach((entry) => {
    const categoryInfo = CATEGORIES[entry.category] || CATEGORIES.observacao;
    const item = document.createElement("article");
    item.className = "timeline-item";
    item.tabIndex = 0;
    item.innerHTML = `
      <div class="timeline-icon">${categoryInfo.icon}</div>
      <div class="timeline-main">
        <div class="timeline-title-row"><strong>${escapeHtml(categoryInfo.label)}</strong><span>${escapeHtml(formatDateTime(entry.when))}</span></div>
        <div class="timeline-description">${escapeHtml(entryDescription(entry))}</div>
      </div>
      <div class="timeline-author"><span>registrado por</span><strong>${escapeHtml(entry.authorName || "Respons\u00e1vel")}</strong></div>
    `;
    item.addEventListener("click", () => openDetail(entry.id));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") openDetail(entry.id);
    });
    timeline.appendChild(item);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openEntryDialog(categoryKey) {
  const category = CATEGORIES[categoryKey];
  if (!category) return;
  const form = $("#entryForm");
  form.dataset.category = categoryKey;
  $("#entryTitle").textContent = category.label;
  $("#entryEyebrow").textContent = "Novo registro";
  $("#entryWhen").value = toLocalInputValue();
  $("#entryNotes").value = "";
  const fieldsWrap = $("#entryFields");
  fieldsWrap.innerHTML = "";
  category.fields.forEach(([name, label, type, placeholder]) => {
    const labelEl = document.createElement("label");
    labelEl.innerHTML = `<span>${escapeHtml(label)}</span><input data-field="${escapeHtml(name)}" type="${escapeHtml(type)}" placeholder="${escapeHtml(placeholder)}" />`;
    fieldsWrap.appendChild(labelEl);
  });
  $("#entryDialog").showModal();
}

async function saveEntry(event) {
  event.preventDefault();
  const category = event.currentTarget.dataset.category;
  if (!CATEGORIES[category]) return;
  const whenValue = $("#entryWhen").value;
  if (!whenValue) return;
  const fields = {};
  $$('[data-field]', $("#entryFields")).forEach((input) => {
    fields[input.dataset.field] = input.value.trim();
  });
  const entry = {
    category,
    when: new Date(whenValue).toISOString(),
    fields,
    notes: $("#entryNotes").value.trim(),
    authorId: state.currentUser.id,
    authorName: state.currentUser.displayName || ROLE_LABEL[state.currentUser.role] || "Respons\u00e1vel",
    authorRole: state.currentUser.role,
    createdAt: new Date().toISOString()
  };

  try {
    if (state.mode === "online") {
      const { error } = await state.supabase.from("family_entries").insert({
        family_id: state.family.id,
        category: entry.category,
        happened_at: entry.when,
        fields: entry.fields,
        notes: entry.notes || null,
        author_id: entry.authorId,
        author_name: entry.authorName,
        author_role: entry.authorRole
      });
      if (error) throw error;
      await refreshEntries();
    } else {
      entry.id = uid("entry");
      state.localStore.entries.push(entry);
      state.entries = state.localStore.entries;
      persistDemoStore();
      renderAll();
    }
    $("#entryDialog").close();
    showToast(`${CATEGORIES[category].label} registrado com sucesso.`);
  } catch (error) {
    console.error(error);
    showToast("N\u00e3o foi poss\u00edvel salvar o registro.");
  }
}

function openProfile() {
  $("#profileNameInput").value = state.currentUser.displayName || "";
  $("#profileRoleInput").value = state.currentUser.role || "responsavel";
  applyAvatar($("#profilePreview"), state.currentUser);
  $("#profilePhotoInput").value = "";
  $("#profileDialog").showModal();
}

async function saveProfile(event) {
  event.preventDefault();
  const updates = {
    displayName: $("#profileNameInput").value.trim(),
    role: $("#profileRoleInput").value
  };
  const file = $("#profilePhotoInput").files[0];
  if (file) updates.photo = await resizeImage(file, 480, 0.74);

  try {
    if (state.mode === "online") {
      const payload = {
        display_name: updates.displayName,
        role: updates.role
      };
      if (Object.prototype.hasOwnProperty.call(updates, "photo")) payload.photo = updates.photo || null;
      const { error } = await state.supabase.from("profiles").update(payload).eq("user_id", state.currentUser.id);
      if (error) throw error;
      state.currentUser = { ...state.currentUser, ...updates };
      await refreshMembers();
    } else {
      const member = state.localStore.members.find((m) => m.id === state.currentUser.id);
      Object.assign(member, updates);
      state.currentUser = member;
      state.members = state.localStore.members;
      persistDemoStore();
      renderAll();
    }
    $("#profileDialog").close();
    showToast("Perfil atualizado.");
  } catch (error) {
    console.error(error);
    showToast("N\u00e3o foi poss\u00edvel atualizar o perfil.");
  }
}

function openBabyProfile() {
  $("#babyNameInput").value = state.family.babyName || "Maria Antonella";
  $("#babyBirthInput").value = state.family.birthDate || "";
  $("#babyPreview").src = imageSrc(state.family.babyPhoto, "assets/anime-baby.jpg");
  $("#familyCodeDisplay").value = state.family.code || "";
  $("#babyPhotoInput").value = "";
  $("#babyDialog").showModal();
}

async function saveBabyProfile(event) {
  event.preventDefault();
  const updates = {
    babyName: $("#babyNameInput").value.trim() || "Maria Antonella",
    birthDate: $("#babyBirthInput").value
  };
  const file = $("#babyPhotoInput").files[0];
  if (file) updates.babyPhoto = await resizeImage(file, 640, 0.76);

  try {
    if (state.mode === "online") {
      const payload = {
        baby_name: updates.babyName,
        baby_birth_date: updates.birthDate || null
      };
      if (Object.prototype.hasOwnProperty.call(updates, "babyPhoto")) payload.baby_photo = updates.babyPhoto;
      const { error } = await state.supabase.from("families").update(payload).eq("id", state.family.id);
      if (error) throw error;
      state.family = { ...state.family, ...updates };
      await refreshFamily();
    } else {
      Object.assign(state.localStore.family, updates);
      state.family = state.localStore.family;
      persistDemoStore();
      renderAll();
    }
    $("#babyDialog").close();
    showToast("Dados do beb\u00ea atualizados.");
  } catch (error) {
    console.error(error);
    showToast("N\u00e3o foi poss\u00edvel atualizar os dados.");
  }
}

function renderFamily() {
  const wrap = $("#familyMembers");
  if (!wrap) return;
  const members = state.members.length ? state.members : [state.currentUser];
  wrap.innerHTML = "";
  members.forEach((member) => {
    const card = document.createElement("div");
    card.className = "member-card";
    const avatar = document.createElement("span");
    avatar.className = "profile-avatar";
    applyAvatar(avatar, member);
    const copy = document.createElement("div");
    copy.className = "member-copy";
    copy.innerHTML = `<span>${escapeHtml(ROLE_LABEL[member.role] || "Respons\u00e1vel")}</span><strong>${escapeHtml(member.displayName || "Sem nome")}</strong>`;
    card.append(avatar, copy);
    wrap.appendChild(card);
  });
  $("#familyInviteCode").textContent = state.family.code || "-";
}

function openFamily() {
  renderFamily();
  $("#familyDialog").showModal();
}

function openDetail(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  state.selectedEntryId = id;
  const category = CATEGORIES[entry.category] || CATEGORIES.observacao;
  $("#detailTitle").textContent = category.label;
  const labels = Object.fromEntries((category.fields || []).map(([name, label]) => [name, label]));
  const rows = [
    ["Data e hora", formatDateTime(entry.when)],
    ...Object.entries(entry.fields || {}).filter(([, value]) => value).map(([key, value]) => [labels[key] || key, value]),
    ...(entry.notes ? [["Observa\u00e7\u00f5es", entry.notes]] : []),
    ["Registrado por", entry.authorName || "Respons\u00e1vel"]
  ];
  $("#detailContent").innerHTML = rows.map(([label, value]) => `<div class="detail-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  $("#detailDialog").showModal();
}

async function deleteSelectedEntry() {
  const id = state.selectedEntryId;
  if (!id) return;
  try {
    if (state.mode === "online") {
      const { error } = await state.supabase.from("family_entries").delete().eq("id", id).eq("family_id", state.family.id);
      if (error) throw error;
      await refreshEntries();
    } else {
      state.localStore.entries = state.localStore.entries.filter((entry) => entry.id !== id);
      state.entries = state.localStore.entries;
      persistDemoStore();
      renderAll();
    }
    $("#detailDialog").close();
    state.selectedEntryId = null;
    showToast("Registro exclu\u00eddo.");
  } catch (error) {
    console.error(error);
    showToast("N\u00e3o foi poss\u00edvel excluir.");
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("C\u00f3digo copiado.");
  } catch {
    showToast(`C\u00f3digo: ${text}`);
  }
}

async function logout() {
  clearTimeout(state.inactivityTimer);
  state.inactivityTimer = null;
  await clearSubscriptions();
  if (state.mode === "online" && state.supabase) {
    await state.supabase.auth.signOut();
  }
  state.currentUser = null;
  state.family = null;
  state.members = [];
  state.entries = [];
  state.mode = "local";
  if ($("#profileDialog").open) $("#profileDialog").close();
  showAuth();
}

function closeDialogById(id) {
  const dialog = document.getElementById(id);
  if (dialog?.open) dialog.close();
}

function setAuthTab(tab) {
  const login = tab === "login";
  $("#loginTab").classList.toggle("active", login);
  $("#registerTab").classList.toggle("active", !login);
  $("#loginForm").classList.toggle("hidden", !login);
  $("#registerForm").classList.toggle("hidden", login);
}

function friendlyAuthError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || error || "");
  if (message.includes("INVALID_FAMILY_CODE")) return "Codigo da familia invalido. Confira o codigo e tente novamente.";
  if (message.includes("SUPABASE_NOT_CONFIGURED")) return "Preencha o Project URL e a chave publica no config.js para ativar o login real.";
  if (message.toLowerCase().includes("invalid login credentials")) return "E-mail/usuario ou senha invalidos.";
  if (message.toLowerCase().includes("email not confirmed")) return "Confirme o e-mail antes de entrar.";
  if (message.toLowerCase().includes("user already registered") || code === "user_already_exists") return "Este e-mail ou usuario ja possui cadastro.";
  if (message.toLowerCase().includes("password")) return "Confira a senha. Use pelo menos 6 caracteres.";
  if (code === "23505" && message.toLowerCase().includes("username")) return "Este nome de usuario ja esta em uso.";
  if (!state.supabase) return "O login real ainda nao esta configurado. Use a demonstracao ou configure o Supabase.";
  return "Nao foi possivel concluir. Verifique os dados e tente novamente.";
}

function wireEvents() {
  renderQuickGrid();
  $("#loginTab").addEventListener("click", () => setAuthTab("login"));
  $("#registerTab").addEventListener("click", () => setAuthTab("register"));
  $("#demoMae").addEventListener("click", () => enterDemo("mae"));
  $("#demoPai").addEventListener("click", () => enterDemo("pai"));

  $$('input[name="familyMode"]').forEach((radio) => radio.addEventListener("change", () => {
    const join = $('input[name="familyMode"]:checked').value === "join";
    $("#familyCodeWrap").classList.toggle("hidden", !join);
    $("#familyCodeInput").required = join;
  }));

  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await remoteLogin($("#loginIdentifier").value, $("#loginPassword").value);
      showToast("Acesso realizado.");
    } catch (error) {
      console.error(error);
      showToast(friendlyAuthError(error));
    }
  });

  $("#registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const familyMode = $('input[name="familyMode"]:checked').value;
    try {
      const result = await remoteRegister({
        displayName: $("#registerName").value.trim(),
        role: $("#registerRole").value,
        identifier: $("#registerIdentifier").value.trim(),
        password: $("#registerPassword").value,
        familyMode,
        familyCode: $("#familyCodeInput").value
      });
      if (result.needsConfirmation) {
        setAuthTab("login");
        showToast(result.syntheticUsername
          ? "Conta criada. Para login por usuario, desative confirmacao de e-mail no Supabase ou use um e-mail real."
          : "Conta criada. Confirme o e-mail e depois entre no aplicativo.");
      } else {
        showToast("Acesso criado com sucesso.");
      }
    } catch (error) {
      console.error(error);
      showToast(friendlyAuthError(error));
    }
  });

  $("#entryForm").addEventListener("submit", saveEntry);
  $("#profileForm").addEventListener("submit", saveProfile);
  $("#babyForm").addEventListener("submit", saveBabyProfile);
  $("#profileButton").addEventListener("click", openProfile);
  $("#babyProfileButton").addEventListener("click", openBabyProfile);
  $("#logoutButton").addEventListener("click", logout);
  $("#deleteEntryButton").addEventListener("click", deleteSelectedEntry);
  $("#dateFilter").addEventListener("change", renderTimeline);
  $("#categoryFilter").addEventListener("change", renderTimeline);
  $("#copyFamilyCode").addEventListener("click", () => copyText(state.family?.code || ""));
  $("#copyInviteCode").addEventListener("click", () => copyText(state.family?.code || ""));

  $("#profilePhotoInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const data = await resizeImage(file, 480, .74);
    applyAvatar($("#profilePreview"), { ...state.currentUser, photo: data });
  });

  $("#babyPhotoInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    $("#babyPreview").src = await resizeImage(file, 640, .76);
  });

  $$('[data-close-dialog]').forEach((button) => button.addEventListener("click", () => closeDialogById(button.dataset.closeDialog)));

  $$(".nav-item").forEach((button) => button.addEventListener("click", () => {
    $$(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const nav = button.dataset.nav;
    if (nav === "home") window.scrollTo({ top: 0, behavior: "smooth" });
    if (nav === "timeline") $("#timeline").scrollIntoView({ behavior: "smooth", block: "start" });
    if (nav === "family") openFamily();
    if (nav === "profile") openProfile();
  }));

  $("#addFloating").addEventListener("click", () => {
    $("#quickGrid").scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Escolha o tipo de registro.");
  });
}

async function boot() {
  wireEvents();
  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, resetInactivityTimer, { passive: true });
  });
  $("#todayLabel").textContent = formatDayLabel();
  await initSupabase();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

boot();
