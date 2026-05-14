        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        // ══════════════════════════════════════════════════════
        //  PROTEÇÃO CONTRA ZOOM DO BROWSER (Ctrl +/- ou pinch)
        //
        //  Problema: window.innerWidth muda com o zoom do browser,
        //  fazendo resizeCanvas() ser chamado com valores errados.
        //  Isso desloca paredes e plataformas geradas anteriormente.
        //
        //  Solução:
        //    1. Bloqueia Ctrl+, Ctrl-, Ctrl+0 no teclado
        //    2. Bloqueia Ctrl+scroll (pinch-zoom no trackpad)
        //    3. resizeCanvas usa clientWidth do container (imune ao zoom CSS)
        // ══════════════════════════════════════════════════════

        // Bloqueia zoom por teclado
        window.addEventListener('keydown', function(e) {
            if (e.ctrlKey && (
                e.key === '+' || e.key === '-' ||
                e.key === '=' || e.key === '_' ||
                e.key === '0'
            )) {
                e.preventDefault();
            }
        }, { capture: true }); // capture:true garante que captura antes de qualquer outro listener

        // Bloqueia zoom por scroll (Ctrl + roda do mouse / trackpad pinch)
        window.addEventListener('wheel', function(e) {
            if (e.ctrlKey) e.preventDefault();
        }, { passive: false });

        // Bloqueia zoom por gesto de toque (mobile)
        window.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) e.preventDefault();
        }, { passive: false });

        // ── resizeCanvas: usa o container como referência ─────
        // gameContainer tem largura fixa menos o sideMenu (120px),
        // então o canvas sempre ocupa o espaço correto independente do zoom.
        function resizeCanvas() {
            const container = document.getElementById('gameContainer');
            const sideMenu  = document.getElementById('sideMenu');
            const sideW     = sideMenu ? sideMenu.offsetWidth : 120;

            // clientWidth é imune ao zoom CSS do browser
            canvas.width  = (container ? container.clientWidth : window.innerWidth) - sideW;
            canvas.height = window.innerHeight;
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // ── Game State ─────────────────────────────────────────
        const game = {
            level: 1,
            generatedY: 0,
            nextCheckpointThreshold: -3000,
            lastCheckpoint: null,
            maxHeight: 0,
            lastHeight: 0,
            score: 0,
            highScore: localStorage.getItem('torreHighScore') || 0,
            lives: 3,
            maxLives: 5,
            camera: { y: 0 },
            keys: {},
            selectedTool: null,
            placingElement: null,
            mousePos: { x: 0, y: 0 },
            combo: 0,
            comboTimer: 0,
            elementsUsedThisLevel: 0,
            gameOver: false,
            lastScoreUpdate: 0,
            enemiesAvoided: 0,
            ladderConsecutiveUses: 0,
            ladderOnCooldown: false,
            springConsecutiveUses: 0,
            springOnCooldown: false,
            escalatorConsecutiveUses: 0,
            escalatorOnCooldown: false,

            // ── SEED ─────────────────────────────────────────
            // Armazena a seed ativa para exibir no HUD / game over
            get seed() { return typeof Rng !== 'undefined' ? Rng.getSeed() : ''; }
        };

        // ── Player ─────────────────────────────────────────────
        const player = {
            x: canvas.width / 2,
            y: canvas.height - 100,
            width: 30,
            height: 40,
            vx: 0,
            vy: 0,
            speed: 5,
            jumpPower: 12,
            jumpsLeft: 2,
            maxJumps: 2,
            gravity: 0.5,
            onGround: false,
            onLadder: false,
            invulnerable: false,
            invulnerableTimer: 0,
            isGliding: false,
            hasShield: false
        };

        // ── Boot — O amigo IA ──────────────────────────────────
        const boot = {
            x: canvas.width / 2 + 100,
            y: canvas.height - 100,
            width: 30,
            height: 40,
            vx: 0,
            vy: 0,
            speed: 6,
            gravity: 0.5,
            history: [],
            historyDelay: 40,
            state: 'following',
            personality: {
                encouragement: ['Vamos lá!', 'Você consegue!', 'Boa!', 'Isso aí!', 'Continue!'],
                overtake: ['Ops, passei você! 😄', 'Te alcancei!', 'Estou indo!', 'Consegui!'],
                fall: ['Cuidado aí!', 'Tá tudo bem?', 'Levanta!', 'Não desiste!', 'Eu te espero!'],
                levelUp: ['Nova fase! 🎉', 'Incrível!', 'Que subida!', 'Uau!'],
                motivational: ['Quase lá!', 'Mais um pouco!', 'Vamos juntos!', 'Eu acredito em você!'],
                teleport: ['Espere por mim!', 'Ufa, quase caí!', 'Vim voando!', 'Cheat ativado! 🚀']
            },
            lastSpeech: 0,
            speechCooldown: 3000,
            emotion: 'happy',
            maxHeight: 0
        };

        // ── Arrays de elementos do mundo ───────────────────────
        let platforms     = [];
        let ladders       = [];
        let elevators     = [];
        let springs       = [];
        let escalators    = [];
        let walls         = [];
        let lavaZones     = [];
        let enemies       = [];
        let placedElements = [];
        let dragStart     = null;
