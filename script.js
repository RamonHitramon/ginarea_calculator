// Глобальные переменные
let currentDirection = 'long';

let charts = {};
let pairData = {};
let positionChart = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadPairData();
    updateCalculatedValues();
    setupEventListeners();
});

// Загрузка данных о парах
async function loadPairData() {
    try {
        console.log('Пытаемся загрузить файлы пар по биржам...');
        
        // Пытаемся загрузить из отдельных файлов по биржам
        const [okxResponse, bybtResponse, bmexResponse] = await Promise.allSettled([
            fetch('pairs-okx.json'),
            fetch('pairs-bybt.json'),
            fetch('pairs-bmex.json')
        ]);
        
        pairData = {};
        
        if (okxResponse.status === 'fulfilled' && okxResponse.value.ok) {
            const okxData = await okxResponse.value.json();
            Object.assign(pairData, okxData);
            console.log(`Загружено ${Object.keys(okxData).length} пар OKX`);
            console.log('Первые 5 пар OKX:', Object.keys(okxData).slice(0, 5));
        } else {
            console.log('Ошибка загрузки OKX:', okxResponse.status, okxResponse.reason);
        }
        
        if (bybtResponse.status === 'fulfilled' && bybtResponse.value.ok) {
            const bybtData = await bybtResponse.value.json();
            Object.assign(pairData, bybtData);
            console.log(`Загружено ${Object.keys(bybtData).length} пар BYBT`);
        } else {
            console.log('Ошибка загрузки BYBT:', bybtResponse.status, bybtResponse.reason);
        }
        
        if (bmexResponse.status === 'fulfilled' && bmexResponse.value.ok) {
            const bmexData = await bmexResponse.value.json();
            Object.assign(pairData, bmexData);
            console.log(`Загружено ${Object.keys(bmexData).length} пар BMEX`);
        } else {
            console.log('Ошибка загрузки BMEX:', bmexResponse.status, bmexResponse.reason);
        }
        
        // Если не удалось загрузить файлы, используем встроенные данные
        if (Object.keys(pairData).length === 0) {
            console.log('Не удалось загрузить файлы пар, используем встроенные данные');
            pairData = getBuiltInPairData();
        }
        
        console.log(`Итого загружено ${Object.keys(pairData).length} пар`);
        
        // Проверяем наличие конкретных пар
        console.log('Проверка пар OKX:');
        const okxPairs = Object.keys(pairData).filter(pair => pairData[pair].exchange === 'OKX');
        console.log('OKX пары:', okxPairs.slice(0, 10), '... всего:', okxPairs.length);
        console.log('GOAT-USDT-SWAP есть:', pairData['GOAT-USDT-SWAP']);
        
    } catch (error) {
        console.log('Ошибка загрузки файлов пар, используем встроенные данные:', error);
        pairData = getBuiltInPairData();
    }
    
    console.log('Итоговые данные пар:', pairData);
    updatePairList();
}

// Парсинг CSV данных и фильтрация USDT_FUTURES
function parseCSVData(csvText) {
    const lines = csvText.split('\n');
    const pairs = {};
    let usdtFuturesCount = 0;
    let parsedCount = 0;
    
    console.log('Начинаем парсинг CSV файла...');
    console.log(`Всего строк: ${lines.length}`);
    
    // Пропускаем заголовок (первая строка)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(',');
        if (columns.length < 5) {
            console.log(`Строка ${i}: недостаточно колонок (${columns.length})`);
            continue;
        }
        
        const exchange = columns[0].trim();
        const name = columns[1].trim();
        const type = columns[2].trim();
        const minOrderSize = columns[3].trim();
        const minGridStep = columns[4].trim();
        
        // Подсчитываем USDT_FUTURES
        if (type === 'USDT_FUTURES') {
            usdtFuturesCount++;
            console.log(`Найдена USDT_FUTURES пара: ${exchange} - ${name}`);
        }
        
        // Фильтруем только USDT_FUTURES
        if (type !== 'USDT_FUTURES') continue;
        
        // Парсим минимальный размер ордера
        const parsedOrderSize = parseOrderSize(minOrderSize);
        if (parsedOrderSize === null) {
            console.log(`Ошибка парсинга Order Size: ${minOrderSize} для ${name}`);
            continue;
        }
        
        // Парсим минимальный шаг сетки
        const parsedGridStep = parseGridStep(minGridStep);
        if (parsedGridStep === null) {
            console.log(`Ошибка парсинга Grid Step: ${minGridStep} для ${name}`);
            continue;
        }
        
        // Сохраняем оригинальное название пары
        const pairKey = name;
        
        pairs[pairKey] = {
            exchange: exchange,
            originalName: name,
            minOrderSize: parsedOrderSize,
            minGridStep: parsedGridStep,
            currentPrice: getEstimatedPrice(name) // Примерная цена для расчетов
        };
        
        parsedCount++;
        console.log(`Успешно добавлена пара: ${pairKey} (${exchange})`);
    }
    
    console.log(`Всего USDT_FUTURES пар найдено: ${usdtFuturesCount}`);
    console.log(`Успешно обработано пар: ${parsedCount}`);
    console.log('Результат парсинга:', pairs);
    
    return pairs;
}

// Парсинг размера ордера из строки типа "0.001 BTC" или "10 DOGE"
function parseOrderSize(orderSizeStr) {
    const match = orderSizeStr.match(/^([\d.]+)\s+/);
    if (match) {
        return parseFloat(match[1]);
    }
    return null;
}

// Парсинг шага сетки из строки типа "0.0002 USDT"
function parseGridStep(gridStepStr) {
    const match = gridStepStr.match(/^([\d.]+)\s+USDT/);
    if (match) {
        return parseFloat(match[1]);
    }
    return null;
}

// Получение примерной цены для пары (в реальном приложении будет API)
function getEstimatedPrice(pairName) {
    // Извлекаем базовую монету из названия пары
    let baseCoin = '';
    
    if (pairName.includes('-USDT-SWAP')) {
        // OKX формат: BTC-USDT-SWAP
        baseCoin = pairName.replace('-USDT-SWAP', '').toLowerCase();
    } else if (pairName.includes('USDT')) {
        // BYBT/BMEX формат: BTCUSDT, XBTUSDT
        baseCoin = pairName.replace('USDT', '').toLowerCase();
    }
    
    // Примерные цены для популярных монет
    const estimatedPrices = {
        'btc': 45000,
        'xbt': 45000, // BMEX использует XBT
        'eth': 3200,
        'sol': 100,
        'ada': 0.5,
        'dot': 7,
        'bnb': 300,
        'xrp': 0.6,
        'matic': 0.8,
        'link': 15,
        'uni': 8,
        'avax': 35,
        'atom': 12,
        'ltc': 78,
        'bch': 245,
        'fil': 5.5,
        'doge': 0.08,
        'ton': 2.5,
        'sui': 1.2
    };
    
    return estimatedPrices[baseCoin] || 1; // По умолчанию 1 USDT
}

// Встроенные данные из GA Pairs.csv (только USDT_FUTURES)
function getBuiltInPairData() {
    return {
        // BYBT пары
        'ADAUSDT': { exchange: 'BYBT', minOrderSize: 2, minGridStep: 0.0002, currentPrice: 0.5 },
        'BTCUSDT': { exchange: 'BYBT', minOrderSize: 0.001, minGridStep: 0.2, currentPrice: 45000 },
        'DOGEUSDT': { exchange: 'BYBT', minOrderSize: 10, minGridStep: 0.00002, currentPrice: 0.08 },
        'ETHUSDT': { exchange: 'BYBT', minOrderSize: 0.01, minGridStep: 0.02, currentPrice: 3200 },
        'LTCUSDT': { exchange: 'BYBT', minOrderSize: 0.1, minGridStep: 0.02, currentPrice: 78 },
        'SOLUSDT': { exchange: 'BYBT', minOrderSize: 0.1, minGridStep: 0.02, currentPrice: 100 },
        'SUIUSDT': { exchange: 'BYBT', minOrderSize: 10, minGridStep: 0.0002, currentPrice: 1.2 },
        'XRPUSDT': { exchange: 'BYBT', minOrderSize: 3, minGridStep: 0.0002, currentPrice: 0.6 },
        'TONUSDT': { exchange: 'BYBT', minOrderSize: 0.3, minGridStep: 0.0002, currentPrice: 2.5 },
        'ETHFIUSDT': { exchange: 'BYBT', minOrderSize: 0.3, minGridStep: 0.0002, currentPrice: 3.5 },
        'ETHBTCUSDT': { exchange: 'BYBT', minOrderSize: 20, minGridStep: 0.000002, currentPrice: 0.07 },
        'SOLAYERUSDT': { exchange: 'BYBT', minOrderSize: 2, minGridStep: 0.0002, currentPrice: 0.8 },
        '10000LADYSUSDT': { exchange: 'BYBT', minOrderSize: 800, minGridStep: 0.0000002, currentPrice: 0.00001 },
        '1000BONKUSDT': { exchange: 'BYBT', minOrderSize: 200, minGridStep: 0.000002, currentPrice: 0.0001 },
        '1000BTTUSDT': { exchange: 'BYBT', minOrderSize: 500, minGridStep: 0.0000002, currentPrice: 0.00001 },
        '1000FLOKIUSDT': { exchange: 'BYBT', minOrderSize: 3, minGridStep: 0.00002, currentPrice: 0.0001 },
        '1000LUNCUSDT': { exchange: 'BYBT', minOrderSize: 3, minGridStep: 0.00002, currentPrice: 0.0001 },
        '1000PEPEUSDT': { exchange: 'BYBT', minOrderSize: 200, minGridStep: 0.000002, currentPrice: 0.0001 },
        '1INCHUSDT': { exchange: 'BYBT', minOrderSize: 0.8, minGridStep: 0.0002, currentPrice: 0.5 },
        'AAVEUSDT': { exchange: 'BYBT', minOrderSize: 0.02, minGridStep: 0.02, currentPrice: 300 },
        'ACHUSDT': { exchange: 'BYBT', minOrderSize: 20, minGridStep: 0.000002, currentPrice: 0.01 },
        'AGLDUSDT': { exchange: 'BYBT', minOrderSize: 0.5, minGridStep: 0.0002, currentPrice: 0.2 },
        'ALGOUSDT': { exchange: 'BYBT', minOrderSize: 2, minGridStep: 0.0002, currentPrice: 0.15 },
        'APEUSDT': { exchange: 'BYBT', minOrderSize: 0.7, minGridStep: 0.0002, currentPrice: 1.5 },
        'API3USDT': { exchange: 'BYBT', minOrderSize: 0.3, minGridStep: 0.0002, currentPrice: 2.5 },
        'APTUSDT': { exchange: 'BYBT', minOrderSize: 0.05, minGridStep: 0.002, currentPrice: 8 },
        'ARBUSDT': { exchange: 'BYBT', minOrderSize: 0.5, minGridStep: 0.0002, currentPrice: 1.2 },
        'ARPAUSDT': { exchange: 'BYBT', minOrderSize: 20, minGridStep: 0.00002, currentPrice: 0.02 },
        'ARUSDT': { exchange: 'BYBT', minOrderSize: 0.2, minGridStep: 0.002, currentPrice: 15 },
        'ASTRUSDT': { exchange: 'BYBT', minOrderSize: 10, minGridStep: 0.00002, currentPrice: 0.05 },
        'ATOMUSDT': { exchange: 'BYBT', minOrderSize: 0.3, minGridStep: 0.002, currentPrice: 12 },
        'AVAXUSDT': { exchange: 'BYBT', minOrderSize: 0.3, minGridStep: 0.002, currentPrice: 35 },
        'AXSUSDT': { exchange: 'BYBT', minOrderSize: 0.2, minGridStep: 0.002, currentPrice: 5 },
        'BAKEUSDT': { exchange: 'BYBT', minOrderSize: 2, minGridStep: 0.0002, currentPrice: 0.3 },
        'BCHUSDT': { exchange: 'BYBT', minOrderSize: 0.05, minGridStep: 0.2, currentPrice: 245 },
        'BELUSDT': { exchange: 'BYBT', minOrderSize: 2, minGridStep: 0.0002, currentPrice: 0.5 },
        'BLURUSDT': { exchange: 'BYBT', minOrderSize: 3, minGridStep: 0.00002, currentPrice: 0.3 },
        'BNBUSDT': { exchange: 'BYBT', minOrderSize: 0.05, minGridStep: 0.2, currentPrice: 300 },
        'BOBAUSDT': { exchange: 'BYBT', minOrderSize: 0.5, minGridStep: 0.00002, currentPrice: 0.1 },
        'BSVUSDT': { exchange: 'BYBT', minOrderSize: 0.02, minGridStep: 0.02, currentPrice: 80 },
        'CELOUSDT': { exchange: 'BYBT', minOrderSize: 0.3, minGridStep: 0.0002, currentPrice: 0.5 },
        'CFXUSDT': { exchange: 'BYBT', minOrderSize: 3, minGridStep: 0.00002, currentPrice: 0.2 },
        'CHZUSDT': { exchange: 'BYBT', minOrderSize: 5, minGridStep: 0.00002, currentPrice: 0.08 },
        'CKBUSDT': { exchange: 'BYBT', minOrderSize: 70, minGridStep: 0.000002, currentPrice: 0.01 },
        'COMPUSDT': { exchange: 'BYBT', minOrderSize: 0.02, minGridStep: 0.02, currentPrice: 60 },
        'COREUSDT': { exchange: 'BYBT', minOrderSize: 0.3, minGridStep: 0.0002, currentPrice: 1.5 },
        'COTIUSDT': { exchange: 'BYBT', minOrderSize: 7, minGridStep: 0.00002, currentPrice: 0.05 },
        'CRVUSDT': { exchange: 'BYBT', minOrderSize: 0.3, minGridStep: 0.0002, currentPrice: 0.5 },
        'CTSIUSDT': { exchange: 'BYBT', minOrderSize: 3, minGridStep: 0.00002, currentPrice: 0.1 },
        'CVCUSDT': { exchange: 'BYBT', minOrderSize: 4, minGridStep: 0.00002, currentPrice: 0.1 },
        'DASHUSDT': { exchange: 'BYBT', minOrderSize: 0.04, minGridStep: 0.02, currentPrice: 30 },
        'DOTUSDT': { exchange: 'BYBT', minOrderSize: 0.3, minGridStep: 0.0002, currentPrice: 7 },
        'DUSKUSDT': { exchange: 'BYBT', minOrderSize: 2, minGridStep: 0.00002, currentPrice: 0.2 },
        'DYDXUSDT': { exchange: 'BYBT', minOrderSize: 0.3, minGridStep: 0.0002, currentPrice: 2 },
        'EGLDUSDT': { exchange: 'BYBT', minOrderSize: 0.02, minGridStep: 0.02, currentPrice: 25 },
        'ENSUSDT': { exchange: 'BYBT', minOrderSize: 0.2, minGridStep: 0.002, currentPrice: 15 },
        'ETCUSDT': { exchange: 'BYBT', minOrderSize: 0.2, minGridStep: 0.002, currentPrice: 25 },
        'FILUSDT': { exchange: 'BYBT', minOrderSize: 0.2, minGridStep: 0.002, currentPrice: 5.5 },
        'FLOWUSDT': { exchange: 'BYBT', minOrderSize: 0.2, minGridStep: 0.0002, currentPrice: 0.8 },
        'FXSUSDT': { exchange: 'BYBT', minOrderSize: 0.1, minGridStep: 0.0002, currentPrice: 5 },
        'GALAUSDT': { exchange: 'BYBT', minOrderSize: 2, minGridStep: 0.00002, currentPrice: 0.02 },
        'GMTUSDT': { exchange: 'BYBT', minOrderSize: 7, minGridStep: 0.00002, currentPrice: 0.2 },
        'GRTUSDT': { exchange: 'BYBT', minOrderSize: 4, minGridStep: 0.00002, currentPrice: 0.1 },
        'HBARUSDT': { exchange: 'BYBT', minOrderSize: 2, minGridStep: 0.00002, currentPrice: 0.05 },
        'HFTUSDT': { exchange: 'BYBT', minOrderSize: 2, minGridStep: 0.00002, currentPrice: 0.3 },
        'HIGHUSDT': { exchange: 'BYBT', minOrderSize: 0.3, minGridStep: 0.0002, currentPrice: 2 },
        'HNTUSDT': { exchange: 'BYBT', minOrderSize: 0.1, minGridStep: 0.002, currentPrice: 2.5 },
        'HOOKUSDT': { exchange: 'BYBT', minOrderSize: 0.6, minGridStep: 0.0002, currentPrice: 1.5 },
        'ICPUSDT': { exchange: 'BYBT', minOrderSize: 0.2, minGridStep: 0.002, currentPrice: 12 },
        'IDUSDT': { exchange: 'BYBT', minOrderSize: 2, minGridStep: 0.0002, currentPrice: 0.5 },
        'ILVUSDT': { exchange: 'BYBT', minOrderSize: 0.03, minGridStep: 0.02, currentPrice: 80 },
        'IMXUSDT': { exchange: 'BYBT', minOrderSize: 0.5, minGridStep: 0.0002, currentPrice: 2 },
        'INJUSDT': { exchange: 'BYBT', minOrderSize: 0.2, minGridStep: 0.002, currentPrice: 25 },
        'IOTAUSDT': { exchange: 'BYBT', minOrderSize: 2, minGridStep: 0.0002, currentPrice: 0.2 },
        'IOTXUSDT': { exchange: 'BYBT', minOrderSize: 20, minGridStep: 0.00002, currentPrice: 0.05 },
        'JASMYUSDT': { exchange: 'BYBT', minOrderSize: 50, minGridStep: 0.000002, currentPrice: 0.005 },
        'JSTUSDT': { exchange: 'BYBT', minOrderSize: 50, minGridStep: 0.00002, currentPrice: 0.02 },
        'KAVAUSDT': { exchange: 'BYBT', minOrderSize: 0.5, minGridStep: 0.0002, currentPrice: 0.8 },
        'KNCUSDT': { exchange: 'BYBT', minOrderSize: 0.5, minGridStep: 0.0002, currentPrice: 0.5 },
        'KSMUSDT': { exchange: 'BYBT', minOrderSize: 0.03, minGridStep: 0.02, currentPrice: 30 },
        'LDOUSDT': { exchange: 'BYBT', minOrderSize: 0.2, minGridStep: 0.0002, currentPrice: 2.5 },
        
        // OKX пары
        'BTC-USDT-SWAP': { exchange: 'OKX', minOrderSize: 0.0001, minGridStep: 0.2, currentPrice: 45000 },
        'ETH-USDT-SWAP': { exchange: 'OKX', minOrderSize: 0.001, minGridStep: 0.02, currentPrice: 3200 },
        'XRP-USDT-SWAP': { exchange: 'OKX', minOrderSize: 1, minGridStep: 0.0002, currentPrice: 0.6 },
        'SOL-USDT-SWAP': { exchange: 'OKX', minOrderSize: 0.01, minGridStep: 0.02, currentPrice: 100 },
        'DOGE-USDT-SWAP': { exchange: 'OKX', minOrderSize: 10, minGridStep: 0.00002, currentPrice: 0.08 },
        'LTC-USDT-SWAP': { exchange: 'OKX', minOrderSize: 0.1, minGridStep: 0.02, currentPrice: 78 },
        'ADA-USDT-SWAP': { exchange: 'OKX', minOrderSize: 10, minGridStep: 0.0002, currentPrice: 0.5 },
        'ETHFI-USDT-SWAP': { exchange: 'OKX', minOrderSize: 1, minGridStep: 0.0002, currentPrice: 3.5 },
        'SUI-USDT-SWAP': { exchange: 'OKX', minOrderSize: 1, minGridStep: 0.0002, currentPrice: 1.2 },
        'TON-USDT-SWAP': { exchange: 'OKX', minOrderSize: 1, minGridStep: 0.002, currentPrice: 2.5 },
        
        // BMEX пары
        'XRPUSDT': { exchange: 'BMEX', minOrderSize: 1, minGridStep: 0.0002, currentPrice: 0.6 },
        'DOGEUSDT': { exchange: 'BMEX', minOrderSize: 10, minGridStep: 0.00002, currentPrice: 0.08 },
        'SOLUSDT': { exchange: 'BMEX', minOrderSize: 0.1, minGridStep: 0.02, currentPrice: 100 },
        'SUIUSDT': { exchange: 'BMEX', minOrderSize: 0.1, minGridStep: 0.0002, currentPrice: 1.2 },
        'ADAUSDT': { exchange: 'BMEX', minOrderSize: 10, minGridStep: 0.0002, currentPrice: 0.5 },
        'TONUSDT': { exchange: 'BMEX', minOrderSize: 1, minGridStep: 0.0002, currentPrice: 2.5 },
        'XBTUSDT': { exchange: 'BMEX', minOrderSize: 0.0001, minGridStep: 0.2, currentPrice: 45000 },
        'ETHUSDT': { exchange: 'BMEX', minOrderSize: 0.01, minGridStep: 0.02, currentPrice: 3200 },
        'LTCUSDT': { exchange: 'BMEX', minOrderSize: 0.1, minGridStep: 0.02, currentPrice: 78 }
    };
}

// Обновление списка пар для автозаполнения
function updatePairList(selectedExchange = null) {
    const datalist = document.getElementById('pairs');
    datalist.innerHTML = '';
    
    if (!selectedExchange) {
        return;
    }
    
    // Фильтруем пары для выбранной биржи
    const exchangePairs = Object.keys(pairData).filter(pair => 
        pairData[pair].exchange === selectedExchange
    );
    
    // Добавляем все пары в datalist для автозаполнения
    exchangePairs.forEach(pair => {
        const option = document.createElement('option');
        option.value = pair;
        datalist.appendChild(option);
    });
    
    console.log(`Добавлено ${exchangePairs.length} пар для ${selectedExchange} в автозаполнение`);
}

// Фильтрация пар при вводе
function filterPairs() {
    const pairInput = document.getElementById('pair');
    const inputValue = pairInput.value.toLowerCase();
    const exchange = document.getElementById('exchange').value;
    
    console.log('Фильтрация пар:', inputValue, 'для биржи:', exchange);
    
    if (inputValue.length > 0 && exchange) {
        // Фильтруем пары для выбранной биржи
        const exchangePairs = Object.keys(pairData).filter(pair => 
            pairData[pair].exchange === exchange
        );
        
        // Показываем подходящие пары
        const matchingPairs = exchangePairs.filter(pair => 
            pair.toLowerCase().includes(inputValue)
        );
        
        console.log('Найдено пар:', matchingPairs.length, matchingPairs.slice(0, 5));
        
        if (matchingPairs.length > 0) {
            updatePairInfo();
        }
    }
}

// Обновление информации о выбранной паре
function updatePairInfo() {
    const pair = document.getElementById('pair').value;
    const exchange = document.getElementById('exchange').value;
    const pairInfo = pairData[pair];
    
    console.log('updatePairInfo вызвана:', pair, 'для биржи:', exchange);
    console.log('pairData содержит пару:', pairData[pair]);
    
    if (pairInfo && pairInfo.exchange === exchange) {
        // Отображаем информацию о паре в интерфейсе
        const pairInfoDiv = document.getElementById('pairInfo');
        if (pairInfoDiv) {
            pairInfoDiv.innerHTML = `
                <div class="pair-info">
                    <div class="info-item">
                        <span>Биржа:</span>
                        <span>${pairInfo.exchange}</span>
                    </div>
                    <div class="info-item">
                        <span>Min Order Size:</span>
                        <span>${pairInfo.minOrderSize}</span>
                    </div>
                    <div class="info-item">
                        <span>Min Grid Step:</span>
                        <span>${pairInfo.minGridStep} USDT</span>
                    </div>
                </div>
            `;
        }
        
        console.log(`Выбрана пара: ${pair}`);
        console.log(`Биржа: ${pairInfo.exchange}`);
        console.log(`Min Order Size: ${pairInfo.minOrderSize}`);
        console.log(`Min Grid Step: ${pairInfo.minGridStep} USDT`);
        console.log(`Current Price: ${pairInfo.currentPrice}`);
    } else {
        // Скрываем информацию если пара не выбрана
        const pairInfoDiv = document.getElementById('pairInfo');
        if (pairInfoDiv) {
            pairInfoDiv.innerHTML = '';
        }
        console.log('Пара не найдена или не соответствует выбранной бирже');
    }
}



// Настройка обработчиков событий
function setupEventListeners() {
    // Обновление рассчитанных значений при изменении параметров
    const inputs = ['orderSize', 'maxOrderSize', 'orderSizeRatio', 'targetDistance', 'minStopProfit', 'currentPrice'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateCalculatedValues);
    });
    
    // Обновление при выборе пары
    document.getElementById('pair').addEventListener('input', function() {
        updateCalculatedValues();
        updatePairInfo();
    });
}

// Обновление при смене биржи
function updateExchange() {
    const exchange = document.getElementById('exchange').value;
    const takerFeeInput = document.getElementById('takerFee');
    const pairInput = document.getElementById('pair');
    
    // Обновляем Taker Fee
    const fees = {
        'OKX': 0.05,
        'BYBT': 0.1,
        'BMEX': 0.035
    };
    
    if (fees[exchange]) {
        takerFeeInput.value = fees[exchange];
    }
    
    // Очищаем поле ввода пары
    pairInput.value = '';
    
    // Обновляем список пар для автозаполнения
    updatePairList(exchange);
    
    // Очищаем информацию о паре
    document.getElementById('pairInfo').innerHTML = '';
    
    updateCalculatedValues();
}

// Установка направления (Long/Short)
function setDirection(direction) {
    currentDirection = direction;
    
    // Обновление UI
    document.querySelectorAll('.toggle-btn[data-value]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-value="${direction}"]`).classList.add('active');
}



// Обновление рассчитанных значений
function updateCalculatedValues() {
    const orderSize = parseFloat(document.getElementById('orderSize').value) || 0;
    const currentPrice = parseFloat(document.getElementById('currentPrice').value) || 100;
    const targetDistance = parseFloat(document.getElementById('targetDistance').value) || 0;
    const minStopProfit = parseFloat(document.getElementById('minStopProfit').value) || 0;
    
    // Order Size в USDT
    const orderSizeUsdt = orderSize * currentPrice;
    document.getElementById('orderSizeUsdt').textContent = orderSizeUsdt.toFixed(2) + ' USDT';
    
    // Profit Per Deal
    if (targetDistance > 0 && minStopProfit > 0) {
        const takerFee = parseFloat(document.getElementById('takerFee').value) / 100;
        let profitPerDeal = 0;
        
        if (currentDirection === 'long') {
            const closePrice = currentPrice * (1 + targetDistance / 100 - minStopProfit / 100);
            profitPerDeal = (closePrice - currentPrice) * orderSize - (orderSizeUsdt * takerFee);
        } else {
            const closePrice = currentPrice * (1 - targetDistance / 100 + minStopProfit / 100);
            profitPerDeal = (currentPrice - closePrice) * orderSize - (orderSizeUsdt * takerFee);
        }
        
        document.getElementById('profitPerDeal').textContent = profitPerDeal.toFixed(2) + ' USDT';
    } else {
        document.getElementById('profitPerDeal').textContent = '0 USDT';
    }
}

// Основная функция расчёта
function calculate() {
    console.log('Calculate function called');
    
    // Получение всех параметров
    const params = getParameters();
    
    // Проверка валидности параметров
    if (!validateParameters(params)) {
        return;
    }
    
    // Расчёт таблицы
    const tableData = calculateTable(params);
    
    // Отображение результатов
    displayResults(params, tableData);
}

// Получение параметров из формы
function getParameters() {
    return {
        exchange: document.getElementById('exchange').value,
        takerFee: parseFloat(document.getElementById('takerFee').value) / 100,
        pair: document.getElementById('pair').value,
        deposit: parseFloat(document.getElementById('deposit').value),
        direction: currentDirection,

        gridStepPercent: parseFloat(document.getElementById('gridStepPercent').value),
        gridStepRatio: parseFloat(document.getElementById('gridStepRatio').value),
        maxTriggerNumber: parseInt(document.getElementById('maxTriggerNumber').value),
        orderSize: parseFloat(document.getElementById('orderSize').value),
        maxOrderSize: parseFloat(document.getElementById('maxOrderSize').value),
        orderSizeRatio: parseFloat(document.getElementById('orderSizeRatio').value),
        targetDistance: parseFloat(document.getElementById('targetDistance').value),
        minStopProfit: parseFloat(document.getElementById('minStopProfit').value),
        currentPrice: parseFloat(document.getElementById('currentPrice').value) || 100
    };
}

// Валидация параметров
function validateParameters(params) {
    if (params.deposit <= 0) {
        alert('Deposit должен быть больше 0');
        return false;
    }
    if (params.orderSize <= 0) {
        alert('Order Size должен быть больше 0');
        return false;
    }
    if (params.maxTriggerNumber <= 0) {
        alert('Max Trigger Number должен быть больше 0');
        return false;
    }
    
    // Проверка на Min Order Size
    const minOrderSize = pairData[params.pair]?.minOrderSize || 0.1;
    if (params.orderSize < minOrderSize) {
        alert(`Order Size (${params.orderSize}) не может быть меньше Min Order Size (${minOrderSize}) для выбранной пары`);
        return false;
    }
    
    // Проверка на кратность Min Order Size
    if (params.orderSize % minOrderSize !== 0) {
        alert(`Order Size (${params.orderSize}) должен быть кратен Min Order Size (${minOrderSize}) для выбранной пары`);
        return false;
    }
    
    return true;
}

// Расчёт таблицы согласно формулам из ТЗ
function calculateTable(params) {
    const data = [];
    let currentPrice = params.currentPrice;
    let currentGridStep = params.gridStepPercent;
    let currentOrderSize = params.orderSize;
    let rawSize = params.orderSize; // Добавляем переменную для Order Size cal
    let totalPosition = 0;
    let totalCost = 0;
    
    for (let i = 1; i <= params.maxTriggerNumber; i++) {
        // InPrice
        if (i === 1) {
            currentPrice = params.currentPrice;
        } else {
            if (params.direction === 'long') {
                currentPrice = currentPrice * (1 - currentGridStep / 100);
            } else {
                currentPrice = currentPrice * (1 + currentGridStep / 100);
            }
        }
        
        // Grid Step %
        if (i > 1) {
            const oldGridStep = currentGridStep;
            currentGridStep = currentGridStep * params.gridStepRatio;
            

        }
        
        // Order Size (coin) - расчет согласно алгоритму
        if (i > 1) {
            const previousRawSize = rawSize; // Используем предыдущий rawSize
            const minOrderSize = pairData[params.pair]?.minOrderSize || 0.1;
            
            // Order Size cal: просто умножаем на множитель без округления
            const orderSizeRatio = (params.orderSizeRatio === "" || params.orderSizeRatio < 1) ? 1 : params.orderSizeRatio;

            rawSize = previousRawSize * orderSizeRatio;
            
            // Order Size: округляем вниз до ближайшего кратного Min Order Size
            let roundedSize;
            if (!params.maxOrderSize || params.maxOrderSize === "") {
                // Если Max Order Size пустой - округлить вниз до кратного Min Order Size
                roundedSize = Math.floor(rawSize / minOrderSize) * minOrderSize;
            } else if (rawSize < params.maxOrderSize) {
                // Если rawSize меньше Max Order Size - округлить вниз до кратного Min Order Size
                roundedSize = Math.floor(rawSize / minOrderSize) * minOrderSize;
            } else {
                // Если rawSize больше или равен Max Order Size - использовать Max Order Size
                roundedSize = params.maxOrderSize;
            }
            
            currentOrderSize = roundedSize;
            

        }
        
        // Order Size (USDT)
        const orderSizeUsdt = currentOrderSize * currentPrice;
        
        // Profit Per Deal
        let profitPerDeal = 0;
        if (params.targetDistance > 0 && params.minStopProfit > 0) {
            let closePrice;
            if (params.direction === 'long') {
                closePrice = currentPrice * (1 + params.targetDistance / 100 - params.minStopProfit / 100);
                profitPerDeal = (closePrice - currentPrice) * currentOrderSize - (orderSizeUsdt * params.takerFee);
            } else {
                closePrice = currentPrice * (1 - params.targetDistance / 100 + params.minStopProfit / 100);
                profitPerDeal = (currentPrice - closePrice) * currentOrderSize - (orderSizeUsdt * params.takerFee);
            }
        }
        
        // Position (coin)
        totalPosition += currentOrderSize;
        
        // Position (USDT)
        totalCost += orderSizeUsdt;
        
        // Loss
        let loss = 0;
        if (params.direction === 'long') {
            loss = totalPosition * currentPrice - totalCost;
        } else {
            loss = totalCost - totalPosition * currentPrice;
        }
        
        // Average Price
        const avgPrice = totalCost / totalPosition;
        
        // Liquidation Price
        const leverage = totalCost / params.deposit;
        let liquidationPrice;
        if (params.direction === 'long') {
            liquidationPrice = avgPrice - avgPrice / leverage;
        } else {
            liquidationPrice = avgPrice + avgPrice / leverage;
        }
        
        data.push({
            orderNumber: i,
            inPrice: currentPrice,
            gridStepPercent: currentGridStep,
            orderSizeCal: rawSize, // Расчетное значение до округления
            orderSize: currentOrderSize,
            orderSizeUsdt: orderSizeUsdt,
            profitPerDeal: profitPerDeal,
            position: totalPosition,
            positionUsdt: totalCost,
            loss: loss,
            avgPrice: avgPrice,
            liquidation: liquidationPrice
        });
    }
    
    return data;
}

// Отображение результатов
function displayResults(params, tableData) {
    if (tableData.length === 0) return;
    
    const lastRow = tableData[tableData.length - 1];
    
    // Trading Range
    const tradingRangePercent = Math.abs(lastRow.inPrice - params.currentPrice) / params.currentPrice * 100;
    const tradingRangeUsdt = Math.abs(lastRow.inPrice - params.currentPrice);
    document.getElementById('tradingRange').textContent = 
        `${tradingRangePercent.toFixed(2)}% (${tradingRangeUsdt.toFixed(2)} USDT)`;
    
    // Max Position
    document.getElementById('maxPosition').textContent = 
        `${lastRow.position.toFixed(4)} coin (${lastRow.positionUsdt.toFixed(2)} USDT)`;
    
    // Leverage
    const leverage = lastRow.positionUsdt / params.deposit;
    document.getElementById('leverage').textContent = `${leverage.toFixed(2)}x`;
    
    // Last Price
    document.getElementById('lastPrice').textContent = `${lastRow.inPrice.toFixed(4)} USDT`;
    
    // Average Price
    document.getElementById('averagePrice').textContent = `${lastRow.avgPrice.toFixed(4)} USDT`;
    
    // Liquidation Price и Game Over Trigger
    let gameOverTrigger = 'Game Over';
    let liquidationPrice = lastRow.liquidation.toFixed(4) + ' USDT';
    
    // Проверяем ликвидацию в указанном диапазоне
    for (let i = 0; i < tableData.length; i++) {
        const row = tableData[i];
        if (params.direction === 'long' && row.inPrice <= row.liquidation) {
            gameOverTrigger = row.orderNumber;
            liquidationPrice = `Game Over on trigger #${row.orderNumber}`;
            break;
        } else if (params.direction === 'short' && row.inPrice >= row.liquidation) {
            gameOverTrigger = row.orderNumber;
            liquidationPrice = `Game Over on trigger #${row.orderNumber}`;
            break;
        }
    }
    
    // Если ликвидация не произошла в указанном диапазоне, рассчитываем примерный триггер
    if (gameOverTrigger === 'Game Over') {
        const estimatedTrigger = calculateEstimatedLiquidationTrigger(params, lastRow);
        gameOverTrigger = `~${estimatedTrigger}`;
        liquidationPrice = `${lastRow.liquidation.toFixed(4)} USDT`;
    }
    
    document.getElementById('liquidationPrice').textContent = liquidationPrice;
    document.getElementById('gameOverTrigger').textContent = gameOverTrigger;
    
    // Обновление таблицы
    updateTable(tableData);
    
    // Создание графика позиции против цены
    console.log('About to create position chart with:', { tableDataLength: tableData.length, direction: params.direction });
    createPositionChart(tableData, params.direction);
    console.log('Position chart creation completed');
}

// Расчет примерного триггера ликвидации
function calculateEstimatedLiquidationTrigger(params, lastRow) {
    const currentPrice = params.currentPrice;
    const liquidationPrice = lastRow.liquidation;
    const gridStepPercent = params.gridStepPercent;
    const gridStepRatio = params.gridStepRatio;
    
    let estimatedTrigger = params.maxTriggerNumber;
    let testPrice = lastRow.inPrice;
    let currentGridStep = lastRow.gridStepPercent;
    
    // Продолжаем расчет за пределами Max Trigger Number
    while (true) {
        if (params.direction === 'long') {
            testPrice = testPrice * (1 - currentGridStep / 100);
            if (testPrice <= liquidationPrice) {
                break;
            }
        } else {
            testPrice = testPrice * (1 + currentGridStep / 100);
            if (testPrice >= liquidationPrice) {
                break;
            }
        }
        
        estimatedTrigger++;
        currentGridStep = currentGridStep * gridStepRatio;
        
        // Ограничиваем расчет для избежания бесконечного цикла
        if (estimatedTrigger > 1000) {
            estimatedTrigger = '>1000';
            break;
        }
    }
    
    return estimatedTrigger;
}

// Обновление таблицы
function updateTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.orderNumber}</td>
            <td>${row.inPrice.toFixed(4)}</td>
            <td>${row.gridStepPercent.toFixed(2)}%</td>
            <td>${row.orderSize.toFixed(4)}</td>
            <td>${row.orderSizeUsdt.toFixed(2)}</td>
            <td>${row.profitPerDeal.toFixed(2)}</td>
            <td>${row.position.toFixed(4)}</td>
            <td>${row.positionUsdt.toFixed(2)}</td>
            <td>${row.loss.toFixed(2)}</td>
            <td>${row.avgPrice.toFixed(4)}</td>
            <td>${row.liquidation > 0 ? row.liquidation.toFixed(4) : '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Создание графика позиции против цены
function createPositionChart(data, direction) {
    console.log('createPositionChart called with:', { data: data.length, direction });
    
    const ctx = document.getElementById('positionChart');
    console.log('Canvas element:', ctx);
    
    // Проверяем, загружена ли Chart.js
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded!');
        return;
    }
    
    // Уничтожаем предыдущий график, если он существует
    if (positionChart) {
        positionChart.destroy();
    }
    
    if (!data || data.length === 0) {
        console.log('No data provided for chart');
        return;
    }
    
    // Подготавливаем данные для графика
    const chartData = data.map((row, index) => ({
        x: row.position * row.inPrice, // Position (USDT) (ось X)
        y: row.inPrice // Цена (ось Y)
    }));
    
    console.log('Chart data prepared:', chartData);
    
    // Сортируем данные по цене (от последнего триггера к первому)
    chartData.sort((a, b) => b.y - a.y);
    
    console.log('Chart data sorted:', chartData);
    
    positionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Position',
                data: chartData,
                backgroundColor: '#28a745',
                borderColor: '#28a745',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `Trigger ${context[0].dataIndex + 1}`;
                        },
                        label: function(context) {
                            return [
                                `Position: ${context.parsed.x.toFixed(2)} USDT`,
                                `Price: ${context.parsed.y.toFixed(4)} USDT`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Position (USDT)',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Price (USDT)',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    },
                    reverse: true // Цена начинается с последнего триггера (сверху)
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}


