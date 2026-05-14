// js/boss08_hydra.js - "A HIDRA ANCESTRAL" - VERSÃO OTIMIZADA
const bossHydra = {
    name: "Hidra Ancestral",
    active: false,
    completed: false,
    startHeight: 22000, 
    endHeight: 25000,
    
    x: 0, y: 0,
    health: 250, // Aumentado de 200 para 250
    maxHealth: 250,
    tentacles: [],
    
    // Cabeças derrotadas regeneram!
    defeatedHeads: 0,
    regenerationTimer: 0,
    isRegenerating: false,
    
    // Partículas de efeito
    particles: [],
    
    config: {
        numTentacles: 5,
        segments: 22, // Aumentado de 20 para 22 (pescoços mais longos)
        segLength: 22, // Aumentado de 20 para 22
        headRadius: 28, // Aumentado de 25 para 28 (cabeças maiores)
        color1: '#cc00ff',
        color2: '#9900cc',
        attackSpeed: 0.18, // Aumentado de 0.15 para 0.18 (mais rápido)
        normalSpeed: 0.06 // Aumentado de 0.05 para 0.06
    },

    init: function() {
        this.x = canvas.width / 2;
        this.y = player.y + 600;
        this.health = this.maxHealth;
        this.defeatedHeads = 0;
        this.regenerationTimer = 0;
        this.isRegenerating = false;
        this.particles = [];
        
        this.tentacles = [];
        for(let i = 0; i < this.config.numTentacles; i++) {
            let segs = [];
            let head = {
                x: this.x, 
                y: this.y, 
                state: 'idle', 
                timer: Math.random() * 100,
                defeated: false,
                health: 3, // Cada cabeça tem sua própria vida!
                maxHealth: 3,
                flashTimer: 0,
                angle: 0
            };
            for(let j = 0; j < this.config.segments; j++) {
                segs.push({x: this.x, y: this.y});
            }
            
            this.tentacles.push({
                segments: segs, 
                headData: head,
                index: i
            });
        }
        
        bootSpeak("MEU DEUS! OLHA QUANTAS CABEÇAS!");
        boot.emotion = 'worried';
        showBonus("⚠️ HIDRA ANCESTRAL! ⚠️");
        audioSys.playTone(80, 'sawtooth', 1.5, 0.8);
    },

    update: function() {
        const currentHeight = game.maxHeight * 10;
        
        // ATIVAÇÃO
        if (!this.active && !this.completed && currentHeight >= this.startHeight) {
            this.active = true;
            this.init();
        }

        if (!this.active) return;
        
        // Base acompanha a câmera lá embaixo
        this.y = game.camera.y + canvas.height + 100;
        this.x = canvas.width / 2;

        // Sistema de Regeneração (Mecânica da Hidra!)
        let aliveHeads = this.tentacles.filter(t => !t.headData.defeated).length;
        
        if (aliveHeads === 0 && !this.isRegenerating) {
            // TODAS as cabeças foram derrotadas! Regenera!
            this.isRegenerating = true;
            this.regenerationTimer = 0;
            bootSpeak("NÃO! ELA ESTÁ REGENERANDO!");
            boot.emotion = 'worried';
            showBonus("⚠️ HIDRA REGENERANDO! ⚠️");
        }
        
        if (this.isRegenerating) {
            this.regenerationTimer++;
            
            // Cria partículas de regeneração
            if (this.regenerationTimer % 3 === 0) {
                this.createRegenerationParticle();
            }
            
            if (this.regenerationTimer > 120) { // 2 segundos
                // Regenera TODAS as cabeças!
                this.tentacles.forEach(tent => {
                    tent.headData.defeated = false;
                    tent.headData.health = tent.headData.maxHealth;
                    tent.headData.state = 'idle';
                    tent.headData.timer = Math.random() * 50;
                });
                
                this.isRegenerating = false;
                this.defeatedHeads = 0;
                
                // Hidra fica mais forte a cada regeneração!
                this.config.attackSpeed = Math.min(0.25, this.config.attackSpeed + 0.02);
                
                bootSpeak("ELA VOLTOU MAIS FORTE!");
                boot.emotion = 'worried';
                showBonus("💀 REGENERAÇÃO COMPLETA! 💀");
                audioSys.playTone(200, 'sawtooth', 0.5);
            }
        }

        // Atualiza cada cabeça
        this.tentacles.forEach((tent, i) => {
            const head = tent.headData;
            
            if (head.defeated) {
                // Cabeça derrotada fica caída
                head.y += 2; // Cai lentamente
                this.updateNeck(tent);
                return;
            }
            
            head.timer++;
            head.flashTimer = Math.max(0, head.flashTimer - 1);
            
            let targetX, targetY;
            
            // Lógica de Estado da Cabeça
            if (head.state === 'idle') {
                // Flutua ao redor de forma mais orgânica
                const baseAngle = (i / this.config.numTentacles) * Math.PI * 2;
                const time = Date.now() * 0.0008;
                const angle = baseAngle + Math.sin(time + i) * 0.5;
                
                targetX = this.x + Math.cos(angle) * 320;
                targetY = this.y - 450 + Math.sin(time * 1.5 + i) * 80;
                
                // Cada cabeça ataca em intervalos diferentes
                const attackInterval = 120 + i * 30;
                if (head.timer > attackInterval) {
                    head.state = 'attack_warning';
                    head.timer = 0;
                }
            } 
            else if (head.state === 'attack_warning') {
                // Prepara bote - foca no player
                const predictionX = player.x + player.vx * 10; // Predição de movimento!
                targetX = predictionX + (Math.random() - 0.5) * 80;
                targetY = player.y - 250;
                
                if (head.timer > 35) { // Reduzido de 40 para 35
                    head.state = 'strike';
                    head.timer = 0;
                    audioSys.playTone(500, 'sawtooth', 0.15, 0.1);
                }
            }
            else if (head.state === 'strike') {
                // ATAQUE RÁPIDO!
                targetX = player.x;
                targetY = player.y;
                
                head.x += (targetX - head.x) * this.config.attackSpeed;
                head.y += (targetY - head.y) * this.config.attackSpeed;
                
                if (head.timer > 25) { // Aumentado de 20 para 25 (ataque mais longo)
                    head.state = 'return';
                    head.timer = 0;
                }
            }
            else if (head.state === 'return') {
                // Retorna à posição de idle
                const baseAngle = (i / this.config.numTentacles) * Math.PI * 2;
                targetX = this.x + Math.cos(baseAngle) * 300;
                targetY = this.y - 400;
                
                head.x += (targetX - head.x) * 0.08;
                head.y += (targetY - head.y) * 0.08;
                
                if (head.timer > 30) {
                    head.state = 'idle';
                    head.timer = 0;
                }
            }
            
            // Move cabeça suave (exceto no strike)
            if (head.state !== 'strike') {
                head.x += (targetX - head.x) * this.config.normalSpeed;
                head.y += (targetY - head.y) * this.config.normalSpeed;
            }

            // Atualiza ângulo da cabeça para olhar para o player
            const dx = player.x - head.x;
            const dy = player.y - head.y;
            head.angle = Math.atan2(dy, dx);

            // Atualiza Pescoço (IK)
            this.updateNeck(tent);
            
            // COLISÃO COM PLAYER (mais perdoável)
            const distP = Math.hypot((player.x + player.width/2) - head.x, 
                                     (player.y + player.height/2) - head.y);
            
            if (distP < this.config.headRadius + 15 && !player.invulnerable && !player.hasShield) {
                if (head.state === 'strike') {
                    loseLife();
                    head.state = 'return';
                    head.timer = 0;
                }
            }
            
            // DANO NA CABEÇA (pulo ou ataque de cima)
            if (player.vy > 3 && distP < 45 && !player.onGround && player.y < head.y) {
                head.health--;
                head.flashTimer = 5;
                player.vy = -12; // Impulso maior!
                
                audioSys.playTone(150, 'square', 0.15, 0.1);
                
                if (head.health <= 0) {
                    // Cabeça derrotada!
                    head.defeated = true;
                    this.defeatedHeads++;
                    this.health -= 50; // Dano no boss geral
                    
                    showBonus(`💀 CABEÇA ${this.defeatedHeads}/5 DERROTADA! +500`);
                    game.score += 500;
                    
                    audioSys.playTone(80, 'sawtooth', 0.3, 0.2);
                    
                    // Explosão de partículas
                    for(let p = 0; p < 15; p++) {
                        this.createDefeatParticle(head.x, head.y);
                    }
                    
                    if (this.defeatedHeads === 1) {
                        bootSpeak("UMA CABEÇA CAIU! CONTINUE!");
                        boot.emotion = 'excited';
                    }
                } else {
                    showBonus(`CABEÇA FERIDA! ${head.health}/${head.maxHealth} HP`);
                }
            }
        });

        // Atualiza partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravidade
            p.life--;
            p.alpha = p.life / p.maxLife;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // VITÓRIA!
        if (this.health <= 0) this.defeat();
    },

    updateNeck: function(tent) {
        // A ponta do pescoço é a cabeça
        tent.segments[0].x = tent.headData.x;
        tent.segments[0].y = tent.headData.y;
        
        // Resolve IK para o resto do pescoço até a base
        for(let j = 1; j < tent.segments.length; j++) {
            let s1 = tent.segments[j];
            let s2 = tent.segments[j-1];
            let dx = s1.x - s2.x;
            let dy = s1.y - s2.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                let r = (dist - this.config.segLength) / dist;
                s1.x -= dx * r * 0.5; // Mais suave
                s1.y -= dy * r * 0.5;
            }
        }
        
        // Última segmento cola na base
        const lastSeg = tent.segments[tent.segments.length - 1];
        lastSeg.x = this.x;
        lastSeg.y = this.y;
    },

    createDefeatParticle: function(x, y) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        
        this.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 30 + Math.random() * 20,
            maxLife: 40,
            alpha: 1,
            size: 3 + Math.random() * 4,
            color: Math.random() > 0.5 ? '#cc00ff' : '#ff00ff'
        });
    },

    createRegenerationParticle: function() {
        this.tentacles.forEach(tent => {
            if (tent.headData.defeated) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 50;
                
                this.particles.push({
                    x: tent.headData.x + Math.cos(angle) * dist,
                    y: tent.headData.y + Math.sin(angle) * dist,
                    vx: -Math.cos(angle) * 2,
                    vy: -Math.sin(angle) * 2,
                    life: 40,
                    maxLife: 40,
                    alpha: 1,
                    size: 4,
                    color: '#00ff00'
                });
            }
        });
    },

    drawBackground: function(ctx) {
        if (!this.active) return;
        
        // Fundo escuro ominoso
        ctx.fillStyle = "rgba(10, 0, 20, 0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Efeito de regeneração
        if (this.isRegenerating) {
            const pulse = Math.sin(this.regenerationTimer * 0.1) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(0, 255, 0, ${pulse * 0.15})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    },

    drawForeground: function(ctx) {
        if (!this.active) return;
        
        // Desenha base/corpo da Hidra
        ctx.fillStyle = '#1a001a';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 80, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = this.config.color1;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Desenha todos os pescoços
        this.tentacles.forEach(tent => {
            const head = tent.headData;
            
            // Pescoço com gradiente
            ctx.beginPath();
            ctx.moveTo(tent.segments[0].x, tent.segments[0].y);
            for(let j = 1; j < tent.segments.length; j++) {
                ctx.lineTo(tent.segments[j].x, tent.segments[j].y);
            }
            
            // Pescoço mais grosso na base
            const gradient = ctx.createLinearGradient(
                tent.segments[0].x, tent.segments[0].y,
                this.x, this.y
            );
            gradient.addColorStop(0, this.config.color1);
            gradient.addColorStop(1, this.config.color2);
            
            ctx.lineWidth = head.defeated ? 8 : 14;
            ctx.strokeStyle = gradient;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            
            if (head.defeated) return; // Não desenha cabeça derrotada
            
            // Cabeça com estado visual
            let headColor = this.config.color1;
            if (head.flashTimer > 0) {
                headColor = '#ffffff'; // Flash de dano
            } else if (head.state === 'attack_warning') {
                headColor = '#ff0000'; // Aviso de ataque
            } else if (head.state === 'strike') {
                headColor = '#ffffff'; // Ataque!
            }
            
            // Corpo da cabeça
            ctx.fillStyle = headColor;
            ctx.beginPath();
            ctx.arc(head.x, head.y, this.config.headRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Borda da cabeça
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Olho direcionado ao player
            const eyeX = head.x + Math.cos(head.angle) * 10;
            const eyeY = head.y + Math.sin(head.angle) * 10;
            
            ctx.fillStyle = head.state === 'strike' ? '#ff0000' : '#ffff00';
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Pupila
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Boca/Mandíbula
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            const mouthAngle = head.state === 'strike' ? 0.8 : 0.4;
            ctx.arc(head.x, head.y + 8, 10, 0, Math.PI * mouthAngle);
            ctx.stroke();
            
            // Barra de vida individual da cabeça
            if (head.health < head.maxHealth) {
                const barW = 40;
                const barH = 4;
                const barX = head.x - barW/2;
                const barY = head.y - this.config.headRadius - 10;
                
                ctx.fillStyle = '#000';
                ctx.fillRect(barX, barY, barW, barH);
                
                const hpRatio = head.health / head.maxHealth;
                ctx.fillStyle = hpRatio > 0.5 ? '#0f0' : '#f00';
                ctx.fillRect(barX, barY, barW * hpRatio, barH);
            }
        });
        
        // Desenha partículas
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        });
        ctx.globalAlpha = 1;
        
        // Barra de Vida Boss Principal (topo da tela)
        const barMargin = 10;
        const barW = canvas.width - barMargin * 2;
        const barH = 20;
        
        // Fundo da barra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barMargin - 2, barMargin - 2, barW + 4, barH + 4);
        
        // Vida
        const hpRatio = this.health / this.maxHealth;
        ctx.fillStyle = hpRatio > 0.5 ? '#0f0' : hpRatio > 0.25 ? '#ff0' : '#f00';
        ctx.fillRect(barMargin, barMargin, barW * hpRatio, barH);
        
        // Borda
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barMargin, barMargin, barW, barH);
        
        // Texto
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("HIDRA ANCESTRAL", canvas.width / 2, barMargin + 15);
        
        // Contador de cabeças
        const aliveHeads = this.tentacles.filter(t => !t.headData.defeated).length;
        ctx.font = '10px monospace';
        ctx.fillText(`Cabeças: ${aliveHeads}/5 | HP: ${Math.ceil(this.health)}/${this.maxHealth}`, 
                     canvas.width / 2, barMargin + barH + 15);
        
        // Aviso de regeneração
        if (this.isRegenerating) {
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('⚠️ REGENERANDO! ⚠️', canvas.width / 2, barMargin + barH + 30);
        }
        
        ctx.textAlign = 'left';
    },

    defeat: function() {
        this.active = false;
        this.completed = true;
        game.score += 12000; // Aumentado de 10000
        
        // Explosão final épica!
        for(let i = 0; i < 50; i++) {
            this.tentacles.forEach(tent => {
                this.createDefeatParticle(tent.headData.x, tent.headData.y);
            });
        }
        
        showBonus("🏆 LENDA DESTRUÍDA! +12000 PONTOS! 🏆");
        bootSpeak("INACREDITÁVEL! SOMOS LENDAS!");
        boot.emotion = 'excited';
        
        audioSys.playTone(100, 'sawtooth', 1.0, 0.5);
        setTimeout(() => audioSys.playTone(150, 'square', 0.5, 0.3), 200);
    },

    handleGeneration: function(currentY) {
        if (!this.active) return false;
        
        // Gera plataformas para facilitar o combate
        if (Math.random() < 0.8) {
            const numPlatforms = 2 + Math.floor(Math.random() * 2);
            const spacing = canvas.width / (numPlatforms + 1);
            
            for(let i = 1; i <= numPlatforms; i++) {
                platforms.push({
                    x: spacing * i - 60 + (Math.random() * 40 - 20),
                    y: currentY + 20,
                    width: 120,
                    height: 20,
                    moving: false
                });
            }
        }
        
        // Paredes laterais
        walls.push({ x: 0, y: currentY, width: 40, height: 100, placed: true });
        walls.push({ x: canvas.width - 40, y: currentY, width: 40, height: 100, placed: true });
        
        return true;
    }
};

if (typeof BossSchool !== 'undefined') {
    BossSchool.register(bossHydra);
}