// База данных оружия
const weaponsDB = {
    ak74: {
        name: "АК-74",
        damage: 45,
        fireRate: 600,
        effectiveRange: 150,
        maxRange: 400,
        description: "Автомат Калашникова"
    },
    svd: {
        name: "СВД",
        damage: 80,
        fireRate: 30,
        effectiveRange: 300,
        maxRange: 800,
        description: "Снайперская винтовка"
    },
    shotgun: {
        name: "Дробовик",
        damage: 60,
        fireRate: 60,
        effectiveRange: 15,
        maxRange: 40,
        description: "Ближнее оружие"
    },
    pm: {
        name: "ПМ",
        damage: 20,
        fireRate: 30,
        effectiveRange: 25,
        maxRange: 50,
        description: "Пистолет Макарова"
    }
};

let currentWeapon = 'ak74';
let currentHealth = 100;
let currentArmor = 0;
let currentDistance = 50;

// Инициализация
function init() {
    updateWeaponInfo();
    calculateDamage();
    
    // Инициализация сравнения оружия
    initWeaponComparison();
}

// Обновление информации об оружии
function updateWeaponInfo() {
    const weaponSelect = document.getElementById('weapon');
    const weaponInfo = document.getElementById('weaponInfo');
    
    if (weaponSelect) {
        currentWeapon = weaponSelect.value;
    }
    
    if (weaponInfo) {
        const weapon = weaponsDB[currentWeapon];
        weaponInfo.innerHTML = `
            <strong>${weapon.name}</strong><br>
            • Базовый урон: ${weapon.damage}<br>
            • Темп стрельбы: ${weapon.fireRate} выстр/мин<br>
            • Эффективная дистанция: ${weapon.effectiveRange}м<br>
            <em>${weapon.description}</em>
        `;
    }
    
    calculateDamage();
}

// Расчет урона
function calculateDamage() {
    currentHealth = parseInt(document.getElementById('health')?.value) || 100;
    currentArmor = parseInt(document.getElementById('armor')?.value) || 0;
    currentDistance = parseInt(document.getElementById('distance')?.value) || 50;
    
    const weapon = weaponsDB[currentWeapon];
    
    const distanceModifier = calculateDistanceModifier(currentDistance, weapon.effectiveRange, weapon.maxRange);
    const modifiedDamage = Math.max(1, Math.floor(weapon.damage * distanceModifier));
    
    const armorReduction = currentArmor / 100;
    const effectiveBodyDamage = Math.max(1, Math.floor(modifiedDamage * (1 - armorReduction)));
    const effectiveHeadDamage = Math.max(1, Math.floor(modifiedDamage * 1.5 * (1 - armorReduction)));
    
    const bodyShots = Math.ceil(currentHealth / effectiveBodyDamage);
    const headShots = Math.ceil(currentHealth / effectiveHeadDamage);
    
    const bodyTime = calculateTimeToKill(bodyShots, weapon.fireRate);
    const headTime = calculateTimeToKill(headShots, weapon.fireRate);
    
    const totalBodyDamage = bodyShots * effectiveBodyDamage;
    const totalHeadDamage = headShots * effectiveHeadDamage;
    
    const shotsSaved = bodyShots - headShots;
    const timeSaved = (bodyTime - headTime).toFixed(1);
    const efficiency = Math.round((shotsSaved / bodyShots) * 100);
    
    updateResults(
        bodyShots,
        headShots,
        effectiveBodyDamage,
        effectiveHeadDamage,
        totalBodyDamage,
        totalHeadDamage,
        shotsSaved,
        efficiency,
        bodyTime,
        headTime,
        timeSaved,
        distanceModifier
    );
}

// Вспомогательные функции
function calculateDistanceModifier(distance, effectiveRange, maxRange) {
    if (distance <= 10) return 1.0;
    else if (distance <= effectiveRange) {
        const range = effectiveRange - 10;
        const penalty = (distance - 10) / range * 0.3;
        return 1.0 - penalty;
    } else if (distance <= maxRange) {
        const range = maxRange - effectiveRange;
        const penalty = 0.3 + ((distance - effectiveRange) / range * 0.6);
        return Math.max(0.1, 1.0 - penalty);
    } else {
        return 0.1;
    }
}

function calculateTimeToKill(shots, fireRate) {
    if (shots <= 0) return 0;
    const timeBetweenShots = 60 / fireRate;
    return (shots - 1) * timeBetweenShots;
}

function updateResults(bodyShots, headShots, bodyDamage, headDamage, totalBodyDamage, totalHeadDamage, shotsSaved, efficiency, bodyTime, headTime, timeSaved, distanceModifier) {
    // Обновляем попадания
    const bodyShotsElement = document.getElementById('bodyShots');
    const headShotsElement = document.getElementById('headShots');
    
    if (bodyShotsElement) bodyShotsElement.innerHTML = `<strong>${bodyShots} выстрелов</strong>`;
    if (headShotsElement) headShotsElement.innerHTML = `<strong>${headShots} выстрелов</strong>`;
    
    // Обновляем время
    const bodyTimeElement = document.getElementById('bodyTime');
    const headTimeElement = document.getElementById('headTime');
    
    if (bodyTimeElement) bodyTimeElement.textContent = `${bodyTime.toFixed(1)} секунд`;
    if (headTimeElement) headTimeElement.textContent = `${headTime.toFixed(1)} секунд`;
    
    // Обновляем урон
    const bodyDamageElement = document.getElementById('bodyDamage');
    const headDamageElement = document.getElementById('headDamage');
    
    if (bodyDamageElement) bodyDamageElement.textContent = `${bodyDamage} урона`;
    if (headDamageElement) headDamageElement.textContent = `${headDamage} урона`;
    
    // Обновляем эффективность
    const shotsSavedElement = document.getElementById('shotsSaved');
    const timeSavedElement = document.getElementById('timeSaved');
    const efficiencyElement = document.getElementById('efficiency');
    
    if (shotsSavedElement) shotsSavedElement.textContent = `${shotsSaved} выстрелов`;
    if (timeSavedElement) timeSavedElement.textContent = `${timeSaved} секунд`;
    if (efficiencyElement) efficiencyElement.textContent = `${efficiency}%`;
    
    // Обновляем информацию о дистанции
    const distanceModifierElement = document.getElementById('distanceModifier');
    const distanceInfoElement = document.getElementById('distanceInfo');
    
    if (distanceModifierElement) distanceModifierElement.textContent = `${Math.round(distanceModifier * 100)}%`;
    if (distanceInfoElement) distanceInfoElement.textContent = `Дистанция: ${currentDistance}м (урон: ${Math.round(distanceModifier * 100)}%)`;
}

// Система сравнения оружия
function initWeaponComparison() {
    const compareWeapon1 = document.getElementById('compareWeapon1');
    const compareWeapon2 = document.getElementById('compareWeapon2');
    
    if (compareWeapon1 && compareWeapon2) {
        // Заполняем селекторы оружием
        Object.keys(weaponsDB).forEach(weaponId => {
            const weapon = weaponsDB[weaponId];
            const option1 = new Option(weapon.name, weaponId);
            const option2 = new Option(weapon.name, weaponId);
            
            compareWeapon1.add(option1);
            compareWeapon2.add(option2);
        });
        
        // Устанавливаем значения по умолчанию
        compareWeapon1.value = 'ak74';
        compareWeapon2.value = 'svd';
        
        // Добавляем обработчики
        compareWeapon1.addEventListener('change', compareWeapons);
        compareWeapon2.addEventListener('change', compareWeapons);
        
        // Первое сравнение
        compareWeapons();
    }
}

function compareWeapons() {
    const weapon1Id = document.getElementById('compareWeapon1')?.value || 'ak74';
    const weapon2Id = document.getElementById('compareWeapon2')?.value || 'svd';
    
    const health = parseInt(document.getElementById('health')?.value) || 100;
    const armor = parseInt(document.getElementById('armor')?.value) || 0;
    const distance = parseInt(document.getElementById('distance')?.value) || 50;

    const weapon1 = weaponsDB[weapon1Id];
    const weapon2 = weaponsDB[weapon2Id];

    // Расчет характеристик для обоих видов оружия
    const results1 = calculateWeaponStats(weapon1, health, armor, distance);
    const results2 = calculateWeaponStats(weapon2, health, armor, distance);

    // Обновление карточек оружия
    updateWeaponCards(weapon1, results1, weapon2, results2);
}

function calculateWeaponStats(weapon, health, armor, distance) {
    const distanceModifier = calculateDistanceModifier(distance, weapon.effectiveRange, weapon.maxRange);
    const modifiedDamage = Math.max(1, Math.floor(weapon.damage * distanceModifier));
    
    const armorReduction = armor / 100;
    const effectiveBodyDamage = Math.max(1, Math.floor(modifiedDamage * (1 - armorReduction)));
    const effectiveHeadDamage = Math.max(1, Math.floor(modifiedDamage * 1.5 * (1 - armorReduction)));
    
    const bodyShots = Math.ceil(health / effectiveBodyDamage);
    const headShots = Math.ceil(health / effectiveHeadDamage);
    
    const bodyTime = calculateTimeToKill(bodyShots, weapon.fireRate);
    const headTime = calculateTimeToKill(headShots, weapon.fireRate);

    return {
        effectiveBodyDamage,
        effectiveHeadDamage,
        bodyShots,
        headShots,
        bodyTime,
        headTime,
        distanceModifier
    };
}

function updateWeaponCards(weapon1, results1, weapon2, results2) {
    const weaponCards = document.getElementById('weaponCards');
    if (!weaponCards) return;
    
    weaponCards.innerHTML = `
        <div class="weapon-card">
            <h4>${weapon1.name}</h4>
            <p>Урон: ${weapon1.damage}</p>
            <p>Скорострельность: ${weapon1.fireRate} выстр/мин</p>
            <p>Эффективная дистанция: ${weapon1.effectiveRange}м</p>
            <p>Выстрелов в тело: ${results1.bodyShots}</p>
            <p>Время убийства: ${results1.bodyTime.toFixed(1)}с</p>
        </div>
        <div class="weapon-card">
            <h4>${weapon2.name}</h4>
            <p>Урон: ${weapon2.damage}</p>
            <p>Скорострельность: ${weapon2.fireRate} выстр/мин</p>
            <p>Эффективная дистанция: ${weapon2.effectiveRange}м</p>
            <p>Выстрелов в тело: ${results2.bodyShots}</p>
            <p>Время убийства: ${results2.bodyTime.toFixed(1)}с</p>
        </div>
    `;
}

// Сохранение сравнения
async function saveComparison() {
    if (!csxAPI.isAuthenticated()) {
        alert('Для сохранения сравнения необходимо войти в систему');
        return;
    }

    const comparisonName = prompt('Введите название сравнения:');
    if (!comparisonName) return;

    const weapon1Id = document.getElementById('compareWeapon1')?.value;
    const weapon2Id = document.getElementById('compareWeapon2')?.value;

    const comparisonData = {
        comparison_name: comparisonName,
        weapon1_id: weapon1Id,
        weapon2_id: weapon2Id,
        parameters: {
            health: currentHealth,
            armor: currentArmor,
            distance: currentDistance
        },
        results: {
            timestamp: new Date().toISOString()
        }
    };

    try {
        const result = await csxAPI.saveComparison(comparisonData);
        alert(`✅ Сравнение "${comparisonName}" сохранено!`);
    } catch (error) {
        alert(`❌ Ошибка: ${error.message}`);
    }
}

// Загрузка сохраненных сравнений
async function loadSavedComparisons() {
    if (!csxAPI.isAuthenticated()) {
        alert('Для загрузки сравнений необходимо войти в систему');
        return;
    }

    alert('Функция загрузки сравнений в разработке');
}

// Показать/скрыть сравнение
function toggleWeaponComparison() {
    const comparisonSection = document.getElementById('weaponComparison');
    if (!comparisonSection) return;
    
    if (comparisonSection.style.display === 'none') {
        comparisonSection.style.display = 'block';
        compareWeapons();
    } else {
        comparisonSection.style.display = 'none';
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', calculateDamage);
    });
    
    const weaponSelect = document.getElementById('weapon');
    if (weaponSelect) {
        weaponSelect.addEventListener('change', function() {
            updateWeaponInfo();
            calculateDamage();
        });
    }
    
    init();
});