// ===== js/3_biomes.js =====
// GERADOR INFINITO DE BIOMAS PROCEDURAIS (Híbridos, Parallax e Física)

const BiomeSystem = (() => {

    // ── CONFIGURAÇÕES GLOBAIS ──
    const BIOME_HEIGHT = 2000;
    
    const BIOME_ARCHETYPES = [
        "LAVA", "ICE", "FOREST", "TOXIC", "CRYSTAL", 
        "VOID", "MACHINE", "DESERT", "BIO_LAB", "ASTRAL"
    ];

    const UI_NAMES = {
        LAVA: "Magma", ICE: "Glacial", FOREST: "Selva", TOXIC: "Tóxico", 
        CRYSTAL: "Cristalino", VOID: "Vazio", MACHINE: "Metálico", 
        DESERT: "Deserto", BIO_LAB: "Laboratório", ASTRAL: "Astral"
    };

    // ── HELPERS MATEMÁTICOS ──
    function biomeHash(n, seed = 1337) {
        let x = Math.sin(n * 9999 + seed) * 10000;
        return x - Math.floor(x);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function hexToRgb(hex) {
        const bigint = parseInt(hex.replace('#', ''), 16);
        return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
    }

    function lerpColor(c1, c2, t) {
        const rgb1 = hexToRgb(c1);
        const rgb2 = hexToRgb(c2);
        const r = Math.round(lerp(rgb1.r, rgb2.r, t));
        const g = Math.round(lerp(rgb1.g, rgb2.g, t));
        const b = Math.round(lerp(rgb1.b, rgb2.b, t));
        return `rgb(${r},${g},${b})`;
    }

    function getBiomeBaseColor(type) {
        const map = {
            LAVA: "#2b0808", ICE: "#0a1f33", FOREST: "#012110", TOXIC: "#12001a",
            CRYSTAL: "#050514", VOID: "#000005", MACHINE: "#1a1a1a", DESERT: "#2b1400",
            BIO_LAB: "#001f1f", ASTRAL: "#14052b"
        };
        return map[type] || "#000000";
    }

    function getBiomeAccentColor(type) {
        const map = {
            LAVA: "#ff4400", ICE: "#00ffff", FOREST: "#00ff44", TOXIC: "#cc00ff",
            CRYSTAL: "#ffffff", VOID: "#440088", MACHINE: "#ffaa00", DESERT: "#ffcc00",
            BIO_LAB: "#00ffcc", ASTRAL: "#ff00ff"
        };
        return map[type] || "#ffffff";
    }

    let cachedChunk = -1;
    let cachedLayers = [];

    return {
        getProceduralBiome: function(altitude, seed = 1337) {
            // Segurança extrema contra NaN
            if (isNaN(altitude) || altitude == null) altitude = 0;
            
            const chunk = Math.floor(altitude / BIOME_HEIGHT);

            const primaryIndex = Math.floor(biomeHash(chunk, seed) * BIOME_ARCHETYPES.length);
            const secondaryIndex = Math.floor(biomeHash(chunk + 1, seed) * BIOME_ARCHETYPES.length);
            const blendFactor = biomeHash(chunk + 999, seed);

            return {
                chunk: chunk,
                primary: BIOME_ARCHETYPES[primaryIndex] || "VOID",
                secondary: BIOME_ARCHETYPES[secondaryIndex] || "VOID",
                blend: blendFactor
            };
        },

        getPhysics: function(biome) {
            const basePhysics = { gravityMod: 1, friction: 0, accel: 0 };
            
            // Fallback seguro caso o bioma venha quebrado
            if (!biome || !biome.primary) return basePhysics;

            const modifiers = {
                LAVA:    { gravityMod: 1.1 },
                ICE:     { friction: 0.98, accel: 0.25 },  
                VOID:    { gravityMod: 0.4, friction: 0.98, accel: 0.4 }, 
                MACHINE: { friction: 0 },
                TOXIC:   { gravityMod: 0.8 },
                ASTRAL:  { gravityMod: 0.5, accel: 0.3 }
            };

            const p1 = modifiers[biome.primary] || {};
            const p2 = modifiers[biome.secondary] || {};

            return {
                gravityMod: lerp(p1.gravityMod || basePhysics.gravityMod, p2.gravityMod || basePhysics.gravityMod, biome.blend),
                friction:   lerp(p1.friction   || basePhysics.friction,   p2.friction   || basePhysics.friction,   biome.blend),
                accel:      lerp(p1.accel      || basePhysics.accel,      p2.accel      || basePhysics.accel,      biome.blend)
            };
        },

        generateLayers: function(biome, seed) {
            const layers = [];
            const density = 20 + Math.floor(biome.blend * 50);

            for (let i = 0; i < density; i++) {
                layers.push({
                    x: biomeHash(i, seed) * (window.innerWidth || 800), 
                    y: biomeHash(i + 500, seed) * (window.innerHeight || 600),
                    size: 1 + biomeHash(i + 999, seed) * 15,
                    speed: 0.05 + biomeHash(i + 777, seed) * 0.4,
                    alpha: 0.1 + biomeHash(i + 123, seed) * 0.4
                });
            }
            return layers;
        },

        drawBackground: function(ctx, biome, altitude, seed) {
            if (isNaN(altitude) || altitude == null) altitude = 0;
            
            if (biome.chunk !== cachedChunk) {
                cachedLayers = this.generateLayers(biome, seed);
                cachedChunk = biome.chunk;
            }

            const color1 = getBiomeBaseColor(biome.primary);
            const color2 = getBiomeBaseColor(biome.secondary);
            ctx.fillStyle = lerpColor(color1, color2, biome.blend);
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const accentColor = getBiomeAccentColor(biome.secondary);
            ctx.fillStyle = accentColor;

            cachedLayers.forEach(layer => {
                const offsetY = (altitude * layer.speed) % canvas.height;
                let drawY = layer.y + offsetY;
                
                if (drawY > canvas.height + layer.size) drawY -= canvas.height;
                else if (drawY < -layer.size) drawY += canvas.height;

                ctx.globalAlpha = layer.alpha;
                ctx.beginPath();
                ctx.arc(layer.x, drawY, layer.size, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.globalAlpha = 1;
        },

        getEvents: function(biome, altitude) {
            if (isNaN(altitude)) altitude = 0;
            const intensity = Math.abs(Math.sin(altitude / 5000));
            return {
                meteorRain: biome.primary === "ASTRAL" && intensity > 0.7,
                toxicStorm: biome.primary === "TOXIC" && intensity > 0.6,
                gravityPulse: biome.primary === "VOID" && intensity > 0.8
            };
        },

        getUIName: function(biome) {
            return `${UI_NAMES[biome.primary] || ''} ${UI_NAMES[biome.secondary] || ''}`.trim();
        },
        
        getAccentColor: getBiomeAccentColor
    };
})();

// ============================================================================
// ADAPTADORES BLINDADOS PARA O 6_MAIN.JS
// ============================================================================

function getCurrentBiome() {
    let altitude = 0;
    if (typeof game !== 'undefined' && game.camera && !isNaN(game.camera.y)) {
        altitude = Math.max(0, -game.camera.y);
    }

    let seed = 1337;
    if (typeof game !== 'undefined' && game.seed) {
        const s = game.seed.toString();
        if (s.length > 0) seed = s.charCodeAt(0);
    }

    const procBiome = BiomeSystem.getProceduralBiome(altitude, seed);
    procBiome.key = procBiome.primary; 
    procBiome.name = BiomeSystem.getUIName(procBiome);
    return procBiome;
}

function getBiomePhysics(biomeParam) {
    // CORREÇÃO DO B.O: 
    // Se o 6_main passar uma string (ex: 'ASTRAL'), nós ignoramos e calculamos o objeto correto na hora!
    let actualBiome = biomeParam;
    if (typeof biomeParam === 'string' || !biomeParam || !biomeParam.primary) {
        actualBiome = getCurrentBiome();
    }
    return BiomeSystem.getPhysics(actualBiome);
}

function drawBiomeBackground(ctx, biome, altitude) {
    let seed = 1337;
    if (typeof game !== 'undefined' && game.seed) {
        const s = game.seed.toString();
        if (s.length > 0) seed = s.charCodeAt(0);
    }
    BiomeSystem.drawBackground(ctx, biome, altitude, seed);
}

function updateBiomeUI() {
    const biome = getCurrentBiome();
    const biomeElement = document.getElementById('biome');
    
    if (biomeElement) {
        let suffix = "";
        const phys = BiomeSystem.getPhysics(biome);
        if (phys.gravityMod < 0.8) suffix = " <small>(Gravidade Baixa 🌑)</small>";
        else if (phys.accel > 0) suffix = " <small>(Piso Escorregadio ❄️)</small>";
        
        biomeElement.innerHTML = biome.name + suffix;
        biomeElement.style.color = BiomeSystem.getAccentColor(biome.primary);
    }
}