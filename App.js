// ─────────────────────────────────────────────────────────────
//  KNN Retail Recommender — Lógica da Aplicação
// ─────────────────────────────────────────────────────────────

// ── GLOBALS ──────────────────────────────────────────────────
let customerMatrix = {};
let products       = [];
let customers      = [];
let normalizedMatrix = [];
let kmeansLabels   = [];
let pcaPoints      = [];
let segmentProducts = {};
let scatterChart   = null;
let donutChart     = null;
let topCharts      = {};
let columnMap      = {};       // { customer, product, quantity(opt), price(opt) }
let quantityMode   = 'binary'; // 'binary' | 'price'
let parsedRawRows  = [];
let parsedFileName = '';
let cooccurrence   = null;     // matriz de co-ocorrência produto x produto (Float32Array[])
let binaryMatrix   = [];       // matriz binária cliente x produto (mesma ordem de normalizedMatrix)
let productIndex   = {};       // mapa produto → índice numérico para lookup O(1)

// ── HEURISTIC COLUMN DETECTION ───────────────────────────────
const HINTS = {
  customer: ['customerid','customer_id','client_id','clientid','user_id','userid','customer','client','user','buyer','conta','cliente','usuario'],
  product:  ['description','product','productname','product_name','item','itemname','item_name','stockcode','sku','produto','descricao','descricção','nome'],
  quantity: ['quantity','qty','qtd','amount','units','quant','quantidade'],
  price:    ['unitprice','price','valor','preco','preço','unit_price','value','cost']
};

function autoDetect(cols) {
  const result = { customer: null, product: null, quantity: null, price: null };
  const used = new Set();
  for (const [field, hints] of Object.entries(HINTS)) {
    for (const hint of hints) {
      const match = cols.find(c => c.toLowerCase().replace(/[\s_\-]/g,'').includes(hint.replace(/[\s_\-]/g,'')));
      if (match && !used.has(match)) { result[field] = match; used.add(match); break; }
    }
  }
  return result;
}

// ── FILE UPLOAD ───────────────────────────────────────────────
const uploadZone = document.getElementById('upload-zone');
const fileInput  = document.getElementById('file-input');

uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); });

function loadFile(file) {
  parsedFileName = file.name;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    preview: 5000,
    complete: function() {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(full) {
          parsedRawRows = full.data;
          const cols = full.meta.fields || [];
          openMappingModal(cols, file.name, parsedRawRows.length);
        }
      });
    }
  });
}

// ── CUSTOM DROPDOWN COMPONENT ────────────────────────────────
function buildCustomSelect(wrapperId, options, selectedValue, nullable) {
  const wrapper  = document.getElementById(wrapperId);
  const trigger  = wrapper.querySelector('.custom-select-trigger');
  const dropdown = wrapper.querySelector('.custom-select-dropdown');

  wrapper.dataset.value = selectedValue || '';

  function renderOptions() {
    dropdown.innerHTML = '';
    if (nullable) {
      const none = document.createElement('div');
      none.className = 'custom-select-option none-option' + (wrapper.dataset.value === '' ? ' selected' : '');
      none.dataset.val = '';
      none.innerHTML = `<span>— não usar —</span><span class="opt-check">✓</span>`;
      dropdown.appendChild(none);
    }
    options.forEach(opt => {
      const el = document.createElement('div');
      el.className = 'custom-select-option' + (wrapper.dataset.value === opt ? ' selected' : '');
      el.dataset.val = opt;
      el.innerHTML = `<span>${opt}</span><span class="opt-check">✓</span>`;
      dropdown.appendChild(el);
    });
  }

  function updateTrigger() {
    const val = wrapper.dataset.value;
    trigger.innerHTML = val
      ? `<span>${val}</span>`
      : `<span class="placeholder">${nullable ? '— não usar —' : 'Selecionar coluna…'}</span>`;
    wrapper.classList.toggle('mapped', !!val);
  }

  function closeDropdown(el) { (el || wrapper).classList.remove('open'); }
  function openDropdown() {
    document.querySelectorAll('.custom-select.open').forEach(el => { if (el !== wrapper) el.classList.remove('open'); });
    renderOptions();
    wrapper.classList.add('open');
  }

  trigger.addEventListener('click', () => wrapper.classList.contains('open') ? closeDropdown() : openDropdown());
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wrapper.classList.contains('open') ? closeDropdown() : openDropdown(); }
    if (e.key === 'Escape') closeDropdown();
  });
  dropdown.addEventListener('click', e => {
    const opt = e.target.closest('.custom-select-option');
    if (!opt) return;
    wrapper.dataset.value = opt.dataset.val;
    updateTrigger();
    closeDropdown();
    wrapper.classList.remove('error');
    updateQtyOptionsVisibility();
  });

  updateTrigger();
}

// Close on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.custom-select'))
    document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
});

// ── MAPPING MODAL ─────────────────────────────────────────────
function openMappingModal(cols, filename, rowCount) {
  document.getElementById('modal-filename').textContent = filename;
  document.getElementById('modal-rowcount').textContent = rowCount.toLocaleString('pt-BR');
  document.getElementById('modal-colcount').textContent = cols.length;

  document.getElementById('cols-strip').innerHTML =
    cols.map(c => `<span class="col-pill">${c}</span>`).join('');

  const detected = autoDetect(cols);

  buildCustomSelect('cs-customer', cols, detected.customer || cols[0],          false);
  buildCustomSelect('cs-product',  cols, detected.product  || cols[1] || cols[0], false);
  buildCustomSelect('cs-quantity', cols, detected.quantity || '',                true);
  buildCustomSelect('cs-price',    cols, detected.price    || '',                true);

  updateQtyOptionsVisibility();
  document.getElementById('mapping-error').style.display = 'none';
  document.getElementById('mapping-overlay').classList.remove('hidden');
}

function updateQtyOptionsVisibility() {
  const hasQty = !!document.getElementById('cs-quantity')?.dataset.value;
  const box = document.getElementById('qty-options-box');
  if (!box) return;
  box.style.opacity       = hasQty ? '0.35' : '1';
  box.style.pointerEvents = hasQty ? 'none'  : 'auto';
}

document.getElementById('btn-cancel-mapping').addEventListener('click', () => {
  document.getElementById('mapping-overlay').classList.add('hidden');
  fileInput.value = '';
});

document.getElementById('btn-confirm-mapping').addEventListener('click', () => {
  const custCol  = document.getElementById('cs-customer').dataset.value;
  const prodCol  = document.getElementById('cs-product').dataset.value;
  const qtyCol   = document.getElementById('cs-quantity').dataset.value;
  const priceCol = document.getElementById('cs-price').dataset.value;
  const errEl    = document.getElementById('mapping-error');

  if (!custCol || !prodCol) {
    errEl.textContent = 'Os campos Cliente e Produto são obrigatórios.';
    errEl.style.display = 'block';
    if (!custCol) document.getElementById('cs-customer').classList.add('error');
    if (!prodCol) document.getElementById('cs-product').classList.add('error');
    return;
  }
  if (custCol === prodCol) {
    errEl.textContent = 'Cliente e Produto não podem ser a mesma coluna.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  columnMap    = { customer: custCol, product: prodCol, quantity: qtyCol || null, price: priceCol || null };
  quantityMode = document.querySelector('input[name="qty-mode"]:checked').value;

  document.getElementById('mapping-overlay').classList.add('hidden');
  runPipeline(parsedRawRows);
});

// ── PROGRESS HELPERS ──────────────────────────────────────────
const steps = ['parse', 'clean', 'matrix', 'norm', 'knn', 'kmeans', 'pca'];

function setProgress(pct, text) {
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-pct').textContent  = pct + '%';
  document.getElementById('progress-text').textContent = text;
}
function stepDone(s)   { const e = document.getElementById('step-' + s); e.classList.remove('active'); e.classList.add('done'); }
function stepActive(s) { document.getElementById('step-' + s).classList.add('active'); }
function showProgress() {
  document.getElementById('progress-wrap').style.display = 'flex';
  steps.forEach(s => { const e = document.getElementById('step-' + s); e.classList.remove('active', 'done'); });
}
function hideProgress() { document.getElementById('progress-wrap').style.display = 'none'; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── MAIN PIPELINE ─────────────────────────────────────────────
async function runPipeline(rawRows) {
  showProgress();
  stepActive('parse');
  setProgress(5, 'Preparando dados...');
  await sleep(40);
  stepDone('parse');

  setProgress(18, 'Pré-processando...');
  stepActive('clean');
  await sleep(30);

  const cm = columnMap;
  const rawCount = rawRows.length;
  let noCustomer = 0, noProduct = 0, badQty = 0;

  const cleaned = rawRows.filter(r => {
    const cid = r[cm.customer];
    if (!cid || String(cid).trim() === '') { noCustomer++; return false; }
    const prod = r[cm.product];
    if (!prod || String(prod).trim() === '') { noProduct++; return false; }
    if (cm.quantity) {
      const q = parseFloat(r[cm.quantity]);
      if (isNaN(q) || q <= 0) { badQty++; return false; }
    } else if (cm.price && quantityMode === 'price') {
      const p = parseFloat(r[cm.price]);
      if (isNaN(p) || p <= 0) { badQty++; return false; }
    }
    return true;
  });

  stepDone('clean');
  setProgress(30, 'Construindo matriz cliente-produto...');
  stepActive('matrix');
  await sleep(30);

  const prodSet = new Set();
  const custMap = {};
  for (const r of cleaned) {
    const cid  = String(r[cm.customer]).trim();
    const prod = String(r[cm.product]).trim().toUpperCase();
    let val = 1;
    if (cm.quantity) {
      val = parseFloat(r[cm.quantity]) || 1;
    } else if (cm.price && quantityMode === 'price') {
      val = parseFloat(r[cm.price]) || 1;
    }
    prodSet.add(prod);
    if (!custMap[cid]) custMap[cid] = {};
    custMap[cid][prod] = (custMap[cid][prod] || 0) + val;
  }

  products       = Array.from(prodSet).sort();
  customers      = Object.keys(custMap).sort();
  customerMatrix = custMap;

  // Mapa produto → índice para lookup O(1) na co-ocorrência
  productIndex = {};
  products.forEach((p, i) => { productIndex[p] = i; });

  stepDone('matrix');
  setProgress(42, 'Normalizando com L2...');
  stepActive('norm');
  await sleep(30);

  normalizedMatrix = customers.map(cid => {
    const row = new Float32Array(products.length);
    const purchases = custMap[cid];
    for (let j = 0; j < products.length; j++) row[j] = purchases[products[j]] || 0;
    const norm = Math.sqrt(row.reduce((s, v) => s + v * v, 0)) || 1;
    for (let j = 0; j < products.length; j++) row[j] /= norm;
    return row;
  });

  stepDone('norm');
  setProgress(55, 'Treinando KNN e co-ocorrências...');
  stepActive('knn');
  await sleep(30);

  // Matriz binária (cliente comprou produto = 1, não comprou = 0)
  // Equivalente ao: (customer_product_matrix > 0).values.astype(float)
  binaryMatrix = customers.map(cid => {
    const row = new Float32Array(products.length);
    const purchases = custMap[cid];
    for (let j = 0; j < products.length; j++) {
      row[j] = purchases[products[j]] ? 1 : 0;
    }
    return row;
  });

  // Matriz de co-ocorrência: cooc = binaryMatrix.T @ binaryMatrix
  // cooc[i][j] = número de clientes que compraram tanto produto i quanto produto j
  // Equivalente ao: matrix_array.T @ matrix_array
  const nProds = products.length;
  const nCusts = customers.length;
  cooccurrence = Array.from({ length: nProds }, () => new Float32Array(nProds));
  for (let c = 0; c < nCusts; c++) {
    const row = binaryMatrix[c];
    for (let i = 0; i < nProds; i++) {
      if (row[i] === 0) continue;
      for (let j = i; j < nProds; j++) {
        if (row[j] === 0) continue;
        cooccurrence[i][j] += 1;
        if (i !== j) cooccurrence[j][i] += 1;
      }
    }
  }
  stepDone('knn');

  setProgress(67, 'Rodando KMeans (5 clusters)...');
  stepActive('kmeans');
  await sleep(30);

  kmeansLabels    = kmeans(normalizedMatrix, 5, 40);
  segmentProducts = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {} };
  for (let i = 0; i < customers.length; i++) {
    const seg = kmeansLabels[i];
    for (const [prod, qty] of Object.entries(custMap[customers[i]])) {
      segmentProducts[seg][prod] = (segmentProducts[seg][prod] || 0) + qty;
    }
  }

  stepDone('kmeans');
  setProgress(82, 'Calculando PCA 2D...');
  stepActive('pca');
  await sleep(30);

  const sampleSize    = Math.min(customers.length, 800);
  const sampleIdx     = sampleCustomers(customers.length, sampleSize);
  const sampledVecs   = sampleIdx.map(i => normalizedMatrix[i]);
  const sampledLabels = sampleIdx.map(i => kmeansLabels[i]);
  pcaPoints = pca2D(sampledVecs).map((pt, i) => ({ x: pt[0], y: pt[1], seg: sampledLabels[i] }));

  stepDone('pca');
  setProgress(100, 'Concluído!');
  await sleep(200);
  hideProgress();

  renderStats(rawCount, noCustomer, noProduct, badQty, cleaned.length);
  renderMappingBadge();
  renderCustomerDropdown();
  renderScatterChart();
  renderDonutChart();
  renderSegmentCharts();

  ['stats-section', 'rec-section', 'seg-section', 'top-sec'].forEach(id =>
    document.getElementById(id).classList.remove('hidden')
  );

  document.getElementById('customer-col-label').textContent = cm.customer;
}

// ── KNN + CO-OCORRÊNCIA (replica lógica do Colab) ────────────
// Equivalente Python:
//   peso_vizinho = 1 / (rank + 1)
//   ignora vizinhos com dist > 0.95
//   peso_cooc = sum(coocorrencia[produto_idx, p_idx] for p_idx in indices_conhecidos)
//   score = peso_vizinho + 0.3 * peso_cooc

function cosine(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += a[i] * b[i];
  return d; // vetores já normalizados → dot = cosine
}

function recommend(customerId, nRec) {
  const idx = customers.indexOf(customerId);
  if (idx === -1) return [];

  // Produtos que o cliente já comprou
  const owned = new Set(Object.keys(customerMatrix[customerId]));

  // Índices dos produtos que o cliente já comprou (para co-ocorrência)
  const ownedIndices = [];
  for (const prod of owned) {
    const j = productIndex[prod];
    if (j !== undefined) ownedIndices.push(j);
  }

  // Calcula similaridade com todos os outros clientes
  const target = normalizedMatrix[idx];
  const sims   = [];
  for (let i = 0; i < normalizedMatrix.length; i++) {
    if (i === idx) continue;
    const sim  = cosine(target, normalizedMatrix[i]);
    const dist = 1 - sim; // distância cosseno = 1 - similaridade
    sims.push({ idx: i, sim, dist });
  }
  sims.sort((a, b) => a.dist - b.dist); // ordena por distância crescente (mais próximo primeiro)

  const neighbors = sims.slice(0, 30);
  const scores    = {};

  neighbors.forEach((nb, rank) => {
    // Equivalente ao: if dist > 0.95: continue
    if (nb.dist > 0.95) return;

    // Peso por ranking: 1º vizinho = 1.0, 2º = 0.5, 3º = 0.33...
    // Equivalente ao: peso_vizinho = 1 / (rank + 1)
    const pesoVizinho = 1 / (rank + 1);

    const nbId       = customers[nb.idx];
    const nbPurchases = customerMatrix[nbId];

    for (const produto of Object.keys(nbPurchases)) {
      if (owned.has(produto)) continue; // não recomenda o que o cliente já tem

      const prodIdx = productIndex[produto];
      if (prodIdx === undefined) continue;

      // Peso de co-ocorrência: soma das co-ocorrências do produto com cada item que o cliente já comprou
      // Equivalente ao: sum(coocorrencia[produto_idx, p_idx] for p_idx in indices_conhecidos)
      let pesoCooc = 0;
      for (const pIdx of ownedIndices) {
        pesoCooc += cooccurrence[prodIdx][pIdx];
      }

      // Score final: peso_vizinho + 0.3 * peso_cooc
      scores[produto] = (scores[produto] || 0) + pesoVizinho + (0.3 * pesoCooc);
    }
  });

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, nRec)
    .map(([name, score]) => ({ name, score }));
}

// ── KMEANS ────────────────────────────────────────────────────
function kmeans(data, k, iters) {
  const n = data.length, dim = data[0].length;
  let centroids = Array.from({ length: k }, (_, i) => new Float32Array(data[Math.floor(i * n / k)]));
  let labels    = new Int32Array(n);
  for (let iter = 0; iter < iters; iter++) {
    for (let i = 0; i < n; i++) {
      let best = -Infinity, bestK = 0;
      for (let j = 0; j < k; j++) { const s = cosine(data[i], centroids[j]); if (s > best) { best = s; bestK = j; } }
      labels[i] = bestK;
    }
    const counts = new Int32Array(k);
    const sums   = Array.from({ length: k }, () => new Float32Array(dim));
    for (let i = 0; i < n; i++) { counts[labels[i]]++; for (let d = 0; d < dim; d++) sums[labels[i]][d] += data[i][d]; }
    for (let j = 0; j < k; j++) if (counts[j] > 0) for (let d = 0; d < dim; d++) centroids[j][d] = sums[j][d] / counts[j];
  }
  return Array.from(labels);
}

// ── PCA 2D (power iteration) ──────────────────────────────────
function pca2D(data) {
  const n = data.length, dim = data[0].length;
  const mean = new Float32Array(dim);
  for (const row of data) for (let d = 0; d < dim; d++) mean[d] += row[d] / n;
  const centered = data.map(row => {
    const r = new Float32Array(dim);
    for (let d = 0; d < dim; d++) r[d] = row[d] - mean[d];
    return r;
  });
  function powerIter(mat, iters) {
    let v = new Float32Array(dim); v[0] = 1;
    for (let it = 0; it < iters; it++) {
      const nv = new Float32Array(dim);
      for (const row of mat) { const dot = row.reduce((s, x, i) => s + x * v[i], 0); for (let d = 0; d < dim; d++) nv[d] += dot * row[d]; }
      const norm = Math.sqrt(nv.reduce((s, x) => s + x * x, 0)) || 1;
      for (let d = 0; d < dim; d++) v[d] = nv[d] / norm;
    }
    return v;
  }
  function deflate(mat, v) {
    return mat.map(row => { const dot = row.reduce((s, x, i) => s + x * v[i], 0); return row.map((x, i) => x - dot * v[i]); });
  }
  const pc1      = powerIter(centered, 20);
  const deflated = deflate(centered, pc1);
  const pc2      = powerIter(deflated, 20);
  return centered.map(row => [
    row.reduce((s, x, i) => s + x * pc1[i], 0),
    row.reduce((s, x, i) => s + x * pc2[i], 0)
  ]);
}

function sampleCustomers(total, size) {
  if (total <= size) return Array.from({ length: total }, (_, i) => i);
  const step = total / size;
  return Array.from({ length: size }, (_, i) => Math.min(Math.floor(i * step), total - 1));
}

// ── RENDER HELPERS ────────────────────────────────────────────
function fmtNum(n) { return n.toLocaleString('pt-BR'); }

function renderStats(raw, noC, noP, badQ, final) {
  const removed = raw - final;
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-label">Linhas originais</div><div class="stat-val">${fmtNum(raw)}</div><div class="stat-sub">registros brutos</div></div>
    <div class="stat-card"><div class="stat-label">Clientes únicos</div><div class="stat-val">${fmtNum(customers.length)}</div><div class="stat-sub">IDs válidos</div></div>
    <div class="stat-card"><div class="stat-label">Produtos únicos</div><div class="stat-val">${fmtNum(products.length)}</div><div class="stat-sub">itens no catálogo</div></div>
    <div class="stat-card"><div class="stat-label">Linhas utilizadas</div><div class="stat-val">${fmtNum(final)}</div><div class="stat-sub">pós-limpeza</div></div>
    <div class="stat-card"><div class="stat-label">Removidas</div><div class="stat-val">${fmtNum(removed)}</div><div class="stat-sub">${((removed / raw) * 100).toFixed(1)}% do total</div></div>
  `;
  const qtyLabel = columnMap.quantity
    ? `coluna <em>${columnMap.quantity}</em>`
    : (quantityMode === 'price' && columnMap.price ? `valor de <em>${columnMap.price}</em>` : 'binário (1 por compra)');
  document.getElementById('preproc-log').innerHTML = `
    <div class="log-line"><span></span> Total bruto: <span class="kept">${fmtNum(raw)} linhas</span></div>
    <div class="log-line"><span></span> Sem cliente (<em>${columnMap.customer}</em>) removidas: <span class="removed">−${fmtNum(noC)}</span></div>
    <div class="log-line"><span></span> Sem produto (<em>${columnMap.product}</em>) removidas: <span class="removed">−${fmtNum(noP)}</span></div>
    ${(columnMap.quantity || (columnMap.price && quantityMode === 'price'))
      ? `<div class="log-line"><span></span> Quantidade/valor ≤ 0 removidas: <span class="removed">−${fmtNum(badQ)}</span></div>` : ''}
    <div class="log-line"><span></span> Dataset final: <span class="kept">${fmtNum(final)} linhas</span></div>
    <div class="log-line"><span></span> Pesos usados: ${qtyLabel}</div>
  `;
}

function renderMappingBadge() {
  const cm = columnMap;
  const items = [
    { label: 'cliente',    val: cm.customer },
    { label: 'produto',    val: cm.product },
    cm.quantity ? { label: 'quantidade', val: cm.quantity } : null,
    cm.price    ? { label: 'preço',      val: cm.price    } : null,
  ].filter(Boolean);
  document.getElementById('mapping-badge').innerHTML = items
    .map(i => `<span class="mbadge">${i.label} <span class="arrow">→</span> ${i.val}</span>`)
    .join('');
}

function renderCustomerDropdown() {
  document.getElementById('customer-select').innerHTML =
    customers.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ── UI INTERACTIONS ───────────────────────────────────────────
document.getElementById('n-rec').addEventListener('input', function () {
  document.getElementById('n-rec-val').textContent   = this.value;
  document.getElementById('n-rec-label').textContent = this.value;
});

document.getElementById('btn-rec').addEventListener('click', () => {
  const cid         = document.getElementById('customer-select').value;
  const n           = parseInt(document.getElementById('n-rec').value);
  const recs        = recommend(cid, n);
  const container   = document.getElementById('rec-results');
  const placeholder = document.getElementById('rec-placeholder');

  if (!recs.length) {
    placeholder.classList.remove('hidden');
    placeholder.innerHTML = '<div class="placeholder-icon">🤔</div><p>Nenhuma recomendação encontrada</p>';
    container.classList.add('hidden');
    return;
  }

  const maxScore = recs[0].score;
  container.innerHTML = recs.map((r, i) => `
    <div class="rec-card" style="animation-delay:${i * 0.05}s">
      <div class="rec-card-rank">RECOMENDAÇÃO #${String(i + 1).padStart(2, '0')}</div>
      <div class="rec-card-name">${r.name}</div>
      <div class="rec-card-score">
        <span>${r.score.toFixed(2)}</span>
        <div class="score-bar"><div class="score-bar-fill" style="width:${(r.score / maxScore * 100).toFixed(0)}%"></div></div>
      </div>
    </div>`).join('');

  placeholder.classList.add('hidden');
  container.classList.remove('hidden');
});

// ── CHARTS ────────────────────────────────────────────────────
const SEG_COLORS = ['#00e5ff', '#a855f7', '#f59e0b', '#10b981', '#f43f5e'];

function renderScatterChart() {
  const datasets = [0, 1, 2, 3, 4].map(seg => ({
    label: 'Segmento ' + (seg + 1),
    data: pcaPoints.filter(p => p.seg === seg).map(p => ({ x: p.x, y: p.y })),
    backgroundColor: SEG_COLORS[seg] + '88',
    borderColor: SEG_COLORS[seg],
    borderWidth: 0.5,
    pointRadius: 3.5,
    pointHoverRadius: 6,
  }));

  if (scatterChart) scatterChart.destroy();
  scatterChart = new Chart(document.getElementById('scatter-chart'), {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#7a9bb5', font: { family: 'DM Mono', size: 11 }, padding: 14, boxWidth: 10, boxHeight: 10, usePointStyle: true } },
        tooltip: {
          backgroundColor: '#0e1419', borderColor: '#1f2d3a', borderWidth: 1,
          titleColor: '#e8f0fe', bodyColor: '#7a9bb5', bodyFont: { family: 'DM Mono', size: 11 },
          callbacks: { label: ctx => `PC1: ${ctx.raw.x.toFixed(3)} · PC2: ${ctx.raw.y.toFixed(3)}` }
        }
      },
      scales: {
        x: { title: { display: true, text: 'PC1', color: '#3d5a73', font: { family: 'DM Mono', size: 11 } }, grid: { color: '#1c2530' }, ticks: { color: '#3d5a73', font: { family: 'DM Mono', size: 10 } } },
        y: { title: { display: true, text: 'PC2', color: '#3d5a73', font: { family: 'DM Mono', size: 11 } }, grid: { color: '#1c2530' }, ticks: { color: '#3d5a73', font: { family: 'DM Mono', size: 10 } } }
      }
    }
  });
}

function renderDonutChart() {
  const counts = [0, 0, 0, 0, 0];
  for (const l of kmeansLabels) counts[l]++;

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById('donut-chart'), {
    type: 'doughnut',
    data: {
      labels: ['Segmento 1', 'Segmento 2', 'Segmento 3', 'Segmento 4', 'Segmento 5'],
      datasets: [{ data: counts, backgroundColor: SEG_COLORS.map(c => c + 'cc'), borderColor: SEG_COLORS, borderWidth: 2, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#7a9bb5', font: { family: 'DM Mono', size: 11 }, padding: 14, boxWidth: 10, boxHeight: 10, usePointStyle: true } },
        tooltip: {
          backgroundColor: '#0e1419', borderColor: '#1f2d3a', borderWidth: 1,
          titleColor: '#e8f0fe', bodyColor: '#7a9bb5', bodyFont: { family: 'DM Mono', size: 11 },
          callbacks: { label: ctx => { const t = counts.reduce((a, b) => a + b, 0); return ` ${ctx.raw} clientes (${(ctx.raw / t * 100).toFixed(1)}%)`; } }
        }
      }
    }
  });
}

function renderSegmentCharts() {
  const counts = [0, 0, 0, 0, 0];
  for (const l of kmeansLabels) counts[l]++;

  const grid = document.getElementById('seg-grid');
  grid.innerHTML = '';

  for (let seg = 0; seg < 5; seg++) {
    const prods  = Object.entries(segmentProducts[seg]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = prods.map(([n]) => n.length > 28 ? n.slice(0, 26) + '…' : n);
    const values = prods.map(([, v]) => v);
    const canvasId = `bar-seg-${seg}`;

    const div = document.createElement('div');
    div.className = 'chart-wrap';
    div.innerHTML = `
      <div class="seg-header">
        <div class="seg-dot" style="background:${SEG_COLORS[seg]};box-shadow:0 0 8px ${SEG_COLORS[seg]}88;"></div>
        <div class="seg-label" style="color:${SEG_COLORS[seg]}">Segmento ${seg + 1}</div>
        <div class="seg-count">${fmtNum(counts[seg])} clientes</div>
      </div>
      <div class="chart-sub">Top 5 produtos por volume</div>
      <div class="chart-container" style="height:220px;"><canvas id="${canvasId}"></canvas></div>`;
    grid.appendChild(div);

    if (topCharts[seg]) topCharts[seg].destroy();
    topCharts[seg] = new Chart(document.getElementById(canvasId), {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: SEG_COLORS[seg] + '55', borderColor: SEG_COLORS[seg], borderWidth: 1.5, borderRadius: 6, hoverBackgroundColor: SEG_COLORS[seg] + '99' }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0e1419', borderColor: '#1f2d3a', borderWidth: 1,
            titleColor: '#e8f0fe', titleFont: { family: 'DM Sans', size: 12 },
            bodyColor: '#7a9bb5', bodyFont: { family: 'DM Mono', size: 11 },
            callbacks: { label: ctx => ` Qtd: ${fmtNum(Math.round(ctx.raw))}` }
          }
        },
        scales: {
          x: { grid: { color: '#1c2530' }, ticks: { color: '#3d5a73', font: { family: 'DM Mono', size: 10 } } },
          y: { grid: { display: false }, ticks: { color: '#7a9bb5', font: { family: 'DM Sans', size: 11 } } }
        }
      }
    });
  }
}