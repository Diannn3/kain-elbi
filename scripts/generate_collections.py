import json
from pathlib import Path
import datetime
import random
import sys

# Windows Unicode output fix
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

def main():
    base_dir = Path(r"C:\Users\Dian\Documents\Vaults\Fensalir\businesses\kain_elbi")
    data_dir = base_dir / "data"
    places_file = data_dir / "places.json"
    out_collections_file = data_dir / "collections.json"
    
    with open(places_file, 'r', encoding='utf-8') as f:
        places_data = json.load(f)
        
    valid_places = [p for p in places_data if p.get("id")]
    
    # Shuffle for randomness in MVP
    random.seed(42)
    random.shuffle(valid_places)
    
    raymundo_places = [p["id"] for p in valid_places[:5]]
    freshie_places = [p["id"] for p in valid_places[5:10]]
    hidden_gems = [p["id"] for p in valid_places[10:15]]

    collections = [
        {
            "id": "raymundo-essentials",
            "title": "Raymundo Essentials",
            "description": "The reliable staples along Raymundo Gate. Quick, student-friendly, and always open when you need them.",
            "research_date": "2026-08-01",
            "evidence_count": 5,
            "source_urls": ["https://uplb.edu.ph"],
            "cover_metadata": {
                "theme": "leaf"
            },
            "place_ids": raymundo_places
        },
        {
            "id": "freshie-starter-pack",
            "title": "Freshie Starter Pack",
            "description": "Welcome to Elbi! Here are the legendary spots every freshie needs to try in their first semester.",
            "research_date": "2026-08-01",
            "evidence_count": 8,
            "source_urls": [],
            "cover_metadata": {
                "theme": "sun"
            },
            "place_ids": freshie_places
        },
        {
            "id": "cafe-and-chills",
            "title": "Café & Chills",
            "description": "Need to study or just want some aircon? The best cafes around campus with decent coffee.",
            "research_date": "2026-08-02",
            "evidence_count": 10,
            "source_urls": [],
            "cover_metadata": {
                "theme": "forest"
            },
            "place_ids": hidden_gems
        }
    ]
    
    with open(out_collections_file, 'w', encoding='utf-8') as f:
        json.dump(collections, f, indent=2)
        
    print(f"Successfully wrote {out_collections_file}")

if __name__ == '__main__':
    main()
