// render.js — the table, the cards and the screens. One job: draw state.
// Reads the match state and writes the DOM; it never changes the rules.
(function () {
  const NS = (globalThis.EmberPact = globalThis.EmberPact || {});

  // One card's HTML. Giant numeral + glyph + colour: readable at thumbnail
  // size, never text alone.
  function cardHtml(card, opts) {
    opts = opts || {};
    const el = NS.ELEMENTS[card.element];
    const cls = 'card el-' + card.element.toLowerCase() + (opts.faceDown ? ' face-down' : '') + (opts.played ? ' played' : '');
    if (opts.faceDown) {
      return '<div class="' + cls + '" aria-label="Hidden card">' +
        '<span class="card-back">🔥</span><span class="card-back-name">EMBER PACT</span></div>';
    }
    const tag = opts.clickable ? 'button' : 'div';
    const data = opts.clickable ? ' data-card="' + card.id + '"' : '';
    const label = el.name + ' ' + card.value;
    return '<' + tag + ' class="' + cls + '"' + data + ' aria-label="' + label + '">' +
      '<span class="card-glyph">' + el.glyph + '</span>' +
      '<span class="card-value">' + card.value + '</span>' +
      '<span class="card-name">' + el.name + '</span>' +
      '<span class="card-glyph small">' + el.glyph + '</span>' +
      '</' + tag + '>';
  }

  // A life bar with a number big enough to read from across the room.
  function lifeHtml(who, life, max) {
    const pct = Math.max(0, Math.min(100, (life / max) * 100));
    const low = life <= 10 ? ' low' : '';
    return '<div class="life' + low + '" data-who="' + who + '">' +
      '<span class="life-num">' + Math.max(0, life) + '</span>' +
      '<span class="life-bar"><span class="life-fill" style="width:' + pct + '%"></span></span>' +
      '<span class="life-max">/ ' + max + '</span></div>';
  }

  // Rook's scheme banner: what it is building toward, and its counter.
  function schemeHtml(scheme) {
    if (!scheme) return '';
    const el = NS.ELEMENTS[scheme.element];
    const counter = scheme.counter ? NS.ELEMENTS[scheme.counter] : null;
    const counterText = counter
      ? 'Counter it with <b style="color:' + counter.color + '">' + counter.glyph + ' ' + counter.name + '</b>'
      : 'Stone has no counter — beat it on value';
    return '<div class="scheme">' +
      '<span class="scheme-label">ROOK&rsquo;S SCHEME</span>' +
      '<span class="scheme-el" style="color:' + el.color + '">' + el.glyph + ' ' + el.name.toUpperCase() + ' SURGE</span>' +
      '<span class="scheme-counter">' + counterText + '</span></div>';
  }

  // Pact pips: one dot per element, lit once that element has won a trick.
  function pactHtml(wonElements) {
    return '<div class="pact" title="Win a trick with every element to burst the Pact">' +
      NS.ELEMENT_KEYS.map((key) => {
        const el = NS.ELEMENTS[key];
        const lit = wonElements.includes(key) ? ' lit' : '';
        return '<span class="pact-pip' + lit + '" style="--el:' + el.color + '" title="' + el.name + '">' + el.glyph + '</span>';
      }).join('') +
      '<span class="pact-label">PACT ' + wonElements.length + '/4</span></div>';
  }

  // The whole table screen, rebuilt from state after every trick.
  function renderTable(state, hooks) {
    const root = document.getElementById('screen-table');
    if (!root) return;
    const last = state.lastTrick;
    const resultLine = last
      ? (last.winner === 'player' ? 'You take the trick' : last.winner === 'rook' ? 'Rook takes the trick' : 'Tie — no damage')
        + (last.damage > 0 ? ' · −' + last.damage + ' life' : '')
        + (last.chain > 1 ? ' · Chain ×' + last.chain : '')
        + (last.pactBurst ? ' · PACT BURST!' : '')
        + (last.schemeBroken ? ' · Scheme broken!' : '')
      : (state.leader === 'rook' ? 'Rook leads — answer it.' : 'Play a card to lead the trick.');
    const rookBacks = state.rookHand.map(() => cardHtml({ element: 'EMBER', value: 0 }, { faceDown: true })).join('');
    const playerCards = state.playerHand.map((c) => cardHtml(c, { clickable: state.phase === 'playing' })).join('');
    root.innerHTML =
      '<div class="table-top">' +
        '<div class="foe"><span class="foe-name">🦊 ROOK <span class="foe-sub">the Cinder Fox</span></span>' +
        lifeHtml('rook', state.rookLife, NS.START_LIFE) + '</div>' +
        schemeHtml(state.scheme) +
      '</div>' +
      '<div class="rook-hand">' + rookBacks + '<span class="hand-count">' + state.rookHand.length + ' cards</span></div>' +
      '<div class="trick-area">' +
        '<div class="played-slot">' + (state.rookPlayed ? cardHtml(state.rookPlayed, { played: true }) : '<div class="slot-empty">ROOK</div>') + '</div>' +
        '<div class="trick-mid">' +
          '<div class="trick-num">TRICK ' + Math.max(1, state.trick) + '</div>' +
          '<div class="chain-meter">' + (state.chain > 1 ? '🔥 CHAIN ×' + state.chain : 'CHAIN ×1') + '</div>' +
          '<div class="trick-result">' + resultLine + '</div>' +
          '<div class="deck-info">Deck ' + state.deck.length + ' · Discard ' + state.discard.length + '</div>' +
        '</div>' +
        '<div class="played-slot">' + (state.playerPlayed ? cardHtml(state.playerPlayed, { played: true }) : '<div class="slot-empty">YOU</div>') + '</div>' +
      '</div>' +
      '<div class="table-bottom">' +
        '<div class="you"><span class="you-name">YOU</span>' + lifeHtml('player', state.playerLife, NS.START_LIFE) + '</div>' +
        pactHtml(state.playerPact) +
        '<div class="table-buttons">' +
          '<button id="btn-mute" class="mini-btn">' + (NS.sound.isMuted() ? '🔇 Sound off' : '🔊 Sound on') + '</button>' +
          '<button id="btn-new" class="mini-btn">↻ New match</button>' +
          '<button id="btn-help" class="mini-btn">? Rules</button>' +
        '</div>' +
      '</div>' +
      '<div class="player-hand">' + playerCards + '</div>' +
      '<div class="trick-log">' + state.log.map((l) => '<div>' + l + '</div>').join('') + '</div>';
    wireTable(root, hooks);
  }

  function wireTable(root, hooks) {
    root.querySelectorAll('[data-card]').forEach((el) => {
      el.addEventListener('click', () => hooks.onPlayCard(el.getAttribute('data-card')));
    });
    const mute = root.querySelector('#btn-mute');
    if (mute) mute.addEventListener('click', hooks.onToggleMute);
    const fresh = root.querySelector('#btn-new');
    if (fresh) fresh.addEventListener('click', hooks.onRestart);
    const help = root.querySelector('#btn-help');
    if (help) help.addEventListener('click', hooks.onShowHelp);
  }

  // Title screen: the hook, the rules in four lines, one big start button.
  function renderTitle(hooks) {
    const root = document.getElementById('screen-title');
    if (!root) return;
    root.innerHTML =
      '<div class="title-wrap">' +
        '<div class="title-embers">🔥 🌪️ 💧 🪨</div>' +
        '<h1 class="title">EMBER<br>PACT</h1>' +
        '<p class="tagline">Outwit Rook the Cinder Fox in a duel of elements.</p>' +
        '<div class="rules">' +
          '<div><b>Play a card each trick.</b> Higher power takes the trick, deals damage, and leads the next.</div>' +
          '<div><b>🔥 &gt; 🌪️ &gt; 💧 &gt; 🔥.</b> Advantage is +3 power. 🪨 Stone fights on value alone.</div>' +
          '<div><b>Chain:</b> win tricks with the same element in a row to multiply damage.</div>' +
          '<div><b>Pact:</b> win with all four elements to burst +6 damage and heal 4.</div>' +
          '<div><b>Scheme:</b> Rook declares its element — break it with the counter.</div>' +
        '</div>' +
        '<button id="btn-start" class="big-btn">▶ &nbsp;START THE DUEL</button>' +
        '<p class="title-foot">30 life each · first to zero loses · keys 1–5 play a card</p>' +
      '</div>';
    const start = root.querySelector('#btn-start');
    if (start) start.addEventListener('click', hooks.onStart);
  }

  // Win / loss screen with the match's numbers.
  function renderEnd(state, hooks) {
    const root = document.getElementById('screen-end');
    if (!root) return;
    const won = state.phase === 'won';
    root.innerHTML =
      '<div class="end-wrap ' + (won ? 'win' : 'loss') + '">' +
        '<div class="end-glyph">' + (won ? '🏆' : '🦊') + '</div>' +
        '<h1 class="end-title">' + (won ? 'THE PACT IS YOURS' : 'ROOK TAKES THE EMBERS') + '</h1>' +
        '<p class="end-line">' + (won
          ? 'Rook bows, outplayed at its own table. The cinders are yours.'
          : 'The fox keeps your embers this time. Shuffle up and break its scheme.') + '</p>' +
        '<div class="end-stats">' +
          '<div><span class="stat-num">' + state.playerTricks + '</span><span class="stat-label">tricks won</span></div>' +
          '<div><span class="stat-num">' + state.trick + '</span><span class="stat-label">tricks played</span></div>' +
          '<div><span class="stat-num">×' + Math.max(1, state.playerChainBest) + '</span><span class="stat-label">best chain</span></div>' +
          '<div><span class="stat-num">' + state.playerPacts + '</span><span class="stat-label">pacts burst</span></div>' +
          '<div><span class="stat-num">' + state.schemeBreaks + '</span><span class="stat-label">schemes broken</span></div>' +
        '</div>' +
        '<button id="btn-again" class="big-btn">' + (won ? '↻ &nbsp;PLAY AGAIN' : '↻ &nbsp;REMATCH') + '</button>' +
      '</div>';
    const again = root.querySelector('#btn-again');
    if (again) again.addEventListener('click', hooks.onRestart);
  }

  // Show exactly one screen.
  function showScreen(name) {
    ['title', 'table', 'end'].forEach((n) => {
      const el = document.getElementById('screen-' + n);
      if (el) el.classList.toggle('active', n === name);
    });
  }

  // A floating damage number over the table.
  function damagePop(text, who) {
    const area = document.querySelector('.trick-area');
    if (!area) return;
    const pop = document.createElement('div');
    pop.className = 'dmg-pop ' + who;
    pop.textContent = text;
    area.appendChild(pop);
    setTimeout(() => pop.remove(), 1100);
  }

  NS.render = {
    cardHtml,
    lifeHtml,
    schemeHtml,
    pactHtml,
    renderTable,
    renderTitle,
    renderEnd,
    showScreen,
    damagePop,
  };
})();
