// ===== js/3_biomes.js =====
// SISTEMA DE BIOMAS PROCEDURAIS — Geração, Física, Arte e UI

// ════════════════════════════════════════════════════════════════
// 1. DEFINIÇÃO DOS BIOMAS (Fixos por altitude, como o original)
// ════════════════════════════════════════════════════════════════

const BIOMES = {
    UNDERGROUND: { min: -Infinity, max:     0, name: "Subterrâneo",       color: "#8B4513" },
    GROUND:      { min:     0,     max:  2000, name: "Superfície",         color: "#4A90E2" },
    FOREST:      { min:  2000,     max:  4000, name: "Floresta Flutuante", color: "#00ff44" },
    CLOUDS:      { min:  4000,     max:  7000, name: "Reino das Nuvens",   color: "#B0E0E6" },
    TWILIGHT:    { min:  7000,     max: 10000, name: "Crepúsculo",         color: "#cc44ff" },
    SPACE:       { min: 10000,     max: 15000, name: "Espaço Sideral",     color: "#8866ff" },
    COSMIC:      { min: 15000,     max: Infinity, name: "Vazio Cósmico",   color: "#00ffcc" }
};

// ════════════════════════════════════════════════════════════════
// 2. HELPERS
// ════════════════════════════════════════════════════════════════

function _lerp(a, b, t) { return a + (b - a) * t; }
function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function _easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

// Hash determinístico — evita random() que varia a cada frame
function _hash(n, seed = 0) {
    let x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
}

function _hexToRgb(hex) {
    const b = parseInt(hex.replace('#',''), 16);
    return [(b >> 16) & 255, (b >> 8) & 255, b & 255];
}

function _lerpHex(h1, h2, t) {
    const [r1,g1,b1] = _hexToRgb(h1);
    const [r2,g2,b2] = _hexToRgb(h2);
    return `rgb(${Math.round(_lerp(r1,r2,t))},${Math.round(_lerp(g1,g2,t))},${Math.round(_lerp(b1,b2,t))})`;
}

// ════════════════════════════════════════════════════════════════
// 3. QUERY DE BIOMA (com blend de transição)
// ════════════════════════════════════════════════════════════════

const TRANSITION_ZONE = 400; // pixels de zona de blend entre biomas

function getCurrentBiome() {
    const altitude = (typeof game !== 'undefined' && game.camera) ? -game.camera.y : 0;
    const keys = Object.keys(BIOMES);

    let currentKey = 'GROUND';
    for (let i = 0; i < keys.length; i++) {
        const b = BIOMES[keys[i]];
        if (altitude >= b.min && altitude < b.max) {
            currentKey = keys[i];
            break;
        }
    }

    // Calcular blend com o próximo bioma (transição suave)
    const current = BIOMES[currentKey];
    const idx = keys.indexOf(currentKey);
    const nextKey = keys[idx + 1] || currentKey;
    const next = BIOMES[nextKey];

    // Quanto falta para o próximo bioma? Normaliza numa zona de transição
    const distToNext = current.max - altitude;
    const blend = (distToNext < TRANSITION_ZONE && nextKey !== currentKey)
        ? _easeInOut(1 - _clamp(distToNext / TRANSITION_ZONE, 0, 1))
        : 0;

    return {
        key: currentKey,
        nextKey,
        blend,        // 0 = só current, 1 = só next
        altitude,
        name: blend > 0.5 ? next.name : current.name,
        color: blend > 0.5 ? next.color : current.color,
        ...current
    };
}

// ════════════════════════════════════════════════════════════════
// 4. FÍSICA (preservada e expandida)
// ════════════════════════════════════════════════════════════════

function getBiomePhysics(biomeOrKey) {
    const key = (typeof biomeOrKey === 'string') ? biomeOrKey
              : (biomeOrKey && biomeOrKey.key) ? biomeOrKey.key
              : getCurrentBiome().key;

    const PHYSICS = {
        UNDERGROUND: { gravityMod: 1.15, friction: 0,    accel: 0   },
        GROUND:      { gravityMod: 1.0,  friction: 0,    accel: 0   },
        FOREST:      { gravityMod: 0.9,  friction: 0.01, accel: 0   },
        CLOUDS:      { gravityMod: 0.75, friction: 0.97, accel: 0.3 },
        TWILIGHT:    { gravityMod: 0.6,  friction: 0.02, accel: 0   },
        SPACE:       { gravityMod: 0.35, friction: 0.98, accel: 0.5 },
        COSMIC:      { gravityMod: 0.15, friction: 0.99, accel: 0.6 },
    };

    // Blend com o próximo bioma se estivermos em transição
    const biome = (typeof biomeOrKey === 'object' && biomeOrKey.blend > 0) ? biomeOrKey : null;
    const p1 = PHYSICS[key] || PHYSICS.GROUND;

    if (biome && biome.blend > 0) {
        const p2 = PHYSICS[biome.nextKey] || p1;
        const t = biome.blend;
        return {
            gravityMod: _lerp(p1.gravityMod, p2.gravityMod, t),
            friction:   _lerp(p1.friction,   p2.friction,   t),
            accel:      _lerp(p1.accel,      p2.accel,      t),
        };
    }

    return { ...p1 };
}

// ════════════════════════════════════════════════════════════════
// 5. RENDERIZAÇÃO — cada bioma tem seu próprio renderer rico
// ════════════════════════════════════════════════════════════════

const BiomeRenderers = {

    UNDERGROUND(ctx, W, H, alt, t) {
        // Fundo: pedra escura com veias de lava
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#1a0a04');
        g.addColorStop(1, '#0d0502');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Camada de rocha — linhas horizontais orgânicas
        for (let i = 0; i < 8; i++) {
            const y = ((i * 157 + alt * 0.3) % (H + 100)) - 50;
            const alpha = 0.06 + _hash(i, 5) * 0.08;
            ctx.strokeStyle = `rgba(80,40,20,${alpha})`;
            ctx.lineWidth = 20 + _hash(i, 2) * 60;
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x <= W; x += 40) {
                ctx.lineTo(x, y + Math.sin(x * 0.02 + _hash(i,1)*10) * 15);
            }
            ctx.stroke();
        }

        // Veias de lava brilhante
        for (let i = 0; i < 4; i++) {
            const x = _hash(i, 10) * W;
            const progress = ((alt * 0.5 + i * 300) % H);
            const pulse = 0.4 + Math.sin(Date.now() / 800 + i * 2) * 0.3;
            const gv = ctx.createRadialGradient(x, progress, 0, x, progress, 30);
            gv.addColorStop(0, `rgba(255,80,0,${pulse})`);
            gv.addColorStop(0.5, `rgba(200,30,0,${pulse*0.4})`);
            gv.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gv;
            ctx.fillRect(0, 0, W, H);
        }

        // Partículas de faísca subindo
        ctx.fillStyle = '#ff6600';
        for (let i = 0; i < 15; i++) {
            const px = _hash(i, 20) * W;
            const py = H - ((alt * (0.5 + _hash(i,3)*0.5) + i * 80) % (H + 50));
            const size = 1 + _hash(i, 4) * 2;
            const alpha = 0.3 + _hash(i, 6) * 0.5;
            ctx.globalAlpha = alpha;
            ctx.fillRect(px, py, size, size);
        }
        ctx.globalAlpha = 1;
    },

    GROUND(ctx, W, H, alt, t) {
        // Céu azul gradiente — hora do dia
        const timeOfDay = (alt * 0.0001) % 1;
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#3a7bd5');
        g.addColorStop(0.6, '#6eb5ff');
        g.addColorStop(1, '#c9e8ff');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Sol
        const sunX = W * 0.8;
        const sunY = 80;
        const sunG = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
        sunG.addColorStop(0, 'rgba(255,240,100,1)');
        sunG.addColorStop(0.3, 'rgba(255,200,50,0.8)');
        sunG.addColorStop(1, 'rgba(255,180,0,0)');
        ctx.fillStyle = sunG;
        ctx.fillRect(0, 0, W, H);

        // Nuvens parallax em 3 camadas
        for (let layer = 0; layer < 3; layer++) {
            const speed = 0.05 + layer * 0.12;
            const size = 60 - layer * 15;
            const alpha = 0.5 + layer * 0.15;
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            for (let i = 0; i < 4 + layer; i++) {
                const cx = ((_hash(i, layer) * W * 1.5) - alt * speed * 0.5) % (W + 200);
                const cy = _hash(i, layer + 10) * H * 0.5;
                _drawCloud(ctx, cx, cy, size + _hash(i, layer+5) * 30);
            }
        }

        // Pássaros no horizonte
        const birdY = H * 0.35;
        ctx.strokeStyle = 'rgba(30,30,80,0.5)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
            const bx = ((_hash(i, 99) * W) - alt * 0.08) % W;
            const wave = Math.sin(Date.now() / 400 + i) * 3;
            ctx.beginPath();
            ctx.moveTo(bx - 6, birdY + wave);
            ctx.quadraticCurveTo(bx, birdY + wave - 4, bx + 6, birdY + wave);
            ctx.stroke();
        }
    },

    FOREST(ctx, W, H, alt, t) {
        // Fundo: verde escuro profundo
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0a1f0a');
        g.addColorStop(1, '#051005');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Raios de luz filtrados — parallax lento
        ctx.save();
        for (let i = 0; i < 6; i++) {
            const lx = _hash(i, 30) * W;
            const angle = -0.3 + _hash(i, 31) * 0.6;
            const alpha = 0.03 + _hash(i, 32) * 0.06;
            ctx.fillStyle = `rgba(180,255,100,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(lx, 0);
            ctx.lineTo(lx + Math.tan(angle) * H + 30, H);
            ctx.lineTo(lx + Math.tan(angle) * H - 30, H);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // Folhas flutuando — 3 camadas de profundidade
        for (let layer = 0; layer < 3; layer++) {
            const speed = 0.2 + layer * 0.4;
            const count = 12 + layer * 8;
            for (let i = 0; i < count; i++) {
                const px = _hash(i, layer) * W;
                const base = _hash(i, layer + 1) * H;
                const py = (base + alt * speed + i * 37) % (H + 20) - 10;
                const size = 4 - layer * 0.8;
                const hue = 90 + _hash(i, layer + 2) * 60;
                const alpha = 0.4 - layer * 0.1;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = `hsl(${hue},80%,40%)`;
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(_hash(i, layer + 3) * Math.PI * 2 + alt * 0.001);
                ctx.beginPath();
                ctx.ellipse(0, 0, size, size * 1.8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1;

        // Vaga-lumes piscando
        for (let i = 0; i < 12; i++) {
            const fx = _hash(i, 50) * W;
            const fy = _hash(i, 51) * H;
            const pulse = Math.sin(Date.now() / (600 + _hash(i,52)*400) + i * 2.1) * 0.5 + 0.5;
            if (pulse > 0.6) {
                const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 8);
                fg.addColorStop(0, `rgba(200,255,100,${pulse * 0.8})`);
                fg.addColorStop(1, 'rgba(100,200,50,0)');
                ctx.fillStyle = fg;
                ctx.fillRect(fx - 8, fy - 8, 16, 16);
            }
        }
    },

    CLOUDS(ctx, W, H, alt, t) {
        // Fundo azul-claro nebuloso
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#6ab4e8');
        g.addColorStop(0.5, '#a8d8f0');
        g.addColorStop(1, '#d0ecf8');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Névoa de fundo
        const fogG = ctx.createLinearGradient(0, 0, 0, H);
        fogG.addColorStop(0, 'rgba(255,255,255,0)');
        fogG.addColorStop(1, 'rgba(255,255,255,0.3)');
        ctx.fillStyle = fogG;
        ctx.fillRect(0, 0, W, H);

        // Nuvens em 4 camadas (parallax real)
        const layers = [
            { count: 3, speed: 0.05, size: 120, alpha: 0.3, yRange: 0.3 },
            { count: 5, speed: 0.15, size: 90,  alpha: 0.5, yRange: 0.5 },
            { count: 7, speed: 0.30, size: 65,  alpha: 0.7, yRange: 0.7 },
            { count: 4, speed: 0.50, size: 40,  alpha: 0.9, yRange: 0.9 },
        ];

        layers.forEach((layer, li) => {
            ctx.fillStyle = `rgba(255,255,255,${layer.alpha})`;
            for (let i = 0; i < layer.count; i++) {
                const cx = ((_hash(i, li) * (W + 300)) - alt * layer.speed) % (W + 400) - 200;
                const cy = _hash(i, li + 10) * H * layer.yRange;
                const s = layer.size + _hash(i, li + 5) * 40;
                _drawCloud(ctx, cx, cy, s);
            }
        });

        // Relâmpagos esporádicos (determinístico)
        const lightningPhase = Math.floor(alt / 800);
        if (_hash(lightningPhase, 77) > 0.7) {
            const lx = _hash(lightningPhase, 78) * W;
            const segments = 6;
            ctx.strokeStyle = `rgba(200,230,255,0.8)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(lx, 0);
            let cy2 = 0;
            for (let s = 0; s < segments; s++) {
                cy2 += H / segments;
                const cx2 = lx + (_hash(lightningPhase + s, 79) - 0.5) * 60;
                ctx.lineTo(cx2, cy2);
            }
            ctx.stroke();
        }
    },

    TWILIGHT(ctx, W, H, alt, t) {
        // Gradiente dramático pôr do sol + roxo
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0,   '#0d001a');
        g.addColorStop(0.3, '#3d0066');
        g.addColorStop(0.6, '#8B0066');
        g.addColorStop(0.85,'#ff4400');
        g.addColorStop(1,   '#ff9900');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Aurora Boreal — ondas de luz
        for (let i = 0; i < 4; i++) {
            const phase = Date.now() / 2000 + i * 1.5;
            const gy = H * 0.2 + i * 30;
            ctx.save();
            ctx.globalAlpha = 0.15 + Math.sin(phase) * 0.08;
            const ag = ctx.createLinearGradient(0, gy - 60, 0, gy + 60);
            ag.addColorStop(0, 'transparent');
            ag.addColorStop(0.5, `hsl(${140 + i*40},100%,60%)`);
            ag.addColorStop(1, 'transparent');
            ctx.fillStyle = ag;
            ctx.beginPath();
            ctx.moveTo(0, gy);
            for (let x = 0; x <= W; x += 8) {
                ctx.lineTo(x, gy + Math.sin(x * 0.015 + phase + i) * 25);
            }
            ctx.lineTo(W, gy - 60);
            ctx.lineTo(0, gy - 60);
            ctx.fill();
            ctx.restore();
        }

        // Estrelas — 3 camadas de profundidade
        for (let layer = 0; layer < 3; layer++) {
            const count = 30 + layer * 20;
            for (let i = 0; i < count; i++) {
                const sx = _hash(i, layer) * W;
                const sy = _hash(i, layer + 50) * H * 0.7;
                const twinkle = Math.sin(Date.now() / (300 + _hash(i,layer+2)*500) + i) * 0.5 + 0.5;
                const sz = 0.5 + _hash(i, layer + 1) * (2 - layer * 0.5);
                ctx.globalAlpha = twinkle * (0.4 + layer * 0.2);
                ctx.fillStyle = layer === 0 ? '#ffddaa' : layer === 1 ? '#ffffff' : '#aaccff';
                ctx.fillRect(sx - sz/2, sy - sz/2, sz, sz);
            }
        }
        ctx.globalAlpha = 1;

        // Silhueta de montanhas no horizonte
        ctx.fillStyle = 'rgba(10,0,20,0.7)';
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 20) {
            const h = 50 + Math.sin(x * 0.008 + alt * 0.0003) * 30
                       + Math.sin(x * 0.02 + 5) * 15;
            ctx.lineTo(x, H - h);
        }
        ctx.lineTo(W, H);
        ctx.fill();
    },

    SPACE(ctx, W, H, alt, t) {
        // Fundo: preto profundo com gradiente roxo-azul
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#02000f');
        g.addColorStop(0.5, '#050018');
        g.addColorStop(1, '#010010');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Nebulosas em background — grandes e suaves
        const nebulae = [
            { x: W*0.2, y: H*0.3, r: 220, c: '80,0,180' },
            { x: W*0.7, y: H*0.6, r: 180, c: '0,60,180' },
            { x: W*0.5, y: H*0.1, r: 150, c: '140,0,100' },
        ];
        nebulae.forEach(n => {
            const nx = (n.x - alt * 0.01) % (W + 400);
            const ng = ctx.createRadialGradient(nx, n.y, 0, nx, n.y, n.r);
            ng.addColorStop(0, `rgba(${n.c},0.2)`);
            ng.addColorStop(0.5, `rgba(${n.c},0.08)`);
            ng.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = ng;
            ctx.fillRect(0, 0, W, H);
        });

        // Estrelas em 4 camadas (diferentes velocidades = parallax 3D)
        const starLayers = [
            { count: 80,  speed: 0.02, size: 0.5, alpha: 0.4 },
            { count: 50,  speed: 0.06, size: 1.0, alpha: 0.6 },
            { count: 25,  speed: 0.12, size: 1.5, alpha: 0.8 },
            { count: 10,  speed: 0.25, size: 2.5, alpha: 1.0 },
        ];
        starLayers.forEach((sl, li) => {
            for (let i = 0; i < sl.count; i++) {
                const sx = _hash(i, li * 100) * W;
                const sy = (_hash(i, li * 100 + 1) * H + alt * sl.speed) % H;
                const twinkle = Math.sin(Date.now() / 1000 + i * 0.7) * 0.3 + 0.7;
                ctx.globalAlpha = sl.alpha * twinkle;

                // Estrelas brilhantes têm um glow
                if (sl.size > 1.5) {
                    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sl.size * 4);
                    sg.addColorStop(0, 'rgba(200,220,255,0.8)');
                    sg.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = sg;
                    ctx.fillRect(sx - sl.size*4, sy - sl.size*4, sl.size*8, sl.size*8);
                }

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(sx - sl.size/2, sy - sl.size/2, sl.size, sl.size);
            }
        });
        ctx.globalAlpha = 1;

        // Planeta ao fundo — parallax suave
        const planetX = (W * 0.75 - alt * 0.03) % (W + 300);
        const planetR = 80;
        const pg = ctx.createRadialGradient(planetX - 20, H*0.2 - 20, 5, planetX, H*0.2, planetR);
        pg.addColorStop(0, '#6633aa');
        pg.addColorStop(0.6, '#331166');
        pg.addColorStop(1, '#110033');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(planetX, H * 0.2, planetR, 0, Math.PI * 2);
        ctx.fill();

        // Anel do planeta
        ctx.save();
        ctx.translate(planetX, H * 0.2);
        ctx.scale(1, 0.3);
        ctx.strokeStyle = 'rgba(180,120,255,0.4)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, planetR + 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Meteoros ocasionais
        const mPhase = Math.floor(alt / 300);
        if (_hash(mPhase, 60) > 0.6) {
            const mx1 = _hash(mPhase, 61) * W;
            const my1 = _hash(mPhase, 62) * H * 0.5;
            const mLen = 40 + _hash(mPhase, 63) * 60;
            const mg = ctx.createLinearGradient(mx1, my1, mx1 + mLen, my1 + mLen * 0.5);
            mg.addColorStop(0, 'rgba(255,255,255,0.9)');
            mg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = mg;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(mx1, my1);
            ctx.lineTo(mx1 + mLen, my1 + mLen * 0.5);
            ctx.stroke();
        }
    },

    COSMIC(ctx, W, H, alt, t) {
        // Void puro — quase preto com tons de ciano profundo
        ctx.fillStyle = '#000005';
        ctx.fillRect(0, 0, W, H);

        // Ondas gravitacionais — pulsos radiais
        const now = Date.now() / 1000;
        for (let i = 0; i < 4; i++) {
            const wx = W * (0.3 + _hash(i, 88) * 0.4);
            const wy = H * (0.3 + _hash(i, 89) * 0.4);
            const phase = now * 0.3 + i * 1.5;
            const r = (phase % 3) * H * 0.4;
            const alpha = Math.max(0, 0.12 - (phase % 3) * 0.04);
            const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, r);
            wg.addColorStop(0, 'rgba(0,0,0,0)');
            wg.addColorStop(0.9, `rgba(0,255,200,${alpha})`);
            wg.addColorStop(1, 'rgba(0,255,200,0)');
            ctx.fillStyle = wg;
            ctx.fillRect(0, 0, W, H);
        }

        // Estrelas distorcidas — campo estelar denso e irregular
        for (let i = 0; i < 200; i++) {
            const sx = _hash(i, 200) * W;
            const sy = (_hash(i, 201) * H + alt * (_hash(i, 202) * 0.3)) % H;
            const pulse = Math.sin(now * (_hash(i, 203) * 2 + 0.5) + i) * 0.5 + 0.5;
            const sz = _hash(i, 204) * 2;
            const hue = 160 + _hash(i, 205) * 60;
            ctx.globalAlpha = pulse * 0.8;
            ctx.fillStyle = `hsl(${hue},100%,80%)`;
            ctx.fillRect(sx, sy, sz, sz);
        }
        ctx.globalAlpha = 1;

        // Fractais de energia — linhas que se bifurcam
        ctx.save();
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 3; i++) {
            _drawEnergyLine(ctx, W * _hash(i, 300), 0, 0, H * 0.7, 4, now + i * 2, i);
        }
        ctx.restore();

        // Buraco negro central
        const bhX = W * 0.5;
        const bhY = H * 0.45;
        const bhR = 40;
        const accretionR = bhR * 2.5;
        const bhG = ctx.createRadialGradient(bhX, bhY, bhR * 0.3, bhX, bhY, accretionR);
        bhG.addColorStop(0, 'rgba(0,0,0,1)');
        bhG.addColorStop(0.5, 'rgba(0,0,0,0.95)');
        bhG.addColorStop(0.8, 'rgba(0,180,150,0.3)');
        bhG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bhG;
        ctx.beginPath();
        ctx.arc(bhX, bhY, accretionR, 0, Math.PI * 2);
        ctx.fill();

        // Disco de acreção
        ctx.save();
        ctx.translate(bhX, bhY);
        ctx.scale(1, 0.25);
        const discG = ctx.createRadialGradient(0, 0, bhR, 0, 0, accretionR);
        discG.addColorStop(0, 'rgba(0,255,200,0.6)');
        discG.addColorStop(0.5, 'rgba(0,200,255,0.3)');
        discG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = discG;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(0, 0, accretionR * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
};

// ════════════════════════════════════════════════════════════════
// 6. HELPERS DE RENDERIZAÇÃO
// ════════════════════════════════════════════════════════════════

function _drawCloud(ctx, cx, cy, size) {
    ctx.beginPath();
    ctx.arc(cx,          cy,          size * 0.5,  0, Math.PI * 2);
    ctx.arc(cx + size,   cy,          size * 0.5,  0, Math.PI * 2);
    ctx.arc(cx + size*2, cy,          size * 0.5,  0, Math.PI * 2);
    ctx.arc(cx + size*0.5, cy - size*0.35, size*0.6, 0, Math.PI * 2);
    ctx.arc(cx + size*1.5, cy - size*0.4,  size*0.7, 0, Math.PI * 2);
    ctx.fill();
}

function _drawEnergyLine(ctx, x, y, angle, length, depth, time, seed) {
    if (depth <= 0 || length < 5) return;
    const ex = x + Math.cos(angle) * length;
    const ey = y + Math.sin(angle) * length;
    const hue = 160 + seed * 30;
    ctx.strokeStyle = `hsl(${hue},100%,70%)`;
    ctx.lineWidth = depth * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    const spread = 0.4 + Math.sin(time) * 0.2;
    _drawEnergyLine(ctx, ex, ey, angle - spread, length * 0.65, depth - 1, time, seed);
    _drawEnergyLine(ctx, ex, ey, angle + spread, length * 0.65, depth - 1, time, seed + 1);
}

// ════════════════════════════════════════════════════════════════
// 7. RENDERER PRINCIPAL (com blend de transição)
// ════════════════════════════════════════════════════════════════

function drawBiomeBackground(ctx, biome, altitude) {
    if (!ctx || !biome) return;

    const W = canvas.width;
    const H = canvas.height;
    const alt = isNaN(altitude) ? 0 : altitude;

    const renderer = BiomeRenderers[biome.key];
    if (!renderer) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        return;
    }

    // Renderiza bioma atual
    renderer(ctx, W, H, alt, 0);

    // Blend suave com o próximo bioma na zona de transição
    if (biome.blend > 0 && biome.nextKey && BiomeRenderers[biome.nextKey]) {
        // Salva o frame atual em offscreen canvas para blend
        const offscreen = document.createElement('canvas');
        offscreen.width = W;
        offscreen.height = H;
        const octx = offscreen.getContext('2d');
        BiomeRenderers[biome.nextKey](octx, W, H, alt, biome.blend);

        ctx.globalAlpha = biome.blend;
        ctx.drawImage(offscreen, 0, 0);
        ctx.globalAlpha = 1;
    }
}

// ════════════════════════════════════════════════════════════════
// 8. UI (preservada, com cor dinâmica)
// ════════════════════════════════════════════════════════════════

function updateBiomeUI() {
    const biome = getCurrentBiome();
    const el = document.getElementById('biome');
    if (!el) return;

    const phys = getBiomePhysics(biome);
    let suffix = "";
    if (phys.gravityMod < 0.5)      suffix = " <small>(Gravidade Baixa 🌑)</small>";
    else if (phys.accel > 0)        suffix = " <small>(Piso Escorregadio ❄️)</small>";
    else if (phys.gravityMod > 1.1) suffix = " <small>(Gravidade Alta 🌋)</small>";

    el.innerHTML = biome.name + suffix;
    el.style.color = biome.color;
}
