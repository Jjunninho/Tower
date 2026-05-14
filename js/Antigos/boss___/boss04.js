// js/boss01_serpent.js - "A SERPENTE DE PLASMA" - VERSÃO COM ROBÔ
const bossSerpent = {
    name: "Serpente de Plasma",
    active: false,
    completed: false,
    startHeight: 7000, 
    endHeight: 8500,
    
    x: 0, y: 0,
    health: 150, maxHealth: 150, // Aumentei pra compensar ajuda do robô
    tentacles: [],
    state: 'floating', // Estados: floating, charging, dashing
    stateTimer: 0,
    attackCooldown: 0,
    sparkles: [], // NOVO: Faíscas elétricas
    lastSparkShot: 0,
    
    config: {
        numTentacles: 1,
        segments: 30,
        segLength: 12,
        headRadius: 30,
        color1: '#7700ff', // Roxo Elétrico
        color2: '#00ffff', // Ciano
        sparkInterval: 2000, // Faíscas a cada 2 segundos
        bootShootInterval: 1600, // Robô atira a cada 1.6s
        bootDamage: 0.28 // Dano do robô
    },

    init: function() {
        this.x = canvas.width / 2;
        this.y = player.y - 300;
        this.health = 150;
        this.tentacles = [];
        this.sparkles = [];
        this.attackCooldown = 0;
        this.lastSparkShot = Date.now();
        
        let body = [];
        for(let i=0; i<this.config.segments; i++) {
            body.push({x: this.x - i * this.config.segLength, y: this.y});
        }
        this.tentacles.push(body);
        
        bootSpeak("Cuidado! Sobrecarga de energia detectada!");
        boot.emotion = 'worried';
        showBonus("⚡ SERPENTE DE PLASMA ⚡");
        audioSys.playTone(100, 'sawtooth', 1.5, 0.7);
    },

    update: function() {
        if (!this.active) return;
        
        this.stateTimer++;
        if (this.attackCooldown > 0) this.attackCooldown--;

        // --- COMPORTAMENTO DO ROBÔ ---
        boot.state = 'controlled_by_boss';
        boot.emotion = (this.state === 'charging') ? 'worried' : 'angry';
        
        // Robô fica em posição estratégica (lado oposto da serpente)
        const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
        const oppositeAngle = angleToPlayer + Math.PI; // Lado oposto
        
        const targetBootX = this.x + Math.cos(oppositeAngle) * 180;
        const targetBootY = this.y + Math.sin(oppositeAngle) * 120 - 80;
        
        boot.x += (targetBootX - boot.x) * 0.08;
        boot.y += (targetBootY - boot.y) * 0.08;

        // Robô atira na serpente
        if (!boot.lastBossShot) boot.lastBossShot = 0;
        if (Date.now() - boot.lastBossShot > this.config.bootShootInterval) {
            this.bootShootsBoss();
            boot.lastBossShot = Date.now();
        }

        // Falas do robô baseadas no estado
        if (Math.random() < 0.003) {
            let frases = [];
            if (this.state === 'charging') {
                frases = ["Ela vai atacar!", "Prepara pra desviar!", "CUIDADO!"];
            } else if (this.state === 'dashing') {
                frases = ["Esquiva!", "Sai da frente!"];
            } else {
                frases = ["Continua se movendo!", "Eu ataco de longe!", "Pula nela!"];
            }
            bootSpeak(frases[Math.floor(Math.random() * frases.length)]);
        }

        // --- LÓGICA DE ESTADOS DA SERPENTE ---
        const targetX = player.x;
        const targetY = player.y;

        if (this.state === 'floating') {
            // Perseguição suave + movimento ondulatório
            const wave = Math.sin(Date.now() * 0.004) * 60;
            this.x += (targetX + wave - this.x) * 0.04;
            this.y += (targetY - 120 - this.y) * 0.04;
            
            if (this.stateTimer > 120) { // Após 2 segundos
                this.state = 'charging';
                this.stateTimer = 0;
                audioSys.playTone(150, 'triangle', 0.3);
            }
        } 
        else if (this.state === 'charging') {
            // Vibra no lugar (aviso visual!)
            this.x += Math.sin(Date.now() * 0.05) * 8;
            this.y += Math.cos(Date.now() * 0.04) * 6;
            
            if (this.stateTimer > 50) { // Após ~0.8s
                this.state = 'dashing';
                this.stateTimer = 0;
                
                // Direção do dash (predição onde o player estará)
                const futureX = targetX + player.vx * 25;
                const futureY = targetY + player.vy * 25;
                
                const angle = Math.atan2(futureY - this.y, futureX - this.x);
                this.dashVX = Math.cos(angle) * 16;
                this.dashVY = Math.sin(angle) * 16;
                
                audioSys.playTone(250, 'sawtooth', 0.4);
                if (Math.random() < 0.6) showBonus("⚡ DASH!");
            }
        } 
        else if (this.state === 'dashing') {
            // Movimento rápido e reto
            this.x += this.dashVX;
            this.y += this.dashVY;
            
            if (this.stateTimer > 35) {
                this.state = 'floating';
                this.stateTimer = 0;
            }
        }

        // ATAQUE: Faíscas elétricas
        if (Date.now() - this.lastSparkShot > this.config.sparkInterval && this.state === 'floating') {
            this.shootSparks();
            this.lastSparkShot = Date.now();
        }

        // Atualiza faíscas
        this.updateSparks();

        // Atualiza física do corpo
        this.updateBody();

        // Colisões
        this.checkCollisions();

        if (this.health <= 0) this.defeat();
    },

    shootSparks: function() {
        // Atira faíscas em várias direções (padrão circular)
        const numSparks = 6;
        for (let i = 0; i < numSparks; i++) {
            const angle = (i / numSparks) * Math.PI * 2;
            this.sparkles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 5,
                vy: Math.sin(angle) * 5,
                radius: 6,
                age: 0
            });
        }
        audioSys.playTone(180, 'square', 0.15);
    },

    updateSparks: function() {
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            const s = this.sparkles[i];
            s.x += s.vx;
            s.y += s.vy;
            s.age++;
            
            // Faíscas desaceleram
            s.vx *= 0.98;
            s.vy *= 0.98;
            
            // Remove se muito velha ou fora da tela
            if (s.age > 120 || s.x < -50 || s.x > canvas.width + 50 || 
                s.y < -50 || s.y > canvas.height + 200) {
                this.sparkles.splice(i, 1);
            }
        }
    },

    updateBody: function() {
        const body = this.tentacles[0];
        body[0].x = this.x;
        body[0].y = this.y;
        
        for(let i=1; i<body.length; i++) {
            let dx = body[i].x - body[i-1].x;
            let dy = body[i].y - body[i-1].y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > this.config.segLength) {
                let ratio = (dist - this.config.segLength) / dist;
                // Durante dash, corpo é mais rígido
                const stiffness = (this.state === 'dashing') ? 0.9 : 0.6;
                body[i].x -= dx * ratio * stiffness;
                body[i].y -= dy * ratio * stiffness;
            }
        }
    },

    bootShootsBoss: function() {
        const hit = Math.random() < 0.48; // 48% acerto
        
        if (hit) {
            this.health -= this.config.bootDamage;
            
            if (Math.random() < 0.15) {
                showBonus("🤖");
            }
            
            audioSys.playTone(390, 'square', 0.04);
        }
    },

    checkCollisions: function() {
        if (this.attackCooldown > 0) return;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // 1. CABEÇA da serpente
        if (dist < this.config.headRadius + 18) {
            loseLife();
            this.attackCooldown = 60;
            return;
        }

        // 2. CORPO (apenas parte traseira machuca)
        const body = this.tentacles[0];
        for (let i = Math.floor(body.length / 2); i < body.length; i++) {
            const seg = body[i];
            const dsx = player.x - seg.x;
            const dsy = player.y - seg.y;
            
            if (Math.sqrt(dsx*dsx + dsy*dsy) < 15) {
                loseLife();
                this.attackCooldown = 60;
                return;
            }
        }

        // 3. FAÍSCAS ELÉTRICAS
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            const s = this.sparkles[i];
            const dspx = player.x - s.x;
            const dspy = player.y - s.y;
            
            if (Math.sqrt(dspx*dspx + dspy*dspy) < s.radius + 15) {
                loseLife();
                this.sparkles.splice(i, 1);
                this.attackCooldown = 60;
                return;
            }
        }

        // 4. PLAYER ATACA (pulo na cabeça)
        if (player.vy > 0 && dist < 55 && dy < 0 && dy > -50) {
            this.health -= 14;
            player.vy = -15;
            showBonus("💥 OVERLOAD! -14 HP");
            audioSys.playTone(350, 'square', 0.25);
            
            // Serpente é empurrada pra trás
            const knockbackAngle = Math.atan2(this.y - player.y, this.x - player.x);
            this.x += Math.cos(knockbackAngle) * 40;
            this.y += Math.sin(knockbackAngle) * 40;
        }
    },

    drawForeground: function(ctx) {
        if (!this.active) return;
        
        this.drawBody(ctx);
        this.drawHead(ctx);
        this.drawSparks(ctx);
        this.drawHealthBar(ctx);
    },

    drawBody: function(ctx) {
        const body = this.tentacles[0];
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Efeito de brilho baseado no estado
        if (this.state === 'charging') {
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#fff';
        } else if (this.state === 'dashing') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.config.color2;
        } else {
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.config.color1;
        }
        
        // Desenha corpo
        ctx.beginPath();
        ctx.moveTo(body[0].x, body[0].y);
        for (let i = 1; i < body.length - 1; i++) {
            let xc = (body[i].x + body[i+1].x) / 2;
            let yc = (body[i].y + body[i+1].y) / 2;
            ctx.quadraticCurveTo(body[i].x, body[i].y, xc, yc);
        }
        ctx.lineTo(body[body.length-1].x, body[body.length-1].y);
        
        // Espessura varia com estado
        ctx.lineWidth = (this.state === 'dashing') ? 20 : 14;
        
        // Gradiente no corpo
        const gradient = ctx.createLinearGradient(
            body[0].x, body[0].y,
            body[body.length-1].x, body[body.length-1].y
        );
        gradient.addColorStop(0, this.config.color2);
        gradient.addColorStop(0.5, this.config.color1);
        gradient.addColorStop(1, '#4400aa');
        
        ctx.strokeStyle = gradient;
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        // Pulsos elétricos no corpo
        if (this.state !== 'dashing') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            const pulsePos = (Date.now() % 1000) / 1000;
            const pulseIndex = Math.floor(pulsePos * body.length);
            
            if (pulseIndex < body.length) {
                ctx.beginPath();
                ctx.arc(body[pulseIndex].x, body[pulseIndex].y, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },

    drawHead: function(ctx) {
        // Brilho intenso durante charging
        if (this.state === 'charging') {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ffffff';
        }
        
        // Cabeça principal
        const headColor = (this.state === 'charging') ? '#ffffff' : this.config.color2;
        ctx.fillStyle = headColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.config.headRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Olhos elétricos
        const eyeColor = (this.state === 'dashing') ? '#ff0000' : this.config.color1;
        ctx.fillStyle = eyeColor;
        
        const eyeAngle = Math.atan2(player.y - this.y, player.x - this.x);
        
        // Olho esquerdo
        ctx.beginPath();
        ctx.arc(this.x - 10, this.y - 8, 5, 0, Math.PI*2);
        ctx.fill();
        
        // Olho direito
        ctx.beginPath();
        ctx.arc(this.x + 10, this.y - 8, 5, 0, Math.PI*2);
        ctx.fill();
        
        // Pupila brilhante
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(
            this.x - 10 + Math.cos(eyeAngle) * 2,
            this.y - 8 + Math.sin(eyeAngle) * 2,
            2, 0, Math.PI*2
        );
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
            this.x + 10 + Math.cos(eyeAngle) * 2,
            this.y - 8 + Math.sin(eyeAngle) * 2,
            2, 0, Math.PI*2
        );
        ctx.fill();
    },

    drawSparks: function(ctx) {
        this.sparkles.forEach(s => {
            // Faísca com brilho pulsante
            const pulse = 1 - (s.age / 120);
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.config.color2;
            
            // Gradiente radial
            const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.5, this.config.color2);
            gradient.addColorStop(1, this.config.color1);
            
            ctx.fillStyle = gradient;
            ctx.globalAlpha = pulse;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            
            // Rastro da faísca
            ctx.strokeStyle = this.config.color2;
            ctx.lineWidth = 2;
            ctx.globalAlpha = pulse * 0.5;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - s.vx * 2, s.y - s.vy * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        });
    },

    drawHealthBar: function(ctx) {
        const w = 200;
        const h = 12;
        const x = this.x - w/2;
        const y = this.y - this.config.headRadius - 28;
        
        // Fundo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x-2, y-2, w+4, h+4);
        
        // Barra com gradiente elétrico
        const hpGradient = ctx.createLinearGradient(x, y, x + w, y);
        hpGradient.addColorStop(0, this.config.color2);
        hpGradient.addColorStop(1, this.config.color1);
        
        ctx.fillStyle = hpGradient;
        ctx.fillRect(x, y, w * (this.health/this.maxHealth), h);
        
        // Texto
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 3;
        ctx.shadowColor = '#000';
        ctx.fillText(`HP: ${Math.ceil(this.health)}/${this.maxHealth}`, this.x, y - 5);
        ctx.shadowBlur = 0;
    },

    defeat: function() {
        this.active = false;
        this.completed = true;
        game.score += 5000;
        showBonus("⚡ SISTEMA DESLIGADO! ⚡");
        bootSpeak("Energia neutralizada! Bom trabalho!");
        boot.emotion = 'happy';
        boot.state = 'following';
        
        // Som de curto-circuito
        audioSys.playTone(400, 'sawtooth', 0.2);
        setTimeout(() => audioSys.playTone(300, 'sawtooth', 0.2), 100);
        setTimeout(() => audioSys.playTone(200, 'sawtooth', 0.3), 200);
        setTimeout(() => audioSys.playTone(100, 'sawtooth', 0.4), 300);
    }
};

if (typeof BossSchool !== 'undefined') BossSchool.register(bossSerpent);