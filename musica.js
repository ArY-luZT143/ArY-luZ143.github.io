/* musica.js — música de fondo para todo el sitio (versión con diagnóstico).
   Uso: en CADA página pon esta línea justo antes de </body>:
        <script src="musica.js"></script>
   Necesita que musica.mp3 esté en la misma carpeta.
   Si algo falla, el botón muestra el motivo y la consola (F12) da más detalle. */
(function () {
  var SRC = new URL("musica.mp3", document.currentScript.src).href;
  var K = { on: "arcade-musica", vol: "arcade-vol", t: "arcade-t" };
  var get = function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  var audio = new Audio(SRC);
  audio.loop = true; audio.preload = "auto";
  audio.volume = parseFloat(get(K.vol, "0.4"));
  var wantOn = get(K.on, "on") !== "off";
  var problema = ""; // texto del error, si lo hay

  console.log("[musica.js] Intentando cargar:", SRC);

  // ----- botón flotante -----
  var css = document.createElement("style");
  css.textContent =
    "#musica-ctrl{position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;align-items:center;gap:10px;padding:8px 12px;" +
    "background:rgba(198,184,244,.96);border:1px solid #5b9fe0;border-radius:12px;box-shadow:0 0 8px #93c5f0,0 0 22px rgba(147,197,240,.55)}" +
    "#musica-btn{cursor:pointer;color:#2d2452;font:bold 14px Arial,Helvetica,sans-serif;background:transparent;border:0}" +
    "#musica-btn:hover{color:#2a5fa8}#musica-vol{width:80px;accent-color:#d873b3}" +
    "@media(max-width:600px){#musica-vol{display:none}}";
  document.head.appendChild(css);
  var box = document.createElement("div");
  box.id = "musica-ctrl";
  box.innerHTML = '<button type="button" id="musica-btn"></button><input type="range" id="musica-vol" min="0" max="1" step="0.05" aria-label="Volumen">';
  document.body.appendChild(box);
  var btn = box.querySelector("#musica-btn"), vol = box.querySelector("#musica-vol");
  vol.value = audio.volume;

  function label() {
    if (problema) { btn.textContent = "⚠ " + problema; return; }
    btn.textContent = !audio.paused ? "🎵 Música: ON" : (wantOn ? "🎵 Activar música" : "🔇 Música: OFF");
  }
  audio.addEventListener("play", function () { problema = ""; label(); });
  audio.addEventListener("pause", label);

  // error al cargar el archivo (no existe, nombre distinto, formato no válido...)
  audio.addEventListener("error", function () {
    var c = audio.error ? audio.error.code : 0;
    console.error("[musica.js] No se pudo cargar el audio. Código:", c, "Archivo:", SRC);
    problema = (c === 4)
      ? "No se encuentra o no se reconoce musica.mp3"
      : "Error de audio (código " + c + ")";
    label();
  });

  // continuar por donde iba al cambiar de página
  audio.addEventListener("loadedmetadata", function () {
    console.log("[musica.js] Audio cargado. Duración:", audio.duration, "s");
    var t = parseFloat(get(K.t, "0"));
    if (t > 0 && t < audio.duration) audio.currentTime = t;
  });
  function saveT() { if (!audio.paused) set(K.t, audio.currentTime); }
  setInterval(saveT, 1000);
  addEventListener("pagehide", saveT);

  // los navegadores bloquean el audio automático: si falla, arranca con el primer clic o tecla
  var evs = ["pointerdown", "keydown", "touchstart"];
  function firstGesture(e) {
    if (e.target && e.target.closest && e.target.closest("#musica-ctrl")) return;
    evs.forEach(function (n) { removeEventListener(n, firstGesture); });
    if (wantOn) audio.play().catch(function (err) { console.error("[musica.js] play() falló:", err); });
  }
  function waitGesture() { evs.forEach(function (n) { addEventListener(n, firstGesture); }); }

  btn.addEventListener("click", function () {
    if (audio.paused) {
      wantOn = true; set(K.on, "on");
      audio.play().catch(function (err) {
        console.error("[musica.js] play() falló:", err);
        problema = "No suena: " + (err && err.name ? err.name : "error");
        label();
      });
    } else { wantOn = false; set(K.on, "off"); audio.pause(); }
    label();
  });
  vol.addEventListener("input", function () { audio.volume = +vol.value; set(K.vol, vol.value); });

  label();
  if (wantOn) audio.play().catch(waitGesture);
})();
