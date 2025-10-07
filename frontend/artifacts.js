// База данных артефактов
const artifactsDB = [
    {
        id: 1,
        name: "Каменный цветок",
        stats: { bulletResistance: 15, anomalyResistance: 5 }
    },
    {
        id: 2, 
        name: "Ночная звезда",
        stats: { anomalyResistance: 20, radiationResistance: 10 }
    },
    {
        id: 3,
        name: "Выверт", 
        stats: { movementSpeed: 15, stamina: 10 }
    },
    {
        id: 4,
        name: "Пустышка",
        stats: { bulletResistance: 8, anomalyResistance: 8, radiationResistance: 5 }
    },
    {
        id: 5,
        name: "Кровь камня",
        stats: { bulletResistance: 25, anomalyResistance: -5, movementSpeed: -3 }
    }
];

// База данных костюмов
const suitsDB = {
    combat: {
        name: "Боевой костюм",
        baseStats: { bulletResistance: 80, anomalyResistance: 40, radiationResistance: 20 }
    },
    scientific: {
        name: "Научный костюм", 
        baseStats: { bulletResistance: 30, anomalyResistance: 80, radiationResistance: 60 }
    },
    combined: {
        name: "Комбинированный костюм",
        baseStats: { bulletResistance: 60, anomalyResistance: 60, radiationResistance: 40 }
    }
};

// База данных контейнеров
const containersDB = {
    standard: {
        name: "Стандартный контейнер",
        slots: 4,
        bonusStats: {}
    },
    military: {
        name: "Военный контейнер",
        slots: 3,
        bonusStats: { bulletResistance: 15, movementSpeed: -5 }
    },
    scientific: {
        name: "Научный контейнер", 
        slots: 3,
        bonusStats: { anomalyResistance: 20, radiationResistance: 10 }
    }
};

let currentSuit = 'combat';
let currentContainer = 'standard';
let currentBuild = Array(containersDB[currentContainer].slots).fill(null);

// Инициализация
function init() {
    renderSuitButtons();
    renderContainerButtons();
    renderArtifactLibrary();
    updateEquipmentInfo();
    renderContainerSlots();
    updateTotalStats();
}

// Рендер кнопок костюмов
function renderSuitButtons() {
    const container = document.getElementById('suitButtons');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(suitsDB).forEach(suitId => {
        const button = document.createElement('button');
        button.className = `equipment-button ${suitId === currentSuit ? 'active' : ''}`;
        button.textContent = suitsDB[suitId].name;
        button.onclick = () => selectSuit(suitId);
        container.appendChild(button);
    });
}

// Рендер кнопок контейнеров
function renderContainerButtons() {
    const container = document.getElementById('containerButtons');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(containersDB).forEach(containerId => {
        const button = document.createElement('button');
        button.className = `equipment-button ${containerId === currentContainer ? 'active' : ''}`;
        button.textContent = containersDB[containerId].name;
        button.onclick = () => selectContainer(containerId);
        container.appendChild(button);
    });
}

// Выбор костюма
function selectSuit(suitId) {
    currentSuit = suitId;
    renderSuitButtons();
    updateEquipmentInfo();
    updateTotalStats();
}

// Выбор контейнера
function selectContainer(containerId) {
    currentContainer = containerId;
    
    // Обновляем слоты
    const newSlots = containersDB[containerId].slots;
    if (newSlots !== currentBuild.length) {
        const oldBuild = [...currentBuild];
        currentBuild = Array(newSlots).fill(null);
        
        for (let i = 0; i < Math.min(oldBuild.length, newSlots); i++) {
            if (oldBuild[i]) {
                currentBuild[i] = oldBuild[i];
            }
        }
    }
    
    renderContainerButtons();
    renderContainerSlots();
    updateEquipmentInfo();
    updateTotalStats();
}

// Обновление информации об оборудовании
function updateEquipmentInfo() {
    // Информация о костюме
    const suitInfo = document.getElementById('suitInfo');
    if (suitInfo) {
        const suit = suitsDB[currentSuit];
        suitInfo.innerHTML = `
            <strong>${suit.name}</strong><br>
            • Пулестойкость: ${suit.baseStats.bulletResistance}%<br>
            • Защита от аномалий: ${suit.baseStats.anomalyResistance}%<br>
            • Радиационная защита: ${suit.baseStats.radiationResistance}%<br>
        `;
    }

    // Информация о контейнере
    const containerInfo = document.getElementById('containerInfo');
    if (containerInfo) {
        const container = containersDB[currentContainer];
        const bonuses = Object.entries(container.bonusStats)
            .filter(([key, value]) => value !== 0)
            .map(([key, value]) => {
                const statNames = {
                    bulletResistance: 'Пулестойкость',
                    anomalyResistance: 'Защита от аномалий',
                    radiationResistance: 'Радиационная защита',
                    movementSpeed: 'Скорость'
                };
                return `${value > 0 ? '+' : ''}${value}% ${statNames[key]}`;
            });

        containerInfo.innerHTML = `
            <strong>${container.name}</strong><br>
            • Слотов для артефактов: ${container.slots}<br>
            ${bonuses.length > 0 ? `• Бонусы: ${bonuses.join(', ')}<br>` : ''}
        `;
    }
}

// Рендер библиотеки артефактов
function renderArtifactLibrary() {
    const library = document.getElementById('artifactLibrary');
    if (!library) return;
    
    library.innerHTML = '';

    artifactsDB.forEach(artifact => {
        const artifactElement = document.createElement('div');
        artifactElement.className = 'artifact-item';
        artifactElement.innerHTML = `
            <h4>${artifact.name}</h4>
            <div class="artifact-stats">
                ${getArtifactStatsText(artifact)}
            </div>
        `;
        
        artifactElement.addEventListener('click', () => {
            const emptySlot = findEmptySlot();
            if (emptySlot !== -1) {
                addArtifactToSlot(emptySlot, artifact);
            } else {
                alert('Все слоты заняты! Смените контейнер или освободите слот.');
            }
        });

        library.appendChild(artifactElement);
    });
}

// Рендер слотов контейнера
function renderContainerSlots() {
    const container = document.getElementById('containerSlots');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < containersDB[currentContainer].slots; i++) {
        const slot = document.createElement('div');
        slot.className = `container-slot ${currentBuild[i] ? 'occupied' : 'empty'}`;
        slot.dataset.slot = i;
        
        if (currentBuild[i]) {
            const artifact = currentBuild[i];
            slot.innerHTML = `
                <div class="artifact-item">
                    <h4>${artifact.name}</h4>
                    <div class="artifact-stats">
                        ${getArtifactStatsText(artifact)}
                    </div>
                    <button class="remove-artifact-btn" onclick="removeArtifact(${i})" title="Удалить артефакт">
                        ✕
                    </button>
                </div>
            `;
        } else {
            slot.innerHTML = `
                <div class="slot-placeholder">
                    <span class="plus-icon">+</span>
                    <span class="slot-text">Добавить артефакт</span>
                </div>
            `;
        }
        
        slot.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-artifact-btn') && !currentBuild[i]) {
                if (artifactsDB.length > 0) {
                    const selectedArtifact = artifactsDB[0];
                    addArtifactToSlot(i, selectedArtifact);
                }
            }
        });

        container.appendChild(slot);
    }
}

// Вспомогательные функции
function getArtifactStatsText(artifact) {
    const stats = [];
    if (artifact.stats.bulletResistance) stats.push(`💥 ${artifact.stats.bulletResistance}%`);
    if (artifact.stats.anomalyResistance) stats.push(`⚡ ${artifact.stats.anomalyResistance}%`);
    if (artifact.stats.radiationResistance) stats.push(`☢️ ${artifact.stats.radiationResistance}%`);
    if (artifact.stats.movementSpeed) stats.push(`🏃 ${artifact.stats.movementSpeed}%`);
    if (artifact.stats.stamina) stats.push(`💪 ${artifact.stats.stamina}%`);
    
    return stats.join(' ');
}

function findEmptySlot() {
    return currentBuild.findIndex(slot => slot === null);
}

function addArtifactToSlot(slotIndex, artifact) {
    currentBuild[slotIndex] = artifact;
    renderContainerSlots();
    updateTotalStats();
}

function removeArtifact(slotIndex) {
    currentBuild[slotIndex] = null;
    renderContainerSlots();
    updateTotalStats();
    event.stopPropagation();
}

// Расчет общей статистики
function updateTotalStats() {
    const suit = suitsDB[currentSuit];
    const container = containersDB[currentContainer];
    
    let totalStats = { 
        bulletResistance: suit.baseStats.bulletResistance,
        anomalyResistance: suit.baseStats.anomalyResistance,
        radiationResistance: suit.baseStats.radiationResistance,
        movementSpeed: 0,
        stamina: 0
    };
    
    // Добавляем бонусы контейнера
    Object.keys(container.bonusStats).forEach(stat => {
        totalStats[stat] += container.bonusStats[stat];
    });
    
    // Добавляем статы артефактов
    currentBuild.forEach(artifact => {
        if (artifact) {
            Object.keys(artifact.stats).forEach(stat => {
                totalStats[stat] = (totalStats[stat] || 0) + artifact.stats[stat];
            });
        }
    });
    
    // Обновляем интерфейс
    const statsElement = document.getElementById('totalStats');
    if (statsElement) {
        statsElement.innerHTML = `
            <li>💥 Пулестойкость: ${Math.round(totalStats.bulletResistance)}%</li>
            <li>⚡ Защита от аномалий: ${Math.round(totalStats.anomalyResistance)}%</li>
            <li>☢️ Радиационная защита: ${Math.round(totalStats.radiationResistance)}%</li>
            <li>🏃 Скорость: ${Math.round(totalStats.movementSpeed)}%</li>
            <li>💪 Выносливость: ${Math.round(totalStats.stamina)}%</li>
        `;
    }
}

// Сохранение сборки
async function saveBuild() {
    if (!csxAPI.isAuthenticated()) {
        alert('Для сохранения необходимо войти в систему');
        return;
    }

    const buildName = prompt('Введите название сборки:');
    if (!buildName) return;

    const buildData = {
        build_name: buildName,
        weapon_data: {
            suit: currentSuit,
            container: currentContainer,
            artifacts: currentBuild.filter(a => a !== null)
        },
        settings_data: {
            total_stats: calculateTotalStats(),
            timestamp: new Date().toISOString()
        }
    };

    try {
        const result = await csxAPI.saveBuild(buildData);
        alert(`✅ Сборка "${buildName}" сохранена!`);
    } catch (error) {
        alert(`❌ Ошибка: ${error.message}`);
    }
}

// Загрузка сборок
async function loadSavedBuilds() {
    if (!csxAPI.isAuthenticated()) {
        alert('Для загрузки необходимо войти в систему');
        return;
    }

    try {
        const builds = await csxAPI.getBuilds();
        
        if (builds.length === 0) {
            alert('У вас нет сохраненных сборок');
            return;
        }

        const buildList = builds.map(build => `• ${build.build_name}`).join('\n');
        const selectedName = prompt(`Ваши сборки:\n${buildList}\n\nВведите название сборки для загрузки:`);
        
        if (!selectedName) return;

        const selectedBuild = builds.find(build => build.build_name === selectedName);
        
        if (selectedBuild) {
            // Загружаем сборку
            currentSuit = selectedBuild.weapon_data.suit;
            currentContainer = selectedBuild.weapon_data.container;
            currentBuild = selectedBuild.weapon_data.artifacts || Array(containersDB[currentContainer].slots).fill(null);
            
            // Обновляем интерфейс
            renderSuitButtons();
            renderContainerButtons();
            renderContainerSlots();
            updateEquipmentInfo();
            updateTotalStats();
            
            alert(`✅ Сборка "${selectedName}" загружена!`);
        } else {
            alert('Сборка не найдена');
        }

    } catch (error) {
        alert(`❌ Ошибка загрузки: ${error.message}`);
    }
}

// Вспомогательная функция для расчета статистики
function calculateTotalStats() {
    const suit = suitsDB[currentSuit];
    const container = containersDB[currentContainer];
    
    let stats = { ...suit.baseStats };
    
    Object.keys(container.bonusStats).forEach(stat => {
        stats[stat] += container.bonusStats[stat];
    });
    
    currentBuild.forEach(artifact => {
        if (artifact) {
            Object.keys(artifact.stats).forEach(stat => {
                stats[stat] += artifact.stats[stat];
            });
        }
    });
    
    return stats;
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', init);
// Функция загрузки сохраненной сборки
async function loadBuildFromId(buildId) {
    try {
        const builds = await csxAPI.getBuilds();
        const build = builds.find(b => b.id === parseInt(buildId));
        
        if (build) {
            currentSuit = build.weapon_data.suit;
            currentContainer = build.weapon_data.container;
            currentBuild = build.weapon_data.artifacts || Array(containersDB[currentContainer].slots).fill(null);
            
            renderSuitButtons();
            renderContainerButtons();
            renderContainerSlots();
            updateEquipmentInfo();
            updateTotalStats();
            
            console.log(`✅ Сборка "${build.build_name}" загружена`);
        }
    } catch (error) {
        console.error('Ошибка загрузки сборки:', error);
    }
}

// Загрузка сборки из URL параметров
function checkUrlForBuild() {
    const urlParams = new URLSearchParams(window.location.search);
    const buildId = urlParams.get('load');
    
    if (buildId && csxAPI.isAuthenticated()) {
        loadBuildFromId(buildId);
    }
}

// Добавьте вызов в конец DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    init();
    checkUrlForBuild();
});