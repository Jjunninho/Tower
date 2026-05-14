// js/boss08_hydra.js - "A HIDRA ANCESTRAL"
const bossHydra = {
    name: "Hidra Ancestral",
    active: false,
    completed: false,
    startHeight: 22000, 
    endHeight: 25000,
    
    x: 0, y: 0,
    health: 200, maxHealth: 200, // Vida dobrada
    tentacles: [], // Cada tentáculo é um pescoço com cabeça
    
    config: {
        numTentacles: 5, // 5 Cabeças!
        segments: 20,
        segLength: 20,
        headRadius: 25,
        color1: '#cc00ff',
        color2: '#9900cc'
    },

    init: function() {
        this.x = canvas.width / 2;
        this.y = player.y + 600; // Base nasce lá embaixo
        this.health = 200;
        
        this.tentacles = [];
        for(let i=0; i<this.config.numTentacles; i++) {
            let segs = [];
            // Cada cabeça tem um alvo independente
            let head = {x: this.x, y: this.y, state: 'idle', timer: Math.random()*100};
            for(let j=0; j<this.config.segments; j++) segs.push({x:this.x, y:this.y});
            
            this.tentacles.push({segments: segs, headData: head});
        }
        
        bootSpeak("MEU DEUS! OLHA QUANTAS CABEÇAS!");
        boot.emotion = 'worried';
        showBonus("⚠️ HIDRA ANCESTRAL! ⚠️");
    },

    update: function() {
        if (!this.active) return;
        
        // Base acompanha a câmera lá embaixo
        this.y = game.camera.y + canvas.height + 100;
        this.x = canvas.width / 2;

        // Atualiza cada cabeça
        this.tentacles.forEach((tent, i) => {
            const head = tent.headData;
            head.timer++;
            
            let targetX, targetY;
            
            // Lógica de Estado da Cabeça
            if (head.state === 'idle') {
                // Flutua ao redor
                const angle = (i / this.config.numTentacles) * Math.PI * 2 + Date.now()*0.001;
                targetX = this.x + Math.cos(angle) * 300;
                targetY = this.y - 400 + Math.sin(angle) * 50;
                
                if (head.timer > 150) {
                    head.state = 'attack_warning';
                    head.timer = 0;
                }
            } 
            else if (head.state === 'attack_warning') {
                // Prepara bote (fica vermelha)
                targetX = player.x + (Math.random()-0.5)*100;
                targetY = player.y - 200; // Recua
                if (head.timer > 40) {
                    head.state = 'strike';
                    head.timer = 0;
                    audioSys.playTone(500, 'sawtooth', 0.1);
                }
            }
            else if (head.state === 'strike') {
                // ATACA!
                targetX = player.x;
                targetY = player.y;
                // Move muito rápido
                head.x += (targetX - head.x) * 0.15;
                head.y += (targetY - head.y) * 0.15;
                
                if (head.timer > 20) {
                    head.state = 'return';
                    head.timer = 0;
                }
            }
            else if (head.state === 'return') {
                head.state = 'idle';
            }
            
            // Move cabeça suave (exceto no strike)
            if (head.state !== 'strike') {
                head.x += (targetX - head.x) * 0.05;
                head.y += (targetY - head.y) * 0.05;
            }

            // Atualiza Pescoço (IK)
            // A ponta do pescoço é a cabeça
            tent.segments[0].x = head.x;
            tent.segments[0].y = head.y;
            
            // Resolve IK para o resto do pescoço até a base
            for(let j=1; j<tent.segments.length; j++) {
                let s1 = tent.segments[j];
                let s2 = tent.segments[j-1];
                let dx = s1.x - s2.x;
                let dy = s1.y - s2.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 0) {
                    let r = (dist - this.config.segLength) / dist;
                    s1.x -= dx * r;
                    s1.y -= dy * r;
                }
            }
            
            // Colisão com esta cabeça
            const distP = Math.hypot(player.x - head.x, player.y - head.y);
            if (distP < this.config.headRadius + 10) loseLife();
            
            // Dano na cabeça (pulo)
            if (player.vy > 0 && distP < 40 && !player.onGround) {
                this.health -= 10;
                player.vy = -10;
                audioSys.playTone(150, 'square', 0.1);
                showBonus("CABEÇA ESMAGADA!");
                // Reseta cabeça atingida
                head.state = 'return';
            }
        });

        if (this.health <= 0) this.defeat();
    },

    drawForeground: function(ctx) {
        if (!this.active) return;
        
        this.tentacles.forEach(tent => {
            const head = tent.headData;
            
            // Desenha Pescoço
            ctx.beginPath();
            ctx.moveTo(tent.segments[0].x, tent.segments[0].y);
            for(let j=1; j<tent.segments.length; j++) ctx.lineTo(tent.segments[j].x, tent.segments[j].y);
            ctx.lineWidth = 12;
            ctx.strokeStyle = this.config.color2;
            ctx.stroke();
            
            // Desenha Cabeça
            ctx.fillStyle = head.state === 'attack_warning' ? '#ff0000' : 
                          head.state === 'strike' ? '#ffffff' : this.config.color1;
            
            ctx.beginPath();
            ctx.arc(head.x, head.y, this.config.headRadius, 0, Math.PI*2);
            ctx.fill();
            
            // Boca
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(head.x, head.y + 10, 8, 0, Math.PI);
            ctx.fill();
        });
        
        // Barra de Vida Boss Gigante
        ctx.fillStyle = '#f00';
        ctx.fillRect(10, 10, (canvas.width-20) * (this.health/this.maxHealth), 15);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(10, 10, canvas.width-20, 15);
        ctx.fillStyle = '#fff';
        ctx.fillText("HIDRA ANCESTRAL", 20, 22);
    },

    defeat: function() {
        this.active = false;
        this.completed = true;
        game.score += 10000;
        showBonus("LENDA DESTRUÍDA! VOCÊ VENCEU!");
        bootSpeak("INACREDITÁVEL! SOMOS LENDAS!");
        boot.emotion = 'excited';
    }
};

if (typeof BossSchool !== 'undefined') BossSchool.register(bossHydra);