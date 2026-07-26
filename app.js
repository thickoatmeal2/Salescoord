let currentData = [];
let numericCols = [];
let sourceCol = null;
let periodCol = null;
let selectedPeriod = 'weekly';
let chartInstances = {}; // keep track of Chart.js instances for cleanup

// ---------- Theme ----------
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', (e) => {
  const opt = e.target.closest('.opt');
  if (!opt) return;
  document.body.setAttribute('data-theme', opt.dataset.mode);
  themeToggle.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o === opt));
});

// ---------- Period selector ----------
const periodToggle = document.getElementById('periodToggle');
periodToggle.addEventListener('click', (e) => {
  const opt = e.target.closest('.opt');
  if (!opt) return;
  selectedPeriod = opt.dataset.period;
  periodToggle.querySelectorAll('.opt').forEach(o => o.classList.toggle('active', o === opt));
});

// ---------- Upload wiring ----------
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

function goBack(){
  document.getElementById('resultsPage').classList.remove('active');
  document.getElementById('uploadPage').classList.add('active');
  destroyCharts();
}
function showResults(){
  document.getElementById('uploadPage').classList.remove('active');
  document.getElementById('resultsPage').classList.add('active');
}
function closeModal(){
  document.getElementById('modalOverlay').style.display = 'none';
  if (chartInstances.modal) {
    chartInstances.modal.destroy();
    chartInstances.modal = null;
  }
}

function destroyCharts() {
  Object.keys(chartInstances).forEach(k => {
    if (chartInstances[k]) {
      chartInstances[k].destroy();
      chartInstances[k] = null;
    }
  });
}

// Rich contact / owner map used for different source types
const sourceMeta = {
  // Regions
  "North Region": "Owner: Jane Doe — jane@salescoord.com",
  "South Region": "Owner: Mike Lee — mike@salescoord.com",
  "East Region": "Owner: Ana Ruiz — ana@salescoord.com",
  "West Region": "Owner: Sam Patel — sam@salescoord.com",
  "Central Region": "Owner: Priya Shah — priya@salescoord.com",
  // Salespeople
  "Alex Rivera": "Rep: Alex Rivera — alex.r@salescoord.com",
  "Jordan Lee": "Rep: Jordan Lee — jordan.l@salescoord.com",
  "Sam Ortiz": "Rep: Sam Ortiz — sam.o@salescoord.com",
  "Taylor Kim": "Rep: Taylor Kim — taylor.k@salescoord.com",
  "Casey Morgan": "Rep: Casey Morgan — casey.m@salescoord.com",
  // Stores
  "Downtown Hub": "Store Mgr: Lila Chen — lila@salescoord.com",
  "Westside Outlet": "Store Mgr: Omar Hassan — omar@salescoord.com",
  "Harbor Plaza": "Store Mgr: Nina Volkov — nina@salescoord.com",
  "Airport Kiosk": "Store Mgr: Ben Carter — ben@salescoord.com",
  "University Shop": "Store Mgr: Maya Singh — maya@salescoord.com",
  // Campaigns
  "Summer Blast 2025": "Campaign Lead: Riley Quinn — riley@salescoord.com",
  "Back-to-School Push": "Campaign Lead: Avery Brooks — avery@salescoord.com",
  "Holiday Glow": "Campaign Lead: Quinn Ellis — quinn@salescoord.com",
  "Flash Friday": "Campaign Lead: Morgan Day — morgan@salescoord.com",
  "Loyalty Boost": "Campaign Lead: Jamie Fox — jamie@salescoord.com",
  // Locations / Cities
  "Austin TX": "Territory: Southwest — contact ops@salescoord.com",
  "Seattle WA": "Territory: Northwest — contact ops@salescoord.com",
  "Miami FL": "Territory: Southeast — contact ops@salescoord.com",
  "Chicago IL": "Territory: Midwest — contact ops@salescoord.com",
  "Denver CO": "Territory: Mountain — contact ops@salescoord.com"
};

// ---------- Period label generation ----------
function genPeriodLabels(type, count) {
  const now = new Date();
  const labels = [];
  if (type === 'weekly') {
    for (let i = count - 1; i >= 0; i--) labels.push(`Wk ${count - i}`);
  } else if (type === 'monthly') {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
    }
  } else { // quarterly
    const curQ = Math.floor(now.getMonth() / 3);
    let y = now.getFullYear(), q = curQ;
    const seq = [];
    for (let i = 0; i < count; i++) {
      seq.unshift(`Q${q+1} ${y}`);
      q--; if (q < 0) { q = 3; y--; }
    }
    labels.push(...seq);
  }
  return labels;
}

// ---------- Sample data scenarios ----------
const scenarios = [
  {
    name: "Regional Performance",
    sourceKey: "Region",
    sources: ["North Region", "South Region", "East Region", "West Region", "Central Region"],
    metrics: ["Revenue", "UnitsSold", "AvgDiscount", "GrossMargin", "OrderFillRate", "SupportTickets"]
  },
  {
    name: "Salesperson Leaderboard",
    sourceKey: "Salesperson",
    sources: ["Alex Rivera", "Jordan Lee", "Sam Ortiz", "Taylor Kim", "Casey Morgan"],
    metrics: ["Revenue", "DealsClosed", "AvgDealSize", "WinRate", "PipelineValue", "FollowUpScore"]
  },
  {
    name: "Store Operations",
    sourceKey: "Store",
    sources: ["Downtown Hub", "Westside Outlet", "Harbor Plaza", "Airport Kiosk", "University Shop"],
    metrics: ["Revenue", "FootTraffic", "ConversionRate", "InventoryTurn", "StaffHours", "CustomerNPS"]
  },
  {
    name: "Campaign Analytics",
    sourceKey: "Campaign",
    sources: ["Summer Blast 2025", "Back-to-School Push", "Holiday Glow", "Flash Friday", "Loyalty Boost"],
    metrics: ["Revenue", "AdSpend", "ROAS", "Clicks", "Conversions", "CPA"]
  },
  {
    name: "City Territory",
    sourceKey: "Location",
    sources: ["Austin TX", "Seattle WA", "Miami FL", "Chicago IL", "Denver CO"],
    metrics: ["Revenue", "ActiveAccounts", "ChurnRate", "UpsellRate", "SupportSLA", "Satisfaction"]
  }
];

function generateRandomData(){
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  const countMap = { weekly: 12, monthly: 12, quarterly: 8 };
  const count = countMap[selectedPeriod];
  const labels = genPeriodLabels(selectedPeriod, count);
  const clamp = (v, min=0, max=100) => Math.min(max, Math.max(min, v));
  const data = [];

  // Pick 3–4 sources from the scenario so the table stays readable
  const chosenSources = scenario.sources
    .sort(() => Math.random() - 0.5)
    .slice(0, 3 + Math.floor(Math.random() * 2));

  for (let i = 0; i < count; i++) {
    const src = chosenSources[Math.floor(Math.random() * chosenSources.length)];
    const row = {
      Period: labels[i],
      [scenario.sourceKey]: src
    };

    // Generate correlated-ish numbers depending on scenario
    const baseGrowth = i * (8 + Math.random() * 6);
    const noise = () => (Math.random() - 0.5) * 18;

    if (scenario.name === "Regional Performance") {
      const discount = clamp(8 + Math.random() * 22 + noise() * 0.3, 0, 35);
      const units = Math.round(900 + baseGrowth * 12 + discount * 18 + noise() * 40);
      const revenue = Math.round((100 - discount) * units * (0.9 + Math.random() * 0.2));
      row.Revenue = revenue;
      row.UnitsSold = units;
      row.AvgDiscount = Math.round(discount);
      row.GrossMargin = Math.round(clamp(42 - discount * 0.7 + noise() * 0.4, 18, 65));
      row.OrderFillRate = Math.round(clamp(78 + (units / 80) - discount * 0.4 + noise(), 55, 99));
      row.SupportTickets = Math.round(clamp(40 + discount * 1.2 - (units / 120) + noise(), 5, 90));
    }
    else if (scenario.name === "Salesperson Leaderboard") {
      const winRate = clamp(35 + Math.random() * 40 + baseGrowth * 0.15 + noise() * 0.5, 20, 92);
      const deals = Math.round(6 + i * 0.9 + winRate * 0.12 + noise() * 0.6);
      const avgDeal = Math.round(1800 + Math.random() * 3200 + baseGrowth * 40);
      row.Revenue = Math.round(deals * avgDeal * (0.85 + Math.random() * 0.3));
      row.DealsClosed = deals;
      row.AvgDealSize = avgDeal;
      row.WinRate = Math.round(winRate);
      row.PipelineValue = Math.round(row.Revenue * (1.4 + Math.random() * 1.1));
      row.FollowUpScore = Math.round(clamp(50 + winRate * 0.35 + noise(), 30, 98));
    }
    else if (scenario.name === "Store Operations") {
      const traffic = Math.round(1200 + baseGrowth * 25 + noise() * 80);
      const conv = clamp(12 + Math.random() * 18 + (traffic / 400) * 0.3 + noise() * 0.4, 6, 38);
      row.Revenue = Math.round(traffic * conv * (4.5 + Math.random() * 3));
      row.FootTraffic = traffic;
      row.ConversionRate = Math.round(conv * 10) / 10;
      row.InventoryTurn = Math.round(clamp(3.2 + conv * 0.08 + noise() * 0.1, 1.5, 9) * 10) / 10;
      row.StaffHours = Math.round(clamp(180 + traffic * 0.04 + noise() * 8, 120, 320));
      row.CustomerNPS = Math.round(clamp(35 + conv * 1.1 + noise(), 10, 85));
    }
    else if (scenario.name === "Campaign Analytics") {
      const spend = Math.round(800 + baseGrowth * 90 + Math.random() * 1200);
      const clicks = Math.round(spend * (2.8 + Math.random() * 4) + noise() * 30);
      const convs = Math.round(clicks * (0.03 + Math.random() * 0.07));
      const revenue = Math.round(convs * (45 + Math.random() * 90));
      row.Revenue = revenue;
      row.AdSpend = spend;
      row.ROAS = Math.round((revenue / spend) * 100) / 100;
      row.Clicks = clicks;
      row.Conversions = convs;
      row.CPA = Math.round((spend / Math.max(convs, 1)) * 100) / 100;
    }
    else { // City Territory
      const accounts = Math.round(80 + baseGrowth * 3.5 + noise() * 6);
      const churn = clamp(4 + Math.random() * 12 - baseGrowth * 0.05 + noise() * 0.3, 1, 22);
      row.Revenue = Math.round(accounts * (220 + Math.random() * 180) * (1 - churn / 100));
      row.ActiveAccounts = accounts;
      row.ChurnRate = Math.round(churn * 10) / 10;
      row.UpsellRate = Math.round(clamp(8 + (100 - churn) * 0.12 + noise() * 0.4, 3, 28) * 10) / 10;
      row.SupportSLA = Math.round(clamp(88 - churn * 1.5 + noise(), 60, 99));
      row.Satisfaction = Math.round(clamp(62 + (100 - churn) * 0.25 + noise(), 40, 95));
    }

    data.push(row);
  }

  loadData(data);
}

function handleFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(event){
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, {type:'array'});
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    loadData(json);
  };
  reader.readAsArrayBuffer(file);
}

function labelize(col) {
  return col.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
}

function loadData(data){
  destroyCharts();
  currentData = data;
  if (!data.length) return;
  const cols = Object.keys(data[0]);
  sourceCol = cols.find(c => /source|region|location|salesperson|store|campaign|territory|city/i.test(c)) || null;
  periodCol = cols.find(c => /period|week|month|quarter|date/i.test(c)) || null;
  numericCols = cols.filter(c => c !== sourceCol && c !== periodCol && data.every(r => !isNaN(parseFloat(r[c]))));
  displayTable(data, cols);
  const results = computeCorrelations(data);
  renderCorrelations(results);
  renderSummary(data, results);
  showResults();
}

function displayTable(data, cols){
  let html = '<table><tr>' + cols.map(c => `<th>${labelize(c)}</th>`).join('') + '</tr>';
  data.slice(0, 14).forEach((row, ri) => {
    html += '<tr>' + cols.map(c => {
      let cls = '';
      if (c === sourceCol) cls = 'source-cell';
      if (c === periodCol) cls = 'period-cell';
      return `<td class="${cls}" onclick="cellClick(${ri}, '${c}')">${row[c]}</td>`;
    }).join('') + '</tr>';
  });
  html += '</table>';
  document.getElementById('tableContainer').innerHTML = html;
}

function cellClick(rowIndex, col){
  const row = currentData[rowIndex];
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalChartWrap = document.getElementById('modalChartWrap');

  // Clear previous chart
  if (chartInstances.modal) {
    chartInstances.modal.destroy();
    chartInstances.modal = null;
  }
  modalChartWrap.style.display = 'none';

  if (col === sourceCol) {
    const val = row[col];
    modalTitle.textContent = val;
    modalBody.textContent = sourceMeta[val] || "Contact info not available for this source.";
  } else if (col === periodCol) {
    let text = '';
    numericCols.forEach(c => { text += `${labelize(c)}: ${row[c]}\n`; });
    modalTitle.textContent = String(row[col]);
    modalBody.textContent = text;
  } else {
    let text = `Value: ${row[col]}\n\nRelated columns (Pearson r):\n`;
    numericCols.filter(c => c !== col).forEach(other => {
      const x = currentData.map(r => parseFloat(r[col]));
      const y = currentData.map(r => parseFloat(r[other]));
      const r = pearsonCorrelation(x, y);
      text += `${labelize(other)}: r = ${r.toFixed(2)} (${r > 0 ? 'positive' : 'negative'})\n`;
    });
    modalTitle.textContent = labelize(col);
    modalBody.textContent = text;
  }
  document.getElementById('modalOverlay').style.display = 'flex';
}

function pearsonCorrelation(x, y){
  const n = x.length;
  const sumX = x.reduce((a,b) => a+b, 0);
  const sumY = y.reduce((a,b) => a+b, 0);
  const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
  const sumX2 = x.reduce((s, xi) => s + xi*xi, 0);
  const sumY2 = y.reduce((s, yi) => s + yi*yi, 0);
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

function computeCorrelations(data){
  let results = [];
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const colA = numericCols[i], colB = numericCols[j];
      const x = data.map(r => parseFloat(r[colA]));
      const y = data.map(r => parseFloat(r[colB]));
      results.push({ colA, colB, r: pearsonCorrelation(x, y) });
    }
  }
  results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  return results;
}

function renderCorrelations(results){
  const container = document.getElementById('corrList');
  container.innerHTML = '';
  results.forEach((res, idx) => {
    const strong = Math.abs(res.r) > 0.7 ? 'strong' : '';
    const dir = res.r > 0 ? 'pos' : 'neg';
    const div = document.createElement('div');
    div.className = `corr-item ${dir} ${strong}`;
    div.innerHTML = `
      <span class="pair">${labelize(res.colA)} ↔ ${labelize(res.colB)} <span class="hint">click for chart</span></span>
      <span class="rval">r = ${res.r.toFixed(2)}</span>
    `;
    div.addEventListener('click', () => showCorrelationChart(res));
    container.appendChild(div);
  });
}

function getPeriodLabels() {
  if (periodCol) {
    return currentData.map(r => String(r[periodCol]));
  }
  return currentData.map((_, i) => `Row ${i + 1}`);
}

function showCorrelationChart(res) {
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalChartWrap = document.getElementById('modalChartWrap');
  const canvas = document.getElementById('modalChart');

  if (chartInstances.modal) {
    chartInstances.modal.destroy();
    chartInstances.modal = null;
  }

  const labels = getPeriodLabels();
  const seriesA = currentData.map(r => parseFloat(r[res.colA]));
  const seriesB = currentData.map(r => parseFloat(r[res.colB]));

  const strength = Math.abs(res.r) > 0.75 ? 'strong' : (Math.abs(res.r) > 0.5 ? 'moderate' : 'weak');
  const direction = res.r > 0 ? 'positive' : 'negative';

  modalTitle.textContent = `${labelize(res.colA)} ↔ ${labelize(res.colB)}`;
  modalBody.textContent = `Pearson r = ${res.r.toFixed(3)} (${strength} ${direction} correlation).\n\nThe chart below shows both series over the periods in this dataset.`;

  modalChartWrap.style.display = 'block';

  const isDay = document.body.getAttribute('data-theme') === 'day';
  const textColor = isDay ? '#1a2030' : '#dce6f2';
  const gridColor = isDay ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  chartInstances.modal = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: labelize(res.colA),
          data: seriesA,
          borderColor: '#35e4ec',
          backgroundColor: 'rgba(53,228,236,0.12)',
          tension: 0.3,
          fill: false,
          pointRadius: 3,
          borderWidth: 2
        },
        {
          label: labelize(res.colB),
          data: seriesB,
          borderColor: '#ffab2e',
          backgroundColor: 'rgba(255,171,46,0.12)',
          tension: 0.3,
          fill: false,
          pointRadius: 3,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: textColor, font: { family: "'IBM Plex Mono', monospace", size: 11 } }
        }
      },
      scales: {
        x: {
          title: { display: true, text: periodCol ? labelize(periodCol) : 'Period', color: textColor, font: { size: 12 } },
          ticks: { color: textColor, maxRotation: 45, font: { size: 10 } },
          grid: { color: gridColor }
        },
        y: {
          title: { display: true, text: 'Value', color: textColor, font: { size: 12 } },
          ticks: { color: textColor, font: { size: 10 } },
          grid: { color: gridColor }
        }
      }
    }
  });

  document.getElementById('modalOverlay').style.display = 'flex';
}

function renderSummary(data, results){
  const el = document.getElementById('summaryText');
  const chartWrap = document.getElementById('summaryChartWrap');
  const canvas = document.getElementById('summaryChart');
  const n = data.length;

  // Clean previous summary chart
  if (chartInstances.summary) {
    chartInstances.summary.destroy();
    chartInstances.summary = null;
  }

  const notable = results.filter(r => Math.abs(r.r) >= 0.45).slice(0, 3);
  let para1;
  if (notable.length) {
    const clauses = notable.map(res => {
      const strength = Math.abs(res.r) > 0.75 ? 'strong' : 'moderate';
      const dir = res.r > 0 ? 'positive' : 'negative';
      return `${labelize(res.colA)} and ${labelize(res.colB)} show a ${strength} ${dir} correlation (r = ${res.r.toFixed(2)})`;
    });
    para1 = `Across the ${n} periods in this dataset, ${clauses.join('; ')}. `;
    const top = notable[0];
    const topDir = top.r > 0 ? 'move together' : 'move in opposite directions';
    para1 += `The strongest pattern is between ${labelize(top.colA)} and ${labelize(top.colB)} — the two ${topDir} closely enough that it is worth investigating whether one drives the other or both respond to a shared factor.`;
  } else {
    para1 = `Across the ${n} periods in this dataset, no strong linear relationships emerged between the tracked metrics — most pairs move largely independently of one another.`;
  }

  let para2 = '';
  if (periodCol && numericCols.length) {
    const idx = data.map((_, i) => i);
    const trendCandidates = numericCols.map(col => {
      const y = data.map(r => parseFloat(r[col]));
      return { col, r: pearsonCorrelation(idx, y), first: y[0], last: y[y.length - 1] };
    }).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    const movers = trendCandidates.filter(t => Math.abs(t.r) >= 0.4).slice(0, 2);
    if (movers.length) {
      const sentences = movers.map(m => {
        const dir = m.r > 0 ? 'climbed' : 'declined';
        return `${labelize(m.col)} ${dir} from ${m.first} to ${m.last}`;
      });
      para2 = ` Over time, ${sentences.join(', while ')}, suggesting a directional trend rather than pure noise.`;
    }
  }

  const caveat = `These are statistical associations observed in this dataset, not confirmed cause-and-effect relationships — treat them as starting points for investigation rather than conclusions.`;

  el.innerHTML = `<p>${para1}${para2}</p><p class="caveat">${caveat}</p>`;

  // Draw top correlation chart if we have a notable pair
  if (notable.length) {
    const top = notable[0];
    const labels = getPeriodLabels();
    const seriesA = data.map(r => parseFloat(r[top.colA]));
    const seriesB = data.map(r => parseFloat(r[top.colB]));

    chartWrap.style.display = 'block';

    const isDay = document.body.getAttribute('data-theme') === 'day';
    const textColor = isDay ? '#1a2030' : '#dce6f2';
    const gridColor = isDay ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

    chartInstances.summary = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: labelize(top.colA),
            data: seriesA,
            borderColor: '#35e4ec',
            backgroundColor: 'rgba(53,228,236,0.1)',
            tension: 0.3,
            fill: false,
            pointRadius: 3,
            borderWidth: 2.5
          },
          {
            label: labelize(top.colB),
            data: seriesB,
            borderColor: '#ffab2e',
            backgroundColor: 'rgba(255,171,46,0.1)',
            tension: 0.3,
            fill: false,
            pointRadius: 3,
            borderWidth: 2.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: textColor, font: { family: "'IBM Plex Mono', monospace", size: 12 } }
          },
          title: {
            display: true,
            text: `Strongest pair: ${labelize(top.colA)} ↔ ${labelize(top.colB)}  (r = ${top.r.toFixed(2)})`,
            color: textColor,
            font: { family: "'Space Grotesk', sans-serif", size: 13, weight: '600' },
            padding: { bottom: 10 }
          }
        },
        scales: {
          x: {
            title: { display: true, text: periodCol ? labelize(periodCol) : 'Period', color: textColor, font: { size: 12 } },
            ticks: { color: textColor, maxRotation: 45, font: { size: 10 } },
            grid: { color: gridColor }
          },
          y: {
            title: { display: true, text: 'Value', color: textColor, font: { size: 12 } },
            ticks: { color: textColor, font: { size: 10 } },
            grid: { color: gridColor }
          }
        }
      }
    });
  } else {
    chartWrap.style.display = 'none';
  }
}
