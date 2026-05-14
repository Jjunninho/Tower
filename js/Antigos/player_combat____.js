// js/player_combat.js
// ══════════════════════════════════════════════════════════════
//  SISTEMA DE COMBATE DO PLAYER — Torre Infinita
//
//  NOVOS CONTROLES:
//    Z  (ou W)  — Tiro básico (direção: para onde o player está olhando)
//    X          — Tiro carregado (mantém pressionado ~1s → dispara)
//    Stomp      — Pulo na cabeça do boss (existia, agora com combo e visual)
//
//  INTEGRAÇÕES:
//    PlayerCombat.update()   → chamar dentro do update() do 6_main.js
//    PlayerCombat.draw(ctx)  → chamar dentro do draw() do 6_main.js
//    PlayerCombat.init()     → chamar no initLevel() do 4_mechanics.js
// ══════════════════════════════════════════════════════════════

const PlayerCombat = (() => {

    // ── Estado interno ────────────────────────────────────────
    const state = {
        bullets:        [],       // projéteis ativos do player
        facing:         1,        // 1 = direita, -1 = esquerda
        shootCooldown:  0,        // frames até poder atirar de novo
        chargeTimer:    0,        // frames que X está pressionado
        chargeReady:    false,    // tiro carregado pronto?
        stomps:         0,        // stomps consecutivos neste boss
        stompComboTimer:0,        // timer para resetar combo
        lastStompTime:  0,        // timestamp do último stomp
        tutorialShown:  false,    // não mostra tutorial duas vezes
        particles:      [],       // partículas de impacto
    };

    // ── Config ────────────────────────────────────────────────
    const CFG = {
        // Tiro básico
        bulletSpeed:    10,
        bulletDamage:   8,
        shootCooldown:  18,       // frames (~0.3s a 60fps)
        bulletLife:     55,       // frames de vida do projétil

        // Tiro carregado
        chargeMax:      65,       // frames para carregar (~1.1s)
        chargeDamage:   30,
        chargeSpeed:    14,
        chargeBulletLife: 70,

        // Stomp
        stompDamage:    12,
        stompComboWindow: 120,    // frames para encadear stomps
        stompComboBonus: [1, 1.5, 2, 3],  // multiplicador por stomp consecutivo

        // Visual
        bulletColor:    '#00ff88',
        chargeColor:    '#ffdd00',
        chargeMaxColor: '#ff4400',
    };

    // ── Funções internas ──────────────────────────────────────

    function spawnBullet(charged) {
        const cx  = player.x + player.width  / 2;
        const cy  = player.y + player.height / 2;
        const spd = charged ? CFG.chargeSpeed : CFG.bulletSpeed;

        state.bullets.push({
            x:       cx,
            y:       cy,
            vx:      state.facing * spd,
            vy:      -1.5,          // leve arco para cima (feel de projétil)
            life:    charged ? CFG.chargeBulletLife : CFG.bulletLife,
            dmg:     charged ? CFG.chargeDamage    : CFG.bulletDamage,
            charged: charged,
            size:    charged ? 9 : 5,
        });

        // Som
        if (charged) {
            audioSys.playTone(600, 'sine',    0.08, 0.12, -200);
            audioSys.playTone(900, 'square',  0.04, 0.08);
        } else {
            audioSys.playTone(500, 'square', 0.06, 0.07, 100);
        }
    }

    function spawnImpactParticles(x, y, charged) {
        const count = charged ? 8 : 4;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const spd   = 1.5 + Math.random() * (charged ? 4 : 2.5);
            state.particles.push({
                x, y,
                vx:    Math.cos(angle) * spd,
                vy:    Math.sin(angle) * spd,
                life:  18 + Math.floor(Math.random() * 12),
                maxLife: 30,
                color: charged ? CFG.chargeColor : CFG.bulletColor,
                size:  charged ? 4 : 2.5,
            });
        }
    }

    function spawnStompParticles(x, y, multiplier) {
        const count = 6 + Math.floor(multiplier * 3);
        for (let i = 0; i < count; i++) {
            const angle = Math.PI + (Math.random() - 0.5) * Math.PI; // arco para baixo
            const spd   = 2 + Math.random() * 4;
            state.particles.push({
                x, y,
                vx:    Math.cos(angle) * spd,
                vy:    Math.sin(angle) * spd,
                life:  22 + Math.floor(Math.random() * 10),
                maxLife: 32,
                color: multiplier >= 3 ? '#ff4400' : multiplier >= 2 ? '#ffaa00' : '#ff6688',
                size:  3,
            });
        }
    }

    function showDamageNumber(x, y, dmg, charged) {
        // Usa o showBonus apenas para combos; para dano normal usa elemento flutuante próprio
        const el = document.createElement('div');
        el.textContent = `-${dmg}`;
        Object.assign(el.style, {
            position:   'fixed',
            left:       `${x}px`,
            top:        `${y - game.camera.y - 40}px`,
            color:      charged ? '#ffdd00' : '#00ff88',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize:   charged ? '22px' : '16px',
            pointerEvents: 'none',
            zIndex:     '500',
            textShadow: '0 0 6px #000',
            transition: 'transform 0.8s ease-out, opacity 0.8s ease-out',
        });
        document.body.appendChild(el);
        requestAnimationFrame(() => {
            el.style.transform = 'translateY(-40px)';
            el.style.opacity   = '0';
        });
        setTimeout(() => el.remove(), 850);
    }

    function tryDamageBoss(bullet) {
        if (typeof BossSchool === 'undefined') return false;
        const boss = BossSchool.currentBoss;
        if (!boss || !boss.active) return false;

        const bx = boss.x ?? (boss.boss && boss.boss.x);
        const by = boss.y ?? (boss.boss && boss.boss.y);
        const br = (boss._cfg?.headRadius) ?? (boss.boss?.headRadius) ?? 40;

        if (bx === undefined) return false;

        const dist = Math.hypot(bullet.x - bx, bullet.y - by);
        if (dist > br + 18) return false;

        // Acertou!
        const dmg = bullet.dmg;

        // Escudo intercepta
        let finalDmg = dmg;
        if (boss._mechanic?.id === 'shield' && boss._mechanic.interceptDamage) {
            finalDmg = boss._mechanic.interceptDamage(boss, dmg);
        } else if (boss.boss) {
            // boss01 (formato legado)
            boss.boss.health -= dmg;
            boss.boss.isHit   = true;
            boss.boss.hitFlashTimer = 5;
        } else {
            boss.health -= finalDmg;
        }

        if (boss._hitFlash !== undefined) boss._hitFlash = 6;

        spawnImpactParticles(bullet.x, bullet.y, bullet.charged);
        showDamageNumber(bx, by, dmg, bullet.charged);

        if (bullet.charged) {
            audioSys.playTone(200, 'sawtooth', 0.15, 0.12);
        } else {
            audioSys.playTone(350, 'square', 0.05, 0.06);
        }

        return true;
    }

    function tryStompBoss() {
        if (typeof BossSchool === 'undefined') return false;
        const boss = BossSchool.currentBoss;
        if (!boss || !boss.active) return false;
        if (player.vy <= 2) return false;   // só caindo

        const bx = boss.x ?? (boss.boss && boss.boss.x);
        const by = boss.y ?? (boss.boss && boss.boss.y);
        const br = (boss._cfg?.headRadius) ?? (boss.boss?.headRadius) ?? 40;
        if (bx === undefined) return false;

        const px = player.x + player.width  / 2;
        const py = player.y + player.height;

        // Hitbox generosa de stomp (mais fácil de acertar)
        if (Math.abs(px - bx) > br + 22) return false;
        if (py < by - br - 10 || py > by + br * 0.6) return false;

        // Calcula multiplicador de combo
        const now    = Date.now();
        const inWindow = (now - state.lastStompTime) < (CFG.stompComboWindow * 16);
        if (inWindow) {
            state.stomps = Math.min(state.stomps + 1, 3);
        } else {
            state.stomps = 0;
        }
        state.lastStompTime  = now;
        state.stompComboTimer = CFG.stompComboWindow;

        const mult   = CFG.stompComboBonus[state.stomps];
        const dmg    = Math.round(CFG.stompDamage * mult);

        // Aplica dano
        if (boss._mechanic?.id === 'shield' && boss._mechanic.interceptDamage) {
            boss._mechanic.interceptDamage(boss, dmg);
        } else if (boss.boss) {
            boss.boss.health -= dmg;
            boss.boss.isHit   = true;
            boss.boss.hitFlashTimer = 8;
        } else {
            boss.health -= dmg;
            if (boss._hitFlash !== undefined) boss._hitFlash = 8;
        }

        // Quica o player
        player.vy           = -14;
        player.jumpsLeft    = player.maxJumps;

        spawnStompParticles(px, by - br, mult);
        showDamageNumber(bx, by - br - 20, dmg, mult >= 2);

        // Feedback por combo
        if (state.stomps === 1) {
            showBonus('💥 DUPLO STOMP! x1.5');
            audioSys.playTone(400, 'square', 0.15);
        } else if (state.stomps === 2) {
            showBonus('💥💥 TRIPLO STOMP! x2');
            audioSys.playTone(500, 'square', 0.2);
        } else if (state.stomps >= 3) {
            showBonus('🔥 ULTRA STOMP! x3');
            bootSpeak('ULTRA STOMP! Sensacional!');
            audioSys.playTone(600, 'sawtooth', 0.25);
            setTimeout(() => audioSys.playTone(800, 'sawtooth', 0.2), 100);
        } else {
            audioSys.playTone(300, 'square', 0.12);
        }

        return true;
    }

    function showTutorial() {
        if (state.tutorialShown) return;
        state.tutorialShown = true;

        setTimeout(() => bootSpeak('Use Z para atirar no boss!'), 800);
        setTimeout(() => bootSpeak('Segure X para um tiro carregado!'), 4000);
        setTimeout(() => bootSpeak('E pule na cabeça dele para o STOMP!'), 7500);
    }

    // ── API PÚBLICA ───────────────────────────────────────────
    return {

        init() {
            state.bullets        = [];
            state.particles      = [];
            state.shootCooldown  = 0;
            state.chargeTimer    = 0;
            state.chargeReady    = false;
            state.stomps         = 0;
            state.stompComboTimer= 0;
            state.facing         = 1;
        },

        update() {
            if (game.gameOver) return;

            // ── Direção que o player está olhando ─────────────
            if (player.vx > 0.5)  state.facing =  1;
            if (player.vx < -0.5) state.facing = -1;

            // ── Timers ────────────────────────────────────────
            if (state.shootCooldown  > 0) state.shootCooldown--;
            if (state.stompComboTimer > 0) {
                state.stompComboTimer--;
                if (state.stompComboTimer <= 0) state.stomps = 0;
            }

            // ── Z / W — Tiro básico ───────────────────────────
            const shootKey = game.keys['z'] || game.keys['Z'] ||
                             game.keys['w'] || game.keys['W'];

            if (shootKey && state.shootCooldown <= 0) {
                spawnBullet(false);
                state.shootCooldown = CFG.shootCooldown;
            }

            // ── X — Tiro carregado ────────────────────────────
            const chargeKey = game.keys['x'] || game.keys['X'];

            if (chargeKey) {
                state.chargeTimer++;
                state.chargeReady = state.chargeTimer >= CFG.chargeMax;
            } else {
                // Soltou X
                if (state.chargeReady && state.shootCooldown <= 0) {
                    spawnBullet(true);
                    state.shootCooldown = CFG.shootCooldown * 2;
                }
                state.chargeTimer = 0;
                state.chargeReady = false;
            }

            // ── Stomp automático (detecta colisão com boss) ───
            tryStompBoss();

            // ── Atualiza projéteis ─────────────────────────────
            for (let i = state.bullets.length - 1; i >= 0; i--) {
                const b = state.bullets[i];
                b.x   += b.vx;
                b.y   += b.vy;
                b.life--;

                // Verifica colisão com boss
                const hit = tryDamageBoss(b);

                if (hit || b.life <= 0 ||
                    b.x < 0 || b.x > canvas.width ||
                    b.y < game.camera.y - 100 ||
                    b.y > game.camera.y + canvas.height + 100) {
                    state.bullets.splice(i, 1);
                }
            }

            // ── Atualiza partículas ────────────────────────────
            for (let i = state.particles.length - 1; i >= 0; i--) {
                const p = state.particles[i];
                p.x    += p.vx;
                p.y    += p.vy;
                p.vy   += 0.18;     // gravidade leve
                p.life--;
                if (p.life <= 0) state.particles.splice(i, 1);
            }

            // ── Tutorial na primeira batalha de boss ──────────
            if (BossSchool?.currentBoss?.active && !state.tutorialShown) {
                showTutorial();
            }
        },

        draw(ctx) {
            if (game.gameOver) return;

            ctx.save();
            ctx.translate(0, -game.camera.y);

            // ── Partículas ────────────────────────────────────
            state.particles.forEach(p => {
                const alpha = p.life / p.maxLife;
                ctx.globalAlpha = alpha;
                ctx.fillStyle   = p.color;
                ctx.shadowBlur  = 6;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.shadowBlur  = 0;
            ctx.globalAlpha = 1;

            // ── Projéteis ─────────────────────────────────────
            state.bullets.forEach(b => {
                const color = b.charged ? CFG.chargeColor : CFG.bulletColor;

                ctx.shadowBlur  = b.charged ? 16 : 8;
                ctx.shadowColor = color;

                // Núcleo
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size * 0.45, 0, Math.PI * 2);
                ctx.fill();

                // Brilho externo
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;

                // Rastro (apenas no tiro carregado)
                if (b.charged) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth   = 3;
                    ctx.globalAlpha = 0.35;
                    ctx.beginPath();
                    ctx.moveTo(b.x, b.y);
                    ctx.lineTo(b.x - b.vx * 5, b.y - b.vy * 5);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            });
            ctx.shadowBlur = 0;

            ctx.restore();

            // ── Indicador de carga (HUD — sem translate de câmera) ──
            if (state.chargeTimer > 0) {
                const px       = player.x + player.width  / 2 - game.camera.y * 0;
                // converter coordenada de mundo para tela
                const screenY  = player.y - game.camera.y - 18;
                const screenX  = player.x + player.width  / 2;

                const progress = Math.min(state.chargeTimer / CFG.chargeMax, 1);
                const barW     = 34;
                const barH     = 5;

                // Fundo
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(screenX - barW/2 - 1, screenY - 1, barW + 2, barH + 2);

                // Barra de progresso
                const chargeColor = state.chargeReady ? CFG.chargeMaxColor : CFG.chargeColor;
                ctx.fillStyle = chargeColor;
                if (state.chargeReady) {
                    // Pisca quando pronto
                    ctx.globalAlpha = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
                }
                ctx.fillRect(screenX - barW/2, screenY, barW * progress, barH);
                ctx.globalAlpha = 1;

                // Ícone ⚡ quando carregado
                if (state.chargeReady) {
                    ctx.fillStyle   = '#ffdd00';
                    ctx.font        = 'bold 11px monospace';
                    ctx.textAlign   = 'center';
                    ctx.shadowBlur  = 6;
                    ctx.shadowColor = '#ffaa00';
                    ctx.fillText('⚡', screenX, screenY - 4);
                    ctx.shadowBlur  = 0;
                    ctx.textAlign   = 'left';
                }
            }

            // ── Indicador de combo de stomp ───────────────────
            if (state.stomps > 0 && state.stompComboTimer > 0) {
                const screenX = player.x + player.width  / 2;
                const screenY = player.y - game.camera.y - 30;
                const alpha   = Math.min(1, state.stompComboTimer / 40);

                ctx.globalAlpha = alpha;
                ctx.fillStyle   = state.stomps >= 3 ? '#ff4400' :
                                   state.stomps >= 2 ? '#ffaa00' : '#ff6688';
                ctx.font        = `bold ${12 + state.stomps * 2}px monospace`;
                ctx.textAlign   = 'center';
                ctx.shadowBlur  = 8;
                ctx.shadowColor = ctx.fillStyle;
                ctx.fillText(`STOMP x${state.stomps + 1}`, screenX, screenY);
                ctx.shadowBlur  = 0;
                ctx.textAlign   = 'left';
                ctx.globalAlpha = 1;
            }
        },

        // Expõe estado para debug
        getState: () => ({ ...state }),
    };
})();

// ── Registra teclas de combate para não conflitar com o jogo ──
// (o 5_controls.js já usa stopPropagation só em inputs,
//  aqui só bloqueamos o preventDefault no espaço para não rolar página)
window.addEventListener('keydown', e => {
    if (e.key === 'z' || e.key === 'Z' ||
        e.key === 'x' || e.key === 'X') {
        // Não propaga para evitar comportamento padrão (zoom out no X, etc.)
        e.preventDefault();
    }
}, { capture: false });
