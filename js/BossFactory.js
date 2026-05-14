// ============================================================
// BossFactory.js — BESTIÁRIO PROCEDURAL OTIMIZADO
// Gerador de bosses únicos para TARS Entombed
// Compatível com BossSchool.register()
// ============================================================

const BossFactory = (() => {

    // ── CONFIGURAÇÕES GLOBAIS DE PERFORMANCE ─────────────
    const MAX_PROJECTILES = 150;
    const MAX_COMPLEXITY_BUDGET = 25; // Limite de complexidade por boss

    // ════════════════════════════════════════════════════════
    //  POOLS DE ATRIBUTOS — O DNA dos monstros
    // ════════════════════════════════════════════════════════

    const POOLS = {

        // ── NOMES ────────────────────────────────────────────
        prefixes: [
            "Sentinela", "Guardião", "Espectro", "Colosso", "Oráculo",
            "Arauto", "Predador", "Leviatã", "Rei", "Ancião",
            "Démon", "Titã", "Juiz", "Abissal", "Eterno",
            "Caçador", "Devorador", "Soberano", "Phantom", "Nexus",
            "Ômega", "Primordial", "Sombra", "Vórtex", "Eco"
        ],
        suffixes: [
            "de Plasma",  "das Trevas",  "Cristalino",  "Ancestral",  "Elemental",
            "Abissal",    "Celestial",   "Fractal",     "das Chamas", "Temporal",
            "do Vazio",   "Espinhoso",   "Magnético",   "Nervoso",    "Estelar",
            "Putrescente","Radiante",    "da Entropia",  "Viral",      "Quântico",
            "Glacial",    "Sônico",      "da Corrupção", "Flamejante", "Silencioso"
        ],

        // ── TEMAS DE COR ─────────────────────────────────────
        colorThemes: {
            cyber:   { c1: '#00f7ff', c2: '#0088aa', bg: '#001122', glow: '#00f7ff', hp: '#00ccff' },
            plasma:  { c1: '#7700ff', c2: '#00ffff', bg: '#110022', glow: '#aa00ff', hp: '#9900ff' },
            ghost:   { c1: '#ff00dd', c2: '#aa00ff', bg: '#0a000a', glow: '#ff00ff', hp: '#ff00bb' },
            inferno: { c1: '#ff4400', c2: '#ffaa00', bg: '#1a0000', glow: '#ff2200', hp: '#ff5500' },
            toxic:   { c1: '#00ff44', c2: '#006622', bg: '#001100', glow: '#00ff22', hp: '#00cc44' },
            void:    { c1: '#8800ff', c2: '#440088', bg: '#050010', glow: '#6600cc', hp: '#9911ff' },
            solar:   { c1: '#ffcc00', c2: '#ff6600', bg: '#1a0800', glow: '#ffaa00', hp: '#ffcc33' },
            ice:     { c1: '#aaddff', c2: '#0044aa', bg: '#001122', glow: '#88ccff', hp: '#66bbff' },
            matrix:  { c1: '#00ff00', c2: '#005500', bg: '#000a00', glow: '#00cc00', hp: '#00ff44' },
            blood:   { c1: '#cc0000', c2: '#440000', bg: '#100000', glow: '#ff0000', hp: '#ff2244' },
            crystal: { c1: '#ffffff', c2: '#aaccff', bg: '#050515', glow: '#ccddff', hp: '#eeeeff' },
            corrupt: { c1: '#aa00ff', c2: '#ff00aa', bg: '#0a0010', glow: '#cc44ff', hp: '#bb22ff' }
        },

        // ── PADRÕES DE MOVIMENTO ─────────────────────────────
        movementPatterns: [
            {
                id: 'orbital',
                label: 'Orbital',
                desc: 'Circula ao redor do player em órbitas elípticas',
                complexity: 2,
                init(boss) {
                    boss._orbitAngle  = Math.random() * Math.PI * 2;
                    boss._orbitRadius = 180 + Math.random() * 120;
                    boss._moveTimer   = 0;
                    boss._targetX     = boss.x;
                    boss._targetY     = boss.y;
                },
                update(boss, t) {
                    boss._moveTimer++;
                    if (boss._moveTimer > 80 + Math.random() * 60) {
                        boss._orbitAngle  += (Math.random() - 0.5) * Math.PI;
                        boss._orbitRadius  = 150 + Math.random() * 150;
                        boss._moveTimer    = 0;
                    }
                    boss._orbitAngle += 0.012;
                    boss._targetX = player.x + Math.cos(boss._orbitAngle) * boss._orbitRadius;
                    boss._targetY = player.y + Math.sin(boss._orbitAngle) * (boss._orbitRadius * 0.55) - 80;
                    boss.x += (boss._targetX - boss.x) * 0.055;
                    boss.y += (boss._targetY - boss.y) * 0.055;
                }
            },
            {
                id: 'phase_dash',
                label: 'Dash Fantasma',
                desc: 'Flutua, carrega e dá dash em direção ao player',
                complexity: 3,
                init(boss) {
                    boss._phaseState = 'floating';
                    boss._phaseTimer = 0;
                    boss._dashVX = 0;
                    boss._dashVY = 0;
                },
                update(boss, t) {
                    boss._phaseTimer++;
                    if (boss._phaseState === 'floating') {
                        const wave = Math.sin(t * 0.004) * 55;
                        boss.x += (player.x + wave - boss.x) * 0.035;
                        boss.y += (player.y - 130 - boss.y)  * 0.035;
                        if (boss._phaseTimer > 130) { boss._phaseState = 'charging'; boss._phaseTimer = 0; }
                    } else if (boss._phaseState === 'charging') {
                        boss.x += Math.sin(t * 0.06) * 7;
                        boss.y += Math.cos(t * 0.05) * 5;
                        if (boss._phaseTimer > 45) {
                            const a = Math.atan2((player.y + player.vy * 20) - boss.y,
                                                  (player.x + player.vx * 20) - boss.x);
                            boss._dashVX = Math.cos(a) * 17;
                            boss._dashVY = Math.sin(a) * 17;
                            boss._phaseState = 'dashing';
                            boss._phaseTimer = 0;
                            audioSys.playTone(300, 'sawtooth', 0.3);
                        }
                    } else if (boss._phaseState === 'dashing') {
                        boss.x += boss._dashVX;
                        boss.y += boss._dashVY;
                        if (boss._phaseTimer > 30) { boss._phaseState = 'floating'; boss._phaseTimer = 0; }
                    }
                }
            },
            {
                id: 'mirror',
                label: 'Espelho',
                desc: 'Replica os movimentos do player com atraso',
                complexity: 4,
                init(boss) {
                    boss._mirrorDelay = 40 + Math.floor(Math.random() * 30);
                    // Otimização: Buffer circular em vez de shift()
                    boss._historyBuffer = new Float32Array(boss._mirrorDelay * 2);
                    boss._historyHead = 0;
                    boss._historyCount = 0;
                },
                update(boss, t) {
                    // Armazena a posição atual do player no buffer circular
                    const idx = boss._historyHead * 2;
                    boss._historyBuffer[idx] = player.x;
                    boss._historyBuffer[idx + 1] = player.y;

                    boss._historyHead = (boss._historyHead + 1) % boss._mirrorDelay;

                    if (boss._historyCount < boss._mirrorDelay) {
                        boss._historyCount++;
                        boss.x += (player.x - boss.x) * 0.07;
                        boss.y += (player.y - boss.y) * 0.07;
                    } else {
                        // Recupera a posição mais antiga (que agora está no head)
                        const tailIdx = boss._historyHead * 2;
                        boss.x = boss._historyBuffer[tailIdx];
                        boss.y = boss._historyBuffer[tailIdx + 1];
                    }
                }
            },
            {
                id: 'aggressive_chase',
                label: 'Perseguidor',
                desc: 'Persegue o player de forma direta e implacável',
                complexity: 1,
                init(boss) {
                    boss._chaseSpeed = 0.04 + Math.random() * 0.04;
                    boss._chaseWavePhase = 0;
                },
                update(boss, t) {
                    boss._chaseWavePhase += 0.05;
                    const perpX = -(player.y - boss.y);
                    const perpY =  (player.x - boss.x);
                    const len   = Math.hypot(perpX, perpY) || 1;
                    boss.x += (player.x - boss.x) * boss._chaseSpeed + (perpX/len) * Math.sin(boss._chaseWavePhase) * 2;
                    boss.y += (player.y - boss.y - 90) * boss._chaseSpeed + (perpY/len) * Math.sin(boss._chaseWavePhase) * 2;
                }
            },
            {
                id: 'anchored_pulse',
                label: 'Âncora Pulsante',
                desc: 'Fica estático mas ataca com ondas de choque',
                complexity: 1,
                init(boss) {
                    boss._anchorX = canvas.width / 2;
                    boss._anchorY = player.y - 280;
                    boss._pulsePhase = 0;
                },
                update(boss, t) {
                    boss._pulsePhase += 0.04;
                    boss._anchorY = player.y - 280;
                    boss.x += (boss._anchorX - boss.x) * 0.03;
                    boss.y += (boss._anchorY  - boss.y) * 0.03;
                    boss.x += Math.sin(boss._pulsePhase) * 3;
                }
            },
            {
                id: 'sine_weave',
                label: 'Ondulante',
                desc: 'Trajetória senoidal suave e imprevisível',
                complexity: 2,
                init(boss) {
                    boss._weavePhase  = 0;
                    boss._weaveAmpX   = 90 + Math.random() * 80;
                    boss._weaveFreqX  = 0.002 + Math.random() * 0.002;
                    boss._weaveAmpY   = 40 + Math.random() * 40;
                    boss._weaveFreqY  = 0.003 + Math.random() * 0.003;
                },
                update(boss, t) {
                    const tx = player.x + Math.sin(t * boss._weaveFreqX) * boss._weaveAmpX;
                    const ty = player.y - 120 + Math.cos(t * boss._weaveFreqY) * boss._weaveAmpY;
                    boss.x += (tx - boss.x) * 0.04;
                    boss.y += (ty - boss.y) * 0.04;
                }
            },
            {
                id: 'teleport',
                label: 'Teletransporte',
                desc: 'Aparece e desaparece em posições ao redor do player',
                complexity: 3,
                init(boss) {
                    boss._teleTimer   = 0;
                    boss._teleCD      = 100 + Math.floor(Math.random() * 80);
                    boss._teleAlpha   = 1;
                    boss._teleVanish  = false;
                },
                update(boss, t) {
                    boss._teleTimer++;
                    if (!boss._teleVanish) {
                        boss._teleAlpha = Math.min(1, boss._teleAlpha + 0.08);
                        if (boss._teleTimer > boss._teleCD) {
                            boss._teleVanish = true;
                            boss._teleTimer = 0;
                            audioSys.playTone(600, 'sine', 0.15);
                        }
                    } else {
                        boss._teleAlpha = Math.max(0, boss._teleAlpha - 0.12);
                        if (boss._teleAlpha <= 0) {
                            const a = Math.random() * Math.PI * 2;
                            const r = 140 + Math.random() * 100;
                            boss.x = player.x + Math.cos(a) * r;
                            boss.y = player.y + Math.sin(a) * r - 80;
                            boss._teleVanish = false;
                            boss._teleTimer  = 0;
                            audioSys.playTone(800, 'sine', 0.15);
                        }
                    }
                    if (!boss._teleVanish) {
                        boss.x += (player.x - boss.x) * 0.01;
                        boss.y += (player.y - 120 - boss.y) * 0.01;
                    }
                }
            }
        ],

        // ── TIPOS DE ATAQUE ──────────────────────────────────
        attackTypes: [
            {
                id: 'aimed_projectile',
                label: 'Projétil Direto',
                complexity: 1,
                initState(boss) { boss._atkTimer = 0; boss._atkCD = 80 + Math.floor(Math.random()*60); },
                update(boss, projectiles, t) {
                    boss._atkTimer++;
                    if (boss._atkTimer < boss._atkCD) return;
                    boss._atkTimer = 0;
                    if (projectiles.length >= MAX_PROJECTILES) return;
                    const a = Math.atan2(player.y - boss.y, player.x - boss.x);
                    projectiles.push({ x: boss.x, y: boss.y, vx: Math.cos(a)*5, vy: Math.sin(a)*5, r: 8, age: 0, type: 'aimed' });
                    audioSys.playTone(200, 'triangle', 0.15);
                }
            },
            {
                id: 'spread_shot',
                label: 'Espalhado',
                complexity: 3,
                initState(boss) { boss._atkTimer = 0; boss._atkCD = 100 + Math.floor(Math.random()*80); boss._spread = 3 + Math.floor(Math.random()*3); },
                update(boss, projectiles, t) {
                    boss._atkTimer++;
                    if (boss._atkTimer < boss._atkCD) return;
                    boss._atkTimer = 0;
                    if (projectiles.length + boss._spread > MAX_PROJECTILES) return;
                    const base = Math.atan2(player.y - boss.y, player.x - boss.x);
                    for (let i = 0; i < boss._spread; i++) {
                        const a = base + (i - Math.floor(boss._spread/2)) * 0.35;
                        projectiles.push({ x: boss.x, y: boss.y, vx: Math.cos(a)*4.5, vy: Math.sin(a)*4.5, r: 7, age: 0, type: 'spread' });
                    }
                    audioSys.playTone(150, 'sawtooth', 0.12);
                }
            },
            {
                id: 'ring_burst',
                label: 'Anel Circular',
                complexity: 4,
                initState(boss) { boss._atkTimer = 0; boss._atkCD = 140; boss._ringCount = 8 + Math.floor(Math.random()*4); },
                update(boss, projectiles, t) {
                    boss._atkTimer++;
                    if (boss._atkTimer < boss._atkCD) return;
                    boss._atkTimer = 0;
                    if (projectiles.length + boss._ringCount > MAX_PROJECTILES) return;
                    for (let i = 0; i < boss._ringCount; i++) {
                        const a = (i / boss._ringCount) * Math.PI * 2;
                        projectiles.push({ x: boss.x, y: boss.y, vx: Math.cos(a)*4, vy: Math.sin(a)*4, r: 6, age: 0, type: 'ring' });
                    }
                    audioSys.playTone(180, 'square', 0.18);
                }
            },
            {
                id: 'laser_beam',
                label: 'Laser',
                complexity: 3,
                initState(boss) { boss._atkTimer = 0; boss._atkCD = 90; boss._lasers = []; },
                update(boss, projectiles, t) {
                    boss._atkTimer++;
                    for (let i = boss._lasers.length - 1; i >= 0; i--) {
                        boss._lasers[i].life--;
                        if (boss._lasers[i].life <= 0) boss._lasers.splice(i, 1);
                    }
                    if (boss._atkTimer < boss._atkCD) return;
                    boss._atkTimer = 0;
                    const inaccuracy = 60 + Math.random() * 80;
                    boss._lasers.push({
                        x1: boss.x, y1: boss.y,
                        x2: player.x + (Math.random()-0.5) * inaccuracy,
                        y2: player.y + (Math.random()-0.5) * (inaccuracy * 0.5),
                        life: 28
                    });
                    audioSys.playTone(900, 'sawtooth', 0.07, 0.08, -500);
                }
            },
            {
                id: 'homing_orb',
                label: 'Orbe Rastreador',
                complexity: 5,
                initState(boss) { boss._atkTimer = 0; boss._atkCD = 160; },
                update(boss, projectiles, t) {
                    boss._atkTimer++;
                    
                    // Otimização: Só itera sobre projéteis se boss tiver homing orbs ativos
                    // Essa lógica foi movida para o update geral de projéteis para evitar double-iteration,
                    // MAS mantemos a compatibilidade estrutural aqui filtrando ou checando rapido
                    let hasHoming = false;
                    for (let i=0; i < projectiles.length; i++) {
                        if (projectiles[i].type === 'homing') {
                            hasHoming = true;
                            break;
                        }
                    }
                    
                    if (hasHoming) {
                        for (let i = 0; i < projectiles.length; i++) {
                            const p = projectiles[i];
                            if (p.type !== 'homing') continue;
                            if (p.age < 200) {
                                const ha = Math.atan2(player.y - p.y, player.x - p.x);
                                p.vx += Math.cos(ha) * 0.2;
                                p.vy += Math.sin(ha) * 0.2;
                                const sp = Math.hypot(p.vx, p.vy);
                                if (sp > 5) { p.vx = (p.vx/sp)*5; p.vy = (p.vy/sp)*5; }
                            }
                        }
                    }

                    if (boss._atkTimer < boss._atkCD) return;
                    boss._atkTimer = 0;
                    if (projectiles.length >= MAX_PROJECTILES) return;
                    const a = Math.atan2(player.y - boss.y, player.x - boss.x);
                    projectiles.push({ x: boss.x, y: boss.y, vx: Math.cos(a)*2.5, vy: Math.sin(a)*2.5, r: 10, age: 0, type: 'homing' });
                    audioSys.playTone(250, 'sine', 0.2);
                }
            },
            {
                id: 'shockwave',
                label: 'Onda de Choque',
                complexity: 3,
                initState(boss) { boss._atkTimer = 0; boss._atkCD = 120; boss._waves = []; },
                update(boss, projectiles, t) {
                    boss._atkTimer++;
                    for (let i = boss._waves.length - 1; i >= 0; i--) {
                        boss._waves[i].r += 6;
                        boss._waves[i].life--;
                        if (boss._waves[i].life <= 0) boss._waves.splice(i, 1);
                    }
                    if (boss._atkTimer < boss._atkCD) return;
                    boss._atkTimer = 0;
                    boss._waves.push({ x: boss.x, y: boss.y, r: 10, life: 25 });
                    audioSys.playTone(80, 'sine', 0.25);
                }
            },
            {
                id: 'spiral',
                label: 'Espiral',
                complexity: 5,
                initState(boss) { boss._atkTimer = 0; boss._atkCD = 6; boss._spiralAngle = 0; boss._spiralActive = false; boss._spiralBurst = 0; },
                update(boss, projectiles, t) {
                    boss._atkTimer++;
                    if (!boss._spiralActive) {
                        if (boss._atkTimer > 160) { boss._spiralActive = true; boss._atkTimer = 0; boss._spiralBurst = 0; }
                        return;
                    }
                    boss._spiralAngle += 0.22;
                    if (boss._atkTimer % 6 === 0) {
                        if (projectiles.length >= MAX_PROJECTILES) {
                            boss._spiralActive = false; // Interrompe spiral se limite estourar
                            return;
                        }
                        projectiles.push({ x: boss.x, y: boss.y, vx: Math.cos(boss._spiralAngle)*4, vy: Math.sin(boss._spiralAngle)*4, r: 6, age: 0, type: 'spiral' });
                        boss._spiralBurst++;
                        if (boss._spiralBurst > 22) { boss._spiralActive = false; boss._atkTimer = 0; }
                    }
                }
            },
            {
                id: 'summon_minions',
                label: 'Invocar Minions',
                complexity: 6,
                initState(boss) { boss._atkTimer = 0; boss._atkCD = 200; boss._minions = []; },
                update(boss, projectiles, t) {
                    boss._atkTimer++;
                    for (const m of boss._minions) {
                        m.x += (player.x - m.x) * 0.02;
                        m.y += (player.y - m.y) * 0.02;
                        m.angle = Math.atan2(player.y - m.y, player.x - m.x);
                        m.life--;
                    }
                    boss._minions = boss._minions.filter(m => m.life > 0);
                    if (boss._atkTimer < boss._atkCD) return;
                    boss._atkTimer = 0;
                    if (boss._minions.length > 6) return; // Otimização limite de minions
                    const count = 2 + Math.floor(Math.random() * 2);
                    for (let i = 0; i < count; i++) {
                        const a = (i / count) * Math.PI * 2;
                        boss._minions.push({ x: boss.x + Math.cos(a)*80, y: boss.y + Math.sin(a)*80, r: 12, angle: 0, life: 300 });
                    }
                    showBonus("⚠ Minions!");
                    audioSys.playTone(200, 'square', 0.2);
                }
            }
        ],

        // ── TIPOS DE CORPO / APÊNDICES ───────────────────────
        bodyTypes: [
            {
                id: 'none',
                label: 'Nenhum',
                complexity: 0,
                init() {},
                update() {},
                draw(ctx, boss, t) {}
            },
            {
                id: 'tentacles_ik',
                label: 'Tentáculos IK',
                complexity: 8,
                init(boss) {
                    const count   = 4 + Math.floor(Math.random() * 5);
                    const segs    = 10 + Math.floor(Math.random() * 8);
                    const segLen  = 12 + Math.floor(Math.random() * 8);
                    boss._tentacles = [];
                    for (let i = 0; i < count; i++) {
                        const t = [];
                        const ao = (i / count) * Math.PI * 2;
                        for (let j = 0; j < segs; j++) t.push({ x: boss.x, y: boss.y });
                        boss._tentacles.push({ segs: t, angleOffset: ao, wave: Math.random()*Math.PI*2, segLen, active: true });
                    }
                },
                update(boss, t) {
                    const time = t * 0.0004;
                    boss._tentacles.forEach((tent, i) => {
                        const isActive = (t + i * 900) % 5000 < 2500;
                        tent.active = isActive;
                        const base = tent.angleOffset + (t * 0.0005);
                        tent.segs[0].x = boss.x + Math.cos(base) * boss._cfg.headRadius;
                        tent.segs[0].y = boss.y + Math.sin(base) * boss._cfg.headRadius * 0.6;
                        if (isActive) {
                            const tip = tent.segs[tent.segs.length - 1];
                            tip.x += (player.x - tip.x) * 0.07;
                            tip.y += (player.y - tip.y) * 0.07;
                        }
                        for (let j = tent.segs.length - 2; j >= 0; j--) {
                            const dx = tent.segs[j+1].x - tent.segs[j].x;
                            const dy = tent.segs[j+1].y - tent.segs[j].y;
                            const dist = Math.hypot(dx, dy);
                            if (dist > 0) {
                                const r = (dist - tent.segLen) / dist;
                                tent.segs[j].x += dx * r * 0.28;
                                tent.segs[j].y += dy * r * 0.28;
                            }
                        }
                    });
                },
                draw(ctx, boss, t) {
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    // Otimização: Evita setar strokeStyle múltiplas vezes desnecessariamente
                    let currentStroke = null;
                    
                    boss._tentacles.forEach((tent, i) => {
                        ctx.globalAlpha = tent.active ? 1.0 : 0.4;
                        ctx.beginPath();
                        ctx.moveTo(tent.segs[0].x, tent.segs[0].y);
                        for (let j = 1; j < tent.segs.length - 1; j++) {
                            const xc = (tent.segs[j].x + tent.segs[j+1].x) / 2;
                            const yc = (tent.segs[j].y + tent.segs[j+1].y) / 2;
                            ctx.quadraticCurveTo(tent.segs[j].x, tent.segs[j].y, xc, yc);
                        }
                        ctx.lineTo(tent.segs[tent.segs.length-1].x, tent.segs[tent.segs.length-1].y);
                        ctx.lineWidth = 7;
                        
                        const color = (i % 2 === 0) ? boss._cfg.theme.c1 : boss._cfg.theme.c2;
                        if (currentStroke !== color) {
                            ctx.strokeStyle = color;
                            currentStroke = color;
                        }
                        
                        ctx.stroke();
                        if (tent.active) {
                            const tip = tent.segs[tent.segs.length-1];
                            ctx.globalAlpha = 1;
                            ctx.fillStyle = '#ff2222';
                            ctx.beginPath();
                            ctx.arc(tip.x, tip.y, 5, 0, Math.PI*2);
                            ctx.fill();
                        }
                    });
                    ctx.globalAlpha = 1;
                },
                getTipPoints(boss) {
                    const pts = [];
                    if (!boss._tentacles) return pts;
                    boss._tentacles.forEach(tent => {
                        if (!tent.active) return;
                        const tip = tent.segs[tent.segs.length - 1];
                        pts.push(tip);
                    });
                    return pts;
                }
            },
            {
                id: 'serpent_body',
                label: 'Corpo de Serpente',
                complexity: 6,
                init(boss) {
                    const segs   = 25 + Math.floor(Math.random() * 15);
                    const segLen = 12 + Math.floor(Math.random() * 6);
                    boss._body = [];
                    for (let i = 0; i < segs; i++) boss._body.push({ x: boss.x - i * segLen, y: boss.y });
                    boss._bodySegLen = segLen;
                },
                update(boss, t) {
                    boss._body[0].x = boss.x;
                    boss._body[0].y = boss.y;
                    for (let i = 1; i < boss._body.length; i++) {
                        const dx = boss._body[i].x - boss._body[i-1].x;
                        const dy = boss._body[i].y - boss._body[i-1].y;
                        const d  = Math.hypot(dx, dy);
                        if (d > boss._bodySegLen) {
                            const r = (d - boss._bodySegLen) / d;
                            boss._body[i].x -= dx * r * 0.7;
                            boss._body[i].y -= dy * r * 0.7;
                        }
                    }
                },
                draw(ctx, boss, t) {
                    const body = boss._body;
                    if (!body || body.length < 2) return;
                    
                    // Otimização: Cache do gradiente, só recria se x/y da ponta mudar muito
                    // Para corpo de serpente, gradient linear é caro. Substituindo por cores interpoladas ou gradiente pré-calculado na bbox
                    // Para manter visual exato sem perda:
                    if (!boss._bodyGradient || t % 10 === 0) {
                         boss._bodyGradient = ctx.createLinearGradient(body[0].x, body[0].y, body[body.length-1].x, body[body.length-1].y);
                         boss._bodyGradient.addColorStop(0, boss._cfg.theme.c1);
                         boss._bodyGradient.addColorStop(0.5, boss._cfg.theme.c2);
                         boss._bodyGradient.addColorStop(1, '#220033');
                    }
                    
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    ctx.moveTo(body[0].x, body[0].y);
                    for (let i = 1; i < body.length - 1; i++) {
                        const xc = (body[i].x + body[i+1].x) / 2;
                        const yc = (body[i].y + body[i+1].y) / 2;
                        ctx.quadraticCurveTo(body[i].x, body[i].y, xc, yc);
                    }
                    ctx.lineTo(body[body.length-1].x, body[body.length-1].y);
                    ctx.lineWidth = 16;
                    ctx.strokeStyle = boss._bodyGradient;
                    ctx.stroke();
                    
                    const pi = Math.floor((t % 900) / 900 * body.length);
                    if (pi < body.length) {
                        ctx.fillStyle = 'rgba(255,255,255,0.65)';
                        ctx.beginPath();
                        ctx.arc(body[pi].x, body[pi].y, 5, 0, Math.PI*2);
                        ctx.fill();
                    }
                },
                getTipPoints(boss) { return []; }
            },
            {
                id: 'orbit_satellites',
                label: 'Satélites Orbitais',
                complexity: 3,
                init(boss) {
                    const count = 3 + Math.floor(Math.random() * 3);
                    boss._satellites = [];
                    for (let i = 0; i < count; i++) {
                        boss._satellites.push({
                            angle: (i / count) * Math.PI * 2,
                            radius: 70 + Math.random() * 40,
                            speed:  0.03 + Math.random() * 0.03,
                            size:   8 + Math.floor(Math.random() * 8),
                            x: boss.x, y: boss.y
                        });
                    }
                },
                update(boss, t) {
                    boss._satellites.forEach(s => {
                        s.angle += s.speed;
                        s.x = boss.x + Math.cos(s.angle) * s.radius;
                        s.y = boss.y + Math.sin(s.angle) * s.radius;
                    });
                },
                draw(ctx, boss, t) {
                    // Otimização: reduzir uso de shadowBlur em arrays (só aplica se não houver muitos projéteis na tela)
                    const useShadow = boss._projectiles.length < 50;
                    ctx.fillStyle = boss._cfg.theme.c1;
                    
                    if (useShadow) {
                        ctx.shadowBlur = 12;
                        ctx.shadowColor = boss._cfg.theme.glow;
                    }
                    
                    ctx.beginPath();
                    boss._satellites.forEach(s => {
                        ctx.moveTo(s.x + s.size, s.y);
                        ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
                    });
                    ctx.fill();
                    
                    if (useShadow) ctx.shadowBlur = 0;
                },
                getTipPoints(boss) { return boss._satellites || []; }
            },
            {
                id: 'wing_spikes',
                label: 'Asas Espinhosas',
                complexity: 4,
                init(boss) {
                    boss._wings = [];
                    const sides = 2;
                    for (let s = 0; s < sides; s++) {
                        const side = (s === 0) ? -1 : 1;
                        const spikes = [];
                        const count = 3 + Math.floor(Math.random() * 3);
                        for (let i = 0; i < count; i++) {
                            spikes.push({ lx: boss.x, ly: boss.y, rx: boss.x + side*60, ry: boss.y - i*22, length: 40 + i*15 });
                        }
                        boss._wings.push({ side, spikes });
                    }
                    boss._wingPhase = 0;
                },
                update(boss, t) {
                    boss._wingPhase += 0.04;
                    boss._wings.forEach((wing, wi) => {
                        wing.spikes.forEach((sp, si) => {
                            const flutter = Math.sin(boss._wingPhase + si * 0.5) * 15;
                            const angle   = wing.side * (0.4 + si * 0.2) + flutter * 0.01;
                            sp.lx = boss.x;
                            sp.ly = boss.y + si * 18;
                            sp.rx = boss.x + Math.cos(angle) * (sp.length + flutter);
                            sp.ry = boss.y + si * 18 + Math.sin(angle + Math.PI) * sp.length * 0.4;
                        });
                    });
                },
                draw(ctx, boss, t) {
                    ctx.lineCap = 'round';
                    // Otimização: batch de desenhar
                    boss._wings.forEach(wing => {
                        wing.spikes.forEach((sp, i) => {
                            ctx.strokeStyle = boss._cfg.theme.c1;
                            ctx.lineWidth = 5 - i * 0.5;
                            ctx.beginPath();
                            ctx.moveTo(sp.lx, sp.ly);
                            ctx.lineTo(sp.rx, sp.ry);
                            ctx.stroke();
                            ctx.fillStyle = boss._cfg.theme.c2;
                            ctx.beginPath();
                            ctx.arc(sp.rx, sp.ry, 4, 0, Math.PI*2);
                            ctx.fill();
                        });
                    });
                },
                getTipPoints(boss) {
                    const pts = [];
                    if (!boss._wings) return pts;
                    boss._wings.forEach(w => w.spikes.forEach(s => pts.push({ x: s.rx, y: s.ry })));
                    return pts;
                }
            }
        ],

        // ── MECÂNICAS ESPECIAIS ──────────────────────────────
        specialMechanics: [
            {
                id: 'none',
                label: 'Padrão',
                complexity: 0,
                init() {},
                update() {}
            },
            {
                id: 'phase_change',
                label: 'Mudança de Fase',
                complexity: 1,
                init(boss) { boss._mechPhase = 1; boss._phaseChanged = false; },
                update(boss, t) {
                    if (!boss._phaseChanged && boss.health < boss.maxHealth * 0.5) {
                        boss._mechPhase = 2;
                        boss._phaseChanged = true;
                        boss._cfg.attackCD = Math.max(30, boss._cfg.attackCD - 20);
                        showBonus("⚠️ FASE 2! ⚠️");
                        bootSpeak("Ele ficou mais forte! Cuidado!");
                        boot.emotion = 'worried';
                        audioSys.playTone(80, 'sawtooth', 0.8);
                    }
                }
            },
            {
                id: 'rage_mode',
                label: 'Modo Fúria',
                complexity: 1,
                init(boss) { boss._raging = false; },
                update(boss, t) {
                    const wasRaging = boss._raging;
                    boss._raging = boss.health < boss.maxHealth * 0.3;
                    if (boss._raging && !wasRaging) {
                        showBonus("🔥 FÚRIA TOTAL!");
                        bootSpeak("ELE ENLOUQUECEU! ESQUIVA!");
                        audioSys.playTone(100, 'sawtooth', 1.0);
                    }
                }
            },
            {
                id: 'shield',
                label: 'Escudo Regenerativo',
                complexity: 2,
                init(boss) { boss._shieldHP = 30; boss._shieldMax = 30; boss._shieldActive = true; boss._shieldRegen = 0; },
                update(boss, t) {
                    if (!boss._shieldActive) {
                        boss._shieldRegen++;
                        if (boss._shieldRegen > 300) {
                            boss._shieldActive = true;
                            boss._shieldHP     = boss._shieldMax;
                            boss._shieldRegen  = 0;
                            showBonus("🛡 Escudo Regenerado!");
                        }
                    }
                },
                interceptDamage(boss, dmg) {
                    if (!boss._shieldActive) return dmg;
                    boss._shieldHP -= dmg;
                    if (boss._shieldHP <= 0) {
                        boss._shieldActive = false;
                        showBonus("🛡 ESCUDO QUEBRADO!");
                        audioSys.playTone(200, 'sawtooth', 0.3);
                    }
                    return 0;
                }
            },
            {
                id: 'invisibility',
                label: 'Invisibilidade',
                complexity: 2,
                init(boss) { boss._invisible = false; boss._invisTimer = 0; boss._invisCD = 180; },
                update(boss, t) {
                    boss._invisTimer++;
                    if (!boss._invisible && boss._invisTimer > boss._invisCD) {
                        boss._invisible = true;
                        boss._invisTimer = 0;
                        bootSpeak("Ele sumiu! Fique atento!");
                    }
                    if (boss._invisible && boss._invisTimer > 120) {
                        boss._invisible = false;
                        boss._invisTimer = 0;
                        bootSpeak("Lá ele está!");
                    }
                }
            },
            {
                id: 'clone_maker',
                label: 'Invocador de Clones',
                complexity: 6,
                init(boss) { 
                    boss._clones = []; 
                    boss._cloneTimer = 0; 
                    boss._cloneCD = 300; 
                    boss._cloneHistLen = 35;
                },
                update(boss, t) {
                    boss._cloneTimer++;
                    for (let i = boss._clones.length - 1; i >= 0; i--) {
                        const c = boss._clones[i];
                        
                        // Otimização de buffer circular para histórico do clone
                        const headIdx = c.histHead * 2;
                        c.hist[headIdx] = player.x;
                        c.hist[headIdx + 1] = player.y;
                        
                        c.histHead = (c.histHead + 1) % boss._cloneHistLen;
                        
                        if (c.histCount < boss._cloneHistLen) {
                            c.histCount++;
                        } else {
                            const tailIdx = c.histHead * 2;
                            const tx = c.hist[tailIdx];
                            const ty = c.hist[tailIdx + 1];
                            c.x += (tx - c.x) * 0.12;
                            c.y += (ty - c.y) * 0.12;
                        }

                        c.life--;
                        c.alpha = c.life / 400;
                        if (c.life <= 0) boss._clones.splice(i, 1);
                    }
                    if (boss._cloneTimer > boss._cloneCD && boss._clones.length < 3) {
                        boss._cloneTimer = 0;
                        const a = Math.random() * Math.PI * 2;
                        boss._clones.push({ 
                            x: player.x + Math.cos(a)*160, 
                            y: player.y + Math.sin(a)*160, 
                            hist: new Float32Array(boss._cloneHistLen * 2), // Array pré-alocado
                            histHead: 0,
                            histCount: 0,
                            life: 400, 
                            alpha: 0.5, 
                            r: 22 
                        });
                        audioSys.playTone(300, 'sine', 0.2);
                        showBonus("👤 Clone!");
                    }
                }
            }
        ],

        // ── FRASES DO BOOT por arquétipo ─────────────────────
        bootPhrases: {
            orbital:          ["Ele tá orbitando!", "Continue se mexendo!", "Pula nele quando passar!"],
            phase_dash:       ["Ele vai dar dash!", "Prepara pra esquivar!", "ESQUIVA!"],
            mirror:           ["Ele tá te copiando!", "Engana ele com movimentos falsos!", "Não para de andar!"],
            aggressive_chase: ["ELE TÁ ATRÁS DE VOCÊ!", "Corre!", "Não deixa ele te alcançar!"],
            anchored_pulse:   ["Cuidado com as ondas!", "Pula as ondas!", "Se aproxima devagar!"],
            sine_weave:       ["Movimento imprevisível!", "Espera a abertura!", "Calma, aguarda..."],
            teleport:         ["Ele teleportou!", "Onde ele foi?!", "Fica alerta!"],
            generic:          ["Continue se mexendo!", "Vou distraindo ele!", "Você consegue!", "Eu cobri você!"]
        },

        // ── APARÊNCIA DO CORE (corpo central) ────────────────
        coreShapes: ['circle', 'star', 'diamond', 'hexagon', 'cross', 'eye'],

        // ── EFEITOS DE DERROTA ────────────────────────────────
        defeatSounds: [
            (score) => {
                audioSys.playTone(400, 'sine', 0.3);
                setTimeout(() => audioSys.playTone(500, 'sine', 0.3), 150);
                setTimeout(() => audioSys.playTone(700, 'sine', 0.5), 300);
            },
            (score) => {
                for (let i = 0; i < 5; i++) setTimeout(() => audioSys.playTone(300 + i*100, 'sawtooth', 0.2), i*80);
            },
            (score) => {
                audioSys.playTone(100, 'sawtooth', 0.5);
                setTimeout(() => audioSys.playTone(50, 'sawtooth', 0.8), 200);
            }
        ]
    };

    // ════════════════════════════════════════════════════════
    //  UTILITÁRIOS
    // ════════════════════════════════════════════════════════

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function pickN(arr, n) {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, n);
    }
    function rng(min, max) { return min + Math.random() * (max - min); }
    function rngInt(min, max) { return Math.floor(rng(min, max + 1)); }

    // ════════════════════════════════════════════════════════
    //  FUNÇÃO PRINCIPAL DE GERAÇÃO
    // ════════════════════════════════════════════════════════

    function generate(options = {}) {
        const {
            heightTier = 1,          
            startHeight = null,      
            endHeight   = null,
            forcedTheme = null,      
            debug       = false
        } = options;

        let bossData = null;
        let attempts = 0;

        // Loop de geração com Complexity Budget
        while (!bossData && attempts < 10) {
            attempts++;
            
            const difficulty = Math.min(10, Math.max(1, heightTier));
            const movement   = pick(POOLS.movementPatterns);
            const bodyType   = pick(POOLS.bodyTypes);

            const numAttacks = Math.min(POOLS.attackTypes.length, 1 + Math.floor(difficulty / 3));
            const attacks    = pickN(POOLS.attackTypes, numAttacks);

            const mechChance = 0.3 + difficulty * 0.07;
            const mechPool   = POOLS.specialMechanics.filter(m => m.id !== 'none');
            const mechanic   = Math.random() < mechChance ? pick(mechPool) : POOLS.specialMechanics[0];

            // ── CÁLCULO DE COMPLEXIDADE ──
            let currentComplexity = movement.complexity + bodyType.complexity + mechanic.complexity;
            for (let a of attacks) {
                currentComplexity += a.complexity;
            }

            // Rejeita boss se for pesado demais, tenta novamente
            if (currentComplexity > MAX_COMPLEXITY_BUDGET) {
                if (debug) console.warn(`[BossFactory] Rejeitando boss por budget (${currentComplexity} > ${MAX_COMPLEXITY_BUDGET}). Tentativa ${attempts}`);
                continue; 
            }

            // Sucesso na alocação do budget
            const themeKey   = forcedTheme || pick(Object.keys(POOLS.colorThemes));
            const theme      = POOLS.colorThemes[themeKey];
            const coreShape  = pick(POOLS.coreShapes);
            const bossName = `${pick(POOLS.prefixes)} ${pick(POOLS.suffixes)}`;

            const baseHP      = 80 + difficulty * 25;
            const jitter      = rngInt(-15, 15);
            const finalHP     = Math.max(60, baseHP + jitter);
            const scoreReward = 800 + difficulty * 400 + rngInt(-100, 100);

            const autoStart = startHeight ?? (1500 + (heightTier - 1) * 3000);
            const autoEnd   = endHeight   ?? (autoStart + 2000);

            const phrases = POOLS.bootPhrases[movement.id] || POOLS.bootPhrases.generic;

            const cfg = {
                theme,
                themeKey,
                headRadius: 28 + rngInt(0, 18),
                attackCD:   Math.max(50, 120 - difficulty * 8),
                bootShootInterval: Math.max(800, 2000 - difficulty * 80),
                bootDamage: 0.2 + difficulty * 0.03,
                bootHitChance: 0.35 + difficulty * 0.03,
                coreShape,
                difficulty,
                phrases,
                scoreReward,
                complexity: currentComplexity
            };

            bossData = { movement, bodyType, attacks, mechanic, bossName, finalHP, autoStart, autoEnd, cfg };
        }

        // Fallback de segurança se falhar max attempts
        if (!bossData) {
            console.error("[BossFactory] Falha ao gerar boss dentro do budget. Retornando fallback simples.");
            return BossFactory.generateCustom({ name: "Falha Genética", body: "none", movement: "aggressive_chase", attacks: ["aimed_projectile"], startHeight, endHeight });
        }

        if (debug) {
            console.log(`[BossFactory] Gerando: ${bossData.bossName} [Cplx: ${bossData.cfg.complexity}/${MAX_COMPLEXITY_BUDGET}]`);
            console.log(`  Movimento: ${bossData.movement.label}, Ataques: ${bossData.attacks.map(a=>a.label).join(', ')}`);
            console.log(`  Corpo: ${bossData.bodyType.label}, Mecânica: ${bossData.mechanic.label}`);
            console.log(`  Tema: ${bossData.cfg.themeKey}, HP: ${bossData.finalHP}`);
        }

        // ── 2. MONTAR O OBJETO BOSS ──────────────────────────

        const boss = {
            name: bossData.bossName,
            active: false,
            completed: false,
            startHeight: bossData.autoStart,
            endHeight:   bossData.autoEnd,

            x: 0, y: 0,
            health:    bossData.finalHP,
            maxHealth: bossData.finalHP,
            _attackCooldown: 0,
            _projectiles: [],
            _hitFlash: 0,

            _movement:  bossData.movement,
            _attacks:   bossData.attacks,
            _bodyType:  bossData.bodyType,
            _mechanic:  bossData.mechanic,
            _cfg:       bossData.cfg,

            init: function() {
                this.x = canvas.width / 2;
                this.y = player.y - 300;
                this.health    = this.maxHealth;
                this._projectiles = []; // Otimização interna JS, reinicia array
                this._attackCooldown = 0;
                this._hitFlash = 0;

                this._movement.init(this);
                this._bodyType.init(this);
                this._mechanic.init(this);
                this._attacks.forEach(a => {
                    if (a.initState) a.initState(this);
                });

                bootSpeak(pick(this._cfg.phrases));
                boot.emotion = 'worried';
                boot.state   = 'controlled_by_boss';

                showBonus(`⚠️ ${this.name.toUpperCase()}! ⚠️`);
                audioSys.playTone(80, 'sawtooth', 3.0, 0.8);

                if (!boot.lastBossShot) boot.lastBossShot = 0;
            },

            update: function() {
                if (!this.active) return;
                
                // Otimização: Pegar timestamp uma vez
                const t = Date.now();
                
                if (this._attackCooldown > 0) this._attackCooldown--;
                if (this._hitFlash > 0) this._hitFlash--;

                this._mechanic.update(this, t);

                const teleAlpha = (this._movement.id === 'teleport') ? this._teleAlpha : 1;
                this._movement.update(this, t);

                this._bodyType.update(this, t);

                this._updateBoot(t);

                this._attacks.forEach(a => a.update(this, this._projectiles, t));

                this._updateProjectiles();

                this._checkCollision();

                if (this.health <= 0) this._defeat();
            },

            _updateBoot: function(t) {
                boot.state   = 'controlled_by_boss';
                boot.emotion = this.health < this.maxHealth * 0.4 ? 'worried' : 'angry';

                const targetBootX = this.x + 190;
                const targetBootY = this.y - 140;
                boot.x += (targetBootX - boot.x) * 0.06;
                boot.y += (targetBootY - boot.y) * 0.06;

                if (t - boot.lastBossShot > this._cfg.bootShootInterval) {
                    boot.lastBossShot = t;
                    const hit = Math.random() < this._cfg.bootHitChance;
                    if (hit) {
                        let dmg = this._cfg.bootDamage;
                        if (this._mechanic.id === 'shield' && this._mechanic.interceptDamage) {
                            dmg = this._mechanic.interceptDamage(this, dmg);
                        }
                        this.health -= dmg;
                        if (Math.random() < 0.12) showBonus("🤖");
                        audioSys.playTone(400, 'square', 0.04);
                    }
                }

                if (Math.random() < 0.002) {
                    bootSpeak(pick(this._cfg.phrases));
                }
            },

            _updateProjectiles: function() {
                for (let i = this._projectiles.length - 1; i >= 0; i--) {
                    const p = this._projectiles[i];
                    p.x  += p.vx;
                    p.y  += p.vy;
                    p.age++;
                    if (p.age > 350 || p.x < -100 || p.x > canvas.width+100 || p.y < -100 || p.y > canvas.height+300) {
                        this._projectiles.splice(i, 1);
                    }
                }
            },

            _checkCollision: function() {
                if (this._attackCooldown > 0) return;
                const px  = player.x + player.width/2;
                const py  = player.y + player.height/2;
                const inv = player.invulnerable || player.hasShield;

                const dHead = Math.hypot(px - this.x, py - this.y);
                if (dHead < this._cfg.headRadius + 20) {
                    if (!inv) { loseLife(); this._attackCooldown = 60; return; }
                }

                const tipPoints = this._bodyType.getTipPoints ? this._bodyType.getTipPoints(this) : [];
                for (const pt of tipPoints) {
                    if (Math.hypot(px - pt.x, py - pt.y) < 14) {
                        if (!inv) { loseLife(); this._attackCooldown = 60; return; }
                    }
                }

                if (this._body) {
                    const half = Math.floor(this._body.length / 2);
                    for (let i = half; i < this._body.length; i++) {
                        if (Math.hypot(px - this._body[i].x, py - this._body[i].y) < 14) {
                            if (!inv) { loseLife(); this._attackCooldown = 60; return; }
                        }
                    }
                }

                for (let i = this._projectiles.length - 1; i >= 0; i--) {
                    const p = this._projectiles[i];
                    if (Math.hypot(px - p.x, py - p.y) < (p.r || 8) + 14) {
                        if (!inv) { loseLife(); this._attackCooldown = 60; }
                        this._projectiles.splice(i, 1);
                        return;
                    }
                }

                if (this._waves) {
                    for (const w of this._waves) {
                        const d = Math.hypot(px - w.x, py - w.y);
                        if (Math.abs(d - w.r) < 18) {
                            if (!inv) { loseLife(); this._attackCooldown = 60; return; }
                        }
                    }
                }

                if (this._clones) {
                    for (const c of this._clones) {
                        if (Math.hypot(px - c.x, py - c.y) < c.r + 18) {
                            if (!inv) { loseLife(); this._attackCooldown = 60; return; }
                        }
                    }
                }

                for (const a of this._attacks) {
                    if (a.id === 'summon_minions' && this._minions) {
                        for (const m of this._minions) {
                            if (Math.hypot(px - m.x, py - m.y) < m.r + 14) {
                                if (!inv) { loseLife(); this._attackCooldown = 60; return; }
                            }
                        }
                    }
                }

                const playerPy = player.y + player.height/2;
                if (player.vy > 2 && dHead < this._cfg.headRadius + 30 && playerPy < this.y) {
                    let dmg = 12 + this._cfg.difficulty;
                    if (this._mechanic.id === 'shield' && this._mechanic.interceptDamage) {
                        dmg = this._mechanic.interceptDamage(this, dmg);
                    } else if (this._mechanic.id === 'none' || !this._mechanic.interceptDamage) {
                        this.health -= dmg;
                    }
                    if (dmg > 0) {
                        this._hitFlash = 5;
                        player.vy = -13;
                        showBonus(`💥 -${dmg} HP`);
                        audioSys.playTone(300, 'square', 0.15);
                        const ka = Math.atan2(this.y - player.y, this.x - player.x);
                        this.x  += Math.cos(ka) * 35;
                        this.y  += Math.sin(ka) * 35;
                    } else {
                        player.vy = -13; 
                    }
                }
            },

            drawBackground: function(ctx) {
                if (!this.active) return;
                
                // Otimização: Cache de time
                const t = Date.now();
                
                ctx.fillStyle = this._cfg.theme.bg;
                ctx.globalAlpha = 0.6;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1;

                if (this._invisible) {
                    const p = Math.sin(t * 0.01) * 0.5 + 0.5;
                    ctx.fillStyle = `rgba(255,255,255,${p * 0.04})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                if (this._raging) {
                    const p2 = Math.sin(t * 0.02) * 0.5 + 0.5;
                    ctx.fillStyle = `rgba(255,0,0,${p2 * 0.07})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            },

            drawForeground: function(ctx) {
                if (!this.active) return;
                
                const t = Date.now();
                const inv   = this._mechanic.id === 'invisibility' && this._invisible;
                const alpha = inv ? 0.12 : (this._movement.id === 'teleport' ? (this._teleAlpha ?? 1) : 1);
                ctx.globalAlpha = alpha;

                this._bodyType.draw(ctx, this, t);

                this._drawCore(ctx, t);

                this._drawProjectiles(ctx);

                if (this._lasers) this._drawLasers(ctx);

                if (this._waves) this._drawWaves(ctx);

                if (this._clones) this._drawClones(ctx);

                if (this._minions) this._drawMinions(ctx);

                if (this._shieldActive) this._drawShield(ctx, t);

                ctx.globalAlpha = 1;

                this._drawHealthBar(ctx);
            },

            _drawCore: function(ctx, t) {
                const r     = this._cfg.headRadius;
                const pulse = 1 + Math.sin(t * 0.006) * 0.08;
                const pr    = r * pulse;
                const theme = this._cfg.theme;
                const isHit = this._hitFlash > 0;
                const isRag = this._raging;
                
                // Otimização: Evitar shadow se estiver invísivel ou muitos projéteis
                const useShadow = !this._invisible && this._projectiles.length < 50;

                if (useShadow) {
                    ctx.shadowBlur  = 18;
                    ctx.shadowColor = isRag ? '#ff0000' : theme.glow;
                }

                ctx.fillStyle = isHit ? '#ffffff' : theme.c1;
                ctx.beginPath();

                switch (this._cfg.coreShape) {
                    case 'star':
                        this._pathStar(ctx, this.x, this.y, pr, pr*0.45, 5);
                        break;
                    case 'diamond':
                        ctx.moveTo(this.x, this.y - pr);
                        ctx.lineTo(this.x + pr*0.7, this.y);
                        ctx.lineTo(this.x, this.y + pr);
                        ctx.lineTo(this.x - pr*0.7, this.y);
                        ctx.closePath();
                        break;
                    case 'hexagon':
                        this._pathPolygon(ctx, this.x, this.y, pr, 6);
                        break;
                    case 'cross':
                        const a3 = pr * 0.38;
                        ctx.rect(this.x - pr, this.y - a3, pr*2, a3*2);
                        ctx.rect(this.x - a3, this.y - pr, a3*2, pr*2);
                        break;
                    case 'eye':
                        ctx.ellipse(this.x, this.y, pr, pr*0.55, 0, 0, Math.PI*2);
                        break;
                    default: 
                        ctx.arc(this.x, this.y, pr, 0, Math.PI*2);
                }
                ctx.fill();

                ctx.strokeStyle = isHit ? '#ff0000' : theme.c2;
                ctx.lineWidth   = 2.5;
                ctx.stroke();

                if (useShadow) ctx.shadowBlur = 0;

                const eyeAngle = Math.atan2(player.y - this.y, player.x - this.x);
                const ex = this.x + Math.cos(eyeAngle) * (r * 0.35);
                const ey = this.y + Math.sin(eyeAngle) * (r * 0.35);
                ctx.fillStyle = isRag ? '#ff4400' : '#ff2222';
                ctx.beginPath();
                ctx.arc(ex, ey, r * 0.22, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex, ey, r * 0.1, 0, Math.PI*2);
                ctx.fill();

                if (this._mechPhase === 2) {
                    const pa = Math.sin(t * 0.01) * 0.5 + 0.5;
                    ctx.strokeStyle = `rgba(255,0,100,${pa * 0.7})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, r + 12 + pa * 8, 0, Math.PI*2);
                    ctx.stroke();
                }
            },

            _pathStar: function(ctx, cx, cy, outerR, innerR, points) {
                for (let i = 0; i < points * 2; i++) {
                    const r = i % 2 === 0 ? outerR : innerR;
                    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI/2;
                    i === 0 ? ctx.moveTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r)
                             : ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
                }
                ctx.closePath();
            },

            _pathPolygon: function(ctx, cx, cy, r, sides) {
                for (let i = 0; i < sides; i++) {
                    const a = (i / sides) * Math.PI * 2 - Math.PI/2;
                    i === 0 ? ctx.moveTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r)
                             : ctx.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
                }
                ctx.closePath();
            },

            _drawProjectiles: function(ctx) {
                const theme = this._cfg.theme;
                const useShadow = this._projectiles.length < 50; // Otimização

                this._projectiles.forEach(p => {
                    const isHoming = p.type === 'homing';
                    
                    if (useShadow) {
                        ctx.shadowBlur  = isHoming ? 18 : 10;
                        ctx.shadowColor = isHoming ? '#ff00aa' : theme.glow;
                    }

                    // Otimização: Evitar criar gradient radial por bala (muito pesado).
                    // Usar cor sólida ou gradient cacheado.
                    // Substituto: Cor base com transparência na borda desenhando dois círculos ou arc()
                    ctx.fillStyle = isHoming ? '#ff0099' : theme.c1;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r || 8, 0, Math.PI*2);
                    ctx.fill();
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, (p.r || 8) * 0.4, 0, Math.PI*2);
                    ctx.fill();

                    if (useShadow) ctx.shadowBlur = 0;

                    if ((p.vx || p.vy) && (p.type === 'homing' || p.type === 'spiral')) {
                        ctx.strokeStyle = theme.c2;
                        ctx.lineWidth = 2;
                        ctx.globalAlpha = 0.4;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p.x - (p.vx||0)*3, p.y - (p.vy||0)*3);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                });
            },

            _drawLasers: function(ctx) {
                this._lasers.forEach(l => {
                    const a = l.life / 28;
                    ctx.strokeStyle = `rgba(255,0,0,${a})`;
                    ctx.lineWidth = l.life > 18 ? 7 : 2;
                    ctx.shadowBlur  = 8;
                    ctx.shadowColor = '#ff0000';
                    ctx.beginPath();
                    ctx.moveTo(l.x1, l.y1);
                    ctx.lineTo(l.x2, l.y2);
                    ctx.stroke();
                    ctx.strokeStyle = `rgba(255,255,255,${a})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                });
            },

            _drawWaves: function(ctx) {
                const theme = this._cfg.theme;
                this._waves.forEach(w => {
                    const a = w.life / 25;
                    ctx.strokeStyle = `rgba(255,255,255,${a * 0.8})`;
                    ctx.lineWidth   = 3;
                    ctx.shadowBlur  = 10;
                    ctx.shadowColor = theme.glow;
                    ctx.beginPath();
                    ctx.arc(w.x, w.y, w.r, 0, Math.PI*2);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                });
            },

            _drawClones: function(ctx) {
                this._clones.forEach(c => {
                    ctx.globalAlpha = c.alpha;
                    ctx.fillStyle   = this._cfg.theme.c2;
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
                    ctx.fill();
                    ctx.fillStyle   = 'rgba(255,255,255,0.7)';
                    ctx.font        = '16px Arial';
                    ctx.textAlign   = 'center';
                    ctx.fillText("?", c.x, c.y + 5);
                    ctx.globalAlpha = 1;
                });
            },

            _drawMinions: function(ctx) {
                const theme = this._cfg.theme;
                this._minions.forEach(m => {
                    ctx.fillStyle = theme.c1;
                    ctx.beginPath();
                    ctx.arc(m.x, m.y, m.r, 0, Math.PI*2);
                    ctx.fill();
                    const ex2 = m.x + Math.cos(m.angle) * 4;
                    const ey2 = m.y + Math.sin(m.angle) * 4;
                    ctx.fillStyle = '#ff2222';
                    ctx.beginPath();
                    ctx.arc(ex2, ey2, 3, 0, Math.PI*2);
                    ctx.fill();
                });
            },

            _drawShield: function(ctx, t) {
                const r    = this._cfg.headRadius + 18;
                const prog = this._shieldHP / this._shieldMax;

                ctx.shadowBlur  = 15;
                ctx.shadowColor = '#88ddff';
                ctx.strokeStyle = `rgba(150, 220, 255, ${0.5 + Math.sin(t*0.005)*0.3})`;
                ctx.lineWidth   = 5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI * 2 * prog);
                ctx.stroke();
                ctx.shadowBlur = 0;
            },

            _drawHealthBar: function(ctx) {
                const w  = 210;
                const h  = 13;
                const bx = this.x - w/2;
                const by = this.y - this._cfg.headRadius - 32;

                ctx.globalAlpha = 1;

                ctx.fillStyle = 'rgba(0,0,0,0.75)';
                ctx.fillRect(bx - 2, by - 2, w + 4, h + 4);

                const hpR  = this.health / this.maxHealth;
                
                // Otimização: Cor em vez de gradient recalculado por frame
                ctx.fillStyle = hpR > 0.5 ? this._cfg.theme.hp : hpR > 0.25 ? '#ff8800' : '#ff2222';
                ctx.fillRect(bx, by, w * hpR, h);

                ctx.strokeStyle = this._cfg.theme.c1;
                ctx.lineWidth   = 1;
                ctx.strokeRect(bx, by, w, h);

                ctx.fillStyle  = '#ffffff';
                ctx.font       = 'bold 10px monospace';
                ctx.textAlign  = 'center';
                
                // Otimização string concat
                let txt = this.name + " — HP " + Math.ceil(this.health) + "/" + this.maxHealth;
                if (this._mechPhase === 2) txt += ' [FASE 2]';
                if (this._shieldActive) txt += ' 🛡';
                
                ctx.fillText(txt, this.x, by - 5);

                if (this._shieldHP !== undefined) {
                    const sw  = 80;
                    const sp  = this._shieldHP / this._shieldMax;
                    const sbx = this.x - sw/2;
                    const sby = by + h + 4;
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(sbx-1, sby-1, sw+2, 5+2);
                    ctx.fillStyle = this._shieldActive ? '#aaddff' : '#335577';
                    ctx.fillRect(sbx, sby, sw * sp, 5);
                }
                ctx.textAlign = 'left';
            },

            handleGeneration: function(currentY) {
                if (!this.active) return false;

                const diff = this._cfg.difficulty;

                walls.push({ x: 0, y: currentY, width: 50, height: 100, placed: true });
                walls.push({ x: canvas.width - 50, y: currentY, width: 50, height: 100, placed: true });

                const platChance = Math.max(0.3, 0.9 - diff * 0.06);
                if (Math.random() < platChance) {
                    const pw = 80 + rngInt(0, 60);
                    platforms.push({
                        x: rngInt(60, canvas.width - 60 - pw),
                        y: currentY + 25,
                        width: pw,
                        height: 18,
                        moving: diff > 6 && Math.random() < 0.3
                    });
                }

                return true;
            },

            _defeat: function() {
                this.active    = false;
                this.completed = true;

                game.score += this._cfg.scoreReward;
                showBonus(`🏆 ${this.name.toUpperCase()} DERROTADO! +${this._cfg.scoreReward}`);
                bootSpeak("CONSEGUIMOS! Que batalha épica!");
                boot.emotion = 'happy';
                boot.state   = 'following';

                pick(POOLS.defeatSounds)(this._cfg.scoreReward);
            }
        };

        return boss;
    }

    // ════════════════════════════════════════════════════════
    //  API PÚBLICA
    // ════════════════════════════════════════════════════════

    return {
        generate,
        POOLS,

        populateBossSchool(count = 5, startH = 2000, gap = 3500) {
            if (typeof BossSchool === 'undefined') {
                console.error('[BossFactory] BossSchool não encontrado!');
                return [];
            }
            const generated = [];
            for (let i = 0; i < count; i++) {
                const tier  = Math.min(10, 1 + Math.floor(i * 10 / count));
                const sH    = startH + i * gap;
                const boss  = generate({ heightTier: tier, startHeight: sH, endHeight: sH + 2000, debug: true });
                BossSchool.register(boss);
                generated.push(boss);
                console.log(`[BossFactory] Boss ${i+1}/${count}: "${boss.name}" registrado (h=${sH}~${sH+2000})`);
            }
            return generated;
        },

        generateCustom({ name, theme, movement, attacks, body, mechanic, hp, startHeight, endHeight, score }) {
            const boss = generate({ startHeight, endHeight });
            if (name)      boss.name = name;
            if (hp)        { boss.health = hp; boss.maxHealth = hp; }
            if (theme)     boss._cfg.theme = POOLS.colorThemes[theme] || boss._cfg.theme;
            if (movement)  {
                const m = POOLS.movementPatterns.find(p => p.id === movement);
                if (m) boss._movement = m;
            }
            if (attacks && attacks.length) {
                boss._attacks = attacks.map(id => POOLS.attackTypes.find(a => a.id === id)).filter(Boolean);
            }
            if (body) {
                const b = POOLS.bodyTypes.find(p => p.id === body);
                if (b) boss._bodyType = b;
            }
            if (mechanic) {
                const m2 = POOLS.specialMechanics.find(p => p.id === mechanic);
                if (m2) boss._mechanic = m2;
            }
            if (score) boss._cfg.scoreReward = score;
            return boss;
        },

        listTraits() {
            console.group('[BossFactory] POOLS disponíveis');
            console.log('Movimentos:',  POOLS.movementPatterns.map(p => p.id));
            console.log('Ataques:',     POOLS.attackTypes.map(p => p.id));
            console.log('Corpos:',      POOLS.bodyTypes.map(p => p.id));
            console.log('Mecânicas:',   POOLS.specialMechanics.map(p => p.id));
            console.log('Temas:',       Object.keys(POOLS.colorThemes));
            console.log('Cores Core:',  POOLS.coreShapes);
            console.groupEnd();
        }
    };
})();