// js/seed_rng.js
// ══════════════════════════════════════════════════════════
//  SISTEMA DE SEED DETERMINÍSTICA — Torre Infinita
//  Algoritmo: Mulberry32 (rápido, período longo, boa distribuição)
//
//  USO:
//    Rng.setSeed("minha-seed");   // define seed por string
//    Rng.next();                  // substitui Math.random() — retorna [0, 1)
//    Rng.int(min, max);           // inteiro inclusivo [min, max]
//    Rng.float(min, max);         // float [min, max)
//    Rng.pick(array);             // elemento aleatório de um array
//    Rng.getSeed();               // retorna a seed atual (string)
//    Rng.reset();                 // volta ao começo da sequência
// ══════════════════════════════════════════════════════════

const Rng = (() => {
    let _seedString = '';
    let _seedNumber = 0;
    let _state      = 0;

    // ── Hash: converte string em número (djb2) ──────────────
    function hashString(str) {
        if (!str || str.trim() === '') {
            // Seed vazia = timestamp → jogo "normal" diferente a cada vez
            return Date.now() & 0xFFFFFFFF;
        }
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash |= 0; // força 32 bits
        }
        return Math.abs(hash);
    }

    // ── Mulberry32 ──────────────────────────────────────────
    function mulberry32() {
        _state  = (_state + 0x6D2B79F5) | 0;
        let t   = Math.imul(_state ^ (_state >>> 15), 1 | _state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    return {
        // ── Pública: define seed ──────────────────────────────
        setSeed(seedStr) {
            _seedString = String(seedStr ?? '').trim();
            _seedNumber = hashString(_seedString);
            _state      = _seedNumber;

            console.log(`🎲 Seed: "${_seedString || '(aleatória)'}" → #${_seedNumber}`);

            // Atualiza UI se o input existir
            const input = document.getElementById('seedInput');
            if (input) input.value = _seedString;

            const display = document.getElementById('seedDisplay');
            if (display) display.textContent = _seedString || '—';
        },

        // ── Reinicia a sequência (mesmo mundo ao reiniciar) ──
        reset() {
            _state = _seedNumber;
        },

        // ── Gerador principal ─────────────────────────────────
        next:          () => mulberry32(),
        float: (a, b) => a + mulberry32() * (b - a),
        int:   (a, b) => Math.floor(a + mulberry32() * (b - a + 1)),
        pick:  (arr)  => arr[Math.floor(mulberry32() * arr.length)],
        pickN: (arr, n) => {
            const copy = [...arr];
            // Fisher-Yates parcial
            for (let i = copy.length - 1; i > copy.length - 1 - n; i--) {
                const j = Math.floor(mulberry32() * (i + 1));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy.slice(copy.length - n);
        },

        getSeed:   () => _seedString,
        getNumber: () => _seedNumber,
    };
})();


// ══════════════════════════════════════════════════════════
//  UI DE SEED — cria o painel de input no DOM
// ══════════════════════════════════════════════════════════
(function createSeedUI() {
    // Aguarda o DOM estar pronto
    function build() {
        if (document.getElementById('seedPanel')) return;

        const panel = document.createElement('div');
        panel.id = 'seedPanel';
        panel.innerHTML = `
            <span id="seedLabel">🎲 SEED:</span>
            <input  id="seedInput"   type="text"   placeholder="qualquer texto..." maxlength="32"
                    title="Digite uma seed para gerar o mesmo mundo sempre" />
            <button id="seedApply"   title="Aplicar seed">✔</button>
            <button id="seedRandom"  title="Seed aleatória">🔀</button>
            <span   id="seedDisplay" title="Seed ativa"></span>
        `;
        document.body.appendChild(panel);

        // ── Estilos inline (não precisa alterar o CSS) ────────
        Object.assign(panel.style, {
            position:   'fixed',
            top:        '10px',
            left:       '130px',
            transform:  'none',
            background: 'rgba(0,0,0,0.75)',
            border:     '1px solid #0ff',
            borderRadius: '8px',
            padding:    '6px 12px',
            display:    'flex',
            alignItems: 'center',
            gap:        '8px',
            zIndex:     '999',
            fontFamily: 'monospace',
            fontSize:   '13px',
            color:      '#0ff',
            userSelect: 'none'
        });

        const input = document.getElementById('seedInput');
        Object.assign(input.style, {
            background: '#111',
            color:      '#0ff',
            border:     '1px solid #0ff',
            borderRadius: '4px',
            padding:    '2px 6px',
            width:      '160px',
            fontFamily: 'monospace',
            fontSize:   '13px'
        });

        ['seedApply', 'seedRandom'].forEach(id => {
            Object.assign(document.getElementById(id).style, {
                background: '#003333',
                color:      '#0ff',
                border:     '1px solid #0ff',
                borderRadius: '4px',
                cursor:     'pointer',
                padding:    '2px 8px',
                fontFamily: 'monospace'
            });
        });

        Object.assign(document.getElementById('seedDisplay').style, {
            color:    '#ff0',
            minWidth: '80px',
            fontSize: '11px'
        });

        // ── Eventos ───────────────────────────────────────────
        document.getElementById('seedApply').addEventListener('click', () => {
            applySeedAndRestart(input.value);
        });

        document.getElementById('seedRandom').addEventListener('click', () => {
            const random = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase();
            input.value = random;
            applySeedAndRestart(random);
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') applySeedAndRestart(input.value);
            e.stopPropagation(); // não interfere no jogo
        });
    }

    function applySeedAndRestart(seedStr) {
        Rng.setSeed(seedStr);
        // Salva no localStorage para manter entre sessões
        localStorage.setItem('torreSeed', seedStr);
        // Reinicia o jogo com o novo mundo
        if (typeof restartGame === 'function') restartGame();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }

    // ── Restaura seed da sessão anterior ─────────────────────
    window.addEventListener('load', () => {
        const saved = localStorage.getItem('torreSeed') ?? '';
        Rng.setSeed(saved);
    });
})();
