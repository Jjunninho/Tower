// js/boss_school.js
// O GERENCIADOR DE BOSSES — agora com integração ao BossFactory

const BossSchool = {
    students: [],
    currentBoss: null,

    lastBossDefeatedHeight: -9999,
    minGapBetweenBosses: 1500,

    // ─────────────────────────────────────────────────────────
    //  REGISTRO MANUAL (compatibilidade com bosses artesanais)
    //  Uso: BossSchool.register(meuBossObjeto)
    // ─────────────────────────────────────────────────────────
    register: function(bossModule) {
        this.students.push(bossModule);
        // Mantém a lista ordenada por altura de ativação
        this.students.sort((a, b) => a.startHeight - b.startHeight);
        console.log(`🎓 Boss matriculado: ${bossModule.name} (h=${bossModule.startHeight})`);
    },

    // ─────────────────────────────────────────────────────────
    //  INTEGRAÇÃO COM BossFactory
    //  Chame esta função UMA vez (ex: no início do jogo)
    //  para gerar N bosses procedurais e registrá-los.
    //
    //  Parâmetros:
    //    count    – quantidade de bosses a gerar (padrão: 12)
    //    startH   – altura do 1º boss gerado em metros (padrão: 2500)
    //    gap      – espaçamento entre bosses em metros (padrão: 2800)
    //
    //  Bosses artesanais registrados ANTES desta chamada continuam
    //  na lista e coexistem normalmente.
    // ─────────────────────────────────────────────────────────
    initFactory: function(count = 12, startH = 2500, gap = 2800) {
        if (typeof BossFactory === 'undefined') {
            console.warn('⚠️ BossFactory.js não foi carregado. Nenhum boss procedural gerado.');
            return;
        }

        console.group('🏭 BossFactory → BossSchool');
        for (let i = 0; i < count; i++) {
            // Tier de dificuldade escala de 1 (fácil) até 10 (épico)
            const tier   = Math.max(1, Math.min(10, 1 + Math.floor(i * 10 / count)));
            const sH     = startH + i * gap;
            const eH     = sH + Math.floor(gap * 0.8); // boss ocupa 80% do gap

            const boss = BossFactory.generate({
                heightTier:  tier,
                startHeight: sH,
                endHeight:   eH,
                debug:       false
            });

            // register() já ordena por altura
            this.register(boss);
        }
        console.log(`✅ ${count} bosses procedurais prontos (${startH}m → ${startH + count * gap}m)`);
        console.groupEnd();
    },

    // ─────────────────────────────────────────────────────────
    //  VERIFICAÇÃO E ATIVAÇÃO
    // ─────────────────────────────────────────────────────────
    checkEnrollment: function() {
        if (this.currentBoss && this.currentBoss.active) return;

        const currentHeight = game.maxHeight * 10;

        if (currentHeight < this.lastBossDefeatedHeight + this.minGapBetweenBosses) return;

        for (let boss of this.students) {
            if (!boss.completed &&
                currentHeight >= boss.startHeight &&
                currentHeight <= boss.endHeight) {

                this.currentBoss = boss;

                if (!boss.active) {
                    // Checkpoint de segurança antes do boss
                    const currentAltitude = -game.camera.y;
                    const currentBiome    = getCurrentBiome();
                    const safeY           = player.y + 100;

                    platforms.push({
                        x: canvas.width / 2 - 50, y: safeY,
                        width: 100, height: 20,
                        isCheckpoint: true, activated: true, placed: true
                    });

                    game.lastCheckpoint = {
                        x:       canvas.width / 2 - 50,
                        y:       safeY - 40,
                        altitude: currentAltitude,
                        cameraY: game.camera.y,
                        biome:   currentBiome.key
                    };

                    boss.active = true;
                    if (boss.init) boss.init();

                    showBonus(`⚠️ ${boss.name.toUpperCase()}! ⚠️`);
                }
                return;
            }
        }
    },

    update: function() {
        this.checkEnrollment();

        if (this.currentBoss && this.currentBoss.active) {
            this.currentBoss.update();

            if (this.currentBoss.completed) {
                console.log(`🏆 ${this.currentBoss.name} derrotado!`);
                this.lastBossDefeatedHeight = game.maxHeight * 10;
                this.currentBoss = null;
            }
        }
    },

    drawBackground: function(ctx) {
        if (this.currentBoss && this.currentBoss.active && this.currentBoss.drawBackground) {
            this.currentBoss.drawBackground(ctx);
        }
    },

    drawForeground: function(ctx) {
        if (this.currentBoss && this.currentBoss.active && this.currentBoss.drawForeground) {
            this.currentBoss.drawForeground(ctx);
        }
    },

    handleGeneration: function(currentY) {
        if (this.currentBoss && this.currentBoss.active && this.currentBoss.handleGeneration) {
            return this.currentBoss.handleGeneration(currentY);
        }
        return false;
    },

    // ─────────────────────────────────────────────────────────
    //  DEBUG: lista todos os bosses matriculados
    // ─────────────────────────────────────────────────────────
    listStudents: function() {
        console.table(this.students.map(b => ({
            nome:  b.name,
            inicio: b.startHeight + 'm',
            fim:    b.endHeight   + 'm',
            hp:     b.maxHealth,
            feito:  b.completed
        })));
    }
};

// ─────────────────────────────────────────────────────────────
//  AUTO-INICIALIZAÇÃO
//  Assim que este script é carregado, verifica se BossFactory
//  já está disponível e popula a escola automaticamente.
//
//  ┌──────────────────────────────────────────────────────────┐
//  │  CONFIGURAÇÃO RÁPIDA (edite aqui):                       │
//  │    count  = quantidade total de bosses procedurais       │
//  │    startH = altura do primeiro boss (em metros)          │
//  │    gap    = distância entre bosses (em metros)           │
//  └──────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────
(function autoInit() {
    if (typeof BossFactory !== 'undefined') {
        BossSchool.initFactory(
            12,     // count  — 12 bosses únicos
            2500,   // startH — primeiro boss a 2500m (final do GROUND)
            2800    // gap    — um boss a cada 2800m de subida
        );
    }
    // Se BossFactory não estiver carregado, a escola funciona
    // normalmente com apenas os bosses registrados manualmente.
})();
