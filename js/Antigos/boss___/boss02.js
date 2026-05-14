// js/boss02_tower.js - "O GUARDIÃO DAS NUVENS" - VERSÃO PADRONIZADA
const bossTower = {
    name: "Torre Guardião",
    active: false,
    completed: false,
    startHeight: 4500,  // AJUSTADO de 4000 para 4500
    endHeight: 6000,    // AJUSTADO de 5500 para 6000

    
    // Dados específicos
    x: 0, y: 0,
    health: 150, maxHealth: 150,
    tentacles: [],
    projectiles: [],
    lastShot: 0,
    attackCooldown: 0,
    
    // Configuração Padronizada
    config: {
        numTentacles: 6,
        segments: 15,
        segLength: 15,
        headRadius: 40,
        color1: '#00f7ff',
        color2: '#0088aa',
        shootInterval: 3000,
        tentacleSpeed: 0.08,
        
        // ROBÔ PADRONIZADO
        bootShootInterval: 1500,
        bootDamage: 0.3,
        bootHitChance: 0.5,
        bootPositionType: 'safe' // Fica longe do perigo
    },

    init: function() {
        this.x = canvas.width / 2;
        this.y = player.y + 300;
        this.health = this.maxHealth;
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
        
        if (this.attackCooldown > 0) this.attackCooldown--;
        
        // --- COMPORTAMENTO PADRONIZADO DO ROBÔ ---
        boot.state = 'controlled_by_boss';
        boot.emotion = 'worried';
        
        // Posição segura
        const targetBootX = this.x + 200;
        const targetBootY = this.y - 150;
        
        boot.x += (targetBootX - boot.x) * 0.06;
        boot.y += (targetBootY - boot.y) * 0.06;

        // Tiro padronizado
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

        // --- MOVIMENTO DA CABEÇA ---
        const targetY = player.y + 100;
        this.y += (targetY - this.y) * 0.04;
        
        const targetX = player.x + Math.sin(Date.now() * 0.002) * 80;
        this.x += (targetX - this.x) * 0.03;

        // --- TENTÁCULOS PERSEGUEM ---
        this.tentacles.forEach((tent, i) => {
            const angleOffset = (i / this.config.numTentacles) * Math.PI * 2;
            const isActive = (Date.now() + i * 1000) % 6000 < 3000;
            
            if (isActive) {
                const predictX = player.x + Math.cos(angleOffset) * 80;
                const predictY = player.y + Math.sin(angleOffset) * 80;
                
                const tip = tent[tent.length - 1];
                tip.x += (predictX - tip.x) * this.config.tentacleSpeed;
                tip.y += (predictY - tip.y) * this.config.tentacleSpeed;
            }
            
            const baseAngle = angleOffset + Date.now() * 0.0005;
            tent[0].x = this.x + Math.cos(baseAngle) * 60;
            tent[0].y = this.y + Math.sin(baseAngle) * 30;
        });

        this.updateTentacles();

        // --- BOSS ATIRA ---
        if (Date.now() - this.lastShot > this.config.shootInterval) {
            this.shoot();
            this.lastShot = Date.now();
        }

        this.updateProjectiles();
        this.checkCollision();

        if (this.health <= 0) this.defeat();
    },

    // FUNÇÃO PADRONIZADA DO ROBÔ
    bootShootsBoss: function() {
        const hit = Math.random() < this.config.bootHitChance;
        
        if (hit) {
            this.health -= this.config.bootDamage;
            
            if (Math.random() < 0.15) {
                showBonus("🤖");
            }
            
            audioSys.playTone(400, 'square', 0.04);
        }
    },

    shoot: function() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        
        for (let i = -0.5; i <= 0.5; i++) {
            const spreadAngle = angle + (i * 0.4);
            this.projectiles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(spreadAngle) * 4,
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
            
            if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height + 200) {
                this.projectiles.splice(i, 1);
            }
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
                    tent[i].x += dx * ratio * 0.3;
                    tent[i].y += dy * ratio * 0.3;
                }
            }
        });
    },

    checkCollision: function() {
        if (this.attackCooldown > 0) return;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        
        // 1. CABEÇA
        if (Math.sqrt(dx*dx + dy*dy) < this.config.headRadius + 20) {
            loseLife();
            this.attackCooldown = 60;
        }
        
        // 2. TENTÁCULOS (só as pontas)
        this.tentacles.forEach(tent => {
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
        
        // 4. PLAYER ATACA
        if (player.vy > 0 && Math.abs(dx) < 50 && dy > -50 && dy < 0) {
            this.health -= 10;
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
    
    // REMOVIDO: handleGeneration() - Não altera mais o ambiente!
};

if (typeof BossSchool !== 'undefined') BossSchool.register(bossTower);
