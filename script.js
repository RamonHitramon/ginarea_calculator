// Глобальные переменные
let currentDirection = 'long';

let charts = {};
let pairData = {}; // Общий объект для всех пар
let bybtPairs = {}; // Отдельный объект для BYBT пар
let okxPairs = {}; // Отдельный объект для OKX пар
let bmexPairs = {}; // Отдельный объект для BMEX пар
let chartInstances = {
    chart1: null,
    chart2: null,
    chart3: null,
    chart4: null
};


// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadPairData();
    updateCalculatedValues();
    setupEventListeners();
    
    // Инициализируем список пар для первой биржи (если выбрана)
    const exchange = document.getElementById('exchange').value;
    if (exchange) {
        updatePairList(exchange);
    }
    

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
        
        // Инициализируем отдельные объекты для каждой биржи
        bybtPairs = {};
        okxPairs = {};
        bmexPairs = {};
        
        // Загружаем данные из CSV файла и распределяем по биржам
        try {
            const csvResponse = await fetch('GA Pairs.csv');
            if (csvResponse.ok) {
                const csvText = await csvResponse.text();
                const csvData = parseCSVData(csvText);
                
                // Распределяем данные по биржам
                Object.keys(csvData).forEach(pair => {
                    const exchange = csvData[pair].exchange;
                    if (exchange === 'BYBT') {
                        bybtPairs[pair] = csvData[pair];
                    } else if (exchange === 'OKX') {
                        okxPairs[pair] = csvData[pair];
                    } else if (exchange === 'BMEX') {
                        bmexPairs[pair] = csvData[pair];
                    }
                });
                
                console.log(`Загружено из CSV: BYBT=${Object.keys(bybtPairs).length}, OKX=${Object.keys(okxPairs).length}, BMEX=${Object.keys(bmexPairs).length}`);
            }
        } catch (csvError) {
            console.log('Ошибка загрузки CSV файла:', csvError);
        }
        
        // Загружаем данные из JSON файлов и перезаписываем соответствующие биржи
        
        if (okxResponse.status === 'fulfilled' && okxResponse.value.ok) {
            const okxData = await okxResponse.value.json();
            console.log('OKX Raw data loaded:', Object.keys(okxData).length, 'pairs');
            console.log('OKX first 10 pairs:', Object.keys(okxData).slice(0, 10));
            
            // Проверяем, есть ли BTC пары
            const btcPairs = Object.keys(okxData).filter(pair => pair.includes('BTC'));
            console.log('OKX BTC pairs found:', btcPairs);
            
            // Перезаписываем OKX пары
            okxPairs = okxData;
            console.log(`Загружено ${Object.keys(okxData).length} пар OKX`);
            console.log('Первые 5 пар OKX:', Object.keys(okxData).slice(0, 5));
        } else {
            console.log('Ошибка загрузки OKX:', okxResponse.status, okxResponse.reason);
        }
        
        if (bybtResponse.status === 'fulfilled' && bybtResponse.value.ok) {
            const bybtData = await bybtResponse.value.json();
            console.log('BYBT Raw data loaded:', Object.keys(bybtData).length, 'pairs');
            console.log('BYBT first 10 pairs:', Object.keys(bybtData).slice(0, 10));
            
            // Проверяем, есть ли ETH пары
            const ethPairs = Object.keys(bybtData).filter(pair => pair.includes('ETH'));
            console.log('BYBT ETH pairs found:', ethPairs);
            
            // Перезаписываем BYBT пары
            bybtPairs = bybtData;
            console.log(`Загружено ${Object.keys(bybtData).length} пар BYBT`);
        } else {
            console.log('Ошибка загрузки BYBT:', bybtResponse.status, bybtResponse.reason);
        }
        
        if (bmexResponse.status === 'fulfilled' && bmexResponse.value.ok) {
            const bmexData = await bmexResponse.value.json();
            
            // Перезаписываем BMEX пары
            bmexPairs = bmexData;
            console.log(`Загружено ${Object.keys(bmexData).length} пар BMEX`);
        } else {
            console.log('Ошибка загрузки BMEX:', bmexResponse.status, bmexResponse.reason);
        }
        
        // Если не удалось загрузить файлы, используем встроенные данные
        if (Object.keys(bybtPairs).length === 0 && Object.keys(okxPairs).length === 0 && Object.keys(bmexPairs).length === 0) {
            console.log('Не удалось загрузить файлы пар, используем встроенные данные');
            const builtInData = getBuiltInPairData();
            
            // Распределяем встроенные данные по биржам
            Object.keys(builtInData).forEach(pair => {
                const exchange = builtInData[pair].exchange;
                if (exchange === 'BYBT') {
                    bybtPairs[pair] = builtInData[pair];
                } else if (exchange === 'OKX') {
                    okxPairs[pair] = builtInData[pair];
                } else if (exchange === 'BMEX') {
                    bmexPairs[pair] = builtInData[pair];
                }
            });
        }
        
        console.log(`Итого загружено: BYBT=${Object.keys(bybtPairs).length}, OKX=${Object.keys(okxPairs).length}, BMEX=${Object.keys(bmexPairs).length} пар`);
        
        // Проверяем наличие конкретных пар
        console.log('Проверка пар OKX:');
        console.log('OKX пары:', Object.keys(okxPairs).slice(0, 10), '... всего:', Object.keys(okxPairs).length);
        console.log('GOAT-USDT-SWAP есть:', okxPairs['GOAT-USDT-SWAP']);
        
        console.log('Проверка пар BYBT:');
        console.log('BYBT пары:', Object.keys(bybtPairs).slice(0, 10), '... всего:', Object.keys(bybtPairs).length);
        console.log('ETHUSDT есть:', bybtPairs['ETHUSDT']);
        
        // Проверяем все ETH пары в итоговых данных
        const allEthPairs = [...Object.keys(bybtPairs), ...Object.keys(okxPairs), ...Object.keys(bmexPairs)].filter(pair => pair.includes('ETH'));
        console.log('Все ETH пары в итоговых данных:', allEthPairs);
        
        // Проверяем, есть ли ETHUSDT в данных
        console.log('ETHUSDT в BYBT:', 'ETHUSDT' in bybtPairs);
        console.log('ETHUSDT в OKX:', 'ETHUSDT' in okxPairs);
        console.log('ETHUSDT в BMEX:', 'ETHUSDT' in bmexPairs);
        
    } catch (error) {
        console.log('Ошибка загрузки файлов пар, используем встроенные данные:', error);
        const builtInData = getBuiltInPairData();
        
        // Распределяем встроенные данные по биржам
        Object.keys(builtInData).forEach(pair => {
            const exchange = builtInData[pair].exchange;
            if (exchange === 'BYBT') {
                bybtPairs[pair] = builtInData[pair];
            } else if (exchange === 'OKX') {
                okxPairs[pair] = builtInData[pair];
            } else if (exchange === 'BMEX') {
                bmexPairs[pair] = builtInData[pair];
            }
        });
    }
    
    console.log('Итоговые данные пар загружены - GitHub Pages Update');
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

// Парсинг размера ордера из строки типа "0.001 BTC", "10 DOGE", "1 USD", "BUY: 7 USDT / SELL: 0.00008 BTC"
function parseOrderSize(orderSizeStr) {
    // Для SPOT пар с форматом "BUY: 7 USDT / SELL: 0.00008 BTC"
    if (orderSizeStr.includes('BUY:')) {
        const buyMatch = orderSizeStr.match(/BUY:\s*([\d.]+)\s+USDT/);
        if (buyMatch) {
            return parseFloat(buyMatch[1]);
        }
    }
    
    // Для обычных форматов "0.001 BTC", "1 USD"
    const match = orderSizeStr.match(/^([\d.]+)\s+/);
    if (match) {
        return parseFloat(match[1]);
    }
    
    return null;
}

// Парсинг шага сетки из строки типа "0.0002 USDT", "0.2 USD"
function parseGridStep(gridStepStr) {
    // Для USDT
    const usdtMatch = gridStepStr.match(/^([\d.]+)\s+USDT/);
    if (usdtMatch) {
        return parseFloat(usdtMatch[1]);
    }
    
    // Для USD
    const usdMatch = gridStepStr.match(/^([\d.]+)\s+USD/);
    if (usdMatch) {
        return parseFloat(usdMatch[1]);
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
    
    // Выбираем соответствующий объект биржи
    let exchangePairs = [];
    if (selectedExchange === 'BYBT') {
        exchangePairs = Object.keys(bybtPairs);
    } else if (selectedExchange === 'OKX') {
        exchangePairs = Object.keys(okxPairs);
    } else if (selectedExchange === 'BMEX') {
        exchangePairs = Object.keys(bmexPairs);
    }
    
    // Добавляем все пары в datalist для автозаполнения
    exchangePairs.forEach(pair => {
        const option = document.createElement('option');
        option.value = pair;
        datalist.appendChild(option);
    });
    
    console.log(`Добавлено ${exchangePairs.length} пар для ${selectedExchange} в автозаполнение`);
    console.log(`Первые 10 пар ${selectedExchange}:`, exchangePairs.slice(0, 10));
    
    // Проверяем конкретные пары
    if (selectedExchange === 'BYBT') {
        console.log('ETHUSDT в списке BYBT:', exchangePairs.includes('ETHUSDT'));
        console.log('BTCUSDT в списке BYBT:', exchangePairs.includes('BTCUSDT'));
    }
}

// Фильтрация пар при вводе
function filterPairs() {
    const pairInput = document.getElementById('pair');
    const inputValue = pairInput.value.toLowerCase();
    const exchange = document.getElementById('exchange').value;
    
    console.log('Фильтрация пар:', inputValue, 'для биржи:', exchange);
    
    if (inputValue.length > 0 && exchange) {
        // Выбираем соответствующий объект биржи
        let exchangePairs = [];
        if (exchange === 'BYBT') {
            exchangePairs = Object.keys(bybtPairs);
        } else if (exchange === 'OKX') {
            exchangePairs = Object.keys(okxPairs);
        } else if (exchange === 'BMEX') {
            exchangePairs = Object.keys(bmexPairs);
        }
        
        // Показываем подходящие пары
        const matchingPairs = exchangePairs.filter(pair => 
            pair.toLowerCase().includes(inputValue)
        );
        
        console.log('Найдено пар:', matchingPairs.length, matchingPairs.slice(0, 5));
        console.log('Все пары BYBT:', Object.keys(bybtPairs));
        console.log('ETHUSDT в BYBT:', 'ETHUSDT' in bybtPairs);
        console.log('ETHUSDT в списке BYBT пар:', Object.keys(bybtPairs).includes('ETHUSDT'));
        
        if (matchingPairs.length > 0) {
            updatePairInfo();
        } else {
            // Если не найдено точных совпадений, попробуем найти по началу названия
            const fullPairName = getFullPairName(inputValue, exchange);
            if (fullPairName) {
                updatePairInfo();
            }
        }
    }
}

// Обновление информации о выбранной паре
function updatePairInfo() {
    const pairInput = document.getElementById('pair').value;
    const exchange = document.getElementById('exchange').value;
    
    console.log('updatePairInfo вызвана:', pairInput, 'для биржи:', exchange);
    
    // Ищем полное название пары, которое соответствует вводу пользователя
    const fullPairName = getFullPairName(pairInput, exchange);
    
    // Получаем информацию о паре из соответствующего объекта биржи
    const pairInfo = fullPairName ? getPairInfo(fullPairName, exchange) : null;
    
    if (fullPairName) {
        console.log('Найдена полная пара:', fullPairName);
    }
    
    console.log('pairData содержит пару:', pairInfo);
    
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
    const inputs = ['orderSize', 'maxOrderSize', 'orderSizeRatio', 'targetDistance', 'minStopProfit', 'currentPrice', 'takerFee'];
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
    
    // Обновляем расчеты при смене направления
    updateCalculatedValues();
}



// Обновление рассчитанных значений
function updateCalculatedValues() {
    const orderSize = parseFloat(document.getElementById('orderSize').value) || 0;
    const currentPrice = parseFloat(document.getElementById('currentPrice').value) || 100;
    const targetDistanceValue = document.getElementById('targetDistance').value;
    const targetDistance = targetDistanceValue === '' ? 0 : parseFloat(targetDistanceValue) || 0;
    const minStopProfitValue = document.getElementById('minStopProfit').value;
    const minStopProfit = minStopProfitValue === '' ? 0 : parseFloat(minStopProfitValue) || 0;
    
    // Order Size в USDT
    const orderSizeUsdt = orderSize * currentPrice;
    document.getElementById('orderSizeUsdt').textContent = orderSizeUsdt.toFixed(2) + ' USDT';
    
    // Profit Per Deal
    let profitPerDeal = 0;
    if (targetDistance > 0) {
        const takerFee = parseFloat(document.getElementById('takerFee').value) / 100;
        
        if (currentDirection === 'long') {
            // Новая формула для Long
            const closePrice = currentPrice * (1 + targetDistance / 100 - minStopProfit / 100);
            const profitFromPrice = orderSize * (closePrice - currentPrice);
            const feeCost = orderSize * closePrice * takerFee;
            profitPerDeal = profitFromPrice - feeCost;
        } else {
            // Новая формула для Short
            const closePrice = currentPrice * (1 - targetDistance / 100 + minStopProfit / 100);
            const profitFromPrice = orderSize * (currentPrice - closePrice);
            const feeCost = orderSize * closePrice * takerFee;
            profitPerDeal = profitFromPrice - feeCost;
        }
    }
    
    document.getElementById('profitPerDeal').textContent = profitPerDeal.toFixed(3) + ' USDT';
}

// Обновление Grid Step Visual с данными из таблицы (функция сохранена, но визуализация скрыта)
function updateGridStepVisualWithTableData(tableData) {
    const container = document.getElementById('gridStepVisual');
    if (!container || !tableData || tableData.length === 0) return;
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Создаем шкалу Grid Step %
    const xAxis = document.createElement('div');
    xAxis.className = 'grid-step-x-axis';
    xAxis.style.position = 'absolute';
    xAxis.style.bottom = '0';
    xAxis.style.left = '20px';
    xAxis.style.right = '20px';
    xAxis.style.height = '30px';
    xAxis.style.borderTop = '1px solid #ddd';
    xAxis.style.fontFamily = "'Inter', sans-serif";
    xAxis.style.fontSize = '11px';
    xAxis.style.color = '#666';
    xAxis.style.display = 'flex';
    xAxis.style.alignItems = 'center';
    xAxis.style.justifyContent = 'space-between';
    xAxis.style.paddingTop = '5px';
    container.appendChild(xAxis);
    
    // Вычисляем размеры
    const containerWidth = container.offsetWidth - 40; // Учитываем отступы
    const containerHeight = container.offsetHeight - 40; // Учитываем шкалу
    
    // Используем все триггеры из таблицы (Max Trigger Number)
    const maxLines = tableData.length;
    
    // Ограничиваем максимальный Grid Step до 10%
    const maxGridStep = Math.min(10, Math.max(...tableData.map(row => row.gridStepPercent)));
    
    // Вычисляем расстояние между линиями для равномерного распределения
    const lineSpacing = containerHeight / maxLines;
    
    for (let i = 0; i < maxLines; i++) {
        const row = tableData[i];
        
        // Проверяем, не выходим ли за пределы контейнера
        const currentYPosition = 10 + (i * lineSpacing);
        if (currentYPosition > containerHeight - 10) {
            break;
        }
        
        // Получаем данные из таблицы
        const gridStepPercent = row.gridStepPercent;
        
        // Вычисляем длину линии (пропорционально Grid Step, максимум 10%)
        const lineWidth = Math.min(containerWidth * 0.9, (gridStepPercent / 10) * containerWidth * 0.9);
        
        // Создаем линию
        const line = document.createElement('div');
        line.className = 'grid-step-line';
        line.style.top = `${currentYPosition}px`;
        line.style.left = `${20}px`; // Отступ от левого края
        line.style.width = `${lineWidth}px`;
        line.style.position = 'absolute';
        line.style.height = '2px';
        line.style.background = '#2ecc71';
        line.style.borderRadius = '1px';
        
        container.appendChild(line);
    }
    
    // Добавляем подписи на шкале X (0% до 10%)
    const xLabels = ['0%', '2.5%', '5%', '7.5%', '10%'];
    xLabels.forEach((label, index) => {
        const xLabel = document.createElement('div');
        xLabel.textContent = label;
        xLabel.style.position = 'absolute';
        xLabel.style.left = `${(index / 4) * containerWidth * 0.9}px`;
        xAxis.appendChild(xLabel);
    });
}

// Обновление Grid Step Visual (старая функция - оставляем для совместимости)
function updateGridStepVisual() {
    const container = document.getElementById('gridStepVisual');
    if (!container) return;
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Получаем параметры
    const currentPrice = parseFloat(document.getElementById('currentPrice').value) || 100;
    const gridStepPercent = parseFloat(document.getElementById('gridStepPercent').value) || 0.05;
    const gridStepRatio = parseFloat(document.getElementById('gridStepRatio').value) || 1;
    const maxTriggerNumber = parseInt(document.getElementById('maxTriggerNumber').value) || 100;
    const direction = currentDirection;
    
    // Создаем ось Y
    const yAxis = document.createElement('div');
    yAxis.className = 'grid-step-y-axis';
    container.appendChild(yAxis);
    

    
    // Вычисляем размеры
    const containerWidth = container.offsetWidth - 80; // Учитываем ось Y
    const containerHeight = container.offsetHeight;
    
    // Создаем линии для каждого триггера
    let currentYPosition = 10; // Начальная позиция Y
    
    for (let i = 1; i <= Math.min(maxTriggerNumber, 50); i++) {
        // Проверяем, не выходим ли за пределы контейнера
        if (currentYPosition > containerHeight - 30) {
            break;
        }
        // Вычисляем Grid Step для текущего триггера
        let currentGridStepPercent = gridStepPercent;
        if (i > 1) {
            currentGridStepPercent = gridStepPercent * Math.pow(gridStepRatio, i - 1);
        }
        
        // Вычисляем позицию Y (обычная - триггер #1 внизу)
        const yPosition = currentYPosition;
        
        // Вычисляем длину линии (пропорционально Grid Step)
        const lineWidth = Math.min(containerWidth * 0.8, (currentGridStepPercent / 0.1) * containerWidth * 0.5);
        
        // Вычисляем расстояние до следующего триггера (пропорционально Grid Step)
        const spacingMultiplier = currentGridStepPercent / gridStepPercent; // Множитель расстояния
        const baseSpacing = 20; // Базовое расстояние между линиями
        const currentSpacing = baseSpacing * spacingMultiplier;
        
        // Вычисляем InPrice
        let inPrice = currentPrice;
        if (i > 1) {
            if (direction === 'long') {
                inPrice = currentPrice * Math.pow(1 - currentGridStepPercent / 100, i - 1);
            } else {
                inPrice = currentPrice * Math.pow(1 + currentGridStepPercent / 100, i - 1);
            }
        }
        
        // Создаем линию
        const line = document.createElement('div');
        line.className = 'grid-step-line';
        line.style.top = `${yPosition + 10}px`;
        line.style.left = `${80}px`; // Отступ от оси Y
        line.style.width = `${lineWidth}px`;
        
        // Добавляем подписи
        const triggerLabel = document.createElement('span');
        triggerLabel.className = 'grid-step-label';
        triggerLabel.textContent = `#${i}`;
        line.appendChild(triggerLabel);
        
        const priceLabel = document.createElement('span');
        priceLabel.className = 'grid-step-label';
        priceLabel.textContent = `${inPrice.toFixed(2)}`;
        line.appendChild(priceLabel);
        
        container.appendChild(line);
        
        // Добавляем подпись на оси Y
        if (i === 1 || i === Math.min(maxTriggerNumber, 50) || i % 10 === 0) {
            const yLabel = document.createElement('div');
            yLabel.className = 'grid-step-y-label';
            yLabel.style.position = 'absolute';
            yLabel.style.top = `${yPosition + 5}px`;
            yLabel.textContent = i;
            yAxis.appendChild(yLabel);
        }
        
        // Обновляем позицию Y для следующего триггера
        currentYPosition += currentSpacing;
    }
    

}

// Основная функция расчёта
function calculate() {
    try {
        console.log('Calculate function called');
    
    // Получение всех параметров
    const params = getParameters();
    console.log('Parameters:', params);
    
    // Проверка валидности параметров
    if (!validateParameters(params)) {
        console.log('Validation failed');
        return;
    }
    
    console.log('Validation passed, calculating table...');
    
    // Расчёт таблицы
    const tableData = calculateTable(params);
    
    // Отображение результатов
    displayResults(params, tableData);
    
    // Обновляем Grid Step Visual с данными из таблицы
    updateGridStepVisualWithTableData(tableData);
    } catch (error) {
        console.error('Error in calculate function:', error);
        alert('Произошла ошибка при расчете. Попробуйте еще раз.');
    }
}

// Функции для модального окна "Автору на кофе"
function showCoffeeModal() {
    const modal = document.getElementById('coffeeModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Блокируем прокрутку страницы
}

function closeCoffeeModal() {
    const modal = document.getElementById('coffeeModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Возвращаем прокрутку страницы
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        // Показываем уведомление об успешном копировании
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = 'Скопировано!';
        button.style.background = '#28a745';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '#667eea';
        }, 2000);
    }).catch(function(err) {
        console.error('Ошибка при копировании: ', err);
        alert('Не удалось скопировать адрес. Попробуйте скопировать вручную.');
    });
}

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('coffeeModal');
    if (event.target === modal) {
        closeCoffeeModal();
    }
}

// Закрытие модального окна по клавише Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeCoffeeModal();
    }
});

// Получение информации о паре из соответствующего объекта биржи
function getPairInfo(pairName, exchange) {
    if (!pairName || !exchange) return null;
    
    if (exchange === 'BYBT') {
        return bybtPairs[pairName];
    } else if (exchange === 'OKX') {
        return okxPairs[pairName];
    } else if (exchange === 'BMEX') {
        return bmexPairs[pairName];
    }
    
    return null;
}

// Получение полного названия пары по вводу пользователя
function getFullPairName(pairInput, exchange) {
    if (!pairInput || !exchange) return null;
    
    // Выбираем соответствующий объект биржи
    let exchangePairs = {};
    if (exchange === 'BYBT') {
        exchangePairs = bybtPairs;
    } else if (exchange === 'OKX') {
        exchangePairs = okxPairs;
    } else if (exchange === 'BMEX') {
        exchangePairs = bmexPairs;
    }
    
    const matchingPairs = Object.keys(exchangePairs).filter(pair => 
        pair.toLowerCase().startsWith(pairInput.toLowerCase())
    );
    
    return matchingPairs.length > 0 ? matchingPairs[0] : null;
}

// Получение параметров из формы
function getParameters() {
    const pairInput = document.getElementById('pair').value;
    const exchange = document.getElementById('exchange').value;
    const fullPairName = getFullPairName(pairInput, exchange);
    
    return {
        exchange: exchange,
        takerFee: parseFloat(document.getElementById('takerFee').value) / 100,
        pair: fullPairName || pairInput, // Используем полное название пары
        deposit: parseFloat(document.getElementById('deposit').value),
        direction: currentDirection,

        gridStepPercent: parseFloat(document.getElementById('gridStepPercent').value),
        gridStepRatio: parseFloat(document.getElementById('gridStepRatio').value),
        maxTriggerNumber: parseInt(document.getElementById('maxTriggerNumber').value),
        orderSize: parseFloat(document.getElementById('orderSize').value),
        maxOrderSize: document.getElementById('maxOrderSize').value === '' ? null : parseFloat(document.getElementById('maxOrderSize').value),
        orderSizeRatio: parseFloat(document.getElementById('orderSizeRatio').value),
        targetDistance: document.getElementById('targetDistance').value === '' ? 0 : parseFloat(document.getElementById('targetDistance').value) || 0,
        minStopProfit: document.getElementById('minStopProfit').value === '' ? 0 : parseFloat(document.getElementById('minStopProfit').value) || 0,
        currentPrice: parseFloat(document.getElementById('currentPrice').value) || 100
    };
}

// Валидация параметров
function validateParameters(params) {
    console.log('Validating parameters:', params);
    
    if (params.deposit <= 0) {
        console.log('Deposit validation failed:', params.deposit);
        alert('Deposit должен быть больше 0');
        return false;
    }
    if (params.orderSize <= 0) {
        console.log('Order Size validation failed:', params.orderSize);
        alert('Order Size должен быть больше 0');
        return false;
    }
    if (params.maxTriggerNumber <= 0) {
        console.log('Max Trigger Number validation failed:', params.maxTriggerNumber);
        alert('Max Trigger Number должен быть больше 0');
        return false;
    }
    
    // Проверка на Min Order Size
    const minOrderSize = getPairInfo(params.pair, params.exchange)?.minOrderSize || 0.1;
    console.log('Min Order Size check:', { pair: params.pair, exchange: params.exchange, minOrderSize, orderSize: params.orderSize });
    if (params.orderSize < minOrderSize) {
        console.log('Min Order Size validation failed');
        alert(`Order Size (${params.orderSize}) не может быть меньше Min Order Size (${minOrderSize}) для выбранной пары`);
        return false;
    }
    
    // Проверка Max Order Size должен быть больше или равен Order Size (если указан)
    if (params.maxOrderSize !== null && params.maxOrderSize > 0) {
        if (params.maxOrderSize < params.orderSize) {
            alert(`Max Order Size (${params.maxOrderSize}) должен быть больше или равен Order Size (${params.orderSize})`);
            return false;
        }
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
    
    // Получаем Min Order Size для пары
    const minOrderSize = getPairInfo(params.pair, params.exchange)?.minOrderSize || 0.1;
    
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
        
        // Проверяем Order Size для первого ордера
        if (i === 1) {
            // Order Size не может быть меньше заданного пользователем И не меньше Min Order Size
            const minAllowedSize = Math.max(params.orderSize, minOrderSize);
            if (currentOrderSize < minAllowedSize) {
                currentOrderSize = minAllowedSize;
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
            
            // Order Size cal: просто умножаем на множитель без округления
            const orderSizeRatio = (params.orderSizeRatio === "" || params.orderSizeRatio < 1) ? 1 : params.orderSizeRatio;

            rawSize = previousRawSize * orderSizeRatio;
            
            // Order Size: округляем вниз до ближайшего кратного Min Order Size
            let roundedSize;
            if (params.maxOrderSize === null || params.maxOrderSize === "") {
                // Если Max Order Size пустой - округлить вниз до кратного Min Order Size
                roundedSize = Math.floor(rawSize / minOrderSize) * minOrderSize;
            } else if (rawSize < params.maxOrderSize) {
                // Если rawSize меньше Max Order Size - округлить вниз до кратного Min Order Size
                roundedSize = Math.floor(rawSize / minOrderSize) * minOrderSize;
            } else {
                // Если rawSize больше или равен Max Order Size - использовать Max Order Size
                // Но также убеждаемся, что Max Order Size кратен Min Order Size
                const maxOrderSizeRounded = Math.floor(params.maxOrderSize / minOrderSize) * minOrderSize;
                roundedSize = maxOrderSizeRounded;
            }
            
            // Order Size не может быть меньше заданного пользователем И не меньше Min Order Size
            const minAllowedSize = Math.max(params.orderSize, minOrderSize);
            if (roundedSize < minAllowedSize) {
                currentOrderSize = minAllowedSize;
            } else {
                currentOrderSize = roundedSize;
            }
            

        }
        
        // Order Size (USDT)
        const orderSizeUsdt = currentOrderSize * currentPrice;
        
        // Profit Per Deal
        let profitPerDeal = 0;
        if (params.targetDistance > 0) {
            let closePrice;
            if (params.direction === 'long') {
                closePrice = currentPrice * (1 + params.targetDistance / 100 - params.minStopProfit / 100);
                const profitFromPrice = currentOrderSize * (closePrice - currentPrice);
                const feeCost = currentOrderSize * closePrice * params.takerFee;
                profitPerDeal = profitFromPrice - feeCost;
            } else {
                closePrice = currentPrice * (1 - params.targetDistance / 100 + params.minStopProfit / 100);
                const profitFromPrice = currentOrderSize * (currentPrice - closePrice);
                const feeCost = currentOrderSize * closePrice * params.takerFee;
                profitPerDeal = profitFromPrice - feeCost;
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
    document.getElementById('tradingRangePercent').textContent = `${tradingRangePercent.toFixed(2)}%`;
    document.getElementById('tradingRangeUSDT').textContent = `${tradingRangeUsdt.toFixed(2)} USDT`;
    
    // Max Position
    document.getElementById('maxPositionCoin').textContent = `${lastRow.position.toFixed(4)} coin`;
    document.getElementById('maxPositionUSDT').textContent = `${lastRow.positionUsdt.toFixed(2)} USDT`;
    
    // Leverage
    const leverage = lastRow.positionUsdt / params.deposit;
    document.getElementById('leverage').textContent = `${leverage.toFixed(2)}x`;
    
    // Average Price
    document.getElementById('averagePrice').textContent = `${lastRow.avgPrice.toFixed(4)} USDT`;
    
    // Last Price
    document.getElementById('lastPrice').textContent = `${lastRow.inPrice.toFixed(4)} USDT`;
    
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
    
    // Создание графиков
    createCharts(tableData);
}

// Создание всех графиков
function createCharts(data) {
    if (!data || data.length === 0) {
        return;
    }
    
    // Уничтожаем предыдущие графики
    Object.values(chartInstances).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
    
    // Chart 1: Position (coin) vs Trigger Number
    createChart1(data);
    
    // Chart 2: Position (USDT) vs Trigger Number
    createChart2(data);
    
    // Chart 3: Order Size (USDT) vs Trigger Number
    createChart3(data);
    
    // Chart 4: Order Size (Coin) vs Trigger Number
    createChart4(data);
}

// Chart 1: Position (coin) vs Trigger Number
function createChart1(data) {
    const ctx = document.getElementById('chart1');
    if (!ctx) return;
    
    const chartData = data.map((row, index) => ({
        x: index + 1,
        y: row.position
    }));
    
    chartInstances.chart1 = new Chart(ctx, {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Position (coin)',
                data: chartData,
                backgroundColor: '#2ecc71',
                borderColor: '#2ecc71',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `Trigger ${context[0].dataIndex + 1}`;
                        },
                        label: function(context) {
                            return `Position: ${context[0].parsed.y.toFixed(4)} coin`;
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
                        text: 'Trigger Number',
                        font: { family: 'Inter', size: 12 }
                    },
                    ticks: { font: { family: 'Inter', size: 10 } }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Position (coin)',
                        font: { family: 'Inter', size: 12 }
                    },
                    ticks: { font: { family: 'Inter', size: 10 } }
                }
            }
        }
    });
}

// Chart 2: Position (USDT) vs Trigger Number
function createChart2(data) {
    const ctx = document.getElementById('chart2');
    if (!ctx) return;
    
    const chartData = data.map((row, index) => ({
        x: index + 1,
        y: row.positionUsdt
    }));
    
    chartInstances.chart2 = new Chart(ctx, {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Position (USDT)',
                data: chartData,
                backgroundColor: '#2ecc71',
                borderColor: '#2ecc71',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `Trigger ${context[0].dataIndex + 1}`;
                        },
                        label: function(context) {
                            return `Position: ${context[0].parsed.y.toFixed(2)} USDT`;
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
                        text: 'Trigger Number',
                        font: { family: 'Inter', size: 12 }
                    },
                    ticks: { font: { family: 'Inter', size: 10 } }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Position (USDT)',
                        font: { family: 'Inter', size: 12 }
                    },
                    ticks: { font: { family: 'Inter', size: 10 } }
                }
            }
        }
    });
}

// Chart 3: Order Size (USDT) vs Trigger Number
function createChart3(data) {
    const ctx = document.getElementById('chart3');
    if (!ctx) return;
    
    const chartData = data.map((row, index) => ({
        x: index + 1,
        y: row.orderSize * row.inPrice
    }));
    
    chartInstances.chart3 = new Chart(ctx, {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Order Size (USDT)',
                data: chartData,
                backgroundColor: '#2ecc71',
                borderColor: '#2ecc71',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `Trigger ${context[0].dataIndex + 1}`;
                        },
                        label: function(context) {
                            return `Order Size: ${context[0].parsed.y.toFixed(2)} USDT`;
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
                        text: 'Trigger Number',
                        font: { family: 'Inter', size: 12 }
                    },
                    ticks: { font: { family: 'Inter', size: 10 } }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Order Size (USDT)',
                        font: { family: 'Inter', size: 12 }
                    },
                    ticks: { font: { family: 'Inter', size: 10 } }
                }
            }
        }
    });
}

// Chart 4: Order Size (Coin) vs Trigger Number
function createChart4(data) {
    const ctx = document.getElementById('chart4');
    if (!ctx) return;
    
    const chartData = data.map((row, index) => ({
        x: index + 1,
        y: row.orderSize
    }));
    
    chartInstances.chart4 = new Chart(ctx, {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Order Size (Coin)',
                data: chartData,
                backgroundColor: '#2ecc71',
                borderColor: '#2ecc71',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `Trigger ${context[0].dataIndex + 1}`;
                        },
                        label: function(context) {
                            return `Order Size: ${context[0].parsed.y.toFixed(4)} coin`;
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
                        text: 'Trigger Number',
                        font: { family: 'Inter', size: 12 }
                    },
                    ticks: { font: { family: 'Inter', size: 10 } }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Order Size (Coin)',
                        font: { family: 'Inter', size: 12 }
                    },
                    ticks: { font: { family: 'Inter', size: 10 } }
                }
            }
        }
    });
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
            <td>${row.profitPerDeal.toFixed(3)}</td>
            <td>${row.position.toFixed(4)}</td>
            <td>${row.positionUsdt.toFixed(2)}</td>
            <td>${row.loss.toFixed(2)}</td>
            <td>${row.avgPrice.toFixed(4)}</td>
            <td>${row.liquidation > 0 ? row.liquidation.toFixed(4) : '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}




