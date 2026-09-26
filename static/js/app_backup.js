/* ╔══════════════════════════════════════════════════════╗
   ║  AI Dairy Cooperative – Supply Chain Platform JS    ║
   ╚══════════════════════════════════════════════════════╝ */

"use strict";

// ── State ────────────────────────────────────────────
let charts = {};

// ── Boot ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  updateClock();
  setInterval(updateClock, 1000);
  setupNav();
  loadPage("dashboard");
});

function updateClock() {
  const el = document.getElementById("topbar-time");
  if (el) el.textContent = new Date().toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

function setupNav() {
  document.querySelectorAll(".nav-item[data-page]").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      el.classList.add("active");
      const page = el.dataset.page;
      document.getElementById("page-title").textContent = el.textContent.trim();
      loadPage(page);
    });
  });
}

function loadPage(page) {
  destroyAllCharts();
  const content = document.getElementById("content");
  content.innerHTML = `<div class="loading">Loading ${page}…</div>`;

  const routes = {
    dashboard:    "/api/dashboard",
    farmers:      "/api/farmers",
    collection:   "/api/collection-centers",
    processing:   "/api/processing-plants",
    distributors: "/api/distributors",
    retailers:    "/api/retailers",
    forecast:     "/api/ai/demand-forecast",
    routes:       "/api/ai/route-optimization",
    alerts:       "/api/ai/quality-alerts",
    insights:     "/api/ai/production-insights",
    balance:      "/api/ai/supply-demand-balance",
  };

  fetch(routes[page])
    .then(r => r.json())
    .then(data => {
      const renderers = {
        dashboard:    renderDashboard,
        farmers:      renderFarmers,
        collection:   renderCollection,
        processing:   renderProcessing,
        distributors: renderDistributors,
        retailers:    renderRetailers,
        forecast:     renderForecast,
        routes:       renderRoutes,
        alerts:       renderAlerts,
        insights:     renderInsights,
        balance:      renderBalance,
      };
      renderers[page](data, content);
    })
    .catch(err => {
      content.innerHTML = `<div class="loading" style="color:#ef4444;">Error loading data: ${err.message}</div>`;
    });
}

function destroyAllCharts() {
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
  charts = {};
}

// ── Helpers ──────────────────────────────────────────
function fmtNum(n) { return Number(n).toLocaleString("en-IN"); }
function fmtK(n)   { return n >= 1000 ? (n/1000).toFixed(1)+"K" : n; }

function kpiCard(icon, label, value, sub="") {
  return `<div class="kpi-card">
    <div class="kpi-icon">${icon}</div>
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${value}</div>
    ${sub ? `<div class="kpi-sub">${sub}</div>` : ""}
  </div>`;
}

function progressBar(pct, label="") {
  const cls = pct > 85 ? "danger" : pct > 70 ? "warn" : "";
  return `<div style="font-size:.72rem;color:#57606a;">${label} ${pct}%</div>
    <div class="progress-bar-bg"><div class="progress-bar-fill ${cls}" style="width:${Math.min(pct,100)}%"></div></div>`;
}

function trendBadge(t) {
  if (t === "Increasing") return `<span class="trend-up">↑ ${t}</span>`;
  if (t === "Declining")  return `<span class="trend-down">↓ ${t}</span>`;
  return `<span class="trend-flat">→ ${t}</span>`;
}

function makeLineChart(id, labels, datasets, title="") {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.data,
        borderColor: ["#1a6db5","#22c55e","#f59e0b","#ef4444"][i % 4],
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.4,
      }))
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" }, title: { display: !!title, text: title } },
      scales: { y: { beginAtZero: false, grid: { color: "#f0f2f5" } }, x: { grid: { display: false } } }
    }
  });
}

function makeDoughnut(id, labels, data) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: ["#1a6db5","#22c55e","#f59e0b","#ef4444"], borderWidth: 2 }]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

function makeBarChart(id, labels, datasets) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: ["#1a6db5","#22c55e","#f59e0b","#ef4444"][i % 4],
      }))
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, grid: { color: "#f0f2f5" } }, x: { grid: { display: false } } }
    }
  });
}

// ── Page Renderers ───────────────────────────────────

// DASHBOARD
function renderDashboard(d, el) {
  const k = d.kpis;
  el.innerHTML = `
    <div class="kpi-grid">
      ${kpiCard("👨‍🌾","Total Farmers",    k.total_farmers,     "Active cooperative members")}
      ${kpiCard("🥛","Daily Production", fmtNum(k.daily_production_liters)+" L","Today's milk collected")}
      ${kpiCard("🏭","Collection Cntrs",  k.collection_centers, `Avg storage ${k.storage_utilization_pct}%`)}
      ${kpiCard("⚙️","Processing Plants", k.processing_plants,  `Avg util ${k.avg_plant_utilization_pct}%`)}
      ${kpiCard("🛒","Retail Partners",   k.total_retailers,   "Across 8 cities")}
      ${kpiCard("📦","Monthly Demand",    fmtK(k.monthly_demand_liters)+" L","Aggregate retail demand")}
      ${kpiCard("⭐","Avg Milk Quality",  k.avg_quality_score+"%","FAO Grade A standard")}
      ${kpiCard("🚚","On-Time Delivery",  k.on_time_delivery_pct+"%","Last 30 days")}
      ${kpiCard("🚨","Active AI Alerts",  d.alerts_count,      "Requires attention")}
    </div>

    <div class="chart-grid">
      <div class="chart-card">
        <div class="section-title">📈 30-Day Milk Production Trend (Litres)</div>
        <canvas id="chartProd"></canvas>
      </div>
      <div class="chart-card">
        <div class="section-title">🎯 Quality Score Distribution</div>
        <canvas id="chartQual"></canvas>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">🔗 Supply Chain Stage Overview</div>
      <table>
        <thead><tr>
          <th>Stage</th><th>Count</th><th>Key Metric</th><th>AI Status</th>
        </tr></thead>
        <tbody>
          <tr><td>🌾 Farm Collection</td><td>${k.total_farmers} farmers</td>
              <td>${fmtNum(k.daily_production_liters)} L/day</td>
              <td><span class="badge badge-green">Monitored</span></td></tr>
          <tr><td>🏭 Collection Centers</td><td>${k.collection_centers} centers</td>
              <td>${k.storage_utilization_pct}% utilization</td>
              <td><span class="badge badge-green">IoT Active</span></td></tr>
          <tr><td>⚙️ Processing Plants</td><td>${k.processing_plants} plants</td>
              <td>${k.avg_plant_utilization_pct}% avg capacity</td>
              <td><span class="badge badge-blue">Optimizing</span></td></tr>
          <tr><td>🚚 Distribution</td><td>4 distributors</td>
              <td>${k.on_time_delivery_pct}% on-time</td>
              <td><span class="badge badge-green">Route AI On</span></td></tr>
          <tr><td>🛒 Retail</td><td>${k.total_retailers} retailers</td>
              <td>${fmtK(k.monthly_demand_liters)} L/mo demand</td>
              <td><span class="badge badge-blue">Forecasting</span></td></tr>
        </tbody>
      </table>
    </div>`;

  setTimeout(() => {
    makeLineChart("chartProd", d.production_trend.labels,
      [{ label: "Daily Production (L)", data: d.production_trend.data }]);
    makeDoughnut("chartQual", d.quality_dist.labels, d.quality_dist.data);
  }, 50);
}

// FARMERS
function renderFarmers(d, el) {
  const rows = d.farmers.map(f => `
    <tr>
      <td><strong>${f.id}</strong></td>
      <td>${f.name}</td>
      <td>${f.village}</td>
      <td>${f.cows}</td>
      <td>${fmtNum(f.daily_yield_liters)} L</td>
      <td>
        <span class="badge ${f.quality_score>=95?"badge-green":f.quality_score>=90?"badge-blue":"badge-orange"}">
          ${f.quality_score}
        </span>
      </td>
      <td>${f.lat.toFixed(3)}°N, ${f.lng.toFixed(3)}°E</td>
    </tr>`).join("");

  el.innerHTML = `
    <div class="kpi-grid" style="margin-bottom:20px;">
      ${kpiCard("👨‍🌾","Total Farmers", d.total,"Active members")}
      ${kpiCard("🐄","Total Cows", fmtNum(d.farmers.reduce((s,f)=>s+f.cows,0)),"Productive livestock")}
      ${kpiCard("🥛","Total Daily Yield", fmtNum(d.farmers.reduce((s,f)=>s+f.daily_yield_liters,0))+" L","Combined production")}
    </div>
    <div class="table-card">
      <div class="table-card-header">👨‍🌾 Registered Farmers</div>
      <table>
        <thead><tr>
          <th>ID</th><th>Name</th><th>Village</th><th>Cows</th>
          <th>Daily Yield</th><th>Quality Score</th><th>Location</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// COLLECTION CENTERS
function renderCollection(d, el) {
  const rows = d.centers.map(c => `
    <tr>
      <td><strong>${c.id}</strong></td>
      <td>${c.name}</td>
      <td>${c.location}</td>
      <td>${fmtNum(c.capacity_liters)} L</td>
      <td>${fmtNum(c.current_stock)} L</td>
      <td>${progressBar(c.utilization_pct)}</td>
      <td>${c.temp_celsius}°C</td>
      <td><span class="badge ${c.status==="Critical"?"badge-red":c.status==="Warning"?"badge-orange":"badge-green"}">
        ${c.status}</span></td>
    </tr>`).join("");

  el.innerHTML = `
    <div class="table-card">
      <div class="table-card-header">🏭 Collection Center Status</div>
      <table>
        <thead><tr>
          <th>ID</th><th>Name</th><th>Location</th><th>Capacity</th>
          <th>Current Stock</th><th>Utilization</th><th>Temperature</th><th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// PROCESSING PLANTS
function renderProcessing(d, el) {
  const rows = d.plants.map(p => `
    <tr>
      <td><strong>${p.id}</strong></td>
      <td>${p.name}</td>
      <td>${p.location}</td>
      <td>${fmtNum(p.capacity_liters_per_day)} L/day</td>
      <td>${progressBar(p.utilization_pct)}</td>
      <td>${p.products.map(pr=>`<span class="badge badge-blue" style="margin:1px 2px;display:inline-block">${pr}</span>`).join("")}</td>
    </tr>`).join("");

  el.innerHTML = `
    <div class="table-card">
      <div class="table-card-header">⚙️ Processing Plants</div>
      <table>
        <thead><tr>
          <th>ID</th><th>Plant Name</th><th>Location</th>
          <th>Capacity</th><th>Utilization</th><th>Products</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// DISTRIBUTORS
function renderDistributors(d, el) {
  const rows = d.distributors.map(dist => `
    <tr>
      <td><strong>${dist.id}</strong></td>
      <td>${dist.name}</td>
      <td>${dist.region}</td>
      <td>${dist.delivery_routes}</td>
      <td>${dist.vehicles}</td>
      <td><span class="badge ${dist.on_time_pct>=95?"badge-green":dist.on_time_pct>=90?"badge-blue":"badge-orange"}">
        ${dist.on_time_pct}%</span></td>
    </tr>`).join("");

  el.innerHTML = `
    <div class="table-card">
      <div class="table-card-header">🚚 Distribution Network</div>
      <table>
        <thead><tr>
          <th>ID</th><th>Name</th><th>Region</th>
          <th>Routes</th><th>Vehicles</th><th>On-Time Delivery</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// RETAILERS
function renderRetailers(d, el) {
  const rows = d.retailers.map(r => `
    <tr>
      <td><strong>${r.id}</strong></td>
      <td>${r.name}</td>
      <td>${r.type}</td>
      <td>${r.city}</td>
      <td>${fmtNum(r.monthly_demand_liters)} L</td>
      <td>${fmtNum(r.current_stock_liters)} L</td>
      <td>${progressBar(Math.round((r.current_stock_liters/(r.monthly_demand_liters/30))*100))}</td>
    </tr>`).join("");

  el.innerHTML = `
    <div class="table-card">
      <div class="table-card-header">🛒 Retail Partners</div>
      <table>
        <thead><tr>
          <th>ID</th><th>Name</th><th>Type</th><th>City</th>
          <th>Monthly Demand</th><th>Current Stock</th><th>Days Coverage</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// DEMAND FORECAST
function renderForecast(d, el) {
  const first = d.forecasts[0];
  const cards = d.forecasts.map(f => `
    <div class="insight-card">
      <div class="insight-header">
        <div>
          <div class="insight-name">${f.retailer}</div>
          <div class="insight-detail">📍 ${f.city}</div>
        </div>
        <span class="badge badge-blue">${f.confidence_pct}% conf.</span>
      </div>
      <div class="insight-tip">
        7-day forecast: ${f.predicted_liters.map((v,i)=>`<strong>${v.toLocaleString()}L</strong>`).join(" · ")}
      </div>
    </div>`).join("");

  el.innerHTML = `
    <div style="margin-bottom:14px;">
      <span class="badge badge-blue">Model: ${d.model}</span>
      <span class="badge badge-green" style="margin-left:8px;">Accuracy: ${d.accuracy}</span>
    </div>
    <div class="chart-card" style="margin-bottom:20px;">
      <div class="section-title">🔮 7-Day Demand Forecast — Top 4 Retailers</div>
      <canvas id="chartForecast"></canvas>
    </div>
    <div class="insight-grid">${cards}</div>`;

  setTimeout(() => {
    const top4 = d.forecasts.slice(0, 4);
    makeLineChart("chartForecast", top4[0].days,
      top4.map(f => ({ label: f.retailer, data: f.predicted_liters })));
  }, 50);
}

// ROUTE OPTIMIZATION
function renderRoutes(d, el) {
  const rows = d.optimizations.map(o => `
    <tr>
      <td>${o.distributor}</td>
      <td>${o.region}</td>
      <td>${fmtNum(o.current_distance_km)} km</td>
      <td>${fmtNum(o.optimized_distance_km)} km</td>
      <td><span class="badge badge-green">-${o.cost_saving_pct}%</span></td>
      <td><span class="badge badge-blue">-${o.fuel_saving_pct}%</span></td>
    </tr>`).join("");

  const recs = d.optimizations.map(o => `
    <div class="alert-card alert-low">
      <div class="alert-icon">🗺️</div>
      <div>
        <div class="alert-title">${o.distributor} — ${o.region}</div>
        <div class="alert-msg">${o.recommendation}</div>
      </div>
    </div>`).join("");

  el.innerHTML = `
    <div style="margin-bottom:14px;">
      <span class="badge badge-blue">Algorithm: ${d.algorithm}</span>
    </div>
    <div class="chart-card" style="margin-bottom:20px;">
      <div class="section-title">📉 Distance Reduction by Distributor</div>
      <canvas id="chartRoutes"></canvas>
    </div>
    <div class="table-card" style="margin-bottom:20px;">
      <div class="table-card-header">Route Optimization Summary</div>
      <table>
        <thead><tr>
          <th>Distributor</th><th>Region</th><th>Current Dist.</th>
          <th>Optimized Dist.</th><th>Cost Saving</th><th>Fuel Saving</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="section-title">💡 AI Recommendations</div>
    ${recs}`;

  setTimeout(() => {
    makeBarChart("chartRoutes",
      d.optimizations.map(o => o.distributor.split(" ")[0]),
      [
        { label: "Current Distance (km)", data: d.optimizations.map(o => o.current_distance_km) },
        { label: "Optimized Distance (km)", data: d.optimizations.map(o => o.optimized_distance_km) },
      ]);
  }, 50);
}

// QUALITY ALERTS
function renderAlerts(d, el) {
  if (!d.alerts.length) {
    el.innerHTML = `<div class="alert-card alert-low"><div class="alert-icon">✅</div>
      <div><div class="alert-title">All Clear</div>
      <div class="alert-msg">No quality alerts at this time. All systems nominal.</div></div></div>`;
    return;
  }

  const cards = d.alerts.map(a => `
    <div class="alert-card alert-${a.severity.toLowerCase()}">
      <div class="alert-icon">${a.severity==="High"?"🔴":"🟡"}</div>
      <div>
        <div class="alert-title">${a.center} — ${a.alert_type}
          <span class="badge ${a.severity==="High"?"badge-red":"badge-orange"}" style="margin-left:8px;">${a.severity}</span>
        </div>
        <div class="alert-msg">${a.message}</div>
        <div class="alert-action">→ ${a.action}</div>
      </div>
    </div>`).join("");

  el.innerHTML = `
    <div style="margin-bottom:14px;">
      <span class="badge badge-blue">Monitoring: ${d.monitoring}</span>
      <span class="badge badge-red" style="margin-left:8px;">${d.alerts.length} Active Alert${d.alerts.length>1?"s":""}</span>
    </div>
    ${cards}`;
}

// PRODUCTION INSIGHTS
function renderInsights(d, el) {
  const cards = d.insights.map(f => `
    <div class="insight-card">
      <div class="insight-header">
        <div>
          <div class="insight-name">${f.name} <span style="font-weight:400;color:#57606a;">(${f.farmer_id})</span></div>
          <div class="insight-detail">📍 ${f.village} · 🐄 Quality: ${f.quality_score}</div>
        </div>
        ${trendBadge(f.trend)}
      </div>
      <div class="insight-detail">Daily yield: <strong>${fmtNum(f.daily_yield)} L</strong></div>
      <div class="insight-tip">💡 ${f.suggestion}</div>
    </div>`).join("");

  const trend_counts = {
    Increasing: d.insights.filter(i=>i.trend==="Increasing").length,
    Stable:     d.insights.filter(i=>i.trend==="Stable").length,
    Declining:  d.insights.filter(i=>i.trend==="Declining").length,
  };

  el.innerHTML = `
    <div style="margin-bottom:14px;">
      <span class="badge badge-blue">Model: ${d.model}</span>
    </div>
    <div class="kpi-grid" style="margin-bottom:20px;">
      ${kpiCard("↑","Increasing Yield", trend_counts.Increasing,"Farmers")}
      ${kpiCard("→","Stable Yield",     trend_counts.Stable,"Farmers")}
      ${kpiCard("↓","Declining Yield",  trend_counts.Declining,"Farmers — needs attention")}
    </div>
    <div class="chart-card" style="margin-bottom:20px;">
      <div class="section-title">📊 Quality Score per Farmer</div>
      <canvas id="chartInsights"></canvas>
    </div>
    <div class="section-title" style="margin-bottom:12px;">💡 Individual AI Recommendations</div>
    <div class="insight-grid">${cards}</div>`;

  setTimeout(() => {
    makeBarChart("chartInsights",
      d.insights.map(f => f.name.split(" ")[0]),
      [{ label: "Quality Score", data: d.insights.map(f => f.quality_score) }]);
  }, 50);
}

// SUPPLY-DEMAND BALANCE
function renderBalance(d, el) {
  const isPlus = d.surplus_deficit_liters >= 0;
  const sup = d.supply_by_region;
  const dem = d.demand_by_region;
  const regions = Object.keys(sup);

  el.innerHTML = `
    <div class="balance-panel">
      <div class="balance-card">
        <div class="balance-title">Monthly Supply</div>
        <div class="balance-value">${fmtK(d.monthly_supply_liters)}</div>
        <div class="balance-unit">Litres</div>
      </div>
      <div class="balance-card">
        <div class="balance-title">Monthly Demand</div>
        <div class="balance-value">${fmtK(d.monthly_demand_liters)}</div>
        <div class="balance-unit">Litres</div>
      </div>
    </div>
    <div class="rec-box">
      <strong>${isPlus?"✅ Surplus":"⚠️ Deficit"}:</strong>
      ${Math.abs(d.surplus_deficit_liters).toLocaleString()} L —
      ${d.recommendation}
    </div>
    <div class="chart-card" style="margin-bottom:20px;">
      <div class="section-title">🗺️ Regional Supply vs. Demand (Litres / month)</div>
      <canvas id="chartBalance"></canvas>
    </div>`;

  setTimeout(() => {
    makeBarChart("chartBalance", regions, [
      { label: "Supply", data: regions.map(r => sup[r]) },
      { label: "Demand", data: regions.map(r => dem[r]) },
    ]);
  }, 50);
}
