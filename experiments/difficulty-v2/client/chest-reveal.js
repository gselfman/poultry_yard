/** Figma QuRa/v13/S01 chest art + open choreography for poultry lootboxes. */
const ROOT = 'assets/rewards/';

export const CHEST_SET = {
  weak: {
    label: 'Обычный сундук',
    hint: '1–5 GE',
    closed: ROOT + 'chest-oak-closed.webp',
    ajar: ROOT + 'chest-oak-ajar.webp',
    open: ROOT + 'chest-oak-open.webp',
  },
  main: {
    label: 'Ценный сундук',
    hint: '21–67 GE · аксессуар',
    closed: ROOT + 'chest-legend-closed.webp',
    ajar: ROOT + 'chest-legend-closed.webp',
    open: ROOT + 'chest-legend-open.webp',
  },
};

export function chestSrc(tier = 'weak', state = 'closed') {
  const set = CHEST_SET[tier] || CHEST_SET.weak;
  return set[state] || set.closed;
}

export function gearSrc(code) {
  if (!code) return ROOT + 'ge-egg.webp';
  return ROOT + 'gear/' + encodeURIComponent(code) + '.webp';
}

function prizeNodes(result) {
  const nodes = [];
  if ((result.ge | 0) > 0) {
    nodes.push(`<div class="loot-prize is-ge" style="--i:0">
      <span class="loot-prize-glow" aria-hidden="true"></span>
      <img src="${ROOT}ge-egg.webp" alt="" width="96" height="96" decoding="async">
      <b>+${result.ge} GE</b>
    </div>`);
  }
  if (result.code || result.accessoryName) {
    const name = result.accessoryName || result.code || 'Аксессуар';
    nodes.push(`<div class="loot-prize is-gear" style="--i:1">
      <span class="loot-prize-glow" aria-hidden="true"></span>
      <img src="${gearSrc(result.code)}" alt="" width="96" height="96" decoding="async"
        onerror="this.onerror=null;this.src='${ROOT}basket-ge-eggs.webp'">
      <span>${escape(name)}</span>
    </div>`);
  }
  if (!nodes.length) {
    nodes.push(`<div class="loot-prize is-empty" style="--i:0"><span>Пусто</span></div>`);
  }
  return nodes.join('');
}

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function chestMarkup(tier = 'weak', { open = false, compact = false } = {}) {
  const set = CHEST_SET[tier] || CHEST_SET.weak;
  const state = open ? 'open' : 'closed';
  return `<div class="loot-chest-art ${compact ? 'is-compact' : ''} ${open ? 'is-open' : ''}" data-tier="${tier}">
    <span class="loot-chest-glow" aria-hidden="true"></span>
    <img class="loot-chest-img" src="${set[state]}" alt="" width="256" height="256" decoding="async">
  </div>`;
}

/**
 * Mount interactive lootbox cards into a results panel.
 * @param {HTMLElement} host
 * @param {{lootboxes: Array, rewardsEnabled: boolean, sounds: {play: Function}, open: (id:string)=>Promise<object>}} opts
 */
export function mountLootChests(host, { lootboxes = [], rewardsEnabled = false, sounds, open }) {
  host.replaceChildren();
  const wrap = document.createElement('section');
  wrap.className = 'loot-rack';
  wrap.setAttribute('aria-live', 'polite');
  const lead = document.createElement('p');
  lead.className = 'loot-rack-lead';
  lead.textContent = rewardsEnabled
    ? 'Нажми на сундук — открой награду'
    : 'Тест без GE, XP и предметов';
  wrap.append(lead);

  if (!lootboxes.length) {
    const empty = document.createElement('p');
    empty.className = 'loot-rack-empty';
    empty.textContent = rewardsEnabled
      ? 'В этом забеге сундуков нет — победи Цесарку или Индюка.'
      : '';
    if (empty.textContent) wrap.append(empty);
    host.append(wrap);
    return wrap;
  }

  for (const item of lootboxes) {
    const tier = item.tier === 'main' ? 'main' : 'weak';
    const set = CHEST_SET[tier];
    const card = document.createElement('article');
    card.className = 'loot-card';
    card.dataset.tier = tier;
    card.dataset.id = item.id;

    if (item.result && item.result.status !== 'pending_daily_cap') {
      card.classList.add('is-opened');
      card.innerHTML = `
        <div class="loot-chest-stage is-open">
          <span class="loot-chest-glow is-lit" aria-hidden="true"></span>
          <img class="loot-chest-img" src="${set.open}" alt="" width="256" height="256" decoding="async">
          <div class="loot-prizes is-settled">${prizeNodes(item.result)}</div>
        </div>
        <p class="loot-card-caption">${escape(set.label)} · открыт</p>`;
      wrap.append(card);
      continue;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'loot-open';
    button.setAttribute('aria-label', `Открыть ${set.label}`);
    button.innerHTML = `
      <div class="loot-chest-stage">
        <span class="loot-chest-glow" aria-hidden="true"></span>
        <img class="loot-chest-img" src="${set.closed}" alt="" width="256" height="256" decoding="async">
        <div class="loot-prizes" hidden></div>
      </div>
      <span class="loot-card-caption"><strong>${escape(set.label)}</strong><small>${escape(set.hint)}</small></span>
      <span class="loot-tap-hint">Нажми, чтобы открыть</span>`;

    button.onclick = async () => {
      if (button.disabled || !rewardsEnabled) return;
      button.disabled = true;
      const stage = button.querySelector('.loot-chest-stage');
      const img = button.querySelector('.loot-chest-img');
      const glow = button.querySelector('.loot-chest-glow');
      const prizes = button.querySelector('.loot-prizes');
      const hint = button.querySelector('.loot-tap-hint');
      try {
        sounds?.play?.('chest-glow');
        stage.classList.add('is-glowing');
        glow.classList.add('is-lit');
        await sleep(420);
        sounds?.play?.('chest-creak');
        img.src = set.ajar;
        stage.classList.add('is-ajar');
        await sleep(280);
        const key = crypto.randomUUID();
        const result = await open(item.id, key);
        if (result.status === 'pending_daily_cap') {
          stage.classList.remove('is-glowing', 'is-ajar');
          glow.classList.remove('is-lit');
          img.src = set.closed;
          hint.textContent = 'Награда сохранена до доступного лимита';
          button.disabled = false;
          return;
        }
        sounds?.play?.('chest-open');
        img.src = set.open;
        stage.classList.remove('is-ajar');
        stage.classList.add('is-open');
        prizes.hidden = false;
        prizes.innerHTML = prizeNodes(result);
        prizes.classList.add('is-flying');
        await sleep(80);
        sounds?.play?.('reward-fly');
        await sleep(700);
        prizes.classList.add('is-settled');
        hint.textContent = 'Получено!';
        card.classList.add('is-opened');
        button.replaceWith(...(() => {
          const done = document.createElement('div');
          done.className = 'loot-opened-static';
          done.innerHTML = button.innerHTML;
          return [done];
        })());
      } catch {
        stage.classList.remove('is-glowing', 'is-ajar', 'is-open');
        glow.classList.remove('is-lit');
        img.src = set.closed;
        prizes.hidden = true;
        prizes.innerHTML = '';
        hint.textContent = 'Результат проверяется · нажми ещё раз';
        button.disabled = false;
      }
    };

    if (!rewardsEnabled) {
      button.disabled = true;
      button.querySelector('.loot-tap-hint').textContent = 'Награды отключены';
    }

    card.append(button);
    wrap.append(card);
  }

  host.append(wrap);
  return wrap;
}
