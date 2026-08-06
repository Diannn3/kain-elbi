import json
import uuid
import math
from pathlib import Path
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

# Basic Haversine distance
def haversine(lon1, lat1, lon2, lat2):
    R = 6371000  # radius of Earth in meters
    phi_1 = math.radians(lat1)
    phi_2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Simple string similarity (Jaccard on words)
def string_sim(s1, s2):
    if not s1 or not s2:
        return 0
    w1 = set(str(s1).lower().split())
    w2 = set(str(s2).lower().split())
    if not w1 or not w2:
        return 0
    return len(w1.intersection(w2)) / len(w1.union(w2))

def main():
    data_dir = Path(__file__).parent.parent / "data" / "raw"
    osm_file = data_dir / "osm-los-banos-food.geojson"
    overture_file = data_dir / "overture-los-banos-food.geojson"
    
    osm_data = {"features": []}
    overture_data = {"features": []}
    
    if osm_file.exists():
        with open(osm_file, 'r', encoding='utf-8') as f:
            osm_data = json.load(f)
            
    if overture_file.exists():
        with open(overture_file, 'r', encoding='utf-8') as f:
            overture_data = json.load(f)

    print(f"Loaded {len(osm_data['features'])} OSM records.")
    print(f"Loaded {len(overture_data['features'])} Overture records.")

    normalized = []

    # Process OSM
    for f in osm_data['features']:
        props = f['properties']
        coords = f['geometry']['coordinates']
        name = props.get('name')
        
        category = props.get('amenity') or props.get('shop')
        cuisine = props.get('cuisine')
        
        normalized.append({
            "source": "osm",
            "source_id": props.get('osm_id'),
            "name": name,
            "lon": coords[0],
            "lat": coords[1],
            "category": category,
            "cuisine": cuisine,
            "phone": props.get('phone') or props.get('contact:phone'),
            "website": props.get('website') or props.get('contact:website'),
            "opening_hours": props.get('opening_hours'),
            "raw": props
        })

    # Process Overture
    for f in overture_data['features']:
        props = f['properties']
        coords = f['geometry']['coordinates']
        
        # Overture names are often in a dictionary {'primary': 'Name'}
        name = None
        names_prop = props.get('names')
        if isinstance(names_prop, dict) and 'primary' in names_prop:
            name = names_prop['primary']
        elif isinstance(names_prop, str):
            name = names_prop
            
        categories_prop = props.get('categories')
        category = None
        if isinstance(categories_prop, dict) and 'main' in categories_prop:
            category = categories_prop['main']
            
        phones_prop = props.get('phones')
        phone = phones_prop[0] if isinstance(phones_prop, list) and len(phones_prop) > 0 else phones_prop
        
        websites_prop = props.get('websites')
        website = websites_prop[0] if isinstance(websites_prop, list) and len(websites_prop) > 0 else websites_prop
        
        # Check if overture record is actually a food place
        # Since overture downloaded all places in bbox, we filter for food categories
        if not category:
            continue
        cat_lower = str(category).lower()
        if not any(food_kw in cat_lower for food_kw in ['restaurant', 'cafe', 'food', 'bakery', 'coffee', 'pizza', 'burger', 'drink', 'bar']):
            continue

        normalized.append({
            "source": "overture",
            "source_id": props.get('id'),
            "name": name,
            "lon": coords[0],
            "lat": coords[1],
            "category": category,
            "cuisine": None,
            "phone": phone,
            "website": website,
            "opening_hours": None,  # Overture doesn't reliably have this in this theme usually
            "raw": props
        })

    print(f"Total relevant food candidates before deduplication: {len(normalized)}")

    # Deduplication
    unique_places = []
    duplicates = 0
    
    for record in normalized:
        is_duplicate = False
        for up in unique_places:
            dist = haversine(record['lon'], record['lat'], up['lon'], up['lat'])
            sim = string_sim(record['name'], up['name'])
            
            # Logic: If they are within 50 meters and have a > 50% name match, merge them
            # If they are within 10 meters and one has no name, assume they might be the same (cautious)
            if dist < 50 and sim > 0.5:
                is_duplicate = True
            elif dist < 15 and (not record['name'] or not up['name']):
                is_duplicate = True
                
            if is_duplicate:
                duplicates += 1
                up['sources'].append({
                    "source": record["source"],
                    "source_id": record["source_id"]
                })
                if not up['name'] and record['name']:
                    up['name'] = record['name']
                if not up['category'] and record['category']:
                    up['category'] = record['category']
                if not up['opening_hours'] and record['opening_hours']:
                    up['opening_hours'] = record['opening_hours']
                break
                
        if not is_duplicate:
            record['id'] = str(uuid.uuid4())
            record['sources'] = [{"source": record["source"], "source_id": record["source_id"]}]
            del record['source']
            del record['source_id']
            unique_places.append(record)

    report = {
        "raw_osm": len(osm_data['features']),
        "raw_overture": len(overture_data['features']),
        "total_food_candidates": len(normalized),
        "apparent_duplicates": duplicates,
        "unique_places": len(unique_places),
        "metrics": {
            "has_name": sum(1 for p in unique_places if p['name']),
            "has_category": sum(1 for p in unique_places if p['category']),
            "has_cuisine": sum(1 for p in unique_places if p['cuisine']),
            "has_phone": sum(1 for p in unique_places if p['phone']),
            "has_website": sum(1 for p in unique_places if p['website']),
            "has_opening_hours": sum(1 for p in unique_places if p['opening_hours']),
        }
    }

    print("="*40)
    print("PROOF OF DATA REPORT")
    print("="*40)
    for k, v in report.items():
        if k == "metrics":
            for mk, mv in v.items():
                print(f"  {mk}: {mv} ({(mv/len(unique_places))*100:.1f}%)")
        else:
            print(f"{k}: {v}")
            
    # Go/No-Go Decision (80+ unique places, 70% categorized)
    is_go = (
        len(unique_places) >= 80 and
        (report['metrics']['has_category'] / len(unique_places)) >= 0.70
    )
    
    print("="*40)
    print(f"GO/NO-GO DECISION: {'GO' if is_go else 'NO-GO'}")
    
    with open(data_dir.parent / "places.json", 'w', encoding='utf-8') as f:
        json.dump(unique_places, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully saved deduped data to places.json")

if __name__ == "__main__":
    main()
