// dist/game/crowd.js
function separateCrowd(enemies, definitions, width, height, obstacles = [], resolve = () => {
}, padding = 0) {
  const alive = enemies.filter((e) => e.hp > 0 && !e.airborne), cell = 160;
  let maxR = 0;
  for (const e of alive) maxR = Math.max(maxR, e.r * 1.3);
  for (let pass = 0; pass < 3; pass++) {
    const grid = /* @__PURE__ */ new Map();
    for (let i = 0; i < alive.length; i++) {
      const e = alive[i], key = `${Math.floor(e.x / cell)},${Math.floor(e.y / cell)}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(i);
    }
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i], search = a.r * 1.3 + maxR;
      for (let y = Math.floor((a.y - search) / cell); y <= Math.floor((a.y + search) / cell); y++) for (let x = Math.floor((a.x - search) / cell); x <= Math.floor((a.x + search) / cell); x++) for (const j of grid.get(`${x},${y}`) || []) {
        if (j <= i) continue;
        const b = alive[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.r + b.r) * 1.3;
        if (d >= min) continue;
        const angle = a.id * 2.399963 + b.id * 0.73, nx = d ? dx / d : Math.cos(angle), ny = d ? dy / d : Math.sin(angle), ma = definitions[a.type].weight, mb = definitions[b.type].weight, push = (min - d) * 0.9;
        const pa = push * mb / (ma + mb), pb = push * ma / (ma + mb);
        a.x -= nx * pa;
        a.y -= ny * pa;
        b.x += nx * pb;
        b.y += ny * pb;
      }
    }
    for (const e of alive) {
      if (!definitions[e.type].isBoss && !e.airborne) resolve(e, obstacles);
      e.x = Math.max(e.r - padding, Math.min(width + padding - e.r, e.x));
      e.y = Math.max(e.r - padding, Math.min(height + padding - e.r, e.y));
    }
  }
}

// dist/game/encounters.js
function localSpawn(s, world, r) {
  const v = s.spawnView || { width: 1100, height: 850 }, p = s.player;
  const rx = v.width * 0.85 + r * 3 + 90, ry = v.height * 0.85 + r * 3 + 90;
  const sector = Math.floor(s.time / 9) * 2.399963 % (Math.PI * 2), angle = sector + (s.random() - 0.5) * 1.1;
  for (let i = 0; i < 24; i++) {
    const a = angle + i * 2.399963, x = p.x + Math.cos(a) * rx, y = p.y + Math.sin(a) * ry;
    if (!world.spawnPadding && (x < r + 32 || x > world.width - r - 32 || y < r + 32 || y > world.height - r - 32)) continue;
    if (Math.abs(x - p.x) < v.width * 0.55 + r * 2 && Math.abs(y - p.y) < v.height * 0.65 + r * 2) continue;
    return { x, y };
  }
  if (world.spawnPadding) return { x: p.x + rx, y: p.y };
  return { x: Math.max(r + 32, Math.min(world.width - r - 32, p.x + (p.x < world.width / 2 ? rx : -rx))), y: Math.max(r + 32, Math.min(world.height - r - 32, p.y)) };
}
function scatterSupplies(s, world, resolve) {
  const corners = [[0.07, 0.07], [0.93, 0.07], [0.07, 0.93], [0.93, 0.93]];
  for (let i = 0; i < corners.length; i++) {
    const [x, y] = corners[i];
    for (const [key, offset] of [["worms", -55], ["magnets", 55]]) {
      const p = { x: world.width * x + offset, y: world.height * y, r: 24 };
      resolve(p, s.obstacles);
      s[key].push({ x: p.x, y: p.y, mapSupply: true, corner: i });
    }
  }
}
function wolfDirection(dx, dy, d, id, age, body = null, pack = [], definitions = {}, playerRadius = 20, playerMove = { x: 0, y: 0 }) {
  if (body) {
    if (d >= 180) body.wolfHunt = false;
    else if (d < 110 || d < 150 && playerMove.x * -dx + playerMove.y * -dy > 0.01) body.wolfHunt = true;
  }
  if (body?.wolfHunt) {
    const length2 = Math.hypot(dx, dy) || 1;
    return { x: dx / length2, y: dy / length2, speed: 1.25, hunt: true };
  }
  const count = Math.max(1, pack.length), rank = Math.max(0, pack.findIndex((e) => e.id === id)), r = body?.r || 25;
  const desiredRadius = Math.max(playerRadius + r * 0.65, 320 - age * 7), angle = Math.atan2(-dy, -dx), slot = age * 0.162 + rank * Math.PI * 2 / count;
  const error = Math.atan2(Math.sin(slot - angle), Math.cos(slot - angle));
  const radial = Math.max(0, Math.min(0.72, (d - desiredRadius) / 100)), rawTangent = Math.max(-0.95, Math.min(1.1, 0.18 * d / Math.max(1, body?.speed || 80) + error * 0.8)), baseTangent = (Math.sign(rawTangent) || 1) * Math.max(0.55, Math.abs(rawTangent)), tangent = baseTangent * 0.9;
  const inwardX = dx === 0 && dy === 0 ? Math.cos(slot) : dx / d, inwardY = dx === 0 && dy === 0 ? Math.sin(slot) : dy / d, x = inwardX * radial + inwardY * tangent, y = inwardY * radial - inwardX * tangent, length = Math.hypot(x, y);
  return { x: x / length, y: y / length, speed: Math.min(2.1, Math.max(1.35, Math.hypot(radial, baseTangent) * 1.85)) * length / Math.hypot(radial, baseTangent), ringRadius: desiredRadius };
}

// dist/game/collision-index.js
var CollisionIndex = class {
  constructor(cell = 160) {
    this.cell = cell;
    this.buckets = /* @__PURE__ */ new Map();
    this.pool = [];
    this.candidates = [];
    this.maxRadius = 0;
    this.dirty = true;
  }
  rebuild(enemies) {
    for (const bucket of this.buckets.values()) {
      bucket.length = 0;
      this.pool.push(bucket);
    }
    this.buckets.clear();
    this.maxRadius = 0;
    this.enemies = enemies;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.hp <= 0) continue;
      this.maxRadius = Math.max(this.maxRadius, e.type === "turkey" ? e.r * 1.5 : e.r);
      const key = Math.floor(e.x / this.cell) + Math.floor(e.y / this.cell) * 1e5;
      let bucket = this.buckets.get(key);
      if (!bucket) {
        bucket = this.pool.pop() || [];
        this.buckets.set(key, bucket);
      }
      bucket.push(i);
    }
    this.dirty = false;
  }
  query(b, enemies) {
    if (this.dirty || this.enemies !== enemies) this.rebuild(enemies);
    const r = this.maxRadius + b.r, c = this.cell, minX = Math.floor((Math.min(b.px, b.x) - r) / c), maxX = Math.floor((Math.max(b.px, b.x) + r) / c), minY = Math.floor((Math.min(b.py, b.y) - r) / c), maxY = Math.floor((Math.max(b.py, b.y) + r) / c);
    const out = this.candidates;
    out.length = 0;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const bucket = this.buckets.get(x + y * 1e5);
      if (bucket) for (const i of bucket) out.push(i);
    }
    out.sort((a, b2) => a - b2);
    return out;
  }
};

// dist/game/enemy-attack-geometry.js
function turkeyPeckGeometry(r, b = {}, pulse = 0) {
  return { start: r * (b.turkeyPeckStart ?? 0.85), range: r * Math.max(0.86, (b.turkeyPeckReach ?? 7.8) - (pulse % 2 ? 0.15 : 0)), width: r * (b.turkeyPeckWidth ?? 0.15) };
}
function peckTiming(a) {
  const gap = a.peckGap || 0.35, elapsed = Math.max(0, a.elapsed - a.windup), pulse = Math.floor(elapsed / gap), phase = elapsed / gap - pulse;
  return { pulse, phase, contact: a.phase === "active" && phase >= 0.25 && phase < 0.65 };
}

// dist/game/item-copy.js
var base = { egg: "\u0411\u0440\u043E\u0441\u0430\u0435\u0442 \u044F\u0439\u0446\u0430 \u0432 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0435\u0433\u043E \u0432\u0440\u0430\u0433\u0430.", beak: "\u041A\u043B\u044E\u0451\u0442 \u0432\u0440\u0430\u0433\u0430 \u043F\u0435\u0440\u0435\u0434 \u0441\u043E\u0431\u043E\u0439.", feather: "\u0412\u044B\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u0432\u0435\u0435\u0440 \u043E\u0441\u0442\u0440\u044B\u0445 \u043F\u0435\u0440\u044C\u0435\u0432.", martial: "\u0411\u044C\u0451\u0442 \u043A\u0440\u044B\u043B\u044C\u044F\u043C\u0438 \u0438 \u0442\u043E\u043F\u0430\u0435\u0442. \u0417\u0430\u0434\u0435\u0432\u0430\u0435\u0442 \u0432\u0440\u0430\u0433\u043E\u0432 \u0440\u044F\u0434\u043E\u043C.", ak: "\u0421\u0442\u0440\u0435\u043B\u044F\u0435\u0442 \u043E\u0447\u0435\u0440\u0435\u0434\u044F\u043C\u0438. \u041A\u043E\u0433\u0434\u0430 \u043F\u0430\u0442\u0440\u043E\u043D\u044B \u043A\u043E\u043D\u0447\u0430\u0442\u0441\u044F, \u043F\u0435\u0440\u0435\u0437\u0430\u0440\u044F\u0436\u0430\u0435\u0442\u0441\u044F.", bomb: "\u041C\u043E\u0449\u043D\u0430\u044F \u0431\u043E\u043C\u0431\u0430 \u0432 \u0442\u043E\u043B\u043F\u0443. \u0411\u0440\u043E\u0441\u043A\u0438 \u0440\u0430\u0437 \u0432 5,2 \u0441 \u0434\u043E \u0443\u0441\u043A\u043E\u0440\u0435\u043D\u0438\u0439. \u0412\u0437\u0440\u044B\u0432 \u0441 \u043D\u0435\u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u0437\u0430\u0434\u0435\u0440\u0436\u043A\u043E\u0439.", dust: "\u041E\u0431\u043B\u0430\u043A\u043E \u0432\u043E\u043A\u0440\u0443\u0433 \u043A\u0443\u0440\u043E\u0447\u043A\u0438 \u043F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u043E \u0440\u0430\u043D\u0438\u0442 \u0438 \u0437\u0430\u043C\u0435\u0434\u043B\u044F\u0435\u0442 \u0432\u0440\u0430\u0433\u043E\u0432.", orbit: "\u042F\u0439\u0446\u0430 \u043A\u0440\u0443\u0436\u0430\u0442 \u0432\u043E\u043A\u0440\u0443\u0433 \u043A\u0443\u0440\u043E\u0447\u043A\u0438 \u0438 \u0431\u044C\u044E\u0442 \u0432\u0440\u0430\u0433\u043E\u0432 \u043F\u0440\u0438 \u043A\u0430\u0441\u0430\u043D\u0438\u0438. \u0418\u043D\u043E\u0433\u0434\u0430 \u0438\u0441\u0447\u0435\u0437\u0430\u044E\u0442, \u0437\u0430\u0442\u0435\u043C \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u044E\u0442\u0441\u044F." };
var effects = {
  "egg:blast": "\u041F\u0440\u044F\u043C\u043E\u0439 \u0443\u0440\u043E\u043D \u044F\u0439\u0446\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D. \u0412\u0437\u0440\u044B\u0432 \u043D\u0430\u043D\u043E\u0441\u0438\u0442 \u0441\u043E\u0441\u0435\u0434\u043D\u0438\u043C \u0432\u0440\u0430\u0433\u0430\u043C 45% \u0443\u0440\u043E\u043D\u0430 \u044F\u0439\u0446\u0430 \u0438 \u0441\u043B\u0435\u0433\u043A\u0430 \u043E\u0442\u0442\u0430\u043B\u043A\u0438\u0432\u0430\u0435\u0442.",
  "egg:gold": "\u041A\u0430\u0436\u0434\u044B\u0439 \u0442\u0440\u0435\u0442\u0438\u0439 \u0437\u0430\u043B\u043F \u2014 \u0437\u043E\u043B\u043E\u0442\u043E\u0439. \u041E\u043D \u043D\u0430\u043D\u043E\u0441\u0438\u0442 \u0432 4 \u0440\u0430\u0437\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 \u0443\u0440\u043E\u043D\u0430 \u0438 \u043F\u0440\u043E\u043B\u0435\u0442\u0430\u0435\u0442 \u0441\u043A\u0432\u043E\u0437\u044C \u0432\u0441\u0435\u0445 \u0432\u0440\u0430\u0433\u043E\u0432.",
  "beak:super": "\u041E\u0434\u0438\u043D \u0441\u0438\u043B\u044C\u043D\u044B\u0439 \u0443\u0434\u0430\u0440 \u0432\u043C\u0435\u0441\u0442\u043E \u0441\u0435\u0440\u0438\u0438. \u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0441\u043D\u0430\u0440\u044F\u0434\u044B \u0434\u0435\u043B\u0430\u044E\u0442 \u0435\u0433\u043E \u043A\u0440\u0443\u043F\u043D\u0435\u0435 \u0438 \u0441\u0438\u043B\u044C\u043D\u0435\u0435.",
  "beak:remote": "\u041A\u043B\u044E\u0451\u0442 \u043F\u0440\u044F\u043C\u043E \u043F\u043E \u0432\u0440\u0430\u0433\u0443 \u043D\u0430 \u043B\u044E\u0431\u043E\u043C \u0440\u0430\u0441\u0441\u0442\u043E\u044F\u043D\u0438\u0438. \u041A\u0430\u0436\u0434\u044B\u0439 \u0443\u0434\u0430\u0440 \u043F\u043E \u0442\u043E\u0439 \u0436\u0435 \u0446\u0435\u043B\u0438 \u0441\u0438\u043B\u044C\u043D\u0435\u0435 \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0435\u0433\u043E. \u041F\u043E\u0441\u043B\u0435 \u0435\u0451 \u0433\u0438\u0431\u0435\u043B\u0438 \u0441\u0435\u0440\u0438\u044F \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0438\u0442 \u043A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0439.",
  "feather:pierce": "\u041F\u0435\u0440\u044C\u044F \u043F\u043E\u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u043A\u043E\u043B\u044C\u0446\u043E\u043C \u0432\u043E\u043A\u0440\u0443\u0433 \u043A\u0443\u0440\u043E\u0447\u043A\u0438 \u0438 \u043B\u0435\u0442\u044F\u0442 \u043A \u043D\u0435\u0439. \u041F\u0440\u043E\u043D\u0437\u0430\u044E\u0442 \u0432\u0441\u0435\u0445 \u0432\u0440\u0430\u0433\u043E\u0432 \u043D\u0430 \u043F\u0443\u0442\u0438.",
  "feather:bounce": "\u041F\u0435\u0440\u044C\u044F \u043D\u0430\u043D\u043E\u0441\u044F\u0442 \u0432 2,2 \u0440\u0430\u0437\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 \u0443\u0440\u043E\u043D\u0430 \u0438 \u0434\u043E \u0447\u0435\u0442\u044B\u0440\u0451\u0445 \u0440\u0430\u0437 \u043E\u0442\u0441\u043A\u0430\u043A\u0438\u0432\u0430\u044E\u0442 \u043A \u0434\u0440\u0443\u0433\u0438\u043C \u0432\u0440\u0430\u0433\u0430\u043C.",
  "martial:stomp": "\u0412\u043C\u0435\u0441\u0442\u043E \u0432\u0437\u043C\u0430\u0445\u043E\u0432 \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u043E\u043F\u043E\u0442. \u0411\u044C\u0451\u0442 \u0432\u0441\u0435\u0445 \u0432\u043E\u043A\u0440\u0443\u0433 \u0438 \u043E\u0442\u0442\u0430\u043B\u043A\u0438\u0432\u0430\u0435\u0442 \u0438\u0445.",
  "martial:plumes": "\u041E\u0431\u0430 \u043A\u0440\u044B\u043B\u0430 \u0432\u044B\u043F\u0443\u0441\u043A\u0430\u044E\u0442 \u043F\u0435\u0440\u044C\u044F. \u0423\u0434\u0430\u0440\u0430 \u043B\u0430\u043F\u043E\u0439 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435\u0442.",
  "ak:belt": "\u041A\u0430\u043B\u0430\u0448 \u0441\u0442\u0440\u0435\u043B\u044F\u0435\u0442 \u0431\u0435\u0437 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438. \u041F\u0435\u0440\u0435\u0437\u0430\u0440\u044F\u0434\u043A\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u043D\u0443\u0436\u043D\u0430.",
  "ak:blast": "\u041F\u0443\u043B\u0438 \u0432\u0437\u0440\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u043F\u0440\u0438 \u043F\u043E\u043F\u0430\u0434\u0430\u043D\u0438\u0438 \u0438 \u0440\u0430\u043D\u044F\u0442 \u0441\u043E\u0441\u0435\u0434\u043D\u0438\u0445 \u0432\u0440\u0430\u0433\u043E\u0432. \u041F\u0435\u0440\u0435\u0437\u0430\u0440\u044F\u0434\u043A\u0430 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F.",
  "bomb:cluster": "\u0422\u0440\u0438 \u043C\u0430\u043B\u044B\u0445 \u0437\u0430\u0440\u044F\u0434\u0430 \u0440\u0430\u0437\u043B\u0435\u0442\u0430\u044E\u0442\u0441\u044F \u0434\u0430\u043B\u044C\u0448\u0435. \u041A\u0430\u0436\u0434\u044B\u0439 \u0432\u0437\u0440\u044B\u0432 \u043D\u0430\u043D\u043E\u0441\u0438\u0442 32% \u0443\u0440\u043E\u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0431\u043E\u043C\u0431\u044B.",
  "bomb:embers": "\u041F\u043E\u0441\u043B\u0435 \u0432\u0437\u0440\u044B\u0432\u0430 \u043D\u0430 \u0442\u0440\u0438 \u0441\u0435\u043A\u0443\u043D\u0434\u044B \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0433\u043E\u0440\u044F\u0447\u0438\u0435 \u0437\u0451\u0440\u043D\u0430. \u041E\u043D\u0438 \u0440\u0430\u043D\u044F\u0442 \u0432\u0440\u0430\u0433\u043E\u0432, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043F\u043E \u043D\u0438\u043C \u043F\u0440\u043E\u0445\u043E\u0434\u044F\u0442.",
  "dust:storm": "\u041F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u043E\u0435 \u0448\u0438\u0440\u043E\u043A\u043E\u0435 \u043E\u0431\u043B\u0430\u043A\u043E \u0441\u043B\u0435\u0434\u0443\u0435\u0442 \u0437\u0430 \u043A\u0443\u0440\u043E\u0447\u043A\u043E\u0439: \u0437\u0430\u043C\u0435\u0434\u043B\u0435\u043D\u0438\u0435 55%, \u0443\u0440\u043E\u043D \xD71,65.",
  "dust:trail": "\u041F\u0440\u0438 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0438 \u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0438\u0435 \u043E\u0431\u043B\u0430\u043A\u0430 \u043D\u0430 3 \u0441\u0435\u043A\u0443\u043D\u0434\u044B. \u0420\u0430\u0434\u0438\u0443\u0441 \u0440\u0430\u0441\u0442\u0451\u0442 \u0432 2,5 \u0440\u0430\u0437\u0430, \u0443\u0440\u043E\u043D \xD72,784 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u044B\u043C. \u0417\u0430\u043C\u0435\u0434\u043B\u044F\u0435\u0442 \u043D\u0430 42%. \u0423\u0440\u043E\u043D \u0440\u0430\u0437\u043D\u044B\u0445 \u0443\u0447\u0430\u0441\u0442\u043A\u043E\u0432 \u0441\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u0435\u0442\u0441\u044F, \u0447\u0430\u0441\u0442\u043E\u0442\u0430 \u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u0438 \u0430\u0442\u0430\u043A\u0438.",
  "orbit:double": "\u0414\u0432\u0430 \u043A\u043E\u043B\u044C\u0446\u0430 \u044F\u0438\u0446 \u043A\u0440\u0443\u0436\u0430\u0442 \u0432 \u0440\u0430\u0437\u043D\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B. \u0411\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0438\u0441\u0447\u0435\u0437\u0430\u044E\u0442.",
  "orbit:guard": "\u041E\u0434\u043D\u043E \u043E\u0433\u0440\u043E\u043C\u043D\u043E\u0435 \u0437\u043E\u043B\u043E\u0442\u043E\u0435 \u044F\u0434\u0440\u043E \u043C\u0435\u0434\u043B\u0435\u043D\u043D\u043E \u0432\u0440\u0430\u0449\u0430\u0435\u0442\u0441\u044F \u0432\u0434\u0430\u043B\u0438 \u043E\u0442 \u043A\u0443\u0440\u043E\u0447\u043A\u0438. \u0423\u0440\u043E\u043D \xD79; \u0441\u0438\u043B\u044C\u043D\u043E \u043E\u0442\u0442\u0430\u043B\u043A\u0438\u0432\u0430\u0435\u0442 \u0432\u044B\u0436\u0438\u0432\u0448\u0438\u0445 \u043E\u0431\u044B\u0447\u043D\u044B\u0445 \u0432\u0440\u0430\u0433\u043E\u0432, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u043C\u0435\u0434\u0432\u0435\u0434\u0435\u0439. \u0411\u043E\u0441\u0441\u043E\u0432 \u043D\u0435 \u0434\u0432\u0438\u0433\u0430\u0435\u0442. \u042F\u0434\u0440\u043E \u0432\u0441\u0435\u0433\u0434\u0430 \u043E\u0434\u043D\u043E. \u041A\u0430\u0436\u0434\u044B\u0439 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0441\u043D\u0430\u0440\u044F\u0434 \u0434\u0430\u0451\u0442 \u0435\u043C\u0443 +10% \u0440\u0430\u0437\u043C\u0435\u0440\u0430 \u0438 +5% \u0443\u0440\u043E\u043D\u0430."
};
var passive = { speed: "\u0411\u0435\u0433\u0430\u0435\u0442 \u043D\u0430 20% \u0431\u044B\u0441\u0442\u0440\u0435\u0435. \u0414\u043E \u043F\u044F\u0442\u0438 \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0439.", damage: "+12% \u043A \u0443\u0440\u043E\u043D\u0443 \u0432\u0441\u0435\u0445 \u043E\u0440\u0443\u0434\u0438\u0439.", haste: "\u0410\u0442\u0430\u043A\u0443\u0435\u0442 \u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u0440\u044F\u0436\u0430\u0435\u0442\u0441\u044F \u043D\u0430 10% \u0431\u044B\u0441\u0442\u0440\u0435\u0435.", magnet: "\u041F\u043E\u0434\u0431\u0438\u0440\u0430\u0435\u0442 \u0441\u0435\u043C\u0435\u0447\u043A\u0438 \u0441 \u0431\u043E\u043B\u044C\u0448\u0435\u0433\u043E \u0440\u0430\u0441\u0441\u0442\u043E\u044F\u043D\u0438\u044F.", health: "+2 \u0441\u0435\u0440\u0434\u0446\u0430. \u0421\u0440\u0430\u0437\u0443 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u0442 \u0434\u0432\u0430 \u0441\u0435\u0440\u0434\u0446\u0430. \u0414\u043E \u043F\u044F\u0442\u0438 \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0439.", shots: "+1 \u0441\u043D\u0430\u0440\u044F\u0434 \u0432 \u0437\u0430\u043B\u043F\u0435. \u0422\u0430\u043A\u0436\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u0442 \u0443\u0434\u0430\u0440\u044B \u0432 \u0441\u0435\u0440\u0438\u0438 \u043A\u043B\u0435\u0432\u043A\u043E\u0432 \u0438 \u043E\u0440\u0431\u0438\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u044F\u0439\u0446\u0430. \u0417\u043E\u043B\u043E\u0442\u043E\u0435 \u044F\u0434\u0440\u043E \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043E\u0434\u043D\u0438\u043C, \u043D\u043E \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 +10% \u0440\u0430\u0437\u043C\u0435\u0440\u0430 \u0438 +5% \u0443\u0440\u043E\u043D\u0430 \u0437\u0430 \u0441\u043D\u0430\u0440\u044F\u0434. \u0414\u043E \u0442\u0440\u0451\u0445 \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0439.", size: "\u0421\u043D\u0430\u0440\u044F\u0434\u044B \u0438 \u043E\u0431\u043B\u0430\u0441\u0442\u044C \u0443\u0434\u0430\u0440\u043E\u0432 \u043D\u0430 20% \u043A\u0440\u0443\u043F\u043D\u0435\u0435. \u0414\u043E \u043F\u044F\u0442\u0438 \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0439.", experience: "\u041D\u0430 18% \u0431\u043E\u043B\u044C\u0448\u0435 \u043E\u043F\u044B\u0442\u0430 \u0437\u0430 \u043A\u0430\u0436\u0434\u0443\u044E \u0441\u0435\u043C\u0435\u0447\u043A\u0443. \u0414\u043E \u043F\u044F\u0442\u0438 \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0439." };
var fmtFlat = (n) => Number(n.toFixed(1)).toLocaleString("ru");
var flavor = { martial: "\u0410\u0442\u0430\u043A\u0438 \u0447\u0430\u0449\u0435 \u0438 \u0437\u0430\u0445\u0432\u0430\u0442\u044B\u0432\u0430\u044E\u0442 \u0431\u043E\u043B\u044C\u0448\u0435 \u0432\u0440\u0430\u0433\u043E\u0432.", beak: "\u041A\u043B\u044E\u0451\u0442 \u0447\u0430\u0449\u0435 \u0438 \u0434\u043E\u0441\u0442\u0430\u0451\u0442 \u0434\u0430\u043B\u044C\u0448\u0435.", dust: "\u0420\u0430\u0434\u0438\u0443\u0441 \u043E\u0431\u043B\u0430\u043A\u0430 +14% \u043E\u0442 \u0431\u0430\u0437\u043E\u0432\u043E\u0433\u043E \u0437\u0430 \u0443\u0440\u043E\u0432\u0435\u043D\u044C.", orbit: "\u0420\u0430\u0437\u043C\u0435\u0440 \u044F\u0438\u0446 +12%, \u0432\u0440\u0430\u0449\u0435\u043D\u0438\u0435 +6% \u043E\u0442 \u0431\u0430\u0437\u043E\u0432\u043E\u0433\u043E \u0437\u0430 \u0443\u0440\u043E\u0432\u0435\u043D\u044C. \u0423 \u044F\u0434\u0440\u0430 \u0440\u043E\u0441\u0442 \u0440\u0430\u0437\u043C\u0435\u0440\u0430 +14%.", egg: "\u0420\u0430\u0437\u043C\u0435\u0440 \u044F\u0438\u0446 +12% \u043E\u0442 \u0431\u0430\u0437\u043E\u0432\u043E\u0433\u043E \u0437\u0430 \u0443\u0440\u043E\u0432\u0435\u043D\u044C.", ak: "\u0421\u0442\u0440\u0435\u043B\u044F\u0435\u0442 \u0447\u0430\u0449\u0435. \u0412 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0435 \u0435\u0449\u0451 \u043F\u044F\u0442\u044C \u043F\u0430\u0442\u0440\u043E\u043D\u043E\u0432." };
var shotExtra = { beak: "\u0415\u0449\u0451 \u043E\u0434\u0438\u043D \u0443\u0434\u0430\u0440 \u0432 \u0441\u0435\u0440\u0438\u0438.", orbit: "\u0415\u0449\u0451 \u043E\u0434\u043D\u043E \u044F\u0439\u0446\u043E \u0432 \u043A\u043E\u043B\u044C\u0446\u0435.", bomb: "\u0415\u0449\u0451 \u043E\u0434\u043D\u0430 \u0431\u043E\u043C\u0431\u0430 \u0437\u0430 \u0431\u0440\u043E\u0441\u043E\u043A.", feather: "\u0415\u0449\u0451 \u043E\u0434\u043D\u043E \u043F\u0435\u0440\u043E \u0432 \u0437\u0430\u043B\u043F\u0435." };
function applyItemCopy(weapons, passives) {
  for (const [id, w] of Object.entries(weapons)) {
    w.description = base[id];
    w.effects = w.effects.map(([effect, name]) => [effect, name, effects[id + ":" + effect]]);
  }
  for (const p of passives) p[3] = passive[p[0]];
}
function upgradeCopy(id, level, t, baseDamage) {
  const rate = level === 5 ? t.progress.weaponDamage * 2 : t.progress.weaponDamage;
  const bump = baseDamage * rate;
  let text = `+${fmtFlat(bump)} \u043A \u0443\u0440\u043E\u043D\u0443. `;
  text += flavor[id] || "\u0410\u0442\u0430\u043A\u0438 \u0447\u0430\u0449\u0435, \u0441\u043D\u0430\u0440\u044F\u0434\u044B \u043A\u0440\u0443\u043F\u043D\u0435\u0435.";
  if (level === 5) text += " \u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0435 \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0435. \u0417\u0430\u0442\u0435\u043C \u0432\u044B\u0431\u0435\u0440\u0438 \u043E\u0434\u043D\u0443 \u0438\u0437 \u0434\u0432\u0443\u0445 \u044D\u0432\u043E\u043B\u044E\u0446\u0438\u0439.";
  if ([3, 5].includes(level) && !["martial", "dust"].includes(id)) text += " " + (shotExtra[id] || "\u0415\u0449\u0451 \u043E\u0434\u0438\u043D \u0441\u043D\u0430\u0440\u044F\u0434 \u0432 \u0437\u0430\u043B\u043F\u0435.");
  return text;
}

// dist/game/rewards.js
function earnChest(s) {
  if (s.chest.earned) return false;
  s.chest.earned = true;
  s.events.push("chest-earned");
  return true;
}
function continueBonus(s) {
  if (s.mode !== "victory") return false;
  s.awaitingBonusChoice = false;
  s.mode = s.pending ? "upgrade" : "playing";
  return true;
}
function finishRun(s) {
  if (!["victory", "paused", "playing"].includes(s.mode)) return false;
  s.awaitingBonusChoice = false;
  s.mode = "ended";
  return true;
}

// dist/game/run-rules.js
var PAID_REROLL_LIMIT = 3;
var CONTINUE_PRICES = Object.freeze([20, 100]);
var used = /* @__PURE__ */ new WeakSet();
var issued = /* @__PURE__ */ new WeakSet();
function continuePrice(s) {
  if (s.bossEvents?.turkey === "dead") return null;
  const price = CONTINUE_PRICES[s.continuesUsed | 0];
  return Number.isFinite(price) ? price : null;
}
function purchaseQuote(s, action) {
  const price = action === "reroll" ? 5 : action === "revive" ? continuePrice(s) : NaN;
  if (!Number.isFinite(price) || s.ge < price) return null;
  if (action === "reroll" && (s.mode !== "upgrade" || s.freeRerolls > 0 || s.stats.paidRerolls >= PAID_REROLL_LIMIT)) return null;
  if (action === "revive" && (s.mode !== "revive" || continuePrice(s) == null)) return null;
  const q = Object.freeze({ state: s, action, price, balance: s.ge, mode: s.mode, time: s.time, choices: s.choices, continuesUsed: s.continuesUsed | 0 });
  issued.add(q);
  return q;
}
function consumeQuote(s, action, q) {
  if (!q || !issued.has(q) || used.has(q) || q.time !== s.time || q.choices !== s.choices || q.state !== s || q.action !== action || q.balance !== s.ge || q.mode !== s.mode || action === "revive" && q.continuesUsed !== (s.continuesUsed | 0)) return false;
  const current = purchaseQuote(s, action);
  if (!current || current.price !== q.price) return false;
  used.add(q);
  return true;
}

// dist/game/world.js
function makeWorldObjects(width, height) {
  const obstacles = [], decor = [];
  const hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let row = 0; row < Math.floor(height / 660) - 1; row++) for (let col = 0; col < Math.floor(width / 650) - 1; col++) {
    const id = row * 100 + col, x = 650 + col * 650 + (hash(id) - 0.5) * 170, y = 680 + row * 660 + (hash(id + 80) - 0.5) * 160;
    if (id % 2 === 1 || Math.hypot(x - width / 2, y - height / 2) < 470) continue;
    obstacles.push({ id, type: id % 3 === 0 ? "pond" : "rock", x, y, r: id % 3 === 0 ? 105 + hash(id + 3) * 30 : 60 + hash(id + 7) * 25 });
  }
  for (let i = 0; i < 700; i++) {
    const x = 70 + hash(i + 200) * (width - 140), y = 80 + hash(i + 1200) * (height - 160);
    if (obstacles.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + 32)) continue;
    decor.push({ id: i, x, y, variant: 1 + i % 12, size: 18 + hash(i + 400) * 35, angle: (hash(i + 600) - 0.5) * 1.4 });
  }
  return { obstacles, decor };
}
function resolveObstacles(body, obstacles) {
  for (let pass = 0; pass < 3; pass++) for (const o of obstacles || []) {
    const dx = body.x - o.x, dy = body.y - o.y, r = body.r + o.r;
    if (Math.abs(dx) >= r || Math.abs(dy) >= r) continue;
    const d = Math.hypot(dx, dy);
    if (d < r) {
      body.x = o.x + (d ? dx / d : 1) * (r + 0.01);
      body.y = o.y + (d ? dy / d : 0) * (r + 0.01);
    }
  }
  return body;
}
function moveBody(body, dx, dy, obstacles) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(8, body.r * 0.65)));
  for (let i = 0; i < steps; i++) {
    body.x += dx / steps;
    body.y += dy / steps;
    resolveObstacles(body, obstacles);
  }
  return body;
}
function steerAround(body, target, ux, uy, obstacles) {
  const goalDistance = Math.hypot(target.x - body.x, target.y - body.y);
  if (goalDistance <= body.r + (target.r || 19) + 8) {
    body.avoidId = null;
    return { x: ux, y: uy };
  }
  let nearest2 = null, best = Infinity;
  for (const o2 of obstacles || []) {
    const dx2 = o2.x - body.x, dy2 = o2.y - body.y, ahead = dx2 * ux + dy2 * uy, cross = dx2 * uy - dy2 * ux, R2 = o2.r + body.r + 1;
    const targetBeyond = (target.x - o2.x) * ux + (target.y - o2.y) * uy;
    if (ahead > 0 && ahead < R2 + 38 && ahead < goalDistance && targetBeyond > -R2 && Math.abs(cross) < R2 && ahead < best) {
      nearest2 = o2;
      best = ahead;
    }
  }
  if (!nearest2) {
    body.avoidId = null;
    return { x: ux, y: uy };
  }
  const o = nearest2, dx = body.x - o.x, dy = body.y - o.y, d = Math.max(1, Math.hypot(dx, dy));
  if (body.avoidId !== o.id) {
    body.avoidId = o.id;
    body.avoidSide = ux * (-dy / d) + uy * (dx / d) >= 0 ? 1 : -1;
  }
  const side = body.avoidSide, nx = dx / d, ny = dy / d, R = o.r + body.r + 1, radial = Math.max(-0.45, Math.min(0.35, (R + 2 - d) / 20));
  let x = -ny * side + nx * radial, y = nx * side + ny * radial, length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
}

// dist/game/engine.js
var collisionIndexes = /* @__PURE__ */ new WeakMap();
var WORLD = { width: 10800, height: 7200, fenceInset: 180, spawnPadding: 4096 };
var PASSIVE_LIMITS = { speed: 5, health: 5, size: 5, experience: 5 };
var CHARACTERS = { ryaba: { name: "\u041A\u0443\u0440\u043E\u0447\u043A\u0430 \u0420\u044F\u0431\u0430", hp: 3, speed: 126, weapon: "egg" }, rambo: { name: "\u0420\u044D\u043C\u0431\u043E", hp: 2, speed: 147.6, weapon: "ak" }, monk: { name: "\u041C\u043E\u043D\u0430\u0445", hp: 5, speed: 107.1, weapon: "martial" } };
var WEAPONS = { egg: { name: "\u042F\u0439\u0446\u0430", icon: "\u{1F95A}", damage: 15, interval: 0.9, speed: 270, effects: [["blast", "\u0412\u0437\u0440\u044B\u0432\u043D\u044B\u0435 \u044F\u0439\u0446\u0430", "\u0411\u043E\u043B\u044C\u0448\u043E\u0439 \u0432\u0437\u0440\u044B\u0432: \u0443\u0441\u0438\u043B\u0435\u043D\u043D\u044B\u0439 \u0443\u0440\u043E\u043D \u043F\u043E \u043E\u0431\u043B\u0430\u0441\u0442\u0438 \u0438 \u043B\u0451\u0433\u043A\u043E\u0435 \u043E\u0442\u0442\u0430\u043B\u043A\u0438\u0432\u0430\u043D\u0438\u0435 \u0441 \u0443\u0447\u0451\u0442\u043E\u043C \u0432\u0435\u0441\u0430."], ["gold", "\u0417\u043E\u043B\u043E\u0442\u043E\u0439 \u0437\u0430\u043B\u043F", "\u041A\u0430\u0436\u0434\u044B\u0439 \u0442\u0440\u0435\u0442\u0438\u0439 \u0437\u0430\u043B\u043F: \xD72.6 \u0443\u0440\u043E\u043D\u0430 \u0438 \u0431\u0435\u0441\u043A\u043E\u043D\u0435\u0447\u043D\u043E\u0435 \u043F\u0440\u043E\u0448\u0438\u0432\u0430\u043D\u0438\u0435."]] }, beak: { name: "\u041A\u043B\u044E\u0432", icon: "\u{1F531}", damage: 25, interval: 1.5, effects: [["super", "\u0421\u0443\u043F\u0435\u0440\u043A\u043B\u0435\u0432\u043E\u043A", "\u041E\u0434\u0438\u043D \u043E\u0433\u0440\u043E\u043C\u043D\u044B\u0439 \u043C\u0435\u0434\u043B\u0435\u043D\u043D\u044B\u0439 \u0443\u0434\u0430\u0440. \u0427\u0438\u0441\u043B\u043E \u0441\u043D\u0430\u0440\u044F\u0434\u043E\u0432 \u0443\u0441\u0438\u043B\u0438\u0432\u0430\u0435\u0442 \u0440\u0430\u0437\u043C\u0435\u0440 \u0438 \u0443\u0440\u043E\u043D."], ["remote", "\u0414\u0438\u0441\u0442\u0430\u043D\u0446\u0438\u043E\u043D\u043D\u044B\u0435 \u043A\u043B\u0435\u0432\u043A\u0438", "\u0421\u0435\u0440\u0438\u044F \u0431\u0435\u0437 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u0434\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438. \u041A\u0430\u0436\u0434\u044B\u0439 \u043F\u043E\u0432\u0442\u043E\u0440 +80% \u0431\u0430\u0437\u043E\u0432\u043E\u0433\u043E \u0443\u0440\u043E\u043D\u0430. \u041D\u0430\u043A\u043E\u043F\u043B\u0435\u043D\u0438\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u043C\u0435\u0436\u0434\u0443 \u0441\u0435\u0440\u0438\u044F\u043C\u0438 \u0434\u043E \u0433\u0438\u0431\u0435\u043B\u0438 \u0446\u0435\u043B\u0438."]] }, feather: { name: "\u041F\u0435\u0440\u044C\u044F", icon: "\u27B6", damage: 18, interval: 1.8, speed: 320, effects: [["pierce", "\u041F\u0435\u0440\u043D\u0430\u0442\u044B\u0439 \u0432\u0438\u0445\u0440\u044C", "\u041A\u0440\u0443\u0433 \u043F\u0435\u0440\u044C\u0435\u0432 \u043F\u043E\u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0432\u0434\u0430\u043B\u0438 \u0438 \u0441\u0442\u044F\u0433\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u043A \u043A\u0443\u0440\u043E\u0447\u043A\u0435, \u043F\u0440\u043E\u0448\u0438\u0432\u0430\u044F \u0432\u0440\u0430\u0433\u043E\u0432."], ["bounce", "\u0420\u0438\u043A\u043E\u0448\u0435\u0442", "\u0423\u0440\u043E\u043D \xD72.2. \u041F\u0435\u0440\u043E \u043E\u0442\u0441\u043A\u0430\u043A\u0438\u0432\u0430\u0435\u0442 \u0435\u0449\u0451 \u0434\u043E 4 \u0440\u0430\u0437."]] }, martial: { name: "\u041A\u0440\u044B\u043B\u044C\u044F \u0438 \u043B\u0430\u043F\u043A\u0438", icon: "\u262F", damage: 25.2, interval: 1.4375, effects: [["stomp", "\u0422\u043E\u043B\u044C\u043A\u043E \u0442\u043E\u043F\u043E\u0442", "\u041A\u0430\u0436\u0434\u0430\u044F \u0430\u0442\u0430\u043A\u0430 \u2014 \u043A\u0440\u0443\u0433\u043E\u0432\u043E\u0439 \u0443\u0434\u0430\u0440 \u043B\u0430\u043F\u043E\u0439 \u0441 \u043E\u0442\u0442\u0430\u043B\u043A\u0438\u0432\u0430\u043D\u0438\u0435\u043C."], ["plumes", "\u041F\u0435\u0440\u043D\u0430\u0442\u044B\u0435 \u043A\u0440\u044B\u043B\u044C\u044F", "\u041E\u0431\u0430 \u043A\u0440\u044B\u043B\u0430 \u043E\u0434\u043D\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u0432\u044B\u043F\u0443\u0441\u043A\u0430\u044E\u0442 \u043F\u0435\u0440\u044C\u044F. \u0422\u043E\u043F\u043E\u0442\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435\u0442."]] }, ak: { name: "\u041A\u0430\u043B\u0430\u0448", icon: "\u{1F525}", damage: 8, interval: 0.13, speed: 420, effects: [["belt", "\u041B\u0435\u043D\u0442\u043E\u0447\u043D\u043E\u0435 \u043F\u0438\u0442\u0430\u043D\u0438\u0435", "\u041D\u0435\u043F\u0440\u0435\u0440\u044B\u0432\u043D\u044B\u0439 \u043E\u0433\u043E\u043D\u044C. \u041F\u0435\u0440\u0435\u0437\u0430\u0440\u044F\u0434\u043A\u0438 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435\u0442."], ["blast", "\u0420\u0430\u0437\u0440\u044B\u0432\u043D\u044B\u0435 \u043F\u0430\u0442\u0440\u043E\u043D\u044B", "\u0412\u0437\u0440\u044B\u0432\u044B \u0432 \u0440\u0430\u0434\u0438\u0443\u0441\u0435 48. \u041C\u0430\u0433\u0430\u0437\u0438\u043D \u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u0440\u044F\u0434\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F."]] } };
Object.assign(WEAPONS, {
  bomb: { name: "\u0417\u0435\u0440\u043D\u043E\u0432\u0430\u044F \u0431\u043E\u043C\u0431\u0430", icon: "\u{1F33E}", damage: 36, interval: 5.2, effects: [["cluster", "\u0420\u0430\u0441\u0441\u044B\u043F\u043D\u043E\u0439 \u0437\u0430\u0440\u044F\u0434", "\u041F\u043E\u0441\u043B\u0435 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0433\u043E \u0432\u0437\u0440\u044B\u0432\u0430 \u0442\u0440\u0438 \u043C\u0430\u043B\u044B\u0445 \u0437\u0430\u0440\u044F\u0434\u0430 \u0432\u0437\u0440\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0432\u043E\u043A\u0440\u0443\u0433."], ["embers", "\u0416\u0430\u0440\u0435\u043D\u044B\u0435 \u0437\u0451\u0440\u043D\u0430", "\u0412\u0437\u0440\u044B\u0432 \u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u043E\u0431\u043B\u0430\u0441\u0442\u044C \u0442\u043B\u0435\u044E\u0449\u0435\u0433\u043E \u0437\u0435\u0440\u043D\u0430 \u043D\u0430 3 \u0441\u0435\u043A\u0443\u043D\u0434\u044B."]] },
  dust: { name: "\u041F\u044B\u043B\u044C\u043D\u0430\u044F \u0432\u0430\u043D\u043D\u0430", icon: "\u{1F32A}", damage: 5, interval: 4.5, effects: [["storm", "\u041F\u0435\u0441\u0447\u0430\u043D\u0430\u044F \u0431\u0443\u0440\u044F", "\u0411\u043E\u043B\u044C\u0448\u043E\u0435 \u043E\u0431\u043B\u0430\u043A\u043E \u0441\u043B\u0435\u0434\u0443\u0435\u0442 \u0437\u0430 \u0433\u0435\u0440\u043E\u0435\u043C, \u0441\u0438\u043B\u044C\u043D\u0435\u0435 \u0437\u0430\u043C\u0435\u0434\u043B\u044F\u0435\u0442, \u043D\u0430\u043D\u043E\u0441\u0438\u0442 \xD71.65 \u0443\u0440\u043E\u043D\u0430 \u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u043F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u043E."], ["trail", "\u041F\u044B\u043B\u0435\u0432\u043E\u0439 \u0441\u043B\u0435\u0434", "\u041F\u0440\u0438 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0438 \u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u0440\u0430\u0441\u0442\u0443\u0449\u0438\u0439 \u043F\u044B\u043B\u0435\u0432\u043E\u0439 \u0441\u043B\u0435\u0434 \u043D\u0430 3 \u0441\u0435\u043A\u0443\u043D\u0434\u044B."]] },
  orbit: { name: "\u041E\u0440\u0431\u0438\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u044F\u0439\u0446\u0430", icon: "\u{1F95A}", damage: 24, interval: 0.65, effects: [["double", "\u0414\u0432\u043E\u0439\u043D\u043E\u0439 \u0432\u0435\u043D\u0435\u0446", "\u0414\u0432\u0430 \u043F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u044B\u0445 \u043A\u043E\u043B\u044C\u0446\u0430 \u0441 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u043C \u0443\u0440\u043E\u043D\u043E\u043C \u0432\u0440\u0430\u0449\u0430\u044E\u0442\u0441\u044F \u0432 \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u043F\u043E\u043B\u043E\u0436\u043D\u044B\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u044B."], ["guard", "\u0417\u043E\u043B\u043E\u0442\u043E\u0435 \u044F\u0434\u0440\u043E", "\u041F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u044B\u0435 \u044F\u0439\u0446\u0430: \u0443\u0440\u043E\u043D \xD72.4 \u0438 \u043D\u0435\u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u043E\u0442\u0442\u0430\u043B\u043A\u0438\u0432\u0430\u043D\u0438\u0435 \u0441 \u0443\u0447\u0451\u0442\u043E\u043C \u0432\u0435\u0441\u0430."]] }
});
var PASSIVE_BONUSES = { speed: 0.2, damage: 0.12, haste: 0.1, magnet: 24, health: 2, shots: 1, size: 0.2, experience: 0.18 };
var passiveMultiplier = (s, id) => 1 + PASSIVE_BONUSES[id] * s.passives[id];
var PASSIVES = [["speed", "\u041B\u0451\u0433\u043A\u0438\u0435 \u043B\u0430\u043F\u043A\u0438", "\u{1F45F}", "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F +20% \u043E\u0442 \u0431\u0430\u0437\u043E\u0432\u043E\u0439. \u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 5 \u0443\u0440\u043E\u0432\u043D\u0435\u0439."], ["damage", "\u0411\u043E\u0435\u0432\u043E\u0439 \u043D\u0440\u0430\u0432", "\u{1F4A5}", "\u0423\u0440\u043E\u043D +12% \u043E\u0442 \u0431\u0430\u0437\u043E\u0432\u043E\u0433\u043E."], ["haste", "\u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u043A\u0440\u044B\u043B\u044C\u044F", "\u26A1", "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0430\u0442\u0430\u043A \u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u0440\u044F\u0434\u043A\u0438 +10% \u043E\u0442 \u0431\u0430\u0437\u043E\u0432\u043E\u0439."], ["magnet", "\u0417\u043E\u0440\u043A\u0438\u0439 \u0433\u043B\u0430\u0437", "\u{1F9F2}", "\u0420\u0430\u0434\u0438\u0443\u0441 \u0441\u0431\u043E\u0440\u0430 \u043E\u043F\u044B\u0442\u0430 +24."], ["health", "\u041A\u0440\u0435\u043F\u043A\u0430\u044F \u043A\u0443\u0440\u043E\u0447\u043A\u0430", "\u2665", "\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F +2. \u0412\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u0442 2 HP. \u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 5 \u0443\u0440\u043E\u0432\u043D\u0435\u0439."], ["shots", "\u0429\u0435\u0434\u0440\u044B\u0439 \u0437\u0430\u043B\u043F", "\u2726", "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0441\u043D\u0430\u0440\u044F\u0434 +1. \u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 3 \u0432\u044B\u0431\u043E\u0440\u0430."], ["size", "\u0428\u0438\u0440\u043E\u043A\u0438\u0439 \u0440\u0430\u0437\u043C\u0430\u0445", "\u2194", "\u0420\u0430\u0437\u043C\u0435\u0440 \u0430\u0442\u0430\u043A +20 \u043F\u0440\u043E\u0446\u0435\u043D\u0442\u043D\u044B\u0445 \u043F\u0443\u043D\u043A\u0442\u043E\u0432 (\u0434\u043E 5 \u0443\u0440\u043E\u0432\u043D\u0435\u0439): \u0441\u043D\u0430\u0440\u044F\u0434\u044B, \u043A\u043B\u0435\u0432\u043A\u0438 \u0438 \u0432\u0437\u0440\u044B\u0432\u044B."], ["experience", "\u0411\u044B\u0441\u0442\u0440\u0430\u044F \u0443\u0447\u0451\u0431\u0430", "\u273A", "\u0411\u043E\u043D\u0443\u0441 \u043E\u043F\u044B\u0442\u0430 +18 \u043F\u0440\u043E\u0446\u0435\u043D\u0442\u043D\u044B\u0445 \u043F\u0443\u043D\u043A\u0442\u043E\u0432. \u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 5 \u0443\u0440\u043E\u0432\u043D\u0435\u0439."]];
applyItemCopy(WEAPONS, PASSIVES);
var ENEMIES = { rat: { name: "\u041C\u044B\u0448\u0438", hp: 3, speed: 38, r: 12, score: 5 }, fox: { name: "\u041B\u0438\u0441\u044B", hp: 21, speed: 54, r: 16, score: 25 }, wolf: { name: "\u0412\u043E\u043B\u043A\u0438", hp: 95, speed: 87.36, r: 21, score: 50 }, bear: { name: "\u041C\u0435\u0434\u0432\u0435\u0434\u0438", hp: 322, speed: 23, r: 28, score: 100 }, squirrel: { name: "\u0411\u0435\u043B\u043A\u0438", hp: 12, speed: 58, r: 14, score: 40 } };
Object.assign(ENEMIES, {
  goose: { name: "\u0413\u0443\u0441\u0438", hp: 100, speed: 35, r: 20, score: 55 },
  duck: { name: "\u0423\u0442\u043A\u0438", hp: 12, speed: 81.6, r: 13, score: 22 },
  guinea: { name: "\u0426\u0435\u0441\u0430\u0440\u043A\u0430 \xB7 \u0431\u043E\u0441\u0441", hp: 3888, speed: 45.5, r: 36, score: 900, isBoss: true },
  turkey: { name: "\u0418\u043D\u0434\u044E\u043A \xB7 \u0431\u043E\u0441\u0441", hp: 20400, speed: 40.3, r: 72, score: 2500, isBoss: true }
});
var dropChances = { rat: [0.05, 3e-4], duck: [0.1, 5e-4], fox: [0.15, 2e-3], squirrel: [0.12, 1e-3], wolf: [0.65, 8e-3], goose: [0.8, 0.012], bear: [0.83, 0.06] };
for (const [id, [medium, large]] of Object.entries(dropChances)) {
  ENEMIES[id].mediumChance = medium;
  ENEMIES[id].largeChance = large;
}
var weights = { rat: 0.35, fox: 0.45, duck: 0.7, squirrel: 0.9, wolf: 2.3, bear: 5, goose: 2.5, guinea: 12, turkey: 20 };
var lateBoosts = { rat: 0.15, fox: 0.22, duck: 0.25, squirrel: 0.18, wolf: 0.2, bear: 0.15, goose: 0.2, guinea: 0, turkey: 0 };
for (const [id, d] of Object.entries(ENEMIES)) {
  d.weight = weights[id];
  d.lateBoost = lateBoosts[id];
}
var TUNING = {
  innate: { ryaba: 0.02, rambo: 0.02, monk: 0.02 },
  progress: { weaponDamage: 0.15, weaponHaste: 0.05, meleeSize: 0.2, rangedSize: 0.06, eggSize: 0.12, dustSize: 0.14, orbitSize: 0.12, orbitCoreLevelSize: 0.14, magazine: 20, magazinePerLevel: 5, reload: 3.5, shotLimit: 3, pickup: 48, xpBase: 12, xpPower: 1.75, xpFactor: 6, initialGems: 25 },
  flow: { interval: 0.85, minInterval: 0.065, intervalDecay: 8e-4, budget: 1.65, budgetGrowth: 180, introDuration: 60, rampStart: 0.55, rampHalf: 0.75, hpGrowth: 210, speedScale: 0.82, bonusHp: 12, bonusSpawn: 10, bonusBudget: 3, bonusSpeedCap: 5, bonusScore: 2, xpGrowth: 300, maxEnemies: 600 },
  combat: { invulnerability: 0.8, guard: 1, guardRadius: 115, guardPush: 12, reviveGuard: 2, healDropLimit: 8, magnetDropLimit: 5, healDropKills: 255, magnetDropKills: 390, heal: 1, healAttract: 105, magnetAttract: 75, pickupSpeed: 240, pickupCollect: 30, projectileScale: 0.9, bulletLife: 4, magnetPull: 750, gemPull: 420 },
  melee: { beakRange: 185, superRange: 280, superPerShot: 10, superSizeCap: 1.8, beakDuration: 0.46, beakMin: 0.28, superDuration: 0.72, superMin: 0.42, superDamage: 4.2, superShotDamage: 0.5, superInterval: 2.2, seriesGap: 0.045, seriesRest: 0.18, wingRange: 90, stompRange: 94, stompDamage: 1.8, stompPush: 22, wingDuration: 0.7, stompDuration: 0.52, plumeCount: 3, plumeDamage: 0.65 },
  effects: { eggBlast: 100, akBlast: 48, goldEvery: 3, goldDamage: 4, featherBounces: 4, eggCount: 1, akCount: 1, featherCount: 5, eggSpread: 0.1, akSpread: 0.16, featherSpread: 0.17, akScatter: 0.32 },
  behaviour: { squirrelInterval: 3.8 / 1.2, acornSpeed: 112.5, acornLife: 6, fleeRange: 135, retreatUntil: 175, shootRange: 205, squirrelFireRange: 250, foxCycle: 4.75, foxWarning: 2.8, foxDashAt: 3.9, foxDash: 7.6, foxWalk: 0.18, foxPrepare: 0.05 },
  growth: { hpLinear: 0.35, hpCubic: 3.4, hpExponent: 3, lateStart: 300, lateEnd: 600 },
  seedDrops: { smallValue: 1, mediumValue: 6, largeValue: 100, smallGrowth: 4, mediumGrowth: 3, largeGrowth: 0, growthDuration: 600 },
  newCombat: { eggSplash: 0.45, eggPush: 10, remoteStack: 0.8, returnRadius: 250, returnSpeed: 270, returnDamage: 1.35, bounceDamage: 2.2, returnExtra: 4 },
  newWeapons: { bombFuse: 1.1, bombRadius: 110, clusterCount: 3, clusterRadius: 62, clusterDamage: 0.32, clusterSpread: 1.15, emberDuration: 3, emberDps: 0.45, dustRadius: 100, dustDuration: 3.4, dustTick: 0.5, dustSlow: 0.25, stormRadius: 145, stormSlow: 0.55, stormDuration: 4.6, stormDamage: 1.65, trailDuration: 3, trailSpacing: 28, trailInterval: 0.5, trailGrowth: 2.5, trailDamage: 2.784375, trailRadiusScale: 0.25, trailSlow: 0.42, orbitCount: 2, orbitRadius: 100, orbitSpeed: 1.8, orbitSpeedPerLevel: 0.06, orbitDuration: 5, orbitCooldown: 2.5, orbitLevelDamage: 0.07, orbitGuardDamage: 9, orbitCoreRadius: 145, orbitCoreSize: 2.8, orbitCoreShotSize: 0.1, orbitCoreShotDamage: 0.05, orbitCoreSpeed: 0.42, orbitCoreSpin: 0.28, orbitCorePush: 180, orbitPush: 8 },
  bosses: { guineaAt: 300, turkeyAt: 600, guineaCrowd: 0.4, turkeyCrowd: 0.18, guineaWindup: 0.95, guineaWingRange: 230, guineaWingSpread: 0.65, guineaChargeSpeed: 240, guineaChargeDuration: 0.72, guineaChargeWidth: 33.3, guineaStompRadius: 155.7, guineaEngage: 350, turkeyEngage: 430, turkeyWindup: 1.2, bossRecovery: 1.1, wingRange: 380, wingSpread: 0.7, stompRadius: 266.2, chargeSpeed: 320, chargeDuration: 1.21, turkeyPeckStart: 0.85, turkeyPeckReach: 7.8, turkeyPeckWidth: 0.15, peckCount: 4, peckGap: 0.35, gooseRange: 105, gooseWidth: 25, gooseWindup: 0.65, gooseRecovery: 0.32 },
  weights: { rat: 8, duck: 2, goose: 1.5, fox: 2, squirrel: 1.1, wolf: 1.2, bear: 1.6, foxLate: 4, wolfLate: 2, foxLateAt: 240, wolfLateAt: 360 },
  costs: { rat: 0.5, duck: 1.4, goose: 3, fox: 2, squirrel: 2.5, wolf: 4, bear: 7, foxLate: 1.2, wolfLate: 2 }
};
for (const e of Object.values(ENEMIES)) {
  e.damage = 1;
  e.r *= 1.1 * 1.08;
  e.speed *= 1.05;
}
function hitR(e) {
  return e.type === "turkey" ? e.r * 1.5 : e.r;
}
ENEMIES.duck.speed *= 1.05 * 1.05;
ENEMIES.wolf.speed *= 1.05 * 0.95;
TUNING.bosses.guineaChargeSpeed *= 1.05;
TUNING.bosses.chargeSpeed *= 1.05;
var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function retain(list, ok) {
  let n = 0;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (ok(item)) list[n++] = item;
  }
  list.length = n;
}
var noExclusions = /* @__PURE__ */ new Set();
function createGame(character = "ryaba", random = Math.random) {
  const hero = CHARACTERS[character] || CHARACTERS.ryaba;
  const s = { random, character: CHARACTERS[character] ? character : "ryaba", mode: "playing", time: 0, score: 0, kills: 0, level: 1, xp: 0, need: TUNING.progress.xpBase, ge: 50, freeRerolls: 0, revived: false, continuesUsed: 0, spawnCredit: 0, spawnTimer: 0.4, enemyId: 0, bulletId: 0, enemies: [], bullets: [], acorns: [], gems: [], worms: [], magnets: [], fx: [], attacks: [], passives: { speed: 0, damage: 0, haste: 0, magnet: 0, health: 0, shots: 0, size: 0, experience: 0 }, weapons: {}, player: { x: WORLD.width / 2, y: WORLD.height / 2, r: 19 * 1.08, hp: hero.hp, maxHp: hero.hp, inv: 0 }, stats: { damageDealt: 0, damageTaken: 0, totalXp: 0, gems: 0, healed: 0, magnets: 0, rerolls: 0, freeRerolls: 0, paidRerolls: 0, revivals: 0, killsByType: Object.fromEntries(Object.keys(ENEMIES).map((id) => [id, 0])), weapons: Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, { damage: 0, kills: 0, attacks: 0 }])) }, pending: 0, choices: [], evolving: null, events: [], bonus: false, bonusStartedAt: null, awaitingBonusChoice: false, chest: { earned: false, opened: false, reward: null }, bossEvents: {}, bombs: [], zones: [], orbitals: [], ambientTimer: 12, spawnView: { width: 1100, height: 850 }, ...makeWorldObjects(WORLD.width, WORLD.height) };
  s.weapons[hero.weapon] = makeWeapon();
  for (let i = 0; i < TUNING.progress.initialGems; i++) s.gems.push({ x: WORLD.width / 2 - 530 + random() * 1060, y: WORLD.height / 2 - 320 + random() * 640, value: 1, tier: 1 });
  scatterSupplies(s, WORLD, resolveObstacles);
  return s;
}
function levelXpCost(level) {
  return Math.round(TUNING.progress.xpBase + Math.pow(level <= 1 ? 0 : level, TUNING.progress.xpPower) * TUNING.progress.xpFactor);
}
function makeWeapon() {
  return { level: 1, effect: null, cd: 0.2, volley: 0, ammo: TUNING.progress.magazine, reload: 0 };
}
function choicePool(s) {
  const pool = PASSIVES.filter(([id]) => s.passives[id] < (id === "shots" ? TUNING.progress.shotLimit : PASSIVE_LIMITS[id] ?? Infinity)).map(([id, name, icon, description]) => ({ kind: "passive", id, name, icon, description }));
  for (const [id, w] of Object.entries(WEAPONS)) {
    const held = s.weapons[id];
    if (held?.level >= 5 || id === "ak" && s.character !== "rambo" || id === "martial" && s.character !== "monk" || !held && Object.keys(s.weapons).length >= 3) continue;
    pool.push({ kind: "weapon", id, name: w.name, icon: w.icon, description: held ? upgradeCopy(id, held.level + 1, TUNING, w.damage) : w.description });
  }
  return pool;
}
function rollChoices(s) {
  const pool = choicePool(s);
  s.choices = [];
  while (s.choices.length < 3 && pool.length) s.choices.push(pool.splice(Math.floor(s.random() * pool.length), 1)[0]);
  return s.choices;
}
function reroll(s, confirmation = null) {
  if (s.mode !== "upgrade" || s.freeRerolls === 0 && (s.stats.paidRerolls >= PAID_REROLL_LIMIT || !consumeQuote(s, "reroll", confirmation))) return false;
  if (s.freeRerolls > 0) {
    s.freeRerolls--;
    s.stats.freeRerolls++;
  } else {
    s.ge -= confirmation.price;
    s.stats.paidRerolls++;
  }
  s.stats.rerolls++;
  rollChoices(s);
  return true;
}
function choose(s, index) {
  if (s.mode !== "upgrade") return false;
  const c = s.choices[index];
  if (!c) return false;
  if (c.kind === "passive" && s.passives[c.id] >= (c.id === "shots" ? TUNING.progress.shotLimit : PASSIVE_LIMITS[c.id] ?? Infinity)) return false;
  const oldReload = s.weapons.ak ? weaponStats(s, "ak").reload : 0;
  if (c.kind === "passive") {
    s.passives[c.id]++;
    if (c.id === "health") {
      s.player.maxHp += PASSIVE_BONUSES.health;
      s.player.hp += PASSIVE_BONUSES.health;
      s.stats.healed += PASSIVE_BONUSES.health;
    }
  } else if (!s.weapons[c.id]) s.weapons[c.id] = makeWeapon();
  else {
    const w = s.weapons[c.id];
    w.level++;
    if (c.id === "ak" && w.reload === 0) w.ammo += TUNING.progress.magazinePerLevel;
    if (w.level === 5) {
      if (c.id === "ak" && w.reload > 0) w.reload *= weaponStats(s, "ak").reload / oldReload;
      s.mode = "evolution";
      s.evolving = c.id;
      return true;
    }
  }
  if (s.weapons.ak?.reload > 0 && oldReload > 0) s.weapons.ak.reload *= weaponStats(s, "ak").reload / oldReload;
  finishChoice(s);
  return true;
}
function evolve(s, effect) {
  if (s.mode !== "evolution" || !WEAPONS[s.evolving].effects.some((x) => x[0] === effect)) return false;
  s.weapons[s.evolving].effect = effect;
  if (effect === "belt") s.weapons[s.evolving].reload = 0;
  s.evolving = null;
  finishChoice(s);
  return true;
}
function finishChoice(s) {
  s.pending--;
  if (s.pending > 0) {
    s.mode = "upgrade";
    rollChoices(s);
  } else {
    s.mode = "playing";
    s.player.inv = Math.max(s.player.inv, TUNING.combat.guard);
    s.player.hurtFlash = 0;
    retain(s.fx, (f) => f.type !== "hurt-feathers");
    for (const e of s.enemies) {
      const d = distance(e, s.player);
      if (d < TUNING.combat.guardRadius + e.r) {
        const angle = d > 0 ? Math.atan2(e.y - s.player.y, e.x - s.player.x) : e.id * 2.39996;
        const push = TUNING.combat.guardPush * (1 - d / (TUNING.combat.guardRadius + e.r)) / ENEMIES[e.type].weight;
        e.x = clamp(e.x + Math.cos(angle) * push, 32, WORLD.width - 32);
        e.y = clamp(e.y + Math.sin(angle) * push, 45, WORLD.height - 45);
      }
    }
    s.fx.push({ type: "guard", x: s.player.x, y: s.player.y, r: 115, life: 1 / 3, max: 1 / 3 });
  }
}
function damagePlayer(s, amount = 1) {
  if (s.player.inv > 0 || s.mode !== "playing") return;
  s.player.hp = Math.max(0, s.player.hp - amount);
  s.stats.damageTaken += amount;
  s.player.inv = TUNING.combat.invulnerability;
  s.player.hurtFlash = TUNING.combat.invulnerability;
  s.fx.push({ type: "hurt-feathers", x: s.player.x, y: s.player.y, r: 48, life: 0.65, max: 0.65 });
  s.events.push("hurt");
  if (s.player.hp <= 0) {
    s.mode = canRevive(s) ? "revive" : "ended";
    s.events.push(s.mode === "revive" ? "revive-offer" : "end");
  }
}
function enemyHpScale(time) {
  const t = Math.min(time, TUNING.bosses.turkeyAt);
  return 1 + TUNING.growth.hpLinear * t / TUNING.flow.hpGrowth + TUNING.growth.hpCubic * Math.pow(t / TUNING.bosses.turkeyAt, TUNING.growth.hpExponent);
}
function runTime(s) {
  return Math.max(0, s.time - (s.bossPausedSeconds || 0));
}
function progressionTime(s) {
  let t = runTime(s);
  for (const e of s.enemies) if (e.hp > 0 && ENEMIES[e.type]?.isBoss) t = Math.min(t, e.freezeAt ?? s.time);
  return t;
}
function bonusAge(s) {
  return s.bonus && s.bonusStartedAt != null ? Math.max(0, s.time - s.bonusStartedAt) / 4 : 0;
}
function enemySpeedScale(s, type) {
  const d = ENEMIES[type];
  if (d.isBoss) return 1;
  return (1 + d.lateBoost * clamp((progressionTime(s) - TUNING.growth.lateStart) / Math.max(1, TUNING.growth.lateEnd - TUNING.growth.lateStart), 0, 1)) * Math.min(TUNING.flow.bonusSpeedCap, 1 + bonusAge(s) / TUNING.flow.bonusHp);
}
function spawnEnemy(s, type) {
  const d = ENEMIES[type];
  if (!d) return null;
  if (d.isBoss) {
    const existing = s.enemies.find((e2) => e2.type === type && e2.hp > 0);
    if (existing) return existing;
  } else if (s.enemies.length >= TUNING.flow.maxEnemies) return null;
  const { x, y } = localSpawn(s, WORLD, d.r);
  const hp = d.hp * (d.isBoss ? 1 : enemyHpScale(progressionTime(s)) * (1 + bonusAge(s) / TUNING.flow.bonusHp));
  const e = { id: ++s.enemyId, type, x, y, r: d.r, hp, maxHp: hp, speed: d.speed * (d.isBoss ? 1 : TUNING.flow.speedScale), shot: 2 + s.random() * 2, dash: s.random() * TUNING.behaviour.foxWarning, flash: 0, freezeAt: runTime(s), attack: null, attackCd: 2, attackIndex: 0 };
  if (!d.isBoss) resolveObstacles(e, s.obstacles);
  s.enemies.push(e);
  if (d.isBoss) {
    s.bossEvents[type] = "alive";
    s.events.push("boss:" + type);
  }
  return e;
}
var SPAWN_STAGES = [{ start: 0, type: "rat" }, { start: 65, type: "fox" }, { start: 110, type: "duck" }, { start: 165, type: "squirrel" }, { start: 220, type: "wolf" }, { start: 270, type: "goose" }, { start: 420, type: "bear" }];
function spawnProfile(time) {
  const stages = [...SPAWN_STAGES].sort((a, b) => a.start - b.start), stage = stages.filter((x) => x.start <= time).at(-1) || stages[0], age = Math.max(0, time - stage.start), t = TUNING.flow, w = TUNING.weights;
  const weights2 = Object.fromEntries(stages.filter((x) => x.start <= time && !(x.type === "rat" && time >= 420)).map((x) => [x.type, x.type === "fox" && time >= w.foxLateAt ? w.foxLate : x.type === "wolf" && time >= w.wolfLateAt ? w.wolfLate : w[x.type]]));
  if (stage.start > 0 && age < t.introDuration) {
    const focus = 1 - age / t.introDuration;
    for (const key in weights2) weights2[key] *= key === stage.type ? 1 + focus * 5 : 1 - focus * 0.8;
  }
  if (stage.type === "bear" && age >= t.introDuration) weights2.bear = Math.max(w.bear, 2.4);
  return { stage: stage.type, age, weights: weights2, ramp: stage.start === 0 ? 1 : Math.min(1, t.rampStart + age / t.introDuration * (1 - t.rampStart)) };
}
function enemyCost(type, time) {
  const c = TUNING.costs, w = TUNING.weights;
  return type === "fox" && time >= w.foxLateAt ? c.foxLate : type === "wolf" && time >= w.wolfLateAt ? c.wolfLate : c[type];
}
function enemyType(s, profile) {
  let roll = s.random() * Object.values(profile.weights).reduce((a, b) => a + b, 0);
  for (const [type, weight] of Object.entries(profile.weights)) {
    roll -= weight;
    if (roll < 0) return type;
  }
  return profile.stage;
}
function nearest(s, from, excluded = noExclusions) {
  let target = null, best = Infinity;
  for (const e of s.enemies) {
    if (e.hp <= 0 || excluded.has(e.id)) continue;
    const dx = e.x - from.x, dy = e.y - from.y, d = dx * dx + dy * dy;
    if (d < best) {
      best = d;
      target = e;
    }
  }
  return target;
}
function hit(s, e, damage, weaponId) {
  if (e.hp <= 0) return;
  const dealt = Math.min(e.hp, damage);
  s.stats.damageDealt += dealt;
  if (weaponId) s.stats.weapons[weaponId].damage += dealt;
  e.hp -= damage;
  e.flash = 0.1;
  s.events.push("hit");
  if (e.hp <= 0) {
    const d = ENEMIES[e.type];
    s.kills++;
    s.stats.killsByType[e.type]++;
    if (weaponId) s.stats.weapons[weaponId].kills++;
    s.score += d.score * (s.bonus ? TUNING.flow.bonusScore : 1);
    if (d.isBoss) {
      s.bossEvents[e.type] = "dead";
      s.fx.push({ type: "boss-death", x: e.x, y: e.y, r: e.r * 2.7, life: 1.1, max: 1.1 });
      s.gems.push(...bossSeedDrops(s, e));
      if (e.type === "turkey") earnChest(s);
      s.events.push("boss-defeated:" + e.type);
      reconcileBosses(s);
    } else s.gems.push(makeSeedDrop(s, e));
    dropConsumables(s, e);
    s.events.push("kill");
    s.events.push("death:" + e.type);
  }
}
function explosion(s, x, y, r, damage, exclude, weaponId, push = 0) {
  if (distance(s.player, { x, y }) < 650) s.events.push("explosion");
  s.fx.push({ type: "blast", x, y, r, life: 0.3, max: 0.3 });
  for (const e of s.enemies) if (e.hp > 0 && e.id !== exclude && distance(e, { x, y }) < r + hitR(e)) {
    hit(s, e, damage, weaponId);
    if (push) knockback(e, x, y, push);
  }
}
function playerStats(s) {
  const levels = s.level - 1;
  return { speed: CHARACTERS[s.character].speed * passiveMultiplier(s, "speed"), pickup: TUNING.progress.pickup + PASSIVE_BONUSES.magnet * s.passives.magnet, damageBonus: PASSIVE_BONUSES.damage * s.passives.damage + (s.character === "rambo" ? TUNING.innate.rambo * levels : 0), hasteBonus: PASSIVE_BONUSES.haste * s.passives.haste + (s.character === "monk" ? TUNING.innate.monk * levels : 0), sizeBonus: PASSIVE_BONUSES.size * s.passives.size, xpBonus: PASSIVE_BONUSES.experience * s.passives.experience + (s.character === "ryaba" ? TUNING.innate.ryaba * levels : 0), extraShots: s.passives.shots * PASSIVE_BONUSES.shots };
}
function weaponFlatDamage(id, level = 1) {
  const base2 = WEAPONS[id].damage, tier = Math.max(0, level - 1), step2 = TUNING.progress.weaponDamage, finalStep = step2 * 2;
  return base2 + base2 * step2 * Math.min(tier, 3) + base2 * finalStep * Math.max(0, tier - 3);
}
function weaponStats(s, id, w = s.weapons[id]) {
  const def = WEAPONS[id], tier = w.level - 1, p = playerStats(s), attackRate = 1 + TUNING.progress.weaponHaste * tier + p.hasteBonus;
  return { damage: weaponFlatDamage(id, w.level) * (1 + p.damageBonus) * (id === "orbit" && w.effect === "guard" ? 1 + p.extraShots * TUNING.newWeapons.orbitCoreShotDamage : 1), interval: def.interval / attackRate * (w.effect === "super" ? TUNING.melee.superInterval : 1), count: id === "orbit" && w.effect === "guard" ? 1 : id === "martial" ? 1 : (id === "feather" ? TUNING.effects.featherCount : id === "ak" ? TUNING.effects.akCount : id === "orbit" ? TUNING.newWeapons.orbitCount : id === "bomb" || id === "dust" ? 1 : TUNING.effects.eggCount) + Math.floor(tier / 2) + Math.min(TUNING.progress.shotLimit, s.passives.shots) * PASSIVE_BONUSES.shots, size: (1 + (["beak", "martial"].includes(id) ? TUNING.progress.meleeSize : id === "egg" ? TUNING.progress.eggSize : id === "dust" ? TUNING.progress.dustSize : id === "orbit" ? w.effect === "guard" ? TUNING.progress.orbitCoreLevelSize : TUNING.progress.orbitSize : TUNING.progress.rangedSize) * tier + p.sizeBonus) * (id === "orbit" && w.effect === "guard" ? 1 + p.extraShots * TUNING.newWeapons.orbitCoreShotSize : 1), magazine: TUNING.progress.magazine + TUNING.progress.magazinePerLevel * tier, reload: w.effect === "belt" ? 0 : TUNING.progress.reload / attackRate, attackRate };
}
function canRevive(s) {
  return continuePrice(s) != null;
}
function revive(s, confirmation = null) {
  if (s.mode !== "revive" || !canRevive(s) || !consumeQuote(s, "revive", confirmation)) return false;
  s.ge -= confirmation.price;
  s.continuesUsed = (s.continuesUsed | 0) + 1;
  s.revived = true;
  s.stats.revivals++;
  s.player.hp = s.player.maxHp;
  s.player.inv = TUNING.combat.reviveGuard;
  s.player.hurtFlash = 0;
  retain(s.fx, (f) => f.type !== "hurt-feathers");
  s.mode = "playing";
  s.events.push("revive");
  for (const g of s.gems) g.magnetized = true;
  s.stats.magnets++;
  s.events.push("magnet");
  for (const e of s.enemies) {
    const d = distance(e, s.player);
    if (d < 200) {
      const a = d ? Math.atan2(e.y - s.player.y, e.x - s.player.x) : e.id * 2.4;
      e.x = clamp(e.x + Math.cos(a) * 45 / ENEMIES[e.type].weight, 32, WORLD.width - 32);
      e.y = clamp(e.y + Math.sin(a) * 45 / ENEMIES[e.type].weight, 45, WORLD.height - 45);
    }
  }
  retain(s.acorns, (a) => distance(a, s.player) > 180);
  s.fx.push({ type: "revive", x: s.player.x, y: s.player.y, r: 180, life: 1, max: 1 });
  return true;
}
function declineRevive(s) {
  if (s.mode !== "revive") return false;
  s.mode = "ended";
  return true;
}
function beakShape(s, w = s.weapons.beak) {
  const v = weaponStats(s, "beak", w), big = w.effect === "super";
  return { range: big ? (TUNING.melee.superRange + v.count * TUNING.melee.superPerShot) * Math.min(v.size, TUNING.melee.superSizeCap) : TUNING.melee.beakRange * v.size, duration: Math.max(big ? TUNING.melee.superMin : TUNING.melee.beakMin, (big ? TUNING.melee.superDuration : TUNING.melee.beakDuration) / v.attackRate) };
}
function wingSweep(a, phase) {
  return a.angle + a.side * (a.wingEvolution ? -1.75 + 1.75 * phase : -1.4 + 2.8 * phase);
}
function beakPose(a) {
  const phase = clamp(a.elapsed / a.duration, 0, 1), smooth = (t) => t * t * (3 - 2 * t), thrust = phase < 0.48 ? smooth(phase / 0.48) : 1 - smooth((phase - 0.48) / 0.52), oldRange = a.r / 2.5, width = oldRange * (a.big ? 1.32 : 0.64), height = oldRange * (a.big ? 0.66 : 0.64), x = 8 + Math.max(0, a.r - width - 8) * thrust;
  return { x, width, height, tip: x + width, halfWidth: height * 0.32 };
}
function inBeakStrike(e, a) {
  const pose = beakPose(a), dx = e.x - a.x, dy = e.y - a.y, along = dx * Math.cos(a.angle) + dy * Math.sin(a.angle), across = -dx * Math.sin(a.angle) + dy * Math.cos(a.angle), closest = clamp(along, pose.x, pose.tip);
  return Math.hypot(along - closest, across) < pose.halfWidth + hitR(e);
}
function fire(s, id, w, target) {
  const def = WEAPONS[id], p = s.player;
  w.volley++;
  s.stats.weapons[id].attacks++;
  const { damage, count, size } = weaponStats(s, id, w);
  let angle = Math.atan2(target.y - p.y, target.x - p.x);
  if (extraFire(s, id, w, target, { damage, count, size })) return;
  if (id === "beak") {
    const big = w.effect === "super", remote = w.effect === "remote", { range, duration } = beakShape(s, w), strikes = big ? 1 : count;
    const series = remote ? w.remoteSeries ??= { targetId: target.id, stacks: 0 } : null;
    for (let i = 0; i < strikes; i++) s.attacks.push({ type: "beak", weapon: id, x: p.x, y: p.y, angle, r: remote ? TUNING.melee.beakRange * size : range, spread: big ? 0.32 : 0.25, damage: damage * (big ? TUNING.melee.superDamage * (1 + (count - 1) * TUNING.melee.superShotDamage) : 1), elapsed: 0, delay: i * (duration + TUNING.melee.seriesGap), duration, hits: /* @__PURE__ */ new Set(), remote, big, series, baseDamage: damage, started: false });
    w.seriesTime = strikes * (duration + TUNING.melee.seriesGap) + TUNING.melee.seriesRest / weaponStats(s, id, w).attackRate;
    return;
  }
  if (id === "martial") {
    const stomp = w.effect === "stomp" || w.effect !== "plumes" && w.volley % 3 === 0, range = (stomp ? TUNING.melee.stompRange : TUNING.melee.wingRange) * size;
    const duration = (stomp ? TUNING.melee.stompDuration : TUNING.melee.wingDuration) / weaponStats(s, id, w).attackRate;
    const swings = w.effect === "plumes" ? 2 : 1;
    if (!stomp) s.events.push("fire:wing");
    for (let i = 0; i < swings; i++) s.attacks.push({ type: stomp ? "stomp" : "wing", weapon: id, x: p.x, y: p.y, angle, side: w.effect === "plumes" ? i === 0 ? -1 : 1 : w.volley % 3 === 1 ? -1 : 1, r: range, spread: 1.4, damage: damage * (stomp ? TUNING.melee.stompDamage : 1), elapsed: 0, duration, hits: /* @__PURE__ */ new Set(), wingEvolution: w.effect === "plumes", plumes: w.effect === "plumes" && i === 0, feathers: TUNING.melee.plumeCount + Math.min(TUNING.progress.shotLimit, s.passives.shots) * PASSIVE_BONUSES.shots });
    return;
  }
  const n = count, gold = id === "egg" && w.effect === "gold" && w.volley % TUNING.effects.goldEvery === 0;
  for (let i = 0; i < n; i++) {
    const spread = id === "feather" ? TUNING.effects.featherSpread : id === "ak" ? TUNING.effects.akSpread : TUNING.effects.eggSpread;
    const a = angle + (i - (n - 1) / 2) * spread + (id === "ak" ? (s.random() - 0.5) * TUNING.effects.akScatter : 0);
    s.bullets.push({ id: ++s.bulletId, type: id, x: p.x, y: p.y, px: p.x, py: p.y, vx: Math.cos(a) * def.speed * TUNING.combat.projectileScale, vy: Math.sin(a) * def.speed * TUNING.combat.projectileScale, r: (id === "egg" ? 6 : 3) * size, size, damage: damage * (gold ? TUNING.effects.goldDamage : id === "feather" && w.effect === "bounce" ? TUNING.newCombat.bounceDamage : 1), gold, blast: w.effect === "blast", pierce: gold ? Infinity : w.effect === "pierce" ? TUNING.effects.featherPierce : 1, bounces: w.effect === "bounce" ? TUNING.effects.featherBounces : 0, hits: /* @__PURE__ */ new Set(), life: TUNING.combat.bulletLife });
  }
  s.fx.push({ type: "muzzle", weapon: id, x: p.x + Math.cos(angle) * 24, y: p.y + Math.sin(angle) * 24, angle, r: id === "ak" ? 22 : 14, life: 0.12, max: 0.12 });
}
function segmentHit(b, e) {
  const radius = hitR(e) + b.r;
  if (e.x + radius < Math.min(b.px, b.x) || e.x - radius > Math.max(b.px, b.x) || e.y + radius < Math.min(b.py, b.y) || e.y - radius > Math.max(b.py, b.y)) return false;
  const dx = b.x - b.px, dy = b.y - b.py, len = dx * dx + dy * dy;
  const t = len ? clamp(((e.x - b.px) * dx + (e.y - b.py) * dy) / len, 0, 1) : 0;
  const ex = e.x - b.px - t * dx, ey = e.y - b.py - t * dy;
  return ex * ex + ey * ey < radius * radius;
}
function step(s, dt, input = { x: 0, y: 0 }) {
  if (s.mode !== "playing") return;
  if (s.enemies.some((e) => e.hp > 0 && ENEMIES[e.type]?.isBoss)) s.bossPausedSeconds = (s.bossPausedSeconds || 0) + dt;
  s.time += dt;
  const p = s.player, moveStart = { x: s.player.x, y: s.player.y };
  p.inv = Math.max(0, p.inv - dt);
  p.hurtFlash = Math.max(0, (p.hurtFlash || 0) - dt);
  reconcileBosses(s);
  const mag = Math.hypot(input.x, input.y);
  const speed = playerStats(s).speed;
  p.moving = mag > 0.05;
  if (mag) {
    if (input.x) p.facing = Math.sign(input.x);
    moveBody(p, input.x / Math.max(1, mag) * speed * dt, input.y / Math.max(1, mag) * speed * dt, s.obstacles);
    p.x = clamp(p.x, WORLD.fenceInset + p.r, WORLD.width - WORLD.fenceInset - p.r);
    p.y = clamp(p.y, WORLD.fenceInset + p.r, WORLD.height - WORLD.fenceInset - p.r);
  }
  s.player.displaced = Math.hypot(p.x - moveStart.x, p.y - moveStart.y) > 1e-3;
  updateAmbientSeeds(s, dt);
  const wave = spawnProfile(progressionTime(s));
  if (s.waveStage !== wave.stage) {
    s.waveStage = wave.stage;
    s.events.push("wave:" + wave.stage);
  }
  if (wave.stage === "bear" && wave.age >= TUNING.flow.introDuration && !s.bearMixed) {
    s.bearMixed = true;
    s.events.push("wave:mixed");
  }
  const spawnClock = Math.min(progressionTime(s), TUNING.bosses.turkeyAt);
  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0) {
    const profile = spawnProfile(spawnClock), bonus = 1 + bonusAge(s) / TUNING.flow.bonusSpawn;
    const turkey = s.enemies.some((e) => e.type === "turkey" && e.hp > 0), guinea = s.enemies.some((e) => e.type === "guinea" && e.hp > 0);
    const crowd = turkey ? TUNING.bosses.turkeyCrowd : guinea ? TUNING.bosses.guineaCrowd : 1;
    s.spawnTimer = Math.max(TUNING.flow.minInterval, (TUNING.flow.interval - spawnClock * TUNING.flow.intervalDecay) / bonus);
    s.spawnCredit += (TUNING.flow.budget + spawnClock / TUNING.flow.budgetGrowth + (s.bonus ? TUNING.flow.bonusBudget : 0)) * profile.ramp * crowd;
    for (let i = 0; i < 12; i++) {
      const type = enemyType(s, profile), cost = enemyCost(type, spawnClock);
      if (s.spawnCredit < cost) break;
      s.spawnCredit -= cost;
      spawnEnemy(s, type);
    }
  }
  const wolfPack = s.enemies.filter((e) => e.hp > 0 && e.type === "wolf").sort((a, b) => a.id - b.id);
  if (wolfPack.length) s.wolfPackStarted ??= s.time;
  else s.wolfPackStarted = null;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.airborne = false;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
    e.facing = dx < 0 ? -1 : 1;
    updateBossPhase(e);
    let v = e.speed * enemySpeedScale(s, e.type) * (e.type === "turkey" && e.enraged ? 2 : 1);
    if (e.slowUntil > s.time) v *= slowFactor(s, e);
    let ux = dx / d, uy = dy / d;
    if (ENEMIES[e.type].isBoss || e.type === "goose") {
      if (enemyAttackStep(s, e, dt)) {
        if (ENEMIES[e.type].isBoss && distance(e, p) < contactRadius(e) + p.r) damagePlayer(s, ENEMIES[e.type].damage);
        continue;
      }
    }
    if (e.type === "fox") {
      const old = e.dash % TUNING.behaviour.foxCycle;
      e.dash += dt;
      const phase = e.dash % TUNING.behaviour.foxCycle;
      e.airborne = phase >= TUNING.behaviour.foxDashAt;
      if (phase >= TUNING.behaviour.foxWarning && (old < TUNING.behaviour.foxWarning || !e.dashDirection)) {
        e.dashDirection = { x: ux, y: uy };
      }
      if (phase >= TUNING.behaviour.foxWarning) {
        ux = e.dashDirection.x;
        uy = e.dashDirection.y;
        e.facing = ux < 0 ? -1 : 1;
      }
      v *= phase >= TUNING.behaviour.foxDashAt ? TUNING.behaviour.foxDash : phase >= TUNING.behaviour.foxWarning ? TUNING.behaviour.foxPrepare : TUNING.behaviour.foxWalk;
    }
    if (e.type === "wolf") {
      const dir = wolfDirection(dx, dy, d, e.id, s.time - s.wolfPackStarted, e, wolfPack, ENEMIES, p.r, { x: p.x - moveStart.x, y: p.y - moveStart.y });
      const wanted = Math.atan2(dir.y, dir.x);
      e.wolfHeading ??= wanted;
      if (dir.hunt) e.wolfHeading = wanted;
      const turn = Math.atan2(Math.sin(wanted - e.wolfHeading), Math.cos(wanted - e.wolfHeading));
      e.wolfHeading += clamp(turn, -dt * 2.8, dt * 2.8);
      ux = Math.cos(e.wolfHeading);
      uy = Math.sin(e.wolfHeading);
      const radial = ux * dx / d + uy * dy / d;
      if (radial < 0) {
        ux -= radial * dx / d;
        uy -= radial * dy / d;
        const len = Math.hypot(ux, uy) || 1;
        ux /= len;
        uy /= len;
      }
      v *= dir.speed;
    }
    if (e.type === "squirrel") {
      if (d < TUNING.behaviour.fleeRange) e.retreating = true;
      else if (d > TUNING.behaviour.retreatUntil) e.retreating = false;
      v *= e.retreating ? -1 : d < TUNING.behaviour.shootRange ? 0 : 1;
      e.shot -= dt;
      if (e.shot <= 0 && d <= TUNING.behaviour.squirrelFireRange) {
        e.shot = TUNING.behaviour.squirrelInterval;
        if (d < 480) s.events.push("acorn-throw");
        s.acorns.push({ x: e.x, y: e.y, vx: dx / d * TUNING.behaviour.acornSpeed, vy: dy / d * TUNING.behaviour.acornSpeed, life: TUNING.behaviour.acornLife });
      }
    }
    e.moving = Math.abs(v) > 1;
    if (!ENEMIES[e.type].isBoss && !(e.type === "fox" && e.dash % TUNING.behaviour.foxCycle >= TUNING.behaviour.foxWarning)) {
      const target = e.type === "squirrel" && v < 0 ? { x: e.x - ux * 220, y: e.y - uy * 220, r: p.r } : e.type === "wolf" ? { x: e.x + ux * 200, y: e.y + uy * 200, r: p.r } : p;
      const dir = steerAround(e, target, ux * Math.sign(v || 1), uy * Math.sign(v || 1), s.obstacles);
      ux = dir.x;
      uy = dir.y;
      v = Math.abs(v);
    }
    moveBody(e, ux * v * dt, uy * v * dt, ENEMIES[e.type].isBoss || e.airborne ? [] : s.obstacles);
    e.x = clamp(e.x, -WORLD.spawnPadding, WORLD.width + WORLD.spawnPadding);
    e.y = clamp(e.y, -WORLD.spawnPadding, WORLD.height + WORLD.spawnPadding);
    if (e.type !== "squirrel" && e.type !== "goose" && distance(e, p) < contactRadius(e) + p.r) damagePlayer(s, ENEMIES[e.type].damage);
  }
  separateCrowd(s.enemies, ENEMIES, WORLD.width, WORLD.height, s.obstacles, resolveObstacles, WORLD.spawnPadding);
  for (const e of s.enemies) if (e.attack && e.attack.kind !== "charge") {
    e.attack.originX = e.x;
    e.attack.originY = e.y;
  }
  if (s.mode !== "playing") return;
  updateExtraWeapons(s, dt);
  for (const [id, w] of Object.entries(s.weapons)) {
    if (id === "orbit" || id === "dust" && w.effect === "trail") continue;
    w.cd -= dt;
    if (w.reload > 0) {
      w.reload = Math.max(0, w.reload - dt);
      if (w.reload === 0) w.ammo = weaponStats(s, id, w).magazine;
      continue;
    }
    if (w.cd > 0) continue;
    const target = nearest(s, p);
    const v = weaponStats(s, id, w);
    const nextStomp = id === "martial" && (w.effect === "stomp" || w.effect !== "plumes" && (w.volley + 1) % 3 === 0);
    const reach = id === "beak" ? beakShape(s, w).range : (nextStomp ? TUNING.melee.stompRange : TUNING.melee.wingRange) * v.size;
    const meleeOnly = id === "beak" && w.effect !== "remote" || id === "martial" && w.effect !== "plumes";
    if (w.cd <= 0 && target && (!meleeOnly || distance(target, p) <= reach + target.r)) {
      fire(s, id, w, target);
      w.cd = Math.max(weaponStats(s, id, w).interval, id === "beak" ? w.seriesTime : 0);
      if (id === "ak" && w.effect !== "belt") {
        w.ammo--;
        if (w.ammo === 0) {
          w.reload = weaponStats(s, id, w).reload;
          s.events.push("ak-latch");
          s.events.push("reload");
        }
      }
      if (id !== "beak" && id !== "martial") s.events.push("fire:" + id);
    }
  }
  for (const a of s.attacks) {
    let attackDt = dt;
    if (a.delay > 0) {
      a.delay -= dt;
      if (a.delay > 0) continue;
      attackDt = -a.delay;
      a.delay = 0;
    }
    if (a.type === "beak" && !a.started) {
      a.started = true;
      const target = a.remote ? remoteTarget(s, a) : nearest(s, p);
      if (target) {
        a.angle = Math.atan2(target.y - p.y, target.x - p.x);
        if (a.remote) {
          a.target = target.id;
          a.x = target.x - Math.cos(a.angle) * a.r * 0.55;
          a.y = target.y - Math.sin(a.angle) * a.r * 0.55;
        }
      }
      s.events.push(a.big ? "fire:super-beak" : "fire:beak");
    }
    if (a.remote) {
      const t = remoteTarget(s, a);
      if (t) {
        a.target = t.id;
        a.x = t.x - Math.cos(a.angle) * a.r * 0.55;
        a.y = t.y - Math.sin(a.angle) * a.r * 0.55;
      }
    }
    a.elapsed += attackDt;
    const phase = Math.min(1, a.elapsed / a.duration);
    if (a.type === "wing" || a.type === "stomp" && !a.waveShown || a.type === "beak" && !a.remote) {
      a.x = p.x;
      a.y = p.y;
    }
    if (a.type === "stomp" && phase >= 0.42 && !a.waveShown) {
      a.waveShown = true;
      s.events.push("fire:stomp");
      s.fx.push({ type: "stomp", x: a.x, y: a.y, r: a.r, life: 0.75, max: 0.75 });
    }
    const active = (a.type === "beak" ? phase < 1 : a.type === "wing" ? phase > 0.08 && phase < 0.95 : phase >= 0.42) && (!a.remote || a.hits.size === 0);
    if (active) {
      const sweep = a.type === "wing" ? wingSweep(a, phase) : a.angle;
      for (const e of s.enemies) {
        if (e.hp <= 0 || a.hits.has(e.id) || distance(e, a) > (a.type === "beak" ? beakPose(a).tip : a.r) + hitR(e)) continue;
        if (a.target && e.id !== a.target) continue;
        const delta = Math.atan2(Math.sin(Math.atan2(e.y - a.y, e.x - a.x) - sweep), Math.cos(Math.atan2(e.y - a.y, e.x - a.x) - sweep));
        if (a.type === "beak" && !a.remote && !inBeakStrike(e, a)) continue;
        if (a.type !== "stomp" && a.type !== "beak" && Math.abs(delta) > (a.type === "wing" ? 0.35 : a.spread) + e.r / Math.max(20, distance(e, a))) continue;
        a.hits.add(e.id);
        const strikeDamage = a.remote ? a.baseDamage * (1 + a.series.stacks * TUNING.newCombat.remoteStack) : a.damage;
        hit(s, e, strikeDamage, a.weapon);
        if (a.remote) a.series.stacks++;
        s.fx.push({ type: "impact", x: e.x, y: e.y, r: 16, life: 0.18, max: 0.18 });
        if (a.type === "stomp") {
          knockback(e, a.x, a.y, TUNING.melee.stompPush);
        }
      }
      if (a.plumes && !a.released && phase >= 0.5) {
        a.released = true;
        for (let i = 0; i < a.feathers; i++) {
          const angle = a.angle + (i - (a.feathers - 1) / 2) * 0.18;
          s.bullets.push({ id: ++s.bulletId, type: "feather", weapon: "martial", x: a.x, y: a.y, px: a.x, py: a.y, vx: Math.cos(angle) * WEAPONS.feather.speed * TUNING.combat.projectileScale, vy: Math.sin(angle) * WEAPONS.feather.speed * TUNING.combat.projectileScale, r: 3, size: 1, damage: a.damage * TUNING.melee.plumeDamage, pierce: 1, bounces: 0, hits: /* @__PURE__ */ new Set(), life: TUNING.combat.bulletLife });
        }
      }
    }
  }
  retain(s.attacks, (a) => a.elapsed < a.duration);
  let collisionIndex = collisionIndexes.get(s);
  if (!collisionIndex) {
    collisionIndex = new CollisionIndex();
    collisionIndexes.set(s, collisionIndex);
  }
  collisionIndex.dirty = true;
  for (const b of s.bullets) {
    if (b.returning) {
      const d = distance(b, p);
      if (d < 14) {
        b.life = 0;
        continue;
      }
      b.vx = (p.x - b.x) / d * TUNING.newCombat.returnSpeed;
      b.vy = (p.y - b.y) / d * TUNING.newCombat.returnSpeed;
    }
    b.px = b.x;
    b.py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    const candidates = b.blast ? null : collisionIndex.query(b, s.enemies);
    for (let candidate = 0; candidate < (candidates ? candidates.length : s.enemies.length); candidate++) {
      const e = s.enemies[candidates ? candidates[candidate] : candidate];
      if (e.hp <= 0 || b.hits.has(e.id) || !segmentHit(b, e)) continue;
      b.hits.add(e.id);
      if (b.type === "egg") s.events.push("egg-impact");
      hit(s, e, b.damage, b.weapon || b.type);
      s.fx.push({ type: "impact", weapon: b.type, x: b.x, y: b.y, r: 12, life: 0.14, max: 0.14 });
      if (b.blast) {
        collisionIndex.dirty = true;
        explosion(s, b.x, b.y, (b.type === "ak" ? TUNING.effects.akBlast : TUNING.effects.eggBlast) * b.size, b.damage * (b.type === "egg" ? TUNING.newCombat.eggSplash : 1), e.id, b.weapon || b.type, b.type === "egg" ? TUNING.newCombat.eggPush : 0);
      }
      if (b.bounces > 0) {
        const t = nearest(s, e, b.hits);
        if (t) {
          b.bounces--;
          const a = Math.atan2(t.y - e.y, t.x - e.x), v = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(a) * v;
          b.vy = Math.sin(a) * v;
          b.x = e.x;
          b.y = e.y;
          break;
        }
      }
      b.pierce--;
      if (b.pierce <= 0) {
        b.life = 0;
        break;
      }
    }
  }
  for (const a of s.acorns) {
    a.px = a.x;
    a.py = a.y;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.life -= dt;
    if (segmentHit({ ...a, r: 5 }, p)) {
      damagePlayer(s, ENEMIES.squirrel.damage);
      a.life = 0;
    }
  }
  if (s.mode !== "playing") return;
  for (const m of s.magnets) {
    pullPickup(m, p, TUNING.combat.magnetAttract, TUNING.combat.pickupSpeed, dt);
  }
  for (const m of s.magnets) if (distance(m, p) < TUNING.combat.pickupCollect) {
    m.collected = true;
    for (const g of s.gems) g.magnetized = true;
    s.stats.magnets++;
    s.events.push("magnet");
  }
  retain(s.magnets, (m) => !m.collected);
  const pickupStats = playerStats(s), pickup = pickupStats.pickup, pickup2 = pickup * pickup, xpMultiplier = 1 + pickupStats.xpBonus;
  let kept = 0;
  for (let i = 0; i < s.gems.length; i++) {
    const g = s.gems[i], dx = p.x - g.x, dy = p.y - g.y, d2 = dx * dx + dy * dy;
    if (g.magnetized || d2 < pickup2) {
      const d = Math.sqrt(d2), pull = Math.min(d, (g.magnetized ? TUNING.combat.magnetPull : TUNING.combat.gemPull) * dt) / Math.max(1, d);
      g.x += dx * pull;
      g.y += dy * pull;
    }
    if (d2 < 324) {
      const earned = g.value * xpMultiplier;
      s.xp += earned;
      s.stats.totalXp += earned;
      s.stats.gems++;
      if (g.tier === 8) s.events.push("pickup:large");
      g.collected = true;
    } else s.gems[kept++] = g;
  }
  s.gems.length = kept;
  for (const w of s.worms) {
    if (p.hp < p.maxHp) pullPickup(w, p, TUNING.combat.healAttract, TUNING.combat.pickupSpeed, dt);
    else w.attracting = false;
  }
  for (const w of s.worms) if (distance(w, p) < TUNING.combat.pickupCollect && p.hp < p.maxHp) {
    const heal = Math.min(TUNING.combat.heal, p.maxHp - p.hp);
    p.hp += heal;
    s.stats.healed += heal;
    w.collected = true;
    s.events.push("heal");
  }
  retain(s.worms, (w) => !w.collected);
  retain(s.enemies, (e) => e.hp > 0);
  retain(s.bullets, (b) => b.life > 0 && b.x > -30 && b.x < WORLD.width + 30 && b.y > -30 && b.y < WORLD.height + 30);
  retain(s.acorns, (a) => a.life > 0);
  for (const f of s.fx) f.life -= dt;
  retain(s.fx, (f) => f.life > 0);
  while (s.xp >= s.need) {
    s.xp -= s.need;
    s.level++;
    if (s.level % 5 === 0) s.freeRerolls++;
    s.need = levelXpCost(s.level);
    s.pending++;
  }
  if (s.pending) {
    s.mode = "upgrade";
    rollChoices(s);
    s.events.push("level");
  }
  if (s.awaitingBonusChoice) s.mode = "victory";
}
function reconcileBosses(s) {
  for (const [type, at] of [["guinea", TUNING.bosses.guineaAt], ["turkey", TUNING.bosses.turkeyAt]]) if (runTime(s) >= at && !s.bossEvents[type]) spawnEnemy(s, type);
  if (!s.bonus && runTime(s) >= TUNING.bosses.turkeyAt && s.bossEvents.turkey === "dead" && !s.enemies.some((e) => e.hp > 0 && ENEMIES[e.type].isBoss)) {
    s.bonus = true;
    s.bonusStartedAt = s.time;
    s.awaitingBonusChoice = true;
    s.events.push("bonus");
  }
}
function seedDistribution(time, type = "rat") {
  const def = ENEMIES[type] || ENEMIES.rat, t = TUNING.seedDrops, medium = clamp(def.mediumChance ?? 0.05, 0, 1), large = clamp(def.largeChance ?? 3e-4, 0, 1 - medium), age = Math.max(0, time) / t.growthDuration, values = [t.smallValue, t.mediumValue, t.largeValue].map((v, i) => Math.round(v * (1 + age * [t.smallGrowth, t.mediumGrowth, t.largeGrowth][i])));
  return { probabilities: [1 - medium - large, medium, large], values };
}
function seedTime(s) {
  return Math.min(progressionTime(s), TUNING.bosses.turkeyAt) + bonusAge(s);
}
function makeSeedDrop(s, e) {
  const d = seedDistribution(seedTime(s), e.type), r = s.random(), i = r < d.probabilities[0] ? 0 : r < d.probabilities[0] + d.probabilities[1] ? 1 : 2;
  return { x: e.x, y: e.y, value: d.values[i], tier: [1, 3, 8][i] };
}
function dropConsumables(s, e) {
  const t = TUNING.combat;
  s.pickupPity ??= { worms: 0, magnets: 0 };
  s.pickupNext ??= {};
  for (const [key, limit, interval] of [["worms", t.healDropLimit, t.healDropKills], ["magnets", t.magnetDropLimit, t.magnetDropKills]]) {
    const count = s[key].filter((x) => !x.mapSupply && !x.collected).length;
    if (count >= limit) {
      s.pickupPity[key] = 0;
      delete s.pickupNext[key];
      continue;
    }
    s.pickupNext[key] ??= Math.round(interval * (0.8 + s.random() * 0.4));
    s.pickupPity[key] = (s.pickupPity[key] || 0) + (key === "worms" && s.weather === "rain" ? 2 : 1) / (1 + count * 0.35);
    if (s.pickupPity[key] >= s.pickupNext[key]) {
      s[key].push({ x: e.x, y: e.y, dropped: true });
      s.pickupPity[key] = 0;
      delete s.pickupNext[key];
    }
  }
}
function slowFactor(s, e) {
  return e.slowUntil > s.time ? 1 - (1 - (e.slowMultiplier ?? 1)) * (ENEMIES[e.type]?.isBoss ? 0.5 : 1) : 1;
}
function knockback(e, x, y, strength) {
  const d = Math.max(1, distance(e, { x, y })), weight = Math.max(0.1, ENEMIES[e.type].weight);
  e.x = clamp(e.x + (e.x - x) / d * strength / weight, 32, WORLD.width - 32);
  e.y = clamp(e.y + (e.y - y) / d * strength / weight, 45, WORLD.height - 45);
}
function remoteTarget(s, a) {
  let t = s.enemies.find((e) => e.id === a.series.targetId && e.hp > 0);
  if (!t) {
    t = nearest(s, s.player);
    a.series.targetId = t?.id;
    a.series.stacks = 0;
  }
  return t;
}
function enemyAttackShape(type, index = 0) {
  const b = TUNING.bosses;
  if (type === "goose") return { kind: "peck", range: b.gooseRange, width: b.gooseWidth, windup: b.gooseWindup, active: 0.65, recovery: b.gooseRecovery };
  if (type === "guinea") return [
    { kind: "wing", range: b.guineaWingRange, spread: b.guineaWingSpread, windup: b.guineaWindup * 1.2, active: 0.36, recovery: 0.85 * 1.15 },
    { kind: "charge", range: b.guineaChargeSpeed * b.guineaChargeDuration, width: b.guineaChargeWidth, speed: b.guineaChargeSpeed * 0.85, windup: (b.guineaWindup + 0.15) * 1.2, active: b.guineaChargeDuration / 0.85, recovery: b.bossRecovery * 1.15 },
    { kind: "stomp", range: b.guineaStompRadius, windup: (b.guineaWindup + 0.2) * 1.2, active: 0.3, recovery: b.bossRecovery * 1.15 }
  ][index % 3];
  return [
    { kind: "wing", range: b.wingRange, spread: b.wingSpread, windup: b.turkeyWindup, active: 0.35, recovery: b.bossRecovery },
    { kind: "stomp", range: b.stompRadius, windup: b.turkeyWindup + 0.2, active: 0.25, recovery: b.bossRecovery },
    { kind: "charge", range: b.chargeSpeed * b.chargeDuration, width: 50.6, speed: b.chargeSpeed, windup: b.turkeyWindup, active: b.chargeDuration, recovery: b.bossRecovery + 0.3 },
    { kind: "pecks", peckGap: b.peckGap, ...turkeyPeckGeometry(ENEMIES.turkey.r, b), windup: b.turkeyWindup, active: b.peckCount * b.peckGap, recovery: b.bossRecovery }
  ][index % 4];
}
function pointSegmentDistance(p, x, y, ex, ey) {
  const dx = ex - x, dy = ey - y, len = dx * dx + dy * dy, t = len ? clamp(((p.x - x) * dx + (p.y - y) * dy) / len, 0, 1) : 0;
  return Math.hypot(p.x - x - t * dx, p.y - y - t * dy);
}
function contactRadius(e) {
  return e.r * (e.type === "turkey" ? 1.1 : 1);
}
function inEnemyAttack(p, e, a, previous = null) {
  if (a.kind === "pecks" && a.targets) {
    const point = a.targets[peckTiming(a).pulse];
    if (!point) return false;
    a = { ...a, ...turkeyPeckGeometry(e.r, TUNING.bosses), angle: point.angle };
  }
  if (a.kind === "stomp") return distance(p, e) < a.range + p.r;
  if (a.kind === "wing") {
    const d = distance(p, e), angle = Math.atan2(p.y - e.y, p.x - e.x), delta = Math.atan2(Math.sin(angle - a.angle), Math.cos(angle - a.angle));
    return d < a.range + p.r && Math.abs(delta) < a.spread + p.r / Math.max(d, 1);
  }
  if (a.kind === "charge" && previous) return pointSegmentDistance(p, previous.x, previous.y, e.x, e.y) < a.width + p.r;
  const x = e.x + Math.cos(a.angle) * (a.start || 0), y = e.y + Math.sin(a.angle) * (a.start || 0);
  return pointSegmentDistance(p, x, y, e.x + Math.cos(a.angle) * a.range, e.y + Math.sin(a.angle) * a.range) < a.width + p.r;
}
function selectEnemyAttack(type, d, index = 0) {
  if (type === "goose") return enemyAttackShape(type);
  const turkey = type === "turkey", stomp = turkey ? TUNING.bosses.stompRadius : TUNING.bosses.guineaStompRadius;
  const kinds = d < stomp * 0.65 ? ["stomp"] : d < (turkey ? 300 : 210) ? d < stomp ? ["wing", "stomp"] : ["wing"] : turkey ? ["pecks", "charge"] : ["charge"];
  const order = turkey ? ["wing", "stomp", "charge", "pecks"] : ["wing", "charge", "stomp"];
  return enemyAttackShape(type, order.indexOf(kinds[index % kinds.length]));
}
function updateBossPhase(e) {
  if (ENEMIES[e.type]?.isBoss && e.hp > 0 && e.hp <= e.maxHp * 0.5) e.enraged = true;
}
function bossAttackRate(e) {
  return 0.85 * (e.enraged ? e.type === "turkey" ? 1.3 : 1.2 : 1);
}
function phasedBossAttack(e, shape) {
  if (!ENEMIES[e.type]?.isBoss) return shape;
  const rate = bossAttackRate(e), a = { ...shape };
  for (const key of ["windup", "active", "recovery", "peckGap"]) if (a[key] != null) a[key] /= rate;
  if (a.kind === "charge") {
    a.speed *= rate;
    if (e.type === "turkey" && e.enraged) {
      a.range *= 1.5;
      a.active *= 1.5;
    }
  }
  return a;
}
function enemyAttackStep(s, e, dt) {
  e.attackCd = Math.max(0, e.attackCd - dt);
  const p = s.player;
  if (!e.attack && e.attackCd === 0) {
    const shape = phasedBossAttack(e, selectEnemyAttack(e.type, distance(e, p), e.attackIndex));
    if (e.type === "turkey" && shape.kind === "pecks") Object.assign(shape, turkeyPeckGeometry(e.r, TUNING.bosses));
    if (distance(e, p) < (shape.kind === "pecks" ? shape.range + shape.width + p.r + 12 : e.type === "goose" ? shape.range + 45 : e.type === "guinea" ? Math.max(shape.range + 80, TUNING.bosses.guineaEngage) : Math.max(shape.range + 80, TUNING.bosses.turkeyEngage))) {
      e.attack = { ...shape, elapsed: 0, phase: "windup", originX: e.x, originY: e.y, angle: Math.atan2(p.y - e.y, p.x - e.x), hitPulses: /* @__PURE__ */ new Set() };
      e.attackIndex++;
    }
  }
  const a = e.attack;
  if (!a) return false;
  e.moving = false;
  a.elapsed += dt;
  e.facing = Math.cos(a.angle) < 0 ? -1 : 1;
  if (a.kind === "pecks") {
    a.targets ??= [];
    const marked = Math.min(TUNING.bosses.peckCount, Math.floor(Math.min(a.elapsed, a.windup - 1e-5) / (a.windup / TUNING.bosses.peckCount)) + 1);
    while (a.targets.length < marked) a.targets.push({ x: p.x, y: p.y, angle: Math.atan2(p.y - e.y, p.x - e.x) });
  }
  if (a.elapsed < a.windup) {
    a.phase = "windup";
    return true;
  }
  if (a.elapsed < a.windup + a.active) {
    a.phase = "active";
    const before = { x: e.x, y: e.y };
    if (a.kind === "charge") {
      moveBody(e, Math.cos(a.angle) * a.speed * slowFactor(s, e) * dt, Math.sin(a.angle) * a.speed * slowFactor(s, e) * dt, ENEMIES[e.type].isBoss || e.airborne ? [] : s.obstacles);
      e.x = clamp(e.x, -WORLD.spawnPadding, WORLD.width + WORLD.spawnPadding);
      e.y = clamp(e.y, -WORLD.spawnPadding, WORLD.height + WORLD.spawnPadding);
      e.moving = true;
    }
    const timing = a.kind === "pecks" ? peckTiming(a) : null, pulse = timing?.pulse ?? 0;
    if (timing) {
      if (a.targets) {
        const target = a.targets[pulse];
        if (target) {
          Object.assign(a, turkeyPeckGeometry(e.r, TUNING.bosses), { angle: target.angle });
        }
      } else Object.assign(a, turkeyPeckGeometry(e.r, TUNING.bosses));
    }
    if ((!timing || timing.contact) && !a.hitPulses.has(pulse) && inEnemyAttack(p, e, a, before)) {
      a.hitPulses.add(pulse);
      damagePlayer(s, ENEMIES[e.type].damage);
    }
    if (!a.effectShown) {
      a.effectShown = true;
      if (a.kind === "stomp") s.fx.push({ type: "boss-stomp", x: e.x, y: e.y, r: a.range, life: 0.75, max: 0.75 });
      if (a.kind === "wing") s.fx.push({ type: "boss-wind", x: e.x, y: e.y, r: a.range, angle: a.angle, spread: a.spread, life: 0.55, max: 0.55 });
      if (a.kind === "charge") s.fx.push({ type: "boss-charge", x: e.x, y: e.y, r: a.width * 2, angle: a.angle, life: 0.5, max: 0.5 });
    }
    return true;
  }
  a.phase = "recovery";
  if (a.elapsed >= a.windup + a.active + a.recovery) {
    e.attack = null;
    e.attackCd = e.type === "goose" ? 0.25 : 1.2 / bossAttackRate(e);
    return false;
  }
  return true;
}
function extraFire(s, id, w, target, v) {
  const t = TUNING.newWeapons, p = s.player;
  if (id === "feather" && w.effect === "pierce") {
    const n = v.count + TUNING.newCombat.returnExtra;
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI * 2 / n, r = TUNING.newCombat.returnRadius * v.size, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      s.bullets.push({ id: ++s.bulletId, type: "feather", x, y, px: x, py: y, vx: 0, vy: 0, r: 4 * v.size, size: v.size, damage: v.damage * TUNING.newCombat.returnDamage, pierce: Infinity, hits: /* @__PURE__ */ new Set(), bounces: 0, life: 5, returning: true });
    }
    return true;
  }
  if (id === "bomb") {
    const targets = s.enemies.filter((e) => e.hp > 0).sort((a, b) => distance(a, p) - distance(b, p));
    for (let i = 0; i < v.count; i++) {
      const target2 = targets[i % targets.length], a = i * Math.PI * 2 / Math.max(1, v.count), spread = i >= targets.length ? 65 : 0;
      s.bombs.push({ x: p.x, y: p.y, startX: p.x, startY: p.y, targetX: clamp(target2.x + Math.cos(a) * spread, 32, WORLD.width - 32), targetY: clamp(target2.y + Math.sin(a) * spread, 45, WORLD.height - 45), elapsed: 0, fuse: t.bombFuse, flight: 0.5, r: t.bombRadius * v.size, damage: v.damage, effect: w.effect, weapon: id, size: v.size });
    }
    return true;
  }
  if (id === "dust") {
    if (w.effect !== "trail" && s.zones.some((z) => z.weapon === "dust" && z.follow)) return true;
    s.zones.push({ type: "dust", x: p.x, y: p.y, r: (w.effect === "storm" ? t.stormRadius : t.dustRadius) * v.size * (1 + (v.count - 1) * 0.04) * (w.effect === "trail" ? t.trailRadiusScale : 1), remaining: (w.effect === "trail" ? t.trailDuration : w.effect === "storm" ? t.stormDuration : t.dustDuration) + (v.count - 1) * 0.25, damage: v.damage * (w.effect === "trail" ? t.trailDamage : w.effect === "storm" ? t.stormDamage : 1), tick: t.dustTick, cd: 0, slow: w.effect === "storm" ? t.stormSlow : w.effect === "trail" ? t.trailSlow : t.dustSlow, follow: w.effect !== "trail", weapon: id, effect: w.effect });
    return true;
  }
  return false;
}
function updateExtraWeapons(s, dt) {
  const t = TUNING.newWeapons, p = s.player;
  for (const b of s.bombs) {
    b.elapsed += dt;
    const f = Math.min(1, b.elapsed / b.flight);
    b.x = b.startX + (b.targetX - b.startX) * f;
    b.y = b.startY + (b.targetY - b.startY) * f;
    if (b.elapsed < b.fuse) continue;
    explosion(s, b.targetX, b.targetY, b.r, b.damage, null, b.weapon, 9);
    if (b.effect === "cluster" && !b.child) {
      for (let i = 0; i < t.clusterCount; i++) {
        const a = i * Math.PI * 2 / t.clusterCount, x = clamp(b.targetX + Math.cos(a) * b.r * t.clusterSpread, 32, WORLD.width - 32), y = clamp(b.targetY + Math.sin(a) * b.r * t.clusterSpread, 45, WORLD.height - 45);
        s.bombs.push({ x, y, startX: b.targetX, startY: b.targetY, targetX: x, targetY: y, elapsed: 0, fuse: 0.45, flight: 0.25, r: t.clusterRadius * b.size, damage: b.damage * t.clusterDamage, weapon: "bomb", size: b.size, child: true });
      }
    }
    if (b.effect === "embers") s.zones.push({ type: "embers", x: b.targetX, y: b.targetY, r: b.r, remaining: t.emberDuration, damage: b.damage * t.emberDps * 0.5, tick: 0.5, cd: 0, slow: 0, follow: false, weapon: "bomb" });
    b.done = true;
  }
  retain(s.bombs, (b) => !b.done);
  const dust = s.weapons.dust;
  if (dust?.effect === "trail") {
    const last = dust.trailPosition, travel = last ? Math.hypot(p.x - last.x, p.y - last.y) : 0;
    if (p.displaced && s.time >= (dust.trailNextAt || 0)) {
      const v2 = weaponStats(s, "dust"), r = t.dustRadius * v2.size * (1 + (v2.count - 1) * 0.04) * t.trailRadiusScale;
      const count = 1;
      dust.trailNextAt = s.time + t.trailInterval / v2.attackRate;
      for (let i = 1; i <= count; i++) s.zones.push({ type: "dust", effect: "trail", weapon: "dust", x: last ? last.x + (p.x - last.x) * i / count : p.x, y: last ? last.y + (p.y - last.y) * i / count : p.y, r, baseRadius: r, remaining: t.trailDuration, duration: t.trailDuration, damage: v2.damage * t.trailDamage, tick: t.dustTick, cd: 0, slow: t.trailSlow, follow: false });
      dust.trailPosition = { x: p.x, y: p.y };
      s.events.push("fire:dust");
    }
  }
  for (const z of s.zones) {
    if (!z.follow) {
      z.remaining -= dt;
      if (z.effect === "trail") z.r = z.baseRadius * (1 + (t.trailGrowth - 1) * (1 - Math.max(0, z.remaining) / z.duration));
    } else {
      const w2 = s.weapons.dust;
      if (!w2 || w2.effect === "trail") {
        z.remaining = 0;
        continue;
      }
      const v2 = weaponStats(s, "dust");
      z.effect = w2.effect;
      z.r = (w2.effect === "storm" ? t.stormRadius : t.dustRadius) * v2.size * (1 + (v2.count - 1) * 0.04);
      z.damage = v2.damage * (w2.effect === "storm" ? t.stormDamage : 1);
      z.slow = w2.effect === "storm" ? t.stormSlow : t.dustSlow;
    }
    if (z.remaining <= 0) continue;
    if (z.follow) {
      z.x = p.x;
      z.y = p.y;
    }
    z.cd -= dt;
    if (z.cd <= 0) {
      z.cd += z.tick;
      for (const e of s.enemies) {
        if (e.hp <= 0 || distance(e, z) > z.r + hitR(e)) continue;
        hit(s, e, z.damage, z.weapon);
        if (z.slow) {
          e.slowUntil = s.time + z.tick + 0.1;
          e.slowMultiplier = 1 - z.slow;
        }
      }
    }
  }
  retain(s.zones, (z) => z.remaining > 0);
  s.orbitals = [];
  const w = s.weapons.orbit;
  if (!w) return;
  if (!w.effect) {
    w.orbitClock = (w.orbitClock || 0) + dt;
    const v2 = weaponStats(s, "orbit", w), on = t.orbitDuration, off = t.orbitCooldown / v2.attackRate;
    if (w.orbitClock % (on + off) >= on) return;
  }
  const v = weaponStats(s, "orbit", w), rings = w.effect === "double" ? 2 : 1;
  if (!w.orbitHits) w.orbitHits = /* @__PURE__ */ new Map();
  for (const [key, until] of w.orbitHits) if (until < s.time - 1) w.orbitHits.delete(key);
  const core = w.effect === "guard";
  w.orbitAngle = (w.orbitAngle || 0) + dt * (core ? t.orbitCoreSpeed : t.orbitSpeed) * v.attackRate * (1 + (w.level - 1) * t.orbitSpeedPerLevel);
  for (let ring = 0; ring < rings; ring++) for (let i = 0; i < v.count; i++) {
    const a = w.orbitAngle * (ring ? -1 : 1) + i * Math.PI * 2 / v.count, r = (core ? t.orbitCoreRadius : t.orbitRadius) * (ring ? 1.55 : 1), o = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 10 * v.size * (core ? t.orbitCoreSize : 1), ring, gold: core, core, spin: core ? s.time * t.orbitCoreSpin : 0 };
    s.orbitals.push(o);
    for (const e of s.enemies) {
      const key = ring + ":" + i + ":" + e.id;
      if (e.hp <= 0 || distance(e, o) > hitR(e) + o.r || (w.orbitHits.get(key) || 0) > s.time) continue;
      w.orbitHits.set(key, s.time + v.interval);
      hit(s, e, v.damage * (w.effect === "guard" ? t.orbitGuardDamage : 1), "orbit");
      s.stats.weapons.orbit.attacks++;
      if (core && e.hp > 0 && !ENEMIES[e.type].isBoss) knockback(e, p.x, p.y, t.orbitCorePush);
    }
  }
}
function updateAmbientSeeds(s, dt) {
  s.ambientTimer = (s.ambientTimer ?? 12) - dt;
  if (s.ambientTimer > 0) return;
  s.ambientTimer = 12;
  const cell = 600, cols = Math.ceil(WORLD.width / cell), rows = Math.ceil(WORLD.height / cell), occupied = new Set(s.gems.map((g) => Math.floor(g.x / cell) + "," + Math.floor(g.y / cell))), start = Math.floor(s.random() * cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const n = (start + i) % (cols * rows), cx = n % cols, cy = Math.floor(n / cols);
    if (occupied.has(cx + "," + cy)) continue;
    const x = cx * cell + 70 + s.random() * (cell - 140), y = cy * cell + 70 + s.random() * (cell - 140);
    if (s.obstacles?.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + 25)) continue;
    const time = Math.min(progressionTime(s), 600), d = seedDistribution(time), r = s.random(), tier = r < d.probabilities[0] ? 1 : r < d.probabilities[0] + d.probabilities[1] ? 3 : 8;
    s.gems.push({ x, y, tier, value: d.values[[1, 3, 8].indexOf(tier)], ambient: true });
    break;
  }
}
function bossSeedDrops(s, e) {
  const values = seedDistribution(seedTime(s)).values, bonus = 1 + playerStats(s).xpBonus, target = levelXpCost(s.level) / bonus, mediumCount = clamp(Math.ceil((target - 3 * values[2]) / Math.max(1, values[1])), 6, 96);
  const tiers = [8, 8, 8, ...Array(mediumCount).fill(3)];
  return tiers.map((tier, i) => ({ x: e.x + Math.cos(i * 2.399963) * (20 + Math.sqrt(i) * 11), y: e.y + Math.sin(i * 2.399963) * (20 + Math.sqrt(i) * 11), value: values[tier === 8 ? 2 : 1], tier, bossReward: true }));
}
function pullPickup(item, player, radius, speed, dt) {
  const dx = player.x - item.x, dy = player.y - item.y, d = Math.hypot(dx, dy);
  if (d <= radius) item.attracting = true;
  if (!item.attracting || d === 0) return;
  const travel = Math.min(d, speed * dt);
  item.x += dx / d * travel;
  item.y += dy / d * travel;
}

// dist/game/session-replay.js
var ENGINE_PROTOCOL = "poultry-v3-20261107";
var TICK_RATE = 60;
function seededRandom(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error("uint32 seed required");
  let state = seed >>> 0;
  const rng = () => (state = Math.imul(state, 1664525) + 1013904223 >>> 0) / 4294967296;
  rng.getState = () => state;
  return rng;
}
function createReplay({ seed, character = "ryaba", geBalance = 0 }) {
  if (!Number.isSafeInteger(geBalance) || geBalance < 0) throw new Error("Invalid GE balance");
  const state = createGame(character, seededRandom(seed));
  state.ge = geBalance;
  return { state, tick: 0, input: { x: 0, y: 0 }, settled: false };
}
function advanceReplay(run, toTick, { maxAdvance = 600, retainEvents = false } = {}) {
  if (!Number.isSafeInteger(toTick) || toTick < run.tick || toTick - run.tick > maxAdvance) throw new Error("Invalid tick window");
  while (run.tick < toTick) {
    step(run.state, 1 / TICK_RATE, run.input);
    if (!retainEvents) run.state.events.length = 0;
    run.tick++;
  }
  return run.state;
}
function replayCommand(run, command, { authorizeSpend = () => false } = {}) {
  if (run.settled || !command || typeof command !== "object") throw new Error("Invalid session");
  advanceReplay(run, command.tick);
  const s = run.state;
  let ok = false;
  switch (command.type) {
    case "pause":
      if (s.mode === "playing") {
        s.mode = "paused";
        ok = true;
      }
      break;
    case "resume":
      if (s.mode === "paused") {
        s.mode = "playing";
        ok = true;
      }
      break;
    case "view":
      if (!Number.isFinite(command.width) || !Number.isFinite(command.height) || command.width < 300 || command.width > 1600 || command.height < 300 || command.height > 1200) throw new Error("Invalid viewport");
      s.spawnView = { width: command.width, height: command.height };
      return true;
    case "move":
      if (!Number.isFinite(command.x) || !Number.isFinite(command.y) || Math.abs(command.x) > 1 || Math.abs(command.y) > 1) throw new Error("Invalid movement");
      run.input = { x: command.x, y: command.y };
      return true;
    case "choose":
      if (s.mode === "upgrade" && Number.isInteger(command.index) && s.choices[command.index]) {
        ok = choose(s, command.index) === true;
      }
      break;
    case "evolve":
      if (s.mode === "evolution") {
        ok = evolve(s, command.effect) === true;
      }
      break;
    case "reroll":
    case "revive": {
      if (command.type === "reroll" && s.freeRerolls > 0) {
        ok = reroll(s);
        break;
      }
      const quote = purchaseQuote(s, command.type);
      if (quote && authorizeSpend({ action: command.type, price: quote.price, tick: run.tick, command }) === true) ok = command.type === "reroll" ? reroll(s, quote) : revive(s, quote);
      break;
    }
    case "decline-revive":
      if (s.mode === "revive") {
        declineRevive(s);
        ok = true;
      }
      break;
    case "continue-bonus":
      ok = continueBonus(s);
      break;
    case "finish":
      ok = finishRun(s);
      if (ok) run.settled = true;
      break;
    default:
      throw new Error("Unknown replay command");
  }
  if (!ok) throw new Error("Command rejected in current state");
  return true;
}

// dist/game/checkpoint.js
function encode(run) {
  const ids = /* @__PURE__ */ new Map(), series = [];
  const reference = (value) => {
    if (!ids.has(value)) {
      ids.set(value, series.length);
      series.push({ ...value });
    }
    return { $remoteSeries: ids.get(value) };
  };
  return JSON.parse(JSON.stringify({
    version: 1,
    tick: run.tick,
    input: run.input,
    settled: run.settled,
    rng: run.state.random.getState(),
    state: run.state,
    remoteSeries: series
  }, (key, value) => {
    if ((key === "series" || key === "remoteSeries") && value && typeof value === "object" && !Array.isArray(value)) return reference(value);
    if (value === Infinity) return { $number: "Infinity" };
    if (value === -Infinity) return { $number: "-Infinity" };
    if (typeof value === "number" && Number.isNaN(value)) throw Error("NaN checkpoint");
    if (typeof value === "function") return void 0;
    if (value instanceof Set) return { $set: [...value] };
    if (value instanceof Map) return { $map: [...value] };
    return value;
  }));
}
function decode(saved) {
  if (saved.version !== 1) throw Error("Unsupported checkpoint");
  const result = JSON.parse(JSON.stringify(saved), (key, value) => {
    if (value?.$number === "Infinity") return Infinity;
    if (value?.$number === "-Infinity") return -Infinity;
    if (value && typeof value === "object" && Object.hasOwn(value, "$set")) return new Set(value.$set);
    if (value && typeof value === "object" && Object.hasOwn(value, "$map")) return new Map(value.$map);
    return value;
  });
  if (Array.isArray(result.remoteSeries)) {
    const restore = (value) => value && Object.hasOwn(value, "$remoteSeries") ? result.remoteSeries[value.$remoteSeries] : value;
    for (const weapon of Object.values(result.state.weapons)) if (weapon.remoteSeries) weapon.remoteSeries = restore(weapon.remoteSeries);
    for (const attack of result.state.attacks) if (attack.series) attack.series = restore(attack.series);
    delete result.remoteSeries;
  }
  result.state.random = seededRandom(result.rng);
  return result;
}

// dist/game/balance-config.js
var roots = { heroes: CHARACTERS, weapons: WEAPONS, enemies: ENEMIES, passives: PASSIVE_BONUSES, ...TUNING, stages: Object.fromEntries(SPAWN_STAGES.map((stage) => [stage.type, stage])) };
var schema = {};
function walk(value, path = []) {
  for (const [key, v] of Object.entries(value)) {
    const parts = [...path, key], name = parts.join(".");
    if (v && typeof v === "object") walk(v, parts);
    else if (typeof v === "number" && Number.isFinite(v) && !["rerollCost", "reviveCost"].includes(key)) {
      let min = v > 0 ? v * 0.25 : 0, max = v > 0 ? v * 4 : 0;
      if (/Chance$/.test(key) || ["dustSlow", "stormSlow", "guineaCrowd", "turkeyCrowd"].includes(key)) {
        min = 0;
        max = 0.95;
      }
      if (key === "hp" && parts[0] === "heroes") {
        min = 1;
        max = 12;
      }
      if (parts[0] === "passives" && key === "health") {
        min = 1;
        max = 3;
      }
      if (key === "maxEnemies") {
        min = 100;
        max = 600;
      }
      if (["invulnerability", "guard", "reviveGuard"].includes(key)) {
        min = 0.1;
        max = 3;
      }
      if (["shotLimit", "featherBounces", "clusterCount", "orbitCount", "returnExtra"].includes(key)) max = Math.min(max, 12);
      if (["guineaAt", "turkeyAt"].includes(key)) min = max = v;
      schema[name] = Object.freeze({ base: v, min, max, integer: Number.isInteger(v) && !["speedScale", "damage", "interval", "weight"].includes(key), path: parts });
    }
  }
}
walk(roots);
var BALANCE_SCHEMA = Object.freeze(schema);
function validateBalance(values) {
  if (!values || Object.getPrototypeOf(values) !== Object.prototype) throw new Error("\u041E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u043E\u0432");
  const result = {};
  for (const [key, value] of Object.entries(values)) {
    const rule = Object.hasOwn(BALANCE_SCHEMA, key) ? BALANCE_SCHEMA[key] : null;
    if (!rule) throw new Error("\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440 \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D: " + key);
    if (typeof value !== "number" || !Number.isFinite(value) || value < rule.min || value > rule.max || rule.integer && !Number.isInteger(value)) throw new Error("\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: " + key);
    result[key] = value;
  }
  if (!Object.keys(result).length) throw new Error("\u041D\u0435\u0442 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u043E\u0432");
  const get = (key) => Object.hasOwn(result, key) ? result[key] : BALANCE_SCHEMA[key].base;
  for (const [a, b] of [["flow.minInterval", "flow.interval"], ["growth.lateStart", "growth.lateEnd"], ["seedDrops.transitionStart", "seedDrops.transitionEnd"]]) if (BALANCE_SCHEMA[a] && BALANCE_SCHEMA[b] && get(a) >= get(b)) throw new Error("\u041D\u0435\u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B: " + a + " / " + b);
  for (const id of Object.keys(ENEMIES)) {
    if (BALANCE_SCHEMA["enemies." + id + ".mediumChance"] && get("enemies." + id + ".mediumChance") + get("enemies." + id + ".largeChance") > 1) throw new Error("\u0421\u0443\u043C\u043C\u0430 \u0432\u0435\u0440\u043E\u044F\u0442\u043D\u043E\u0441\u0442\u0435\u0439 \u0431\u043E\u043B\u044C\u0448\u0435 1: " + id);
  }
  return result;
}
function publishableBalance(values) {
  const safe = {};
  for (const key of Object.keys(BALANCE_SCHEMA)) if (Object.hasOwn(values, key)) safe[key] = values[key];
  return validateBalance(safe);
}
function applyBalance(values) {
  const safe = validateBalance(values);
  for (const [key, value] of Object.entries(safe)) {
    const path = BALANCE_SCHEMA[key].path;
    let target = roots;
    for (const part of path.slice(0, -1)) target = target[part];
    target[path.at(-1)] = value;
  }
  return safe;
}
export {
  BALANCE_SCHEMA,
  ENGINE_PROTOCOL,
  TICK_RATE,
  advanceReplay,
  applyBalance,
  createReplay,
  decode,
  encode,
  publishableBalance,
  replayCommand,
  seededRandom,
  validateBalance
};
