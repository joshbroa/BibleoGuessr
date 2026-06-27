import json
import os
import matplotlib.pyplot as plt

# Resolve paths safely
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, "KJV_with_popularity.json")

# 1. Load the JSON data
with open(DATA_PATH, 'r', encoding='utf-8') as f:
    kjv_data = json.load(f)

# 2. Extract all popularity scores into a single list
popularity_scores = []
for book in kjv_data["books"]:
    for chapter in book["chapters"]:
        for verse in chapter["verses"]:
            # Default to 1 if the popularity key doesn't exist for some reason
            popularity_scores.append(verse.get("popularity", 1))

# 3. Create the plot
plt.figure(figsize=(12, 6))

# Shift bin edges by 0.5 so that integers (like 99 and 100) fall dead-center in a bar
# This creates bins like [98.5, 99.5) and [99.5, 100.5)
bin_edges = [i - 0.5 for i in range(0, 102)]

plt.hist(popularity_scores, bins=bin_edges, color='royalblue', edgecolor='black', alpha=0.7)

# 4. Customize labels and styling
plt.title("Distribution of Verse Popularity Ratings in KJV", fontsize=14, fontweight='bold')
plt.xlabel("Popularity Rating (0 - 100)", fontsize=12)
plt.ylabel("Number of Verses", fontsize=12)

# Adjust x-axis limits slightly so the outer edges of the 0 and 100 bars aren't cut off
plt.xlim(-1, 101) 
# Force ticks at intervals of 10 for clean reading
plt.xticks(range(0, 101, 10)) 

plt.grid(axis='y', linestyle='--', alpha=0.7)
# 5. Display the graph
plt.tight_layout()
plt.show()