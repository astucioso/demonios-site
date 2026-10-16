"use strict";

(() => {
  const config = window.DEMONIOS_CONFIG || {};
  const FALLBACK = "fallback.svg";
  const API = "https://api.lanyard.rest/v1/users/";
  const SOCKET = "wss://api.lanyard.rest/socket";
  const labels = { online: "Online", idle: "Ausente", dnd: "Não perturbe", offline: "Offline", unknown: "Aguardando presença" };
  const container = document.getElementById("profiles");
  const note = document.getElementById("connection-note");
  const profiles = new Map();
  const entrance = { delay: 1300, stagger: 200, duration: 500 };
  let entered = false;
  let entranceTimer = null;
  let socket = null;
  let socketReady = false;
  let heartbeat = null;
  let connectionTimeout = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let polling = false;
  let lastPoll = 0;
  let disposed = false;
  let soundProblem = "";

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function clean(value, limit = 180) {
    return typeof value === "string" ? value.trim().slice(0, limit) : "";
  }
  function createProfile(item) {
    const id = String(item.id || "");
    if (!/^\d{17,20}$/.test(id) || profiles.has(id)) return;
    const fallbackName = clean(item.fallbackName, 40) || "Discord";
    const article = element("article", "profile");
    article.inert = true;
    article.style.setProperty("--reveal-delay", `${entrance.delay + profiles.size * entrance.stagger}ms`);
    article.style.setProperty("--reveal-duration", `${entrance.duration}ms`);
    const link = element("a", "profile-link");
    link.href = `https://discord.com/users/${id}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `Abrir perfil de ${fallbackName} no Discord (nova aba)`);
    link.setAttribute("aria-describedby", `details-${id}`);
    const wrap = element("span", "avatar-wrap");
    const avatar = element("img", "avatar");
    avatar.src = FALLBACK;
    avatar.alt = "";
    avatar.width = avatar.height = 104;
    avatar.decoding = "async";
    avatar.referrerPolicy = "no-referrer";
    avatar.addEventListener("error", () => {
      if (avatar.getAttribute("src") !== FALLBACK) avatar.src = FALLBACK;
    });
    const dot = element("span", "presence-dot");
    dot.dataset.status = "unknown";
    dot.setAttribute("aria-hidden", "true");
    wrap.append(avatar, dot);
    const name = element("span", "profile-name", fallbackName);
    link.append(wrap, name);
    const toggle = element("button", "details-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", `details-${id}`);
    toggle.setAttribute("aria-label", `Ver atividade de ${fallbackName}`);
    toggle.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
    const details = element("div", "details");
    details.id = `details-${id}`;
    details.setAttribute("role", "tooltip");
    const status = element("p", "details-status", labels.unknown);
    const art = element("img", "spotify-art");
    art.hidden = true;
    art.alt = "";
    art.width = art.height = 38;
    art.referrerPolicy = "no-referrer";
    art.addEventListener("error", () => { art.hidden = true; });
    const activity = element("p", "details-activity", "Carregando perfil do Discord…");
    const freshness = element("p", "details-time");
    details.append(status, art, activity, freshness);
    article.append(link, toggle, details);
    container.append(article);
    toggle.addEventListener("click", () => {
      const opening = !article.classList.contains("is-expanded");
      closeDetails();
      article.classList.toggle("is-expanded", opening);
      toggle.setAttribute("aria-expanded", String(opening));
      if (!opening) toggle.blur();
    });
    profiles.set(id, { id, fallbackName, article, link, avatar, dot, name, toggle, status, art, activity, freshness, data: null, updatedAt: 0, failed: false, error: "" });
  }
  function closeDetails() {
    profiles.forEach(profile => {
      profile.article.classList.remove("is-expanded");
      profile.toggle.setAttribute("aria-expanded", "false");
    });
  }
  document.addEventListener("pointerdown", event => {
    if (!event.target.closest(".profile")) closeDetails();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeDetails();
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
  });
  (Array.isArray(config.profiles) ? config.profiles : []).forEach(createProfile);

  function activityText(data) {
    const activities = Array.isArray(data.activities) ? data.activities : [];
    if (data.listening_to_spotify && data.spotify) {
      const song = clean(data.spotify.song);
      const artist = clean(data.spotify.artist);
      return `Ouvindo ${song || "Spotify"}${artist ? `\n${artist}` : ""}`;
    }
    const game = activities.find(value => value && value.type !== 4 && value.name !== "Spotify");
    const custom = activities.find(value => value && value.type === 4);
    const lines = [];
    if (game) {
      const prefixes = { 0: "Jogando", 1: "Transmitindo", 2: "Ouvindo", 3: "Assistindo", 5: "Competindo em" };
      const gameName = clean(game.name);
      if (gameName) lines.push(`${prefixes[game.type] || "Em"} ${gameName}`);
      if (clean(game.details)) lines.push(clean(game.details));
      if (clean(game.state)) lines.push(clean(game.state));
    }
    if (custom && clean(custom.state)) {
      const emoji = custom.emoji && !custom.emoji.id ? clean(custom.emoji.name, 12) : "";
      lines.push(`${emoji ? `${emoji} ` : ""}${clean(custom.state)}`);
    }
    return lines.join("\n") || (data.discord_status === "offline" ? "Até daqui a pouco." : "Por aqui.");
  }
  function avatarUrl(user, id) {
    const hash = clean(user.avatar, 100);
    return /^[a-zA-Z0-9_]+$/.test(hash)
      ? `https://cdn.discordapp.com/avatars/${id}/${hash}.${hash.startsWith("a_") ? "gif" : "webp"}?size=256`
      : FALLBACK;
  }
  function applyPresence(id, data, requestStarted = Infinity) {
    const profile = profiles.get(String(id));
    if (!profile || !data || !data.discord_user || String(data.discord_user.id) !== profile.id) return false;
    if (profile.updatedAt > requestStarted) return true;
    const user = data.discord_user;
    const name = clean(user.global_name, 60) || clean(user.display_name, 60) || clean(user.username, 60) || profile.fallbackName;
    const status = Object.hasOwn(labels, data.discord_status) ? data.discord_status : "unknown";
    profile.data = data;
    profile.updatedAt = Date.now();
    profile.failed = false;
    profile.error = "";
    profile.name.textContent = name;
    profile.link.setAttribute("aria-label", `Abrir perfil de ${name} no Discord (nova aba)`);
    profile.toggle.setAttribute("aria-label", `Ver atividade de ${name}`);
    const avatar = avatarUrl(user, profile.id);
    if (profile.avatar.getAttribute("src") !== avatar) profile.avatar.src = avatar;
    profile.dot.dataset.status = status;
    profile.status.textContent = labels[status];
    profile.activity.textContent = activityText(data);
    profile.art.hidden = true;
    if (data.listening_to_spotify && data.spotify) {
      try {
        const art = new URL(data.spotify.album_art_url);
        if (art.protocol === "https:" && art.hostname === "i.scdn.co") {
          profile.art.src = art.href;
          profile.art.hidden = false;
        }
      } catch (_) { /* Capa opcional; presença e música continuam visíveis. */ }
    }
    refreshConnectionNote();
    return true;
  }
  function refreshConnectionNote() {
    let failedCount = 0;
    profiles.forEach(profile => {
      if (profile.failed) failedCount++;
      profile.freshness.classList.toggle("stale", profile.failed);
      if (profile.failed) {
        profile.freshness.textContent = profile.data ? "Última presença recebida · tentando atualizar" : profile.error || "Presença indisponível · tentando novamente";
        if (!profile.data) profile.activity.textContent = "Não foi possível consultar a presença agora.";
      } else {
        profile.freshness.textContent = profile.data ? (socketReady ? "Atualização em tempo real" : "Atualização periódica") : "";
      }
    });
    note.textContent = soundProblem || (failedCount === profiles.size && failedCount ? "Presença temporariamente indisponível. Tentando novamente…" : "");
  }
  async function fetchProfile(profile) {
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${API}${profile.id}`, { signal: controller.signal, cache: "no-store", credentials: "omit" });
      if (!response.ok) throw new Error("request_failed");
      const body = await response.json();
      if (!body.success) throw new Error(body.error && body.error.code === "user_not_monitored" ? "not_monitored" : "request_failed");
      if (!applyPresence(profile.id, body.data, started)) throw new Error("invalid_presence");
    } catch (error) {
      if (profile.updatedAt <= started) {
        profile.failed = true;
        profile.error = error.message === "not_monitored" ? "Perfil ainda não monitorado pelo Lanyard" : "Presença indisponível · tentando novamente";
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  async function poll(force = false) {
    if (polling || disposed || (navigator.onLine === false) || (!force && Date.now() - lastPoll < 10000)) return;
    polling = true;
    lastPoll = Date.now();
    await Promise.allSettled(Array.from(profiles.values(), fetchProfile));
    polling = false;
    refreshConnectionNote();
  }
  function clearSocketTimers() {
    clearInterval(heartbeat);
    clearTimeout(connectionTimeout);
    heartbeat = connectionTimeout = null;
  }
  function scheduleReconnect() {
    if (disposed || reconnectTimer || navigator.onLine === false) return;
    const delay = Math.min(60000, 1500 * Math.pow(2, Math.min(reconnectAttempt++, 6))) + Math.random() * 900;
    reconnectTimer = setTimeout(() => { reconnectTimer = null; connectSocket(); }, delay);
  }
  function connectSocket() {
    if (disposed || navigator.onLine === false || !profiles.size) return;
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;
    let ws;
    try { ws = new WebSocket(SOCKET); } catch (_) { scheduleReconnect(); return; }
    socket = ws;
    socketReady = false;
    connectionTimeout = setTimeout(() => {
      if (socket === ws && !socketReady) ws.close(4000, "initialization_timeout");
    }, 12000);
    ws.addEventListener("message", event => {
      if (socket !== ws) return;
      let payload;
      try { payload = JSON.parse(event.data); } catch (_) { return; }
      if (!payload || typeof payload !== "object") return;
      if (payload.op === 1) {
        const interval = Number(payload.d && payload.d.heartbeat_interval);
        if (!Number.isFinite(interval) || interval < 1000 || interval > 120000) { ws.close(4000, "invalid_hello"); return; }
        clearInterval(heartbeat);
        ws.send(JSON.stringify({ op: 2, d: { subscribe_to_ids: Array.from(profiles.keys()) } }));
        heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }));
        }, interval);
      } else if (payload.op === 0 && payload.t === "INIT_STATE" && payload.d && typeof payload.d === "object") {
        clearTimeout(connectionTimeout);
        socketReady = true;
        reconnectAttempt = 0;
        Object.entries(payload.d).forEach(([id, data]) => applyPresence(id, data));
        refreshConnectionNote();
      } else if (payload.op === 0 && payload.t === "PRESENCE_UPDATE" && payload.d && payload.d.discord_user) {
        applyPresence(payload.d.discord_user.id, payload.d);
      }
    });
    ws.addEventListener("close", () => {
      if (socket !== ws) return;
      clearSocketTimers();
      socket = null;
      socketReady = false;
      refreshConnectionNote();
      poll();
      scheduleReconnect();
    });
    ws.addEventListener("error", () => {
      if (socket === ws && ws.readyState !== WebSocket.CLOSED) ws.close();
    });
  }
  const pollTimer = setInterval(() => {
    if (!socketReady || Array.from(profiles.values()).some(profile => profile.failed || !profile.data)) poll();
  }, 45000);
  window.addEventListener("online", () => { clearTimeout(reconnectTimer); reconnectTimer = null; poll(true); connectSocket(); });
  window.addEventListener("offline", () => {
    if (socket) socket.close();
    profiles.forEach(profile => { profile.failed = true; });
    refreshConnectionNote();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) { poll(); connectSocket(); }
    updateAnimation();
  });
  window.addEventListener("pagehide", event => {
    disposed = true;
    clearSocketTimers();
    clearTimeout(reconnectTimer);
    clearTimeout(entranceTimer);
    clearInterval(pollTimer);
    if (socket) socket.close(1000, "page_hidden");
    if (event.persisted) window.addEventListener("pageshow", () => window.location.reload(), { once: true });
  }, { once: true });

  const soundButton = document.getElementById("sound");
  let audio = null;
  const musicSrc = clean(config.musicSrc, 500);
  if (musicSrc) {
    // Só caminhos locais relativos: mantém a música na própria hospedagem.
    if (!/^(?:[a-z]+:|\/\/|\/|\.\.)/i.test(musicSrc)) {
      audio = document.getElementById("music");
      audio.src = musicSrc;
      audio.loop = true;
      audio.preload = "none";
      audio.volume = Math.max(0, Math.min(1, Number(config.musicVolume) || .35));
      soundButton.hidden = false;
    }
  }
  async function playMusic() {
    if (!audio) return;
    try {
      await audio.play();
      soundProblem = "";
      soundButton.setAttribute("aria-pressed", "false");
      soundButton.setAttribute("aria-label", "Pausar música");
      soundButton.title = "Pausar música";
    } catch (_) {
      soundProblem = "Música indisponível. Use o botão de som para tentar novamente.";
      soundButton.setAttribute("aria-pressed", "true");
      soundButton.setAttribute("aria-label", "Tentar reproduzir música");
      soundButton.title = "Tentar reproduzir música";
    }
    refreshConnectionNote();
  }
  soundButton.addEventListener("click", () => {
    if (!audio) return;
    if (audio.paused) playMusic();
    else {
      audio.pause();
      soundButton.setAttribute("aria-pressed", "true");
      soundButton.setAttribute("aria-label", "Reproduzir música");
      soundButton.title = "Reproduzir música";
    }
  });
  document.getElementById("enter").addEventListener("click", () => {
    if (entered) return;
    entered = true;
    document.body.classList.add("entering-profiles");
    document.body.classList.remove("awaiting-entry");
    document.getElementById("entry").classList.add("is-open");
    document.getElementById("entry").setAttribute("aria-hidden", "true");
    document.getElementById("main").inert = false;
    document.getElementById("controls").hidden = false;
    document.getElementById("main").focus({ preventScroll: true });
    playMusic();
    updateAnimation();
    const finishEntrance = () => {
      entranceTimer = null;
      profiles.forEach(profile => { profile.article.inert = false; });
      document.body.classList.remove("entering-profiles");
      document.body.classList.add("profiles-revealed");
      updateAnimation();
    };
    if (reduced.matches) finishEntrance();
    else entranceTimer = setTimeout(finishEntrance, entrance.delay + Math.max(0, profiles.size - 1) * entrance.stagger + entrance.duration);
  });

  const canvas = document.getElementById("particles");
  const context = canvas.getContext("2d");
  const motionButton = document.getElementById("motion");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionPaused = reduced.matches;
  let frame = null;
  let width = 0;
  let height = 0;
  let lastFrame = 0;
  let dots = [];
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    if (context) context.setTransform(scale, 0, 0, scale, 0, 0);
    dots = Array.from({ length: Math.min(75, Math.round(width * height / 14500)) }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      r: .45 + Math.random() * 1.1, speed: .12 + Math.random() * .25,
      sway: Math.random() * Math.PI * 2, opacity: .15 + Math.random() * .45
    }));
  }
  function draw(time) {
    frame = null;
    if (!context || !entered || motionPaused || document.hidden || config.particles === false) return;
    const delta = lastFrame ? Math.min((time - lastFrame) / 16.67, 3) : 1;
    lastFrame = time;
    context.clearRect(0, 0, width, height);
    dots.forEach(dot => {
      dot.y += dot.speed * delta;
      dot.x += Math.sin(time * .00025 + dot.sway) * .13 * delta;
      if (dot.y > height + 4) { dot.y = -4; dot.x = Math.random() * width; }
      context.beginPath();
      context.fillStyle = `rgba(255,255,255,${dot.opacity})`;
      context.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      context.fill();
    });
    frame = requestAnimationFrame(draw);
  }
  function updateAnimation() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    document.body.classList.toggle("motion-paused", motionPaused || document.hidden || !entered);
    motionButton.setAttribute("aria-pressed", String(motionPaused));
    const label = motionPaused ? "Ativar animações" : "Pausar animações";
    motionButton.setAttribute("aria-label", label);
    motionButton.title = label;
    if (motionPaused && context) context.clearRect(0, 0, width, height);
    if (entered && !motionPaused && !document.hidden && context && config.particles !== false) frame = requestAnimationFrame(draw);
  }
  motionButton.addEventListener("click", () => { motionPaused = !motionPaused; updateAnimation(); });
  reduced.addEventListener("change", event => { motionPaused = event.matches; updateAnimation(); });
  window.addEventListener("resize", resize, { passive: true });
  motionButton.hidden = false;
  resize();
  poll(true);
  connectSocket();
})();
