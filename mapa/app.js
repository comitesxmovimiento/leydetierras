(function () {
  "use strict";

  const CAP_NACIONAL = 15; // % techo legal vigente (Ley 26.737)

  let geoData, provinceBoundaries, provStats, nacStats;

  /* ===== MAPA BASE ===== */
  const map = L.map("map", { zoomControl: true, minZoom: 4, maxZoom: 10 }).setView(
    [-38.4, -63.6],
    5,
  );
  if (window.innerWidth <= 768) map.setView([-38.4, -65.5], 4);

  let deptLayer, provLayer;
  let afterMode = false;
  let selectedProvince = "";
  const provLayerByName = {};
  const HOME_VIEW = window.innerWidth <= 768 ? [[-38.4, -65.5], 4] : [[-38.4, -63.6], 5];

  function colorForPct(pct, after) {
    if (after) return "#e23d28";
    const t = Math.min(pct / CAP_NACIONAL, 1);
    if (t < 0.5) return mix("#1e3a24", "#357a53", t / 0.5);
    if (t < 0.85) return mix("#357a53", "#f4c542", (t - 0.5) / 0.35);
    return mix("#f4c542", "#e23d28", (t - 0.85) / 0.15);
  }
  function mix(c1, c2, t) {
    const a = hexToRgb(c1),
      b = hexToRgb(c2);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  function hexToRgb(h) {
    h = h.replace("#", "");
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }

  function styleDept(feature) {
    const pct = feature.properties.pct;
    const dimmed = selectedProvince && feature.properties.provincia !== selectedProvince;
    return {
      fillColor: colorForPct(pct, afterMode),
      fillOpacity: dimmed ? 0.1 : afterMode ? 0.75 : 0.8,
      color: afterMode ? "#7a1f14" : "#171713",
      weight: 0.4,
      opacity: dimmed ? 0.2 : 0.6,
    };
  }

  function styleProv(feature) {
    const isSel = selectedProvince && feature.properties.provincia === selectedProvince;
    return {
      fill: false,
      color: !selectedProvince || isSel ? "#f4c542" : "#57534e",
      weight: isSel ? 3.5 : 2,
      opacity: !selectedProvince ? 0.85 : isSel ? 1 : 0.3,
      dashArray: "5,4",
    };
  }

  function fmtHa(n) {
    return Math.round(n).toLocaleString("es-AR") + " ha";
  }
  function fmtPct(n) {
    return n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  }

  const infoBox = document.getElementById("infoBox");
  document.getElementById("infoClose").onclick = () => (infoBox.style.display = "none");

  function showInfo(props) {
    infoBox.classList.toggle("after", afterMode);
    document.getElementById("infoNombre").textContent = props.nombre;
    document.getElementById("infoProv").textContent = props.provincia;
    document.getElementById("infoExt").textContent = fmtHa(props.ext_ha);
    document.getElementById("infoPct").textContent = fmtPct(props.pct);
    const capRow = document.getElementById("infoCapRow");
    if (afterMode) {
      capRow.classList.add("warn");
      document.getElementById("infoCap").textContent = "SIN TECHO";
    } else {
      const diff = props.pct - CAP_NACIONAL;
      if (diff > 0) {
        capRow.classList.add("warn");
        document.getElementById("infoCap").textContent =
          CAP_NACIONAL.toLocaleString("es-AR") + "% — EXCEDE en " + fmtPct(diff);
      } else {
        capRow.classList.remove("warn");
        document.getElementById("infoCap").textContent =
          CAP_NACIONAL.toLocaleString("es-AR") + "% (faltan " + fmtPct(-diff) + ")";
      }
    }
    infoBox.style.display = "block";
  }

  function initLayers() {
    deptLayer = L.geoJSON(geoData, {
      style: styleDept,
      onEachFeature: (feature, layer) => {
        layer.on("click", () => showInfo(feature.properties));
        layer.on("mouseover", function () {
          this.setStyle({ weight: 1.5, opacity: 1 });
        });
        layer.on("mouseout", function () {
          deptLayer.resetStyle(this);
        });
      },
    }).addTo(map);

    provLayer = L.geoJSON(provinceBoundaries, {
      style: styleProv,
      interactive: false,
    }).addTo(map);
    provLayer.eachLayer((l) => {
      provLayerByName[l.feature.properties.provincia] = l;
    });
  }

  /* ===== ESTADISTICAS NACIONALES ===== */
  function updateStats() {
    const box = document.getElementById("statsBox");
    box.classList.toggle("after", afterMode);
    const pctNac = (nacStats.extranjerizada_ha / nacStats.total_ha) * 100;
    document.getElementById("statExt").textContent = fmtHa(nacStats.extranjerizada_ha);
    document.getElementById("statPct").textContent = fmtPct(pctNac);
    document.getElementById("statCap").textContent = CAP_NACIONAL.toLocaleString("es-AR") + "%";
    const capAfter = document.getElementById("statCapAfter");
    if (afterMode) {
      capAfter.textContent = "SIN LÍMITE";
      capAfter.parentElement.classList.add("warn");
    } else {
      capAfter.textContent = CAP_NACIONAL.toLocaleString("es-AR") + "%";
      capAfter.parentElement.classList.remove("warn");
    }
  }

  /* ===== SELECTOR DE PROVINCIA ===== */
  const provSelect = document.getElementById("provSelect");

  function populateProvSelect() {
    Object.keys(provStats)
      .sort((a, b) => a.localeCompare(b, "es"))
      .forEach((prov) => {
        const opt = document.createElement("option");
        opt.value = prov;
        opt.textContent = prov;
        provSelect.appendChild(opt);
      });
  }

  function updateProvBox(prov) {
    const box = document.getElementById("provStatsBox");
    const ps = prov ? provStats[prov] : null;
    if (!ps) {
      box.classList.remove("show");
      return;
    }
    box.classList.add("show");
    box.classList.toggle("after", afterMode);
    document.getElementById("provStatsTitle").textContent = prov;
    document.getElementById("pvCount").textContent = ps.count.toLocaleString("es-AR");
    document.getElementById("pvExt").textContent = fmtHa(ps.ext);

    const pct = ps.tot > 0 ? (ps.ext / ps.tot) * 100 : 0;
    const capRow = document.getElementById("pvCapRow");
    if (afterMode) {
      capRow.classList.add("warn");
      document.getElementById("pvPct").textContent = fmtPct(pct) + " — SIN TECHO";
    } else {
      const diff = pct - CAP_NACIONAL;
      if (diff > 0) {
        capRow.classList.add("warn");
        document.getElementById("pvPct").textContent = fmtPct(pct) + " — EXCEDE en " + fmtPct(diff);
      } else {
        capRow.classList.remove("warn");
        document.getElementById("pvPct").textContent = fmtPct(pct) + " (faltan " + fmtPct(-diff) + ")";
      }
    }
    document.getElementById("pvOrigen").textContent = ps.origen || "Sin datos específicos";
    document.getElementById("pvMineria").textContent =
      ps.min_actividad.toLocaleString("es-AR") + " / " + ps.min_previstos.toLocaleString("es-AR");
    document.getElementById("pvCom").textContent = ps.com_total.toLocaleString("es-AR");
    document.getElementById("pvComDetalle").textContent =
      ps.com_culminado + " / " + ps.com_tramite + " / " + ps.com_sin_relevar;
    document.getElementById("pvGlaciares").textContent = fmtHa(ps.glaciares_prov_total_ha || 0);
  }

  provSelect.addEventListener("change", () => {
    selectedProvince = provSelect.value;
    deptLayer.setStyle(styleDept);
    provLayer.setStyle(styleProv);
    infoBox.style.display = "none";
    updateProvBox(selectedProvince);
    if (selectedProvince) {
      const layer = provLayerByName[selectedProvince];
      if (layer) map.fitBounds(layer.getBounds(), { padding: [24, 24] });
    } else {
      map.setView(HOME_VIEW[0], HOME_VIEW[1]);
    }
  });

  /* ===== BANNER FLASH ===== */
  const flashBanner = document.getElementById("flashBanner");
  function flash(text, ms) {
    flashBanner.textContent = text;
    flashBanner.classList.add("show");
    clearTimeout(flash._t);
    flash._t = setTimeout(() => flashBanner.classList.remove("show"), ms || 2200);
  }

  /* ===== CUENTA REGRESIVA (silencio administrativo) ===== */
  const countdownBox = document.getElementById("countdownBox");
  const countdownNum = document.getElementById("countdownNum");
  const countdownApproved = document.getElementById("countdownApproved");
  let countdownTimer = null;

  function runCountdown() {
    countdownBox.classList.add("show");
    countdownApproved.classList.remove("show");
    countdownNum.style.display = "block";
    let n = 180;
    countdownNum.textContent = n;
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      n -= Math.ceil(180 / 22);
      if (n <= 0) {
        n = 0;
        countdownNum.textContent = n;
        clearInterval(countdownTimer);
        countdownNum.style.display = "none";
        countdownApproved.classList.add("show");
        flash("SIN RESPUESTA DEL ESTADO → COMPRA APROBADA", 3000);
        return;
      }
      countdownNum.textContent = n;
    }, 90);
  }
  function stopCountdown() {
    clearInterval(countdownTimer);
    countdownBox.classList.remove("show");
    countdownNum.style.display = "block";
    countdownApproved.classList.remove("show");
  }

  /* ===== TOGGLE ===== */
  const lawSwitch = document.getElementById("lawSwitch");
  const switchCaption = document.getElementById("switchCaption");
  const legendTitle = document.getElementById("legendTitle");
  const legendScale = document.getElementById("legendScale");
  const legendNote = document.getElementById("legendNote");

  function setMode(after) {
    afterMode = after;
    lawSwitch.classList.toggle("after", after);
    deptLayer.setStyle(styleDept);
    updateStats();
    updateProvBox(selectedProvince);
    infoBox.style.display = "none";

    if (after) {
      switchCaption.textContent =
        "Sin techo para privados extranjeros. Solo quedan restringidos los Estados extranjeros.";
      legendTitle.textContent = "Todo el país queda sin techo legal";
      legendScale.classList.remove("before");
      legendScale.classList.add("after");
      legendNote.textContent =
        "El color ya no indica riesgo relativo: sin límite normativo, cualquier % es posible en cualquier departamento.";
      flash("TECHO LEGAL ELIMINADO", 2200);
      runCountdown();
    } else {
      switchCaption.textContent =
        "Techo legal: 15% nacional / 30% por nacionalidad / 1.000 ha en zona núcleo.";
      legendTitle.textContent =
        "Intensidad de extranjerización (por depto., respecto al techo del 15%)";
      legendScale.classList.remove("after");
      legendScale.classList.add("before");
      legendNote.textContent =
        'Ninguna provincia llega hoy al techo legal en su totalidad — pero 32 departamentos, tomados de forma individual, ya superan el 15% (clickealos en el mapa).';
      stopCountdown();
    }
  }

  lawSwitch.addEventListener("click", () => setMode(!afterMode));

  /* ===== INIT ===== */
  async function boot() {
    try {
      const response = await fetch("./data.json");
      if (!response.ok) throw new Error("No se pudo cargar la información del mapa");
      ({ geoData, provinceBoundaries, provStats, nacStats } = await response.json());

      initLayers();
      populateProvSelect();
      updateStats();
    } catch (error) {
      document.getElementById("loading-overlay").innerHTML =
        '<p class="loading-text">Abrí el proyecto con un servidor local para cargar el mapa.</p>';
      console.error(error);
      return;
    }
    document.getElementById("loading-overlay").classList.add("fade-out");
  }

  boot();
})();
