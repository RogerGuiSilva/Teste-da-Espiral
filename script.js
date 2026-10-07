(function () {
  var MAX_CATS = 8, MAX_OPTS = 12, MIN_OPTS = 2;

  function capWords(s) { return s.replace(/(^|\s)(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); }); }
  function capFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function fmtFilhos(s) { return /^\d+$/.test(s) ? s + (Number(s) === 1 ? ' filho' : ' filhos') : s; }
  var FMT = { words: capWords, first: capFirst, filhos: fmtFilhos };

  var DEFAULTS = [
    { name: 'Pretendentes', fmt: 'words', ph: 'Pretendente', values: ['', '', ''] },
    { name: 'Onde morar', fmt: 'words', ph: 'Lugar', values: ['', '', ''] },
    { name: 'Quantidade de filhos', fmt: 'filhos', ph: 'Quantidade', values: ['', '', ''] },
    { name: 'Situação socioeconômica', fmt: 'first', ph: 'Situação', values: ['', '', ''] }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fieldsEl = $('fields');
  var uid = 0;

  /* ---------- formulário dinâmico ---------- */
  function renumber(group) {
    var inputs = group.querySelectorAll('.rows .field');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].placeholder = (group.dataset.ph || 'Opção') + ' ' + (i + 1);
      inputs[i].setAttribute('aria-label', 'Opção ' + (i + 1));
    }
  }
  function syncGroup(group) {
    var n = group.querySelectorAll('.rows .row').length;
    group.querySelectorAll('.rows .icon-btn').forEach(function (b) { b.disabled = n <= MIN_OPTS; });
    group.querySelector('.add-opt').disabled = n >= MAX_OPTS;
  }
  function syncAll() {
    var groups = fieldsEl.querySelectorAll('.group');
    groups.forEach(function (g) {
      syncGroup(g);
      g.querySelector('.group-head .icon-btn').disabled = groups.length <= 1;
    });
    $('add-cat').disabled = groups.length >= MAX_CATS;
  }
  function addRow(group, value) {
    var row = document.createElement('div');
    row.className = 'row';
    var inp = document.createElement('input');
    inp.className = 'field';
    inp.type = 'text';
    inp.id = 'opt-' + (++uid);
    inp.value = value || '';
    inp.autocomplete = 'off';
    var rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'icon-btn';
    rm.textContent = '×';
    rm.setAttribute('aria-label', 'Remover opção');
    rm.addEventListener('click', function () {
      row.remove();
      renumber(group);
      syncGroup(group);
    });
    row.appendChild(inp);
    row.appendChild(rm);
    group.querySelector('.rows').appendChild(row);
    return inp;
  }
  function createGroup(def) {
    var g = document.createElement('div');
    g.className = 'group';
    g.setAttribute('role', 'group');
    g.dataset.fmt = def.fmt || 'first';
    g.dataset.ph = def.ph || 'Opção';

    var head = document.createElement('div');
    head.className = 'group-head';
    var name = document.createElement('input');
    name.className = 'cat-name';
    name.type = 'text';
    name.id = 'cat-' + (++uid);
    name.value = def.name || '';
    name.placeholder = 'Nome da categoria';
    name.autocomplete = 'off';
    name.setAttribute('aria-label', 'Nome da categoria');
    var rmCat = document.createElement('button');
    rmCat.type = 'button';
    rmCat.className = 'icon-btn';
    rmCat.textContent = '×';
    rmCat.setAttribute('aria-label', 'Remover categoria');
    rmCat.addEventListener('click', function () {
      g.remove();
      syncAll();
    });
    head.appendChild(name);
    head.appendChild(rmCat);

    var rows = document.createElement('div');
    rows.className = 'rows';

    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'add-opt';
    add.textContent = '+ Adicionar opção';
    add.addEventListener('click', function () {
      var inp = addRow(g, '');
      renumber(g);
      syncGroup(g);
      inp.focus();
    });

    g.appendChild(head);
    g.appendChild(rows);
    g.appendChild(add);
    (def.values || ['', '', '']).forEach(function (v) { addRow(g, v); });
    renumber(g);
    fieldsEl.appendChild(g);
    return g;
  }

  DEFAULTS.forEach(createGroup);
  syncAll();

  $('add-cat').addEventListener('click', function () {
    var g = createGroup({ name: '', fmt: 'first', ph: 'Opção', values: ['', '', ''] });
    syncAll();
    g.querySelector('.cat-name').focus();
  });

  $('clear').addEventListener('click', function () {
    $('idade').value = '';
    fieldsEl.querySelectorAll('.rows .field').forEach(function (i) { i.value = ''; });
    $('error').hidden = true;
    $('idade').focus();
  });

  /* ---------- simulação (contagem geral em um único círculo) ----------
     Todas as opções entram em uma fila só, na ordem das categorias:
     cat 1 op 1, cat 1 op 2, ..., cat 2 op 1, ... A contagem vai de 1 até a idade
     e elimina a opção em que parar. A próxima rodada continua da opção seguinte.
     Quando uma categoria fica com 1 opção, ela está decidida e sai da contagem. */
  function simulate(age, lists) {
    var flat = [];
    lists.forEach(function (l, c) { l.forEach(function (_, i) { flat.push({ c: c, i: i }); }); });
    var N = flat.length;
    var alive = flat.map(function () { return true; });
    var left = lists.map(function (l) { return l.length; });
    var total = N - lists.length;
    var start = 0, rounds = [];

    for (var r = 0; r < total; r++) {
      var order = [];
      for (var k = 0; k < N; k++) {
        var f = (start + k) % N;
        if (alive[f] && left[flat[f].c] > 1) order.push(f);
      }
      var out = order[(age - 1) % order.length];
      alive[out] = false;
      left[flat[out].c]--;
      start = (out + 1) % N;
      var done = [];
      if (left[flat[out].c] === 1) {
        for (var q = 0; q < N; q++) if (alive[q] && flat[q].c === flat[out].c) done.push(q);
      }
      rounds.push({ order: order, out: out, done: done });
    }

    var winners = lists.map(function () { return 0; });
    for (var m = 0; m < N; m++) if (alive[m]) winners[flat[m].c] = flat[m].i;
    return { rounds: rounds, winners: winners };
  }

  /* ---------- espiral ---------- */
  var cv = $('spiral'), ctx = cv.getContext('2d');
  var sp = { rot: 0, reveal: 1 };

  function fit() {
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth;
    if (!w) return;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(w * dpr);
    drawSpiral();
  }
  function drawSpiral() {
    var dpr = window.devicePixelRatio || 1;
    var W = cv.clientWidth;
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, W);
    var cs = getComputedStyle(document.documentElement);
    var ink = cs.getPropertyValue('--ink').trim() || '#1E3FA8';
    var pen = cs.getPropertyValue('--pen').trim() || '#CF3030';
    var c = W / 2, r0 = W * 0.2, r1 = W * 0.47, turns = 4.5, steps = 480;
    var n = Math.floor(steps * sp.reveal);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2.5, W * 0.008);
    ctx.strokeStyle = ink;
    ctx.beginPath();
    var x = 0, y = 0;
    for (var i = 0; i <= n; i++) {
      var t = i / steps;
      var a = turns * 2 * Math.PI * t + sp.rot;
      var r = r0 + (r1 - r0) * t + Math.sin(t * 44) * W * 0.003;
      x = c + r * Math.cos(a);
      y = c + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (n > 0) {
      ctx.fillStyle = pen;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(4, W * 0.014), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  window.addEventListener('resize', fit);

  /* ---------- animação ---------- */
  var runId = 0, skip = false;
  var flatItems = [];

  function sleep(ms) {
    return new Promise(function (res) { setTimeout(res, skip ? 0 : ms); });
  }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }

  function buildBoards(cats) {
    var boards = $('boards');
    boards.textContent = '';
    flatItems = [];
    cats.forEach(function (c) {
      var box = document.createElement('div');
      box.className = 'board';
      var h = document.createElement('h3');
      h.className = 'mono';
      h.textContent = c.label;
      var ul = document.createElement('ul');
      c.items.forEach(function (txt) {
        var li = document.createElement('li');
        li.textContent = txt;
        ul.appendChild(li);
        flatItems.push(li);
      });
      box.appendChild(h);
      box.appendChild(ul);
      boards.appendChild(box);
    });
  }

  function clearActive() {
    flatItems.forEach(function (li) { li.classList.remove('active'); });
  }
  function setActive(round, k) {
    clearActive();
    flatItems[round.order[(k - 1) % round.order.length]].classList.add('active');
  }

  function countRound(round, age, id) {
    return new Promise(function (res) {
      var dur = reduced ? 700 : Math.min(5200, 2400 + Math.min(age, 120) * 24);
      var t0 = performance.now(), lastK = 0;
      function frame(now) {
        if (id !== runId) return res();
        var p = skip ? 1 : Math.min(1, (now - t0) / dur);
        var c = age * easeOut(p);
        var k = Math.max(1, Math.min(age, Math.ceil(c)));
        if (p >= 1) k = age;
        if (k !== lastK) {
          lastK = k;
          $('count').textContent = k;
          setActive(round, k);
        }
        sp.rot = reduced ? 0 : c * 0.32;
        drawSpiral();
        if (p < 1) requestAnimationFrame(frame); else res();
      }
      requestAnimationFrame(frame);
    });
  }

  function revealSpiral(id) {
    return new Promise(function (res) {
      if (reduced || skip) { sp.reveal = 1; drawSpiral(); return res(); }
      var t0 = performance.now(), dur = 900;
      function frame(now) {
        if (id !== runId) return res();
        var p = Math.min(1, (now - t0) / dur);
        sp.reveal = easeOut(p);
        drawSpiral();
        if (p < 1 && !skip) requestAnimationFrame(frame); else { sp.reveal = 1; drawSpiral(); res(); }
      }
      requestAnimationFrame(frame);
    });
  }

  async function run(age, cats) {
    var id = ++runId;
    skip = false;
    var sim = simulate(age, cats.map(function (c) { return c.items; }));
    var total = sim.rounds.length;
    buildBoards(cats);
    $('result').hidden = true;
    $('skip').hidden = false;
    $('count').textContent = '0';
    $('of').textContent = 'de ' + age;
    $('round').textContent = 'Preparando';
    $('status').textContent = 'Desenhando a espiral.';
    sp.rot = 0;
    sp.reveal = reduced ? 1 : 0;
    fit();
    await revealSpiral(id);
    if (id !== runId) return;

    for (var r = 0; r < total; r++) {
      var round = sim.rounds[r];
      $('round').textContent = 'Rodada ' + (r + 1) + ' de ' + total;
      $('status').textContent = 'Contando até ' + age + '.';
      await countRound(round, age, id);
      if (id !== runId) return;
      await sleep(450);
      if (id !== runId) return;
      $('status').textContent = 'Riscando a opção em que a contagem parou.';
      clearActive();
      flatItems[round.out].classList.add('out');
      await sleep(900);
      if (id !== runId) return;
      round.done.forEach(function (f) { flatItems[f].classList.add('winner'); });
      await sleep(600);
      if (id !== runId) return;
    }

    $('round').textContent = 'Fim';
    $('status').textContent = 'Sobrou uma opção de cada lista.';
    $('skip').hidden = true;
    showResult(age, cats, sim.winners);
  }

  function showResult(age, cats, winners) {
    $('result-title').textContent = 'Quem casa aos ' + age + ' anos fica com:';
    var dl = $('result-list');
    dl.textContent = '';
    cats.forEach(function (c, ci) {
      var d = document.createElement('div');
      var dt = document.createElement('dt');
      dt.className = 'mono';
      dt.textContent = c.label;
      var dd = document.createElement('dd');
      dd.textContent = c.items[winners[ci]];
      d.appendChild(dt);
      d.appendChild(dd);
      dl.appendChild(d);
    });
    $('result').hidden = false;
    $('result').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  }

  $('skip').addEventListener('click', function () { skip = true; });

  $('again').addEventListener('click', function () {
    runId++;
    $('stage').hidden = true;
    $('setup').hidden = false;
    window.scrollTo(0, 0);
    $('idade').focus();
  });

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('error');
    var age = parseInt($('idade').value, 10);
    if (!(age >= 1 && age <= 9999)) {
      err.textContent = 'Digite uma idade entre 1 e 9999.';
      err.hidden = false;
      $('idade').focus();
      return;
    }
    var cats = [];
    var groups = fieldsEl.querySelectorAll('.group');
    for (var gi = 0; gi < groups.length; gi++) {
      var g = groups[gi];
      var label = g.querySelector('.cat-name').value.trim() || ('Categoria ' + (gi + 1));
      var fmt = FMT[g.dataset.fmt] || capFirst;
      var inputs = g.querySelectorAll('.rows .field');
      var vals = [], firstEmpty = null;
      for (var i = 0; i < inputs.length; i++) {
        var v = inputs[i].value.trim();
        if (v) vals.push(fmt(v)); else if (!firstEmpty) firstEmpty = inputs[i];
      }
      if (vals.length < MIN_OPTS) {
        err.textContent = '"' + label + '" precisa de pelo menos 2 opções preenchidas.';
        err.hidden = false;
        (firstEmpty || inputs[0]).focus();
        return;
      }
      cats.push({ label: label, items: vals });
    }
    err.hidden = true;
    $('setup').hidden = true;
    $('stage').hidden = false;
    window.scrollTo(0, 0);
    run(age, cats);
  });
})();
