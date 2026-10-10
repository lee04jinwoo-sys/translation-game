import urllib.request
import zipfile
import io
import json
import re

url = 'https://www.manythings.org/anki/kor-eng.zip'
headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}

print('Fetching 6,394 authentic human-translated sentence pairs from Tatoeba...')
req = urllib.request.Request(url, headers=headers)

with urllib.request.urlopen(req) as resp:
    z = zipfile.ZipFile(io.BytesIO(resp.read()))
    content = z.read('kor.txt').decode('utf-8')

raw_lines = content.strip().split('\n')
print(f'Total raw Tatoeba lines: {len(raw_lines)}')

# Parse Tatoeba sentence pairs
tatoeba_pairs = []
seen_eng = set()
seen_kor = set()

for line in raw_lines:
    parts = line.split('\t')
    if len(parts) >= 2:
        eng = parts[0].strip()
        kor = parts[1].strip()
        
        # Filter out 1-2 word trivial entries (e.g., "Go.", "Hi.")
        word_count = len(eng.split())
        if word_count < 3:
            continue
            
        if eng not in seen_eng and kor not in seen_kor:
            seen_eng.add(eng)
            seen_kor.add(kor)
            tatoeba_pairs.append((eng, kor, word_count))

print(f'Filtered {len(tatoeba_pairs)} high-quality, authentic Tatoeba sentence pairs!')

# Topic classification keywords
travel_kw = ['hotel', 'airport', 'flight', 'ticket', 'station', 'bus', 'train', 'taxi', 'vacation', 'trip', 'travel', 'passport', 'luggage', 'room', 'map', 'beach', 'sea', 'tour', 'visit', 'city', 'seat', 'destination', 'tourist', 'reservation']
business_kw = ['meeting', 'company', 'work', 'job', 'office', 'boss', 'salary', 'contract', 'client', 'business', 'email', 'report', 'project', 'market', 'money', 'cost', 'pay', 'dollar', 'price', 'buy', 'sell', 'manager', 'employee', 'deal', 'strategy', 'customer']
school_kw = ['school', 'student', 'teacher', 'class', 'study', 'test', 'exam', 'book', 'read', 'write', 'learn', 'library', 'university', 'college', 'homework', 'paper', 'science', 'math', 'language', 'english', 'korean', 'lesson', 'question', 'answer', 'professor']

def classify_topic(eng):
    e = eng.lower()
    if any(kw in e for kw in travel_kw):
        return 'travel'
    elif any(kw in e for kw in business_kw):
        return 'business'
    elif any(kw in e for kw in school_kw):
        return 'school'
    else:
        return 'daily'

# Group by topic and word length (CEFR Level proxy)
buckets = {
    (lvl, top): [] for lvl in range(1, 6) for top in ['daily', 'travel', 'business', 'school']
}

for eng, kor, wc in tatoeba_pairs:
    topic = classify_topic(eng)
    
    if wc <= 5:
        lvl = 1
    elif wc <= 8:
        lvl = 2
    elif wc <= 11:
        lvl = 3
    elif wc <= 15:
        lvl = 4
    else:
        lvl = 5
        
    buckets[(lvl, topic)].append((kor, eng))

# Ensure each cell gets 50 items (if a bucket has fewer than 50, borrow from adjacent levels of same topic)
final_db = []
item_id = 1

for lvl in range(1, 6):
    for top in ['daily', 'travel', 'business', 'school']:
        items = buckets[(lvl, top)]
        
        # If pool is smaller than 50, borrow from neighboring levels of same topic
        if len(items) < 50:
            for alt_lvl in [lvl-1, lvl+1, lvl-2, lvl+2, 1, 2, 3, 4, 5]:
                if alt_lvl in range(1, 6) and alt_lvl != lvl:
                    borrowed = [x for x in buckets[(alt_lvl, top)] if x not in items]
                    items.extend(borrowed)
                    if len(items) >= 50:
                        break
                        
        selected = items[:50]
        assert len(selected) == 50, f'L{lvl}-{top} has only {len(selected)} items'
        
        for k, e in selected:
            final_db.append({
                'id': item_id,
                'korean': k,
                'english': e,
                'topic': top,
                'level': lvl
            })
            item_id += 1

print(f'Total Tatoeba DB items created: {len(final_db)}')

# Save to public/sentences.json
with open('/Users/leejinwoo/Desktop/Projects/translation-game/public/sentences.json', 'w', encoding='utf-8') as f:
    json.dump(final_db, f, ensure_ascii=False, indent=2)

print('SUCCESS! Replaced sentences.json with 1,000 AUTHENTIC TATOEBA HUMAN SENTENCES!')
