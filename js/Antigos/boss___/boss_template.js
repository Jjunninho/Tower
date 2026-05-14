// js/boss_template.js
// Use este arquivo como base (copiar e colar) para criar novos bosses

const bossTemplate = {
    name: "Nome do Boss Aqui",
    
    // Configuração de Ativação
    active: false,
    completed: false,
    startHeight: 5000, // Altura que ele começa (ex: 5000m)
    endHeight: 6500,   // Altura que ele termina se não matar
    
    // Dados do Boss
    x: 0,
    y: 0,
    health: 100,
    maxHealth: 100,

    // 1. Inicialização (Chamado uma vez quando o boss ativa)
    init: function() {
        this.x = canvas.width / 2;
        this.y = player.y - 300;
        this.health = 100;
        
        bootSpeak("Cuidado! Um novo inimigo apareceu!");
        boot.emotion = 'worried';
        
        showBonus(`⚠️ ${this.name.toUpperCase()}! ⚠️`);
        audioSys.playTone(80, 'sawtooth', 3.0, 0.8);
    },

    // 2. Loop Principal (Chamado a cada frame)
    update: function() {
        if (!this.active) return;
        
        // --- LÓGICA DE MOVIMENTO ---
        // this.x += ...
        
        // --- LÓGICA DE ATAQUE ---
        // if (Math.random() < 0.01) this.shoot();

        // --- CONDIÇÃO DE VITÓRIA ---
        if (this.health <= 0) {
            this.active = false;
            this.completed = true;
            game.score += 2000;
            showBonus("BOSS DERROTADO!");
            bootSpeak("Conseguimos!");
            boot.emotion = 'happy';
        }
    },

    // 3. Desenho atrás do jogo (Fundo preto, efeitos, etc)
    drawBackground: function(ctx) {
        if (!this.active) return;
        // ctx.fillStyle = 'black'; ...
    },

    // 4. Desenho na frente do jogo (O boss, tiros, lasers)
    drawForeground: function(ctx) {
        if (!this.active) return;
        
        // Desenha o Boss
        // ctx.fillStyle = 'red';
        // ctx.fillRect(this.x, this.y, 50, 50);
    },

    // 5. Geração de Terreno (Opcional)
    // Retorne true se você gerou o terreno neste frame, para o jogo não gerar plataformas normais
    handleGeneration: function(currentY) {
        if (!this.active) return false;
        
        // Exemplo: Paredes laterais para prender o jogador
        // walls.push({ x: 0, y: currentY, width: 50, height: 100, placed: true });
        // walls.push({ x: canvas.width - 50, y: currentY, width: 50, height: 100, placed: true });
        
        // return true; // Bloqueia geração normal
        return false;   // Permite geração normal misturada com o boss
    }
};

// Matrícula na escola
if (typeof BossSchool !== 'undefined') {
    BossSchool.register(bossTemplate);
}