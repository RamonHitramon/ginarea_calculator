#!/usr/bin/env python3
import json
import csv

def generate_bybt_json():
    pairs = {}
    
    with open('GA Pairs.csv', 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            exchange = row['Exchange'].strip()
            name = row['Name'].strip()
            type_ = row['Type'].strip()
            
            # Только BYBT USDT_FUTURES пары
            if exchange == 'BYBT' and type_ == 'USDT_FUTURES':
                # Парсим Min Order Size
                min_order_size_str = row['Min Order Size'].strip()
                min_order_size = 0.1  # значение по умолчанию
                
                # Извлекаем число из строки типа "0.001 BTC"
                import re
                match = re.match(r'^([\d.]+)\s+', min_order_size_str)
                if match:
                    min_order_size = float(match.group(1))
                
                # Парсим Min Grid Step
                min_grid_step_str = row['Min Grid Step'].strip()
                min_grid_step = 0.0002  # значение по умолчанию
                
                # Извлекаем число из строки типа "0.2 USDT"
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

if __name__ == "__main__":
    generate_bybt_json()
