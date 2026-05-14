// js/boss05_mirror.js - "O ESPELHO FANTASMA" - VERSÃO MORTAL
const bossMirror = {
    name: "Espelho Fantasma",
    active: false,
    completed: false,
    startHeight: 14000, 
    endHeight: 15500,
    
    x: 0, y: 0,
    health: 200, maxHealth: 200, // Boss mais tanque
    history: [],
    delay: 45, // Reduzido pra 0.75s (era 1s)
    attackCooldown: 0,
    
    // NOVO: Sistema de clones
    clones: [],
    lastCloneSpawn: 0,
    cloneSpawnInterval: 5000, // Clone a cada 5s
    
    // NOVO: Orbes fantasmagóricos
    ghostOrbs: [],
    lastOrbShot: 0,
    orbInterval: 2800,
    
    tentacles: [],
    phase: 1, // Fases do boss (1 = normal, 2 = enraged)
    
    config: {
        numTentacles: 8,
        segments: 10,
        segLength: 10,
        headRadius: 35,
        color1: 'rgba(255, 0, 212, 0.7)',
        color2: 'rgba(200, 0, 255, 0.5)',
        bootShootInterval: 2000, // Robô atira mais devagar (boss é difícil)
        bootDamage: 0.35
    },

    init: function() {
        this.x = player.x;
        this.y = player.y + 500;
        this.health = 200;
        this.history = [];
        this.clones = [];
        this.ghostOrbs = [];
        this.attackCooldown = 0;
        this.lastCloneSpawn = Date.now();
        this.lastOrbShot = Date.now();
        this.phase = 1;
        this.tentacles = [];
        
        // Cria tentáculos radiais
        for(let i=0; i<this.config.numTentacles; i++) {
            let segs = [];
            for(let j=0; j<this.config.segments; j++) {
                segs.push({x: this.x, y: this.y});
            }
            this.tentacles.push(segs);
        }
        
        bootSpeak("Ele está copiando seus movimentos!");
        boot.emotion = 'worried';
        showBonus("👻 ESPELHO FANTASMA! 👻");
        audioSys.playTone(200, 'triangle', 2.0, 0.5);
    },

    update: function() {
        if (!this.active) return;
        
        if (this.attackCooldown > 0) this.attackCooldown--;
        
        // Fase 2 quando HP < 50%
        if (this.health < this.maxHealth / 2 && this.phase === 1) {
            this.phase = 2;
            this.delay = 30; // Fica mais rápido!
            bootSpeak("Ele tá ficando mais forte!");
            showBonus("⚠️ FASE 2! ⚠️");
            audioSys.playTone(100, 'sawtooth', 1.0);
        }

        // --- COMPORTAMENTO DO ROBÔ ---
        boot.state = 'controlled_by_boss';
        boot.emotion = (this.phase === 2) ? 'worried' : 'angry';
        
        // Robô fica acima e atrás do player (posição segura)
        const targetBootX = player.x - 100;
        const targetBootY = player.y - 150;
        
        boot.x += (targetBootX - boot.x) * 0.09;
        boot.y += (targetBootY - boot.y) * 0.09;

        // Robô atira no boss principal (não nos clones)
        if (!boot.lastBossShot) boot.lastBossShot = 0;
        if (Date.now() - boot.lastBossShot > this.config.bootShootInterval) {
            this.bootShootsBoss();
            boot.lastBossShot = Date.now();
        }

        // Falas contextuais
        if (Math.random() < 0.002) {
            const frases = [
                "Não para de se mexer!",
                "Ele tá te seguindo!",
                "Cuidado com os clones!",
                this.phase === 2 ? "Ele ficou mais rápido!" : "Mantenha distância!"
            ];
            bootSpeak(frases[Math.floor(Math.random() * frases.length)]);
        }

        // --- MOVIMENTO: ESPELHA O PLAYER ---
        // 1. Grava posição do player
        this.history.push({x: player.x, y: player.y, vx: player.vx, vy: player.vy});
        
        // 2. Move para onde o player estava
        if (this.history.length > this.delay) {
            const pos = this.history.shift();
            this.x = pos.x;
            this.y = pos.y;
        } else {
            // Aproximação inicial
            this.x += (player.x - this.x) * 0.08;
            this.y += (player.y - this.y) * 0.08;
        }

        // --- SPAWN DE CLONES ---
        if (Date.now() - this.lastCloneSpawn > this.cloneSpawnInterval) {
            this.spawnClone();
            this.lastCloneSpawn = Date.now();
        }

        // Atualiza clones
        this.updateClones();

        // --- ATAQUE: ORBES FANTASMAGÓRICOS ---
        if (Date.now() - this.lastOrbShot > this.orbInterval) {
            this.shootGhostOrbs();
            this.lastOrbShot = Date.now();
        }

        // Atualiza orbes
        this.updateGhostOrbs();

        // --- TENTÁCULOS FLUTUANTES ---
        this.updateTentacles();

        // --- COLISÕES ---
        this.checkCollision();

        if (this.health <= 0) this.defeat();
    },

    spawnClone: function() {
        // Spawna clone em posição aleatória próxima
        const angle = Math.random() * Math.PI * 2;
        const distance = 150 + Math.random() * 100;
        
        this.clones.push({
            x: player.x + Math.cos(angle) * distance,
            y: player.y + Math.sin(angle) * distance,
            history: [],
            delay: 30, // Clones são mais rápidos
            alpha: 0.5,
            radius: 25,
            lifetime: 600 // 10 segundos (60fps)
        });
        
        audioSys.playTone(300, 'sine', 0.3);
        if (Math.random() < 0.5) showBonus("👻 Clone!");
    },

    updateClones: function() {
        for (let i = this.clones.length - 1; i >= 0; i--) {
            const clone = this.clones[i];
            
            // Clone segue o player também
            clone.history.push({x: player.x, y: player.y});
            
            if (clone.history.length > clone.delay) {
                const pos = clone.history.shift();
                clone.x += (pos.x - clone.x) * 0.1;
                clone.y += (pos.y - clone.y) * 0.1;
            }
            
            // Reduz tempo de vida
            clone.lifetime--;
            clone.alpha = Math.min(0.5, clone.lifetime / 600);
            
            // Remove clone morto
            if (clone.lifetime <= 0) {
                this.clones.splice(i, 1);
            }
        }
    },

    shootGhostOrbs: function() {
        // Atira orbes em direção ao player com spread
        const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
        
        // Na fase 2, atira 5 orbes; fase 1 atira 3
        const numOrbs = (this.phase === 2) ? 5 : 3;
        const spread = 0.4;
        
        for (let i = 0; i < numOrbs; i++) {
            const offset = (i - Math.floor(numOrbs/2)) * spread;
            const angle = angleToPlayer + offset;
            
            this.ghostOrbs.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 3.5,
                vy: Math.sin(angle) * 3.5,
                radius: 8,
                age: 0,
                homing: (this.phase === 2) // Fase 2 = homing!
            });
        }
        
        audioSys.playTone(250, 'sine', 0.2);
    },

    updateGhostOrbs: function() {
        for (let i = this.ghostOrbs.length - 1; i >= 0; i--) {
            const orb = this.ghostOrbs[i];
            
            // Fase 2: Orbes têm homing leve
            if (orb.homing && orb.age < 180) {
                const angleToPlayer = Math.atan2(player.y - orb.y, player.x - orb.x);
                orb.vx += Math.cos(angleToPlayer) * 0.15;
                orb.vy += Math.sin(angleToPlayer) * 0.15;
                
                // Limita velocidade
                const speed = Math.sqrt(orb.vx*orb.vx + orb.vy*orb.vy);
                if (speed > 5) {
                    orb.vx = (orb.vx / speed) * 5;
                    orb.vy = (orb.vy / speed) * 5;
                }
            }
            
            orb.x += orb.vx;
            orb.y += orb.vy;
            orb.age++;
            
            // Remove se muito velho ou fora da tela
            if (orb.age > 300 || orb.x < -100 || orb.x > canvas.width + 100 ||
                orb.y < -100 || orb.y > canvas.height + 200) {
                this.ghostOrbs.splice(i, 1);
            }
        }
    },

    updateTentacles: function() {
        const time = Date.now() * 0.005;
        
        this.tentacles.forEach((tent, t) => {
            const angle = (t / this.config.numTentacles) * Math.PI * 2 + time;
            const radius = 60 + Math.sin(time * 2 + t) * 20;
            const targetX = this.x + Math.cos(angle) * radius;
            const targetY = this.y + Math.sin(angle) * radius;
            
            tent[0].x = targetX;
            tent[0].y = targetY;
            
            // Inverse Kinematics
            for(let i=1; i<tent.length; i++) {
                let dx = tent[i].x - tent[i-1].x;
                let dy = tent[i].y - tent[i-1].y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 0) {
                    let ratio = (dist - this.config.segLength) / dist;
                    tent[i].x -= dx * ratio * 0.6;
                    tent[i].y -= dy * ratio * 0.6;
                }
            }
        });
    },

    bootShootsBoss: function() {
        const hit = Math.random() < 0.42; // 42% acerto (boss difícil)
        
        if (hit) {
            this.health -= this.config.bootDamage;
            
            if (Math.random() < 0.12) {
                showBonus("🤖");
            }
            
            audioSys.playTone(420, 'square', 0.04);
        }
    },

    checkCollision: function() {
        if (this.attackCooldown > 0) return;
        
        // 1. BOSS PRINCIPAL
        const distMain = Math.hypot(player.x - this.x, player.y - this.y);
        if (distMain < this.config.headRadius + 20) {
            loseLife();
            this.attackCooldown = 60;
            return;
        }
        
        // 2. CLONES
        this.clones.forEach(clone => {
            const distClone = Math.hypot(player.x - clone.x, player.y - clone.y);
            if (distClone < clone.radius + 20) {
                loseLife();
                this.attackCooldown = 60;
            }
        });
        
        // 3. ORBES FANTASMAGÓRICOS
        for (let i = this.ghostOrbs.length - 1; i >= 0; i--) {
            const orb = this.ghostOrbs[i];
            const distOrb = Math.hypot(player.x - orb.x, player.y - orb.y);
            
            if (distOrb < orb.radius + 15) {
                loseLife();
                this.ghostOrbs.splice(i, 1);
                this.attackCooldown = 60;
                return;
            }
        }
        
        // 4. PLAYER ATACA (método único: tem que PARAR de se mexer!)
        // Quando player fica parado, o boss encosta nele e toma dano
        const isPlayerStill = Math.abs(player.vx) < 0.5 && Math.abs(player.vy) < 0.5;
        
        if (isPlayerStill && distMain < 50) {
            this.health -= 0.5; // Dano contínuo enquanto parado
            
            if (Math.random() < 0.05) {
                showBonus("💥 Confronto!");
            }
        }
        
        // OU: Player pode pular nele quando ele estiver vulnerável
        if (player.vy > 0 && distMain < 55 && player.y < this.y) {
            this.health -= 15;
            player.vy = -13;
            showBonus("👻 EXORCISMO! -15 HP");
            audioSys.playTone(400, 'sine', 0.25);
            
            // Boss é empurrado
            const pushAngle = Math.atan2(this.y - player.y, this.x - player.x);
            this.x += Math.cos(pushAngle) * 50;
            this.y += Math.sin(pushAngle) * 50;
        }
    },

    drawForeground: function(ctx) {
        if (!this.active) return;
        
        this.drawTentacles(ctx);
        this.drawClones(ctx);
        this.drawMainBoss(ctx);
        this.drawGhostOrbs(ctx);
        this.drawHealthBar(ctx);
    },

    drawTentacles: function(ctx) {
        ctx.strokeStyle = this.config.color2;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff00ff';
        
        this.tentacles.forEach(tent => {
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(tent[0].x, tent[0].y);
            
            for(let i=1; i<tent.length-1; i++) {
                let xc = (tent[i].x + tent[i+1].x) / 2;
                let yc = (tent[i].y + tent[i+1].y) / 2;
                ctx.quadraticCurveTo(tent[i].x, tent[i].y, xc, yc);
            }
            ctx.lineTo(tent[tent.length-1].x, tent[tent.length-1].y);
            ctx.stroke();
        });
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    },

    drawClones: function(ctx) {
        this.clones.forEach(clone => {
            ctx.globalAlpha = clone.alpha;
            
            // Corpo do clone
            ctx.fillStyle = 'rgba(150, 0, 200, 0.5)';
            ctx.beginPath();
            ctx.arc(clone.x, clone.y, clone.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Rosto
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("?", clone.x, clone.y + 6);
        });
        
        ctx.globalAlpha = 1;
    },

    drawMainBoss: function(ctx) {
        // Brilho fantasmagórico
        ctx.shadowBlur = (this.phase === 2) ? 25 : 15;
        ctx.shadowColor = (this.phase === 2) ? '#ff0066' : '#ff00ff';
        
        // Corpo principal
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.config.headRadius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, this.config.color1);
        gradient.addColorStop(1, this.config.color2);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.config.headRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Rosto assustador
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        
        // Muda expressão baseado na fase
        const face = (this.phase === 2) ? "😈" : "👻";
        ctx.fillText(face, this.x, this.y + 10);
        
        // Aura pulsante na fase 2
        if (this.phase === 2) {
            const pulseSize = this.config.headRadius + Math.sin(Date.now() * 0.01) * 10;
            ctx.strokeStyle = 'rgba(255, 0, 100, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, pulseSize, 0, Math.PI * 2);
            ctx.stroke();
        }
    },

    drawGhostOrbs: function(ctx) {
        this.ghostOrbs.forEach(orb => {
            const alpha = 1 - (orb.age / 300);
            ctx.globalAlpha = alpha;
            
            // Brilho
            ctx.shadowBlur = orb.homing ? 15 : 10;
            ctx.shadowColor = orb.homing ? '#ff0066' : '#ff00ff';
            
            // Gradiente
            const gradient = ctx.createRadialGradient(
                orb.x, orb.y, 0,
                orb.x, orb.y, orb.radius
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.5, orb.homing ? '#ff0099' : '#ff00ff');
            gradient.addColorStop(1, 'rgba(200, 0, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Rastro
            if (orb.homing) {
                ctx.strokeStyle = 'rgba(255, 0, 150, 0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(orb.x, orb.y);
                ctx.lineTo(orb.x - orb.vx * 3, orb.y - orb.vy * 3);
                ctx.stroke();
            }
        });
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    },

    drawHealthBar: function(ctx) {
        const w = 240;
        const h = 14;
        const x = this.x - w/2;
        const y = this.y - this.config.headRadius - 35;
        
        // Fundo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x-2, y-2, w+4, h+4);
        
        // Barra (muda cor na fase 2)
        const barColor = (this.phase === 2) ? '#ff0066' : '#ff00ff';
        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, w * (this.health/this.maxHealth), h);
        
        // Texto
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 3;
        ctx.shadowColor = '#000';
        
        const phaseText = (this.phase === 2) ? " [ENRAGED]" : "";
        ctx.fillText(`HP: ${Math.ceil(this.health)}/${this.maxHealth}${phaseText}`, this.x, y - 6);
        ctx.shadowBlur = 0;
    },

    defeat: function() {
        this.active = false;
        this.completed = true;
        game.score += 6000;
        showBonus("👻 FANTASMA EXORCIZADO! 👻");
        bootSpeak("Ele sumiu! Realidade restaurada!");
        boot.emotion = 'happy';
        boot.state = 'following';
        
        // Som de exorcismo
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                audioSys.playTone(400 + i * 100, 'sine', 0.2);
            }, i * 100);
        }
    }
};

if (typeof BossSchool !== 'undefined') BossSchool.register(bossMirror);