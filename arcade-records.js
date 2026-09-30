/* arcade-records.js — nombre del jugador y récords COMPARTIDOS del Mini Arcade.
   Lo usan records.html (para mostrar) y cada juego (para guardar puntajes).

   En CADA juego, antes de </body>:
        <script src="arcade-records.js"></script>
   y cuando termine la partida:
        ArcadeRecords.guardar("atrapa", puntos);
   Claves de juego: atrapa, bug, rapido, ordena, space

   PUNTAJES COMPARTIDOS: pega abajo la URL de tu Firebase Realtime Database.
   Si DB_URL está vacío, todo funciona como antes (solo en este navegador). */
(function () {
  var DB_URL = "https://mini-arcade-94638-default-rtdb.firebaseio.com/"; 

  var KR = "arcade-records", KN = "arcade-jugador";
  var JUEGOS = {
    atrapa: "Atrapa el código",
    bug: "Bug Hunter",
    rapido: "Soporte rápido",
    ordena: "Ordena el código",
    space: "Programmer Space"
  };
  DB_URL = DB_URL.replace(/\/+$/, "");
  var remoto = [], cargado = false;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function locales() {
    try { var a = JSON.parse(get(KR) || "[]"); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function limpiar(n) { return String(n || "").replace(/\s+/g, " ").trim().slice(0, 16); }
  function orden(a, b) { return b.p - a.p || a.f - b.f; }

  // Lo que se muestra: los récords globales + lo local que aún no se subió.
  function todos() {
    var loc = locales();
    if (!DB_URL || !cargado) return loc;
    return remoto.concat(loc.filter(function (e) { return e.s !== true; }));
  }

  function subir(e, cb) {
    fetch(DB_URL + "/records/" + e.j + ".json", {
      method: "POST",
      body: JSON.stringify({ n: e.n, p: e.p, j: e.j, f: e.f })
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      e.s = true;
      set(KR, JSON.stringify(locales_marcar(e)));
      if (cb) cb();
    }).catch(function () { /* sin internet o sin permiso: queda pendiente */ });
  }
  function locales_marcar(e) {
    return locales().map(function (x) {
      return (x.f === e.f && x.n === e.n && x.p === e.p && x.j === e.j) ? e : x;
    });
  }

  var R = {
    JUEGOS: JUEGOS,
    compartido: !!DB_URL,
    nombre: function () { return get(KN) || ""; },
    setNombre: function (n) { n = limpiar(n); if (n) set(KN, n); return n; },
    pedirNombre: function () {
      var n = R.nombre();
      if (n) return n;
      n = R.setNombre(prompt("¿Cómo te llamas? Así aparecerás en los récords:"));
      return n || "Anónimo";
    },
    guardar: function (juego, puntos) {
      puntos = Math.floor(Number(puntos));
      if (!JUEGOS[juego] || !(puntos > 0)) return null;
      var mejorAntes = todos().reduce(function (m, e) { return e.j === juego ? Math.max(m, e.p) : m; }, 0);
      var nombre = R.pedirNombre();
      var entrada = { n: nombre, p: puntos, j: juego, f: Date.now() };
      var lista = locales();
      lista.push(entrada);
      lista.sort(orden);
      var cuenta = {};
      lista = lista.filter(function (e) { cuenta[e.j] = (cuenta[e.j] || 0) + 1; return cuenta[e.j] <= 50; });
      set(KR, JSON.stringify(lista));
      if (DB_URL) subir(entrada);
      return { nombre: nombre, puntos: puntos, nuevoRecord: puntos > mejorAntes };
    },
    lista: function (juego) {
      return todos()
        .filter(function (e) { return !juego || juego === "todos" || e.j === juego; })
        .sort(orden);
    },
    // Descarga los récords globales (y sube los pendientes). Llama cb(ok) al terminar.
    cargar: function (cb) {
      if (!DB_URL) { if (cb) cb(false); return; }
      locales().filter(function (e) { return e.s !== true && JUEGOS[e.j]; }).forEach(function (e) { subir(e); });
      var claves = Object.keys(JUEGOS), acumulado = [], listos = 0, fallo = false;
      claves.forEach(function (j) {
        fetch(DB_URL + "/records/" + j + ".json?orderBy=%22p%22&limitToLast=50")
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (obj) {
            Object.keys(obj || {}).forEach(function (id) {
              var e = obj[id];
              if (e && typeof e.p === "number") acumulado.push({ n: String(e.n), p: e.p, j: j, f: e.f || 0 });
            });
          })
          .catch(function () { fallo = true; })
          .then(function () {
            if (++listos < claves.length) return;
            if (!fallo) { remoto = acumulado; cargado = true; }
            if (cb) cb(!fallo);
          });
      });
    },
    borrar: function () { set(KR, "[]"); }
  };
  window.ArcadeRecords = R;
})();
