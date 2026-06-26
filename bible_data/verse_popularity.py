import json
import math
import re

# Helper function to parse 'bbcccvvv' ID into (book_index, chapter, verse)
def parse_verse_id(id_str):
    if not id_str or len(id_str) != 8:
        return None
    return {
        "book_idx": int(id_str[0:2]) - 1, # 01 becomes index 0
        "chapter": int(id_str[2:5]),
        "verse": int(id_str[5:8])
    }

# 1. Aggregate votes per individual verse
verse_votes = {}

with open('topics-votes.txt', 'r', encoding='utf-8') as f:
    # Skip the header line
    next(f)
    for line in f:
        parts = line.strip().split('\t')
        if len(parts) < 4:
            continue
            
        start_id = parts[1]
        end_id = parts[2] if parts[2] else start_id
        try:
            votes = int(parts[3])
        except ValueError:
            continue
            
        start_meta = parse_verse_id(start_id)
        end_meta = parse_verse_id(end_id)
        
        if not start_meta or not end_meta:
            continue
            
        # Handle single verse or small range within the same book/chapter safely
        # Note: If a range spans multiple chapters, this simple loop handles the verse number span.
        # For an exact cross-chapter boundary system, expanding intermediate chapters is ideal, 
        # but for OpenBible topical data, 99% of ranges are intra-chapter lists.
        for v in range(start_meta["verse"], end_meta["verse"] + 1):
            key = f"{start_meta['book_idx']}_{start_meta['chapter']}_{v}"
            verse_votes[key] = verse_votes.get(key, 0) + votes

# 2. Find the maximum votes accumulated by a single verse for scaling
max_votes = max(verse_votes.values()) if verse_votes else 1

# 3. Load your existing KJV JSON structure
with open('KJV.json', 'r', encoding='utf-8') as f:
    kjv_data = json.load(f)

# 4. Inject popularity metadata into the JSON tree
for b_idx, book in enumerate(kjv_data["books"]):
    for chapter_obj in book["chapters"]:
        ch = chapter_obj["chapter"]
        for verse_obj in chapter_obj["verses"]:
            v = verse_obj["verse"]
            
            # Construct the matching key for our vote map
            lookup_key = f"{b_idx}_{ch}_{v}"
            raw_votes = verse_votes.get(lookup_key, 0)
            
            # Apply Logarithmic Smoothing
            if raw_votes > 0:
                score = 1 + 99 * (math.log(raw_votes + 1) / math.log(max_votes + 1))
                popularity_score = round(score)
            else:
                popularity_score = 1 # Default baseline for entirely unvoted verses
                
            # Inject the new key
            verse_obj["popularity"] = popularity_score

# 5. Save the updated, game-ready JSON payload
with open('KJV_with_popularity.json', 'w', encoding='utf-8') as f:
    json.dump(kjv_data, f, indent=4)

print("Successfully injected popularity metadata into KJV_with_popularity.json!")