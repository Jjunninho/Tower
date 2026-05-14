// js/boss02_tower.js - "O GUARDIÃO DAS NUVENS" - VERSÃO BALANCEADA
const bossTower = {
    name: "Torre Guardião",
    active: false,
    completed: false,
    startHeight: 4000, 
    endHeight: 5500,
    
    // Dados específicos
    x: 0, y: 0,
    health: 150, maxHealth: 150, // AUMENTEI HP (robô ajuda, mas não mata sozinho)
    tentacles: [],
    projectiles: [],
    lastShot: 0,
    attackCooldown: 0, // NOVO: Evita spam de ataques
    
    // Configuração da Espécie
    config: {
        numTentacles: 6,
        segments: 15,
        segLength: 15,
        headRadius: 40,
        color1: '#00f7ff',
        color2: '#0088aa',
        shootInterval: 3000, // 3 segundos entre tiros (era 2)
        tentacleSpeed: 0.08, // REDUZIDO! Era 0.15 (agora são mais lentos)
        bootShootInterval: 1500, // Robô atira a cada 1.5s (não 0.5s!)
        bootDamage: 0.3 // Dano do robô REDUZIDO (era 0.8)
    },

    init: function() {
        this.x = canvas.width / 2;
        this.y = player.y + 300;
        this.health = 150;
        this.tentacles = this.createTentacles(this.x, this.y);
        this.projectiles = [];
        this.lastShot = Date.now();
        this.attackCooldown = 0;
        
        bootSpeak("Detectando estrutura gigante abaixo!");
        boot.emotion = 'worried';
        showBonus("⚠️ TORRE GUARDIÃO! ⚠️");
        audioSys.playTone(60, 'square', 2.0, 0.8);
    },

    update: function() {
        if (!this.active) return;
        
        // Reduz cooldown de ataques
        if (this.attackCooldown > 0) this.attackCooldown--;
        
        // --- COMPORTAMENTO DO ROBÔ (AJUDANTE, NÃO DEUS) ---
        boot.state = 'controlled_by_boss';
        boot.emotion = 'worried'; // Voltei pra worried
        
        // Robô fica numa posição SEGURA (longe do perigo)
        const targetBootX = this.x + 200; // Mais longe
        const targetBootY = this.y - 150; // Mais alto
        
        boot.x += (targetBootX - boot.x) * 0.06; // Mais devagar
        boot.y += (targetBootY - boot.y) * 0.06;

        // ROBÔ ATIRA NO BOSS COM MODERAÇÃO
        if (!boot.lastBossShot) boot.lastBossShot = 0;
        if (Date.now() - boot.lastBossShot > this.config.bootShootInterval) {
            this.bootShootsBoss();
            boot.lastBossShot = Date.now();
        }

        // Fala ocasional
        if (Math.random() < 0.002) {
            const frases = [
                "Eu vou distraindo ela!",
                "Pula na cabeça dela!",
                "Não para de se mexer!"
            ];
            bootSpeak(frases[Math.floor(Math.random() * frases.length)]);
        }

        // --- MOVIMENTO DA CABEÇA (Menos agressivo) ---
        const targetY = player.y + 100; // Mais longe do player (era 50)
        this.y += (targetY - this.y) * 0.04; // Mais lento (era 0.08)
        
        // Cabeça oscila menos
        const targetX = player.x + Math.sin(Date.now() * 0.002) * 80; // Mais previsível
        this.x += (targetX - this.x) * 0.03; // Mais lento

        // --- TENTÁCULOS PERSEGUEM (MAS DEVAGAR) ---
        this.tentacles.forEach((tent, i) => {
            const angleOffset = (i / this.config.numTentacles) * Math.PI * 2;
            
            // NEM TODOS os tentáculos perseguem ao mesmo tempo
            const isActive = (Date.now() + i * 1000) % 6000 < 3000; // Revezam
            
            if (isActive) {
                const predictX = player.x + Math.cos(angleOffset) * 80;
                const predictY = player.y + Math.sin(angleOffset) * 80;
                
                // Ponta persegue (DEVAGAR)
                const tip = tent[tent.length - 1];
                tip.x += (predictX - tip.x) * this.config.tentacleSpeed;
                tip.y += (predictY - tip.y) * this.config.tentacleSpeed;
            }
            
            // Base fica girando em volta da cabeça
            const baseAngle = angleOffset + Date.now() * 0.0005;
            tent[0].x = this.x + Math.cos(baseAngle) * 60;
            tent[0].y = this.y + Math.sin(baseAngle) * 30;
        });

        // Atualiza física dos tentáculos
        this.updateTentacles();

        // --- BOSS ATIRA (MENOS) ---
        if (Date.now() - this.lastShot > this.config.shootInterval) {
            this.shoot();
            this.lastShot = Date.now();
        }

        // Atualiza projéteis
        this.updateProjectiles();

        // Checa colisão
        this.checkCollision();

        // Vitória
        if (this.health <= 0) this.defeat();
    },

    shoot: function() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        
        // Atira apenas 2 projéteis (não 3)
        for (let i = -0.5; i <= 0.5; i++) {
            const spreadAngle = angle + (i * 0.4);
            this.projectiles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(spreadAngle) * 4, // Mais lento (era 5)
                vy: Math.sin(spreadAngle) * 4,
                radius: 8
            });
        }
        
        audioSys.playTone(150, 'triangle', 0.2);
    },

    updateProjectiles: function() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            
            // Remove se sair da tela
            if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height + 200) {
                this.projectiles.splice(i, 1);
            }
        }
    },

    bootShootsBoss: function() {
        // 50% de chance de acertar (era 70%)
        const hit = Math.random() < 0.5;
        
        if (hit) {
            this.health -= this.config.bootDamage; // Só 0.3 de dano!
            
            // Efeito visual esporádico
            if (Math.random() < 0.15) {
                showBonus("🤖");
            }
            
            audioSys.playTone(400, 'square', 0.03); // Som mais suave
        }
    },

    updateTentacles: function() {
        this.tentacles.forEach(tent => {
            for(let i = tent.length - 2; i >= 0; i--) {
                let dx = tent[i+1].x - tent[i].x;
                let dy = tent[i+1].y - tent[i].y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 0) {
                    let ratio = (dist - this.config.segLength) / dist;
                    tent[i].x += dx * ratio * 0.3; // Mais suave
                    tent[i].y += dy * ratio * 0.3;
                }
            }
        });
    },

    checkCollision: function() {
        // Cooldown entre danos (não morre instantaneamente)
        if (this.attackCooldown > 0) return;
        
        // 1. CABEÇA
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        if (Math.sqrt(dx*dx + dy*dy) < this.config.headRadius + 20) {
            loseLife();
            this.attackCooldown = 60; // 1 segundo de invencibilidade
        }
        
        // 2. TENTÁCULOS - SÓ AS PONTAS machucam (não todos os segmentos)
        this.tentacles.forEach(tent => {
            // Só os últimos 3 segmentos causam dano
            for (let i = tent.length - 3; i < tent.length; i++) {
                const seg = tent[i];
                const dxt = player.x - seg.x;
                const dyt = player.y - seg.y;
                if (Math.sqrt(dxt*dxt + dyt*dyt) < 12) {
                    loseLife();
                    this.attackCooldown = 60;
                    return;
                }
            }
        });
        
        // 3. PROJÉTEIS
        this.projectiles.forEach((p, i) => {
            const dpx = player.x - p.x;
            const dpy = player.y - p.y;
            if (Math.sqrt(dpx*dpx + dpy*dpy) < p.radius + 15) {
                loseLife();
                this.projectiles.splice(i, 1);
                this.attackCooldown = 60;
            }
        });
        
        // 4. PLAYER ATACA pulando
        if (player.vy > 0 && Math.abs(dx) < 50 && dy > -50 && dy < 0) {
            this.health -= 10; // Dano bom do player
            player.vy = -12;
            audioSys.playTone(300, 'square', 0.15);
            showBonus("💥 -10 HP");
        }
    },

    drawForeground: function(ctx) {
        if (!this.active) return;
        this.drawTentacles(ctx);
        this.drawHead(ctx);
        this.drawProjectiles(ctx);
        this.drawHealthBar(ctx);
    },

    drawProjectiles: function(ctx) {
        ctx.fillStyle = '#ff3366';
        this.projectiles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ff99bb';
            ctx.beginPath();
            ctx.arc(p.x - 2, p.y - 2, p.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff3366';
        });
    },

    createTentacles: function(x, y) {
        let t = [];
        for(let i=0; i<this.config.numTentacles; i++) {
            let segs = [];
            for(let j=0; j<this.config.segments; j++) {
                segs.push({x: x, y: y + j * this.config.segLength});
            }
            t.push(segs);
        }
        return t;
    },

    drawTentacles: function(ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this.tentacles.forEach((tent, t) => {
            // Tentáculos mais transparentes = menos intimidador
            const isActive = (Date.now() + t * 1000) % 6000 < 3000;
            const alpha = isActive ? 1.0 : 0.5;
            
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(tent[0].x, tent[0].y);
            for (let i = 1; i < tent.length - 1; i++) {
                let xc = (tent[i].x + tent[i+1].x) / 2;
                let yc = (tent[i].y + tent[i+1].y) / 2;
                ctx.quadraticCurveTo(tent[i].x, tent[i].y, xc, yc);
            }
            ctx.lineTo(tent[tent.length-1].x, tent[tent.length-1].y);
            ctx.lineWidth = 8;
            ctx.strokeStyle = (t % 2 === 0) ? this.config.color1 : this.config.color2;
            ctx.stroke();
            
            // Ponta vermelha SÓ nos ativos
            if (isActive) {
                const tip = tent[tent.length-1];
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, 6, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        });
    },

    drawHead: function(ctx) {
        ctx.fillStyle = this.config.color1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.config.headRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = '#f00';
        ctx.beginPath();
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        ctx.arc(this.x + Math.cos(angle)*8, this.y + Math.sin(angle)*8, 6, 0, Math.PI*2);
        ctx.fill();
    },

    drawHealthBar: function(ctx) {
        const w = 200;
        const h = 12;
        const x = this.x - w/2;
        const y = this.y - this.config.headRadius - 25;
        
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x-2, y-2, w+4, h+4);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y, w * (this.health/this.maxHealth), h);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`HP: ${Math.ceil(this.health)}/${this.maxHealth}`, this.x, y - 5);
    },

    defeat: function() {
        this.active = false;
        this.completed = true;
        game.score += 3000;
        showBonus("🎉 GUARDIÃO DERROTADO! 🎉");
        bootSpeak("Conseguimos juntos!");
        boot.emotion = 'happy';
        boot.state = 'following';
        
        audioSys.playTone(400, 'sine', 0.3);
        setTimeout(() => audioSys.playTone(500, 'sine', 0.3), 150);
        setTimeout(() => audioSys.playTone(600, 'sine', 0.5), 300);
    }
};

if (typeof BossSchool !== 'undefined') BossSchool.register(bossTower);