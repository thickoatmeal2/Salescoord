let currentData = [];
let numericCols = [];
let sourceCol = null;
let periodCol = null;
let selectedPeriod = 'weekly';

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

function goBack(){ document.getElementById('resultsPage').classList.remove('active'); document.getElementById('uploadPage').classList.add('active'); }
function showResults(){ document.getElementById('uploadPage').classList.remove('active'); document.getElementById('resultsPage').classList.add('active'); }
function closeModal(){ document.getElementById('modalOverlay').style.display='none'; }

const contacts = {
  "North": "Contact: Jane Doe — jane@salescoord.com",
  "South": "Contact: Mike Lee — mike@salescoord.com",
  "East": "Contact: Ana Ruiz — ana@salescoord.com",
  "West": "Contact: Sam Patel — sam@salescoord.com"
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

// ---------- Sample data generation ----------
function generateRandomData(){
  const regions = ["North","South","East","West"];
  const countMap = { weekly: 12, monthly: 12, quarterly: 8 };
  const count = countMap[selectedPeriod];
  const labels = genPeriodLabels(selectedPeriod, count);
  const clamp = v => Math.min(100, Math.max(25, v));
  const data = [];

  for (let i = 0; i < count; i++) {
    const discount = Math.random()*30;
    const units = 1000 + i*15 + discount*20 + Math.random()*100;
    const cost = 60 + Math.random()*10;
    const revenue = (100-discount)*units;
    const margin = ((100-discount)-cost)/(100-discount)*100;

    const orderProcessingEfficiency = clamp(55 + units/40 - discount*0.6 + i*0.6 + (Math.random()*10 - 5));
    const operationalSupport = clamp(80 - discount*1.1 + (Math.random()*12 - 6));
    const inventoryTracking = clamp(60 + (orderProcessingEfficiency - 55)*0.5 + (Math.random()*14 - 7));
    const interdeptComms = clamp(50 + operationalSupport*0.3 + (Math.random()*16 - 8));

    data.push({
      Period: labels[i],
      Source: regions[Math.floor(Math.random()*regions.length)],
      Revenue: Math.round(revenue),
      Cost: Math.round(cost),
      Units: Math.round(units),
      Discount: Math.round(discount),
      Margin: Math.round(margin),
      OrderProcessingEfficiency: Math.round(orderProcessingEfficiency),
      OperationalSupport: Math.round(operationalSupport),
      InventoryAssetTracking: Math.round(inventoryTracking),
      InterdeptComms: Math.round(interdeptComms)
    });
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
  currentData = data;
  const cols = Object.keys(data[0]);
  sourceCol = cols.find(c => /source|region|location|salesperson|store/i.test(c)) || null;
  periodCol = cols.find(c => /period|week|month|quarter|date/i.test(c)) || null;
  numericCols = cols.filter(c => c !== sourceCol && c !== periodCol && data.every(r => !isNaN(parseFloat(r[c]))));
  displayTable(data, cols);
  const results = computeCorrelations(data);
  renderCorrelations(results);
  renderSummary(data, results);
  showResults();
}

function displayTable(data, cols){
  let html = '<table><tr>' + cols.map(c=>`<th>${labelize(c)}</th>`).join('') + '</tr>';
  data.slice(0,12).forEach((row, ri) => {
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

  if (col === sourceCol) {
    const val = row[col];
    modalTitle.textContent = val;
    modalBody.textContent = contacts[val] || "Contact info not available.";
  } else if (col === periodCol) {
    let text = '';
    numericCols.forEach(c => { text += `${labelize(c)}: ${row[c]}\n`; });
    modalTitle.textContent = row[col];
    modalBody.textContent = text;
  } else {
    let text = `Value: ${row[col]}\n\nRelated columns:\n`;
    numericCols.filter(c => c !== col).forEach(other => {
      const x = currentData.map(r => parseFloat(r[col]));
      const y = currentData.map(r => parseFloat(r[other]));
      const r = pearsonCorrelation(x,y);
      text += `${labelize(other)}: r=${r.toFixed(2)} (${r>0?'positive':'negative'})\n`;
    });
    modalTitle.textContent = labelize(col);
    modalBody.textContent = text;
  }
  document.getElementById('modalOverlay').style.display = 'flex';
}

function pearsonCorrelation(x,y){
  const n=x.length;
  const sumX=x.reduce((a,b)=>a+b,0), sumY=y.reduce((a,b)=>a+b,0);
  const sumXY=x.reduce((s,xi,i)=>s+xi*y[i],0);
  const sumX2=x.reduce((s,xi)=>s+xi*xi,0), sumY2=y.reduce((s,yi)=>s+yi*yi,0);
  const num=n*sumXY-sumX*sumY;
  const den=Math.sqrt((n*sumX2-sumX*sumX)*(n*sumY2-sumY*sumY));
  return den===0?0:num/den;
}

function computeCorrelations(data){
  let results=[];
  for(let i=0;i<numericCols.length;i++){
    for(let j=i+1;j<numericCols.length;j++){
      const colA=numericCols[i],colB=numericCols[j];
      const x=data.map(r=>parseFloat(r[colA])), y=data.map(r=>parseFloat(r[colB]));
      results.push({colA,colB,r:pearsonCorrelation(x,y)});
    }
  }
  results.sort((a,b)=>Math.abs(b.r)-Math.abs(a.r));
  return results;
}

function renderCorrelations(results){
  const container=document.getElementById('corrList');
  container.innerHTML='';
  results.forEach(res=>{
    const strong = Math.abs(res.r) > 0.7 ? 'strong' : '';
    const dir = res.r > 0 ? 'pos' : 'neg';
    container.innerHTML += `<div class="corr-item ${dir} ${strong}">
      <span class="pair">${labelize(res.colA)} &harr; ${labelize(res.colB)}</span>
      <span class="rval">r = ${res.r.toFixed(2)}</span>
    </div>`;
  });
}

function renderSummary(data, results){
  const el = document.getElementById('summaryText');
  const n = data.length;

  // Strongest cross-metric relationships
  const notable = results.filter(r => Math.abs(r.r) >= 0.5).slice(0, 3);
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
    para1 += `The relationship between ${labelize(top.colA)} and ${labelize(top.colB)} is the most pronounced pattern — the two ${topDir} closely enough that it's worth digging into whether one is driving the other, or whether both are responding to a shared underlying factor.`;
  } else {
    para1 = `Across the ${n} periods in this dataset, no strong linear relationships emerged between the tracked metrics — most pairs move largely independently of one another.`;
  }

  // Trend over time, if a period column is present
  let para2 = '';
  if (periodCol && numericCols.length) {
    const idx = data.map((_, i) => i);
    const trendCandidates = numericCols.map(col => {
      const y = data.map(r => parseFloat(r[col]));
      return { col, r: pearsonCorrelation(idx, y), first: y[0], last: y[y.length-1] };
    }).sort((a,b) => Math.abs(b.r) - Math.abs(a.r));

    const movers = trendCandidates.filter(t => Math.abs(t.r) >= 0.4).slice(0, 2);
    if (movers.length) {
      const sentences = movers.map(m => {
        const dir = m.r > 0 ? 'climbed' : 'declined';
        return `${labelize(m.col)} ${dir} from ${m.first} to ${m.last}`;
      });
      para2 = ` Over time, ${sentences.join(', while ')}, suggesting a directional trend rather than random noise.`;
    }
  }

  const caveat = `These are statistical associations observed in this dataset, not confirmed cause-and-effect relationships — treat them as starting points for investigation rather than conclusions.`;

  el.innerHTML = `<p>${para1}${para2}</p><p class="caveat">${caveat}</p>`;
}
