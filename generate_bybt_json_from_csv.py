#!/usr/bin/env python3
import json
import csv
import re

def generate_bybt_json_from_csv():
    pairs = {}
    
    with open('bybt_pairs.csv', 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            exchange = row['Exchange'].strip()
            name = row['Name'].strip()
            type_ = row['Type'].strip()
            
            # Проверяем, что это BYBT и USDT_FUTURES
            if exchange == 'BYBT' and type_ == 'USDT_FUTURES':
                min_order_size_str = row['Min Order Size'].strip()
                min_grid_step_str = row['Min Grid Step'].strip()
                
                # Парсим Min Order Size (например, "0.01 ETH" -> 0.01)
                min_order_size = 0.1  # значение по умолчанию
                match = re.match(r'^([\d.]+)\s+', min_order_size_str)
                if match:
                    min_order_size = float(match.group(1))
                
                # Парсим Min Grid Step (например, "0.02 USDT" -> 0.02)
                min_grid_step = 0.0002  # значение по умолчанию
                match = re.match(r'^([\d.]+)\s+USDT', min_grid_step_str)
                if match:
                    min_grid_step = float(match.group(1))
                
                pairs[name] = {
                    "exchange": "BYBT",
                    "minOrderSize": min_order_size,
                    "minGridStep": min_grid_step,
                    "currentPrice": 0
                }
    
    # Сохраняем в JSON файл
    with open('pairs-bybt.json', 'w', encoding='utf-8') as jsonfile:
        json.dump(pairs, jsonfile, indent=2, ensure_ascii=False)
    
    print(f"Сгенерировано {len(pairs)} пар BYBT")
    print("Первые 10 пар:", list(pairs.keys())[:10])
    print("ETHUSDT присутствует:", "ETHUSDT" in pairs)
    
    # Проверяем несколько конкретных пар
    test_pairs = ["ETHUSDT", "BTCUSDT", "ADAUSDT", "SOLUSDT"]
    for pair in test_pairs:
        if pair in pairs:
            print(f"{pair}: minOrderSize={pairs[pair]['minOrderSize']}, minGridStep={pairs[pair]['minGridStep']}")
        else:
            print(f"{pair}: НЕ НАЙДЕН")

if __name__ == "__main__":
    generate_bybt_json_from_csv()
