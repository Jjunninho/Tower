// js/boss01.js - VERSÃO: BOOT ATIRADOR OTIMIZADO + BOSS TÁTICO

const bossMatrix = {
	name: "Sentinela Matrix",
    active: false,
    completed: false,
    startHeight: 2000, 
    endHeight: 3500,
    
    boss: null,
    lasers: [],
    projectiles: [],
    
    // === SISTEMA DE TIRO DO BOOT OTIMIZADO ===
    bootBullets: [],
    bootShootTimer: 0,
    bootShootRate: 8,  // Atira a cada 8 frames (~7.5 tiros/segundo) - MUITO MAIS RÁPIDO!
    isBootShooting: true,
    bootHitCount: 0,    // Contador de acertos
    totalDamage: 0,     // Dano total causado
    
    // === TRACKING DO MOVIMENTO DO PLAYER ===
    playerLastX: 0,
    playerLastY: 0,
    playerStillTimer: 0,  // Conta quanto tempo player está parado
    playerIsStill: false,
    
    orbitRadius: 250,
    
    init: function() {
        this.spawnBoss();
        
        this.bootBullets = [];
        this.bootShootTimer = 0;
        this.isBootShooting = true;
        this.bootHitCount = 0;
        this.totalDamage = 0;
        
        this.playerLastX = player.x;
        this.playerLastY = player.y;
        this.playerStillTimer = 0;
        
        bootSpeak("Vou atirar nele! Continue se movendo!");
        boot.emotion = 'excited';
    },

    spawnBoss: function() {
        this.boss = {
            x: canvas.width / 2,
            y: player.y - 300,
            targetX: canvas.width / 2,
            targetY: player.y - 300,
            angle: 0,
            health: 100,
            maxHealth: 100,
            
            // TENTÁCULOS ULTRA OTIMIZADOS
            tentacles: [],
            numTentacles: 3,
            segmentsPerTentacle: 6,
            segmentLength: 12,
            headRadius: 40,
            
            pulsePhase: 0,
            shootTimer: 0,
            moveTimer: 0,
            eyeAngle: 0,
            isHit: false,
            hitFlashTimer: 0
        };

        // Cria tentáculos
        for(let t = 0; t < this.boss.numTentacles; t++) {
            let tentacle = [];
            let angleOffset = (t / this.boss.numTentacles) * Math.PI * 2;
            for(let i = 0; i < this.boss.segmentsPerTentacle; i++) {
                tentacle.push({
                    x: this.boss.x,
                    y: this.boss.y
                });
            }
            this.boss.tentacles.push({
                segments: tentacle,
                angleOffset: angleOffset,
                wave: Math.random() * Math.PI * 2
            });
        }
    },

    update: function() {
        const currentHeight = game.maxHeight * 10;
        
        // ATIVAÇÃO
        if (!this.active && !this.completed && currentHeight >= this.startHeight) {
            this.active = true;
            this.init();
            audioSys.playTone(80, 'sawtooth', 3.0, 0.8);
            showBonus("⚠️ SENTINELA DETECTADO! ⚠️");
        }

        // VITÓRIA
        if (this.active && this.boss && this.boss.health <= 0) {
            this.active = false;
            this.completed = true;
            this.boss = null;
            this.lasers = [];
            this.projectiles = [];
            this.bootBullets = [];
            this.isBootShooting = false;
            
            showBonus("🎯 ALVO ELIMINADO! +1500 PONTOS! 🎯");
            bootSpeak("Tiro perfeito! Somos uma dupla!");
            boot.emotion = 'happy';
            game.score += 1500;
        }

        if (!this.active || !this.boss) return;

        const b = this.boss;

        // === 1. DETECTA SE PLAYER ESTÁ PARADO ===
        const moveThreshold = 2;  // Pixels de movimento
        const dx = Math.abs(player.x - this.playerLastX);
        const dy = Math.abs(player.y - this.playerLastY);
        
        if (dx < moveThreshold && dy < moveThreshold) {
            // Player está parado!
            this.playerStillTimer++;
            if (this.playerStillTimer > 20) {  // ~0.3 segundos parado
                this.playerIsStill = true;
            }
        } else {
            // Player está se movendo
            this.playerStillTimer = 0;
            this.playerIsStill = false;
        }
        
        this.playerLastX = player.x;
        this.playerLastY = player.y;

        // === 2. BOOT ATIRA NO BOSS (OTIMIZADO!) ===
        if (this.isBootShooting) {
            // Posiciona Boot perto do player (como um companheiro)
            boot.x = player.x - 60;
            boot.y = player.y - 10;
            
            this.bootShootTimer++;
            if (this.bootShootTimer >= this.bootShootRate) {
                this.shootBootBullet();
                this.bootShootTimer = 0;
            }
        }

        // Atualiza balas do Boot
        for (let i = this.bootBullets.length - 1; i >= 0; i--) {
            const bullet = this.bootBullets[i];
            
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.life--;
            
            // Colisão bala → boss (área de colisão aumentada)
            const dx2 = bullet.x - b.x;
            const dy2 = bullet.y - b.y;
            const distSq = dx2 * dx2 + dy2 * dy2;
            const hitRadius = (b.headRadius + 20) * (b.headRadius + 20); // Aumentado para 20 - MAIS FÁCIL DE ACERTAR!
            
            if (distSq < hitRadius) {
                // ACERTOU!
                const damage = 1.2; // Aumentado de 0.5 para 1.2 - MAIS DANO!
                b.health -= damage;
                b.isHit = true;
                b.hitFlashTimer = 3;
                
                // Atualiza contadores
                this.bootHitCount++;
                this.totalDamage += damage;
                
                // Efeito sonoro de acerto
                audioSys.playTone(1200, 'square', 0.05, 0.03);
                
                this.bootBullets.splice(i, 1);
                continue;
            }
            
            // Remove balas fora da tela ou com vida esgotada
            if (bullet.life <= 0 || bullet.y < -500 || bullet.y > canvas.height + 100) {
                this.bootBullets.splice(i, 1);
            }
        }

        // === 3. COMPORTAMENTO DO BOSS ===
        // Flash de dano
        if (b.hitFlashTimer > 0) {
            b.hitFlashTimer--;
            b.isHit = true;
        } else {
            b.isHit = false;
        }
        
        // Movimento orbital
        b.moveTimer++;
        if (b.moveTimer > 100) {
            const angle = Math.random() * Math.PI * 2;
            const radius = this.orbitRadius + Math.random() * 80;
            b.targetX = player.x + player.width/2 + Math.cos(angle) * radius;
            b.targetY = player.y - 180 + Math.sin(angle) * (radius * 0.5);
            b.moveTimer = 0;
        }

        b.x += (b.targetX - b.x) * 0.06;
        b.y += (b.targetY - b.y) * 0.06;
        b.angle += 0.015;
        b.pulsePhase += 0.08;

        // === 4. FÍSICA DOS TENTÁCULOS ===
        const time = Date.now() * 0.0004;
        
        b.tentacles.forEach((tent) => {
            const baseAngle = tent.angleOffset + b.angle;
            const wave = Math.sin(time * 2 + tent.wave) * 8;
            
            const targetX = b.x + Math.cos(baseAngle) * b.headRadius;
            const targetY = b.y + Math.sin(baseAngle) * b.headRadius + wave;
            
            // Primeiro segmento
            const seg0 = tent.segments[0];
            const dx0 = targetX - seg0.x;
            const dy0 = targetY - seg0.y;
            seg0.x += dx0 * 0.5;
            seg0.y += dy0 * 0.5;
            
            // Resto
            for(let i = 1; i < b.segmentsPerTentacle; i++) {
                const seg = tent.segments[i];
                const prev = tent.segments[i-1];
                const dx = prev.x - seg.x;
                const dy = prev.y - seg.y;
                seg.x += dx * 0.25;
                seg.y += dy * 0.25;
            }
        });

        // Olhos rastreiam player
        const playerCenterX = player.x + player.width/2;
        const playerCenterY = player.y + player.height/2;
        b.eyeAngle = Math.atan2(playerCenterY - b.y, playerCenterX - b.x);

        // === 5. ATAQUES DO BOSS (BASEADO NO MOVIMENTO DO PLAYER) ===
        b.shootTimer++;
        
        let shootInterval;
        let inaccuracy;
        
        if (this.playerIsStill) {
            // PLAYER PARADO = BOSS MUITO PRECISO E RÁPIDO!
            shootInterval = 60;  // Atira mais rápido
            inaccuracy = 20;     // Muito preciso (era 100-150)
        } else {
            // PLAYER SE MOVENDO = BOSS LENTO E IMPRECISO
            shootInterval = 120;  // Atira mais devagar
            inaccuracy = 200;     // Bem impreciso
        }
        
        if (b.shootTimer > shootInterval) {
            this.shootLaser(inaccuracy);
            
            // Projéteis apenas quando está perdendo vida
            if (b.health < 60 && this.playerIsStill) {
                // Projéteis só se player parado e boss machucado
                this.shootProjectile();
            }
            
            b.shootTimer = 0;
        }

        // Atualiza Lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const l = this.lasers[i];
            l.life--;
            
            if (l.life > 20 && !player.invulnerable && !player.hasShield) {
                const dx = l.x2 - (player.x + player.width/2);
                const dy = l.y2 - (player.y + player.height/2);
                if (dx*dx + dy*dy < 35*35) {
                    loseLife();
                    l.life = 0;
                }
            }
            if (l.life <= 0) this.lasers.splice(i, 1);
        }

        // Atualiza Projéteis
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            
            if (!player.invulnerable && !player.hasShield) {
                const dx = p.x - (player.x + player.width/2);
                const dy = p.y - (player.y + player.height/2);
                if (dx*dx + dy*dy < 20*20) {
                    loseLife();
                    p.life = 0;
                }
            }
            
            if (p.life <= 0) this.projectiles.splice(i, 1);
        }
    },

	shootBootBullet: function() {
		audioSys.playTone(800, 'square', 0.05, 0.05, 200);

		const targetX = this.boss.x;
		const targetY = this.boss.y;

		const dx = targetX - (boot.x + 20);
		const dy = targetY - (boot.y + 15);
		const dist = Math.hypot(dx, dy);

		const angle = Math.atan2(dy, dx);

		const spread = (Math.random() - 0.5) * 0.04; // Reduzido de 0.08 para 0.04 - MUITO MAIS PRECISO!
		const finalAngle = angle + spread;

		const speed = Math.min(14, Math.max(10, dist / 25)); // Aumentado de 10/6 para 14/10 - MAIS RÁPIDO!

		this.bootBullets.push({
			x: boot.x + 20,
			y: boot.y + 15,
			vx: Math.cos(finalAngle) * speed,
			vy: Math.sin(finalAngle) * speed,
			life: 350, // Aumentado de 300 para 350 - MAIS TEMPO DE VIDA!
			size: 5 // Aumentado de 4 para 5 - BALAS MAIORES!
		});
	},

    shootLaser: function(inaccuracy) {
        if (!this.boss) return;
        audioSys.playTone(900, 'sawtooth', 0.08, 0.08, -600);
        
        const targetX = player.x + player.width/2;
        const targetY = player.y + player.height/2;
        
        this.lasers.push({
            x1: this.boss.x,
            y1: this.boss.y,
            x2: targetX + (Math.random() - 0.5) * inaccuracy,
            y2: targetY + (Math.random() - 0.5) * (inaccuracy * 0.5),
            life: 30
        });
    },

    shootProjectile: function() {
        if (!this.boss) return;
        audioSys.playTone(600, 'sine', 0.08, 0.05);
        
        const angle = Math.atan2(
            (player.y + player.height/2) - this.boss.y,
            (player.x + player.width/2) - this.boss.x
        );
        
        this.projectiles.push({
            x: this.boss.x,
            y: this.boss.y,
            vx: Math.cos(angle) * 4,
            vy: Math.sin(angle) * 4,
            life: 180
        });
    },

    drawBackground: function(ctx) {
        if (!this.active) return;
        
        // Fundo sólido escuro
        ctx.fillStyle = "#0a0014";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Indicador visual se player está parado (PERIGO!)
        if (this.playerIsStill) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.08)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    },

    drawForeground: function(ctx) {
        if (!this.active || !this.boss) return;
        const b = this.boss;

        // === 1. BALAS DO BOOT ===
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 10; // Aumentado de 8 para 10 - MAIS BRILHO!
        ctx.shadowColor = '#00ffff';
        
        this.bootBullets.forEach(bullet => {
            // Núcleo brilhante maior
            ctx.fillRect(bullet.x - 4, bullet.y - 4, 8, 8); // Aumentado de 6x6 para 8x8 - BALAS MAIS VISÍVEIS!
        });
        
        ctx.shadowBlur = 0;

        // === 2. PROJÉTEIS DO BOSS ===
        ctx.fillStyle = '#ff00ff';
        this.projectiles.forEach(p => {
            ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
            // Núcleo branco
            ctx.fillStyle = '#fff';
            ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
            ctx.fillStyle = '#ff00ff';
        });

        // === 3. LASERS DO BOSS ===
        this.lasers.forEach(l => {
            const alpha = Math.min(1, l.life / 30);
            
            // Glow vermelho (mais intenso se player parado)
            const intensity = this.playerIsStill ? 1.0 : 0.6;
            ctx.strokeStyle = `rgba(255, 0, 0, ${alpha * intensity})`;
            ctx.lineWidth = l.life > 20 ? 8 : 3;
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            ctx.lineTo(l.x2, l.y2);
            ctx.stroke();
            
            // Núcleo branco
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = l.life > 20 ? 2 : 1;
            ctx.stroke();
        });

        // === 4. TENTÁCULOS ===
        ctx.strokeStyle = '#00f7ff';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        
        b.tentacles.forEach((tent) => {
            ctx.beginPath();
            ctx.moveTo(tent.segments[0].x, tent.segments[0].y);
            
            for(let i = 1; i < b.segmentsPerTentacle; i++) {
                ctx.lineTo(tent.segments[i].x, tent.segments[i].y);
            }
            
            ctx.stroke();
        });

        // === 5. CORPO DO BOSS ===
        const pulse = 1 + Math.sin(b.pulsePhase) * 0.1;
        const radius = b.headRadius * pulse;
        
        // Corpo (pisca branco quando leva dano)
        ctx.fillStyle = b.isHit ? '#fff' : '#222';
        ctx.beginPath();
        ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Borda neon
        ctx.strokeStyle = '#00f7ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // === 6. OLHO RASTREADOR ===
        const eyeX = b.x + Math.cos(b.eyeAngle) * 12;
        const eyeY = b.y + Math.sin(b.eyeAngle) * 12;
        
        // Glow do olho (mais intenso se focado no player parado)
        if (this.playerIsStill) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';
        }
        
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Pupila
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
        ctx.fill();

        // === 7. BARRA DE VIDA ===
        const barW = 180;
        const barH = 10;
        const barX = b.x - barW/2;
        const barY = b.y - radius - 35;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        
        const hp = b.health / b.maxHealth;
        ctx.fillStyle = hp > 0.5 ? '#0f0' : hp > 0.25 ? '#ff0' : '#f00';
        ctx.fillRect(barX, barY, barW * hp, barH);
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);
        
        // === 8. INDICADORES DE STATUS ===
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        
        // Aviso se player está parado
        if (this.playerIsStill) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText('⚠ PARADO = PERIGO! ⚠', b.x, barY - 10);
        } else {
            ctx.fillStyle = '#00ff00';
            ctx.fillText('✓ Continue se movendo!', b.x, barY - 10);
        }
        
        // HP do boss
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.fillText(`HP: ${Math.ceil(b.health)}/${b.maxHealth}`, b.x, barY + barH + 15);
        
        // Estatísticas de combate (DEBUG)
        ctx.fillStyle = '#00ffff';
        ctx.font = '8px monospace';
        ctx.fillText(`Boot: ${this.bootHitCount} acertos | ${this.totalDamage.toFixed(1)} dano`, b.x, barY + barH + 27);
        ctx.fillText(`Balas ativas: ${this.bootBullets.length}`, b.x, barY + barH + 38);
        
        ctx.textAlign = 'left';
        
        // === 9. MIRA DO BOOT ===
        if (this.isBootShooting) {
            // Desenha linha de mira sutil do Boot → Boss
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(boot.x + 20, boot.y + 15);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    },

    handleGeneration: function(currentY) {
        if (!this.active) return false;
        
        walls.push({ x: 0, y: currentY, width: 60, height: 100, placed: true });
        walls.push({ x: canvas.width - 60, y: currentY, width: 60, height: 100, placed: true });
        
        if (Math.random() < 0.75) {
            platforms.push({
                x: canvas.width / 2 - 60 + (Math.random() * 80 - 40),
                y: currentY + 30,
                width: 120,
                height: 20,
                moving: false
            });
        }
        
        return true;
    }
};

// MATRICULA O BOSS NA ESCOLA
if (typeof BossSchool !== 'undefined') {
    BossSchool.register(bossMatrix);
}