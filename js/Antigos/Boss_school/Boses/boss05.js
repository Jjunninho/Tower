// js/boss05_mirror.js - "O ESPELHO FANTASMA"
const bossMirror = {
    name: "Espelho Fantasma",
    active: false,
    completed: false,
    startHeight: 14000, 
    endHeight: 15500,
    
    x: 0, y: 0,
    health: 100, maxHealth: 100,
    history: [], // Armazena posições do player
    delay: 60,   // Quantos frames de atraso (1 segundo a 60fps)
    
    tentacles: [], // Tentáculos decorativos fantasmagóricos
    
    config: {
        numTentacles: 8,
        segments: 10,
        segLength: 10,
        headRadius: 35,
        color1: 'rgba(255, 0, 212, 0.6)', // Rosa transparente
        color2: 'rgba(200, 0, 255, 0.4)'
    },

    init: function() {
        this.x = player.x;
        this.y = player.y + 500;
        this.health = 100;
        this.history = [];
        this.tentacles = [];
        
        // Cria tentáculos radiais
        for(let i=0; i<this.config.numTentacles; i++) {
            let segs = [];
            for(let j=0; j<this.config.segments; j++) segs.push({x:this.x, y:this.y});
            this.tentacles.push(segs);
        }
        
        bootSpeak("Ele está copiando seus movimentos!");
        boot.emotion = 'worried';
        showBonus("⚠️ ESPELHO FANTASMA! ⚠️");
    },

    update: function() {
        if (!this.active) return;
        
        // 1. Grava onde o player está
        this.history.push({x: player.x, y: player.y});
        
        // 2. Move para onde o player estava X frames atrás
        if (this.history.length > this.delay) {
            const pos = this.history.shift(); // Pega o mais antigo e remove
            this.x = pos.x;
            this.y = pos.y;
        } else {
            // Se ainda não tem histórico suficiente, aproxima-se lentamente
            this.x += (player.x - this.x) * 0.05;
            this.y += (player.y - this.y) * 0.05;
        }

        // 3. Atualiza Tentáculos (Efeito fantasmagórico flutuante)
        const time = Date.now() * 0.005;
        this.tentacles.forEach((tent, t) => {
            const angle = (t / this.config.numTentacles) * Math.PI * 2 + time;
            const targetX = this.x + Math.cos(angle) * 60;
            const targetY = this.y + Math.sin(angle) * 60;
            
            // Move a ponta
            tent[0].x = targetX;
            tent[0].y = targetY;
            
            // IK
            for(let i=1; i<tent.length; i++) {
                let dx = tent[i].x - tent[i-1].x;
                let dy = tent[i].y - tent[i-1].y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 0) {
                    let ratio = (dist - this.config.segLength) / dist;
                    tent[i].x -= dx * ratio;
                    tent[i].y -= dy * ratio;
                }
            }
        });

        // 4. Colisão
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        
        // Se tocar no fantasma: DANO
        if (dist < 40) loseLife();
        
        // Para matar: Tem que atraí-lo para armadilhas (Lava) ou usar escudo/tiro
        // Como simplificação: Se player usar ESCUDO e tocar nele, ele toma dano
        if (dist < 50 && player.hasShield) {
            this.health -= 2;
            audioSys.playTone(1000, 'sine', 0.1);
        }
        // Dano passivo por tempo (ele se desfaz)
        this.health -= 0.05;

        if (this.health <= 0) this.defeat();
    },

    drawForeground: function(ctx) {
        if (!this.active) return;
        
        // Desenha Cabeça Fantasma
        ctx.fillStyle = this.config.color1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.config.headRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Desenha Rosto
        ctx.fillStyle = '#fff';
        ctx.font = '30px Arial';
        ctx.fillText("?", this.x - 8, this.y + 10);

        // Desenha Tentáculos
        ctx.strokeStyle = this.config.color2;
        ctx.lineWidth = 4;
        this.tentacles.forEach(tent => {
            ctx.beginPath();
            ctx.moveTo(tent[0].x, tent[0].y);
            for(let i=1; i<tent.length; i++) ctx.lineTo(tent[i].x, tent[i].y);
            ctx.stroke();
        });
        
        // Barra de Vida
        ctx.fillStyle = '#f0f';
        ctx.fillRect(this.x - 30, this.y - 50, 60 * (this.health/100), 5);
    },

    defeat: function() {
        this.active = false;
        this.completed = true;
        game.score += 5000;
        showBonus("FANTASMA EXORCIZADO!");
    }
};

if (typeof BossSchool !== 'undefined') BossSchool.register(bossMirror);