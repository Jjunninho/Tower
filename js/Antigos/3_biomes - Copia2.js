// ===== SISTEMA DE BIOMAS =====
const BIOMES = {
    UNDERGROUND: { min: -Infinity, max: 0, name: "Subterrâneo" },
    GROUND: { min: 0, max: 2000, name: "Superfície" },
    FOREST: { min: 2000, max: 4000, name: "Floresta Flutuante" },
    CLOUDS: { min: 4000, max: 7000, name: "Reino das Nuvens" },
    TWILIGHT: { min: 7000, max: 10000, name: "Crepúsculo" },
    SPACE: { min: 10000, max: 15000, name: "Espaço Sideral" },
    COSMIC: { min: 15000, max: Infinity, name: "Vazio Cósmico" }
};

function getCurrentBiome() {
    const altitude = -game.camera.y; 
    for (let key in BIOMES) {
        const biome = BIOMES[key];
        if (altitude >= biome.min && altitude < biome.max) {
            return { key, ...biome };
        }
    }
    return { key: 'COSMIC', ...BIOMES.COSMIC };
}

function getBiomeColor(key) {
    const colors = {
        UNDERGROUND: '#8B4513',
        GROUND: '#4A90E2',
        FOREST: '#2d5016',
        CLOUDS: '#87CEEB',
        TWILIGHT: '#8B008B',
        SPACE: '#4B0082',
        COSMIC: '#00FFFF'
    };
    return colors[key] || '#FFF';
}