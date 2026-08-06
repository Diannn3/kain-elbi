import json
import math
import datetime
from pathlib import Path
import os
import sys

# Windows Unicode output fix
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # Radius of earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

def main():
    base_dir = Path(r"C:\Users\Dian\Documents\Vaults\Fensalir\businesses\kain_elbi")
    data_dir = base_dir / "data"
    
    places_file = data_dir / "places.json"
    app_data_file = Path(r"C:\Users\Dian\.gemini\antigravity\brain\86604351-1290-4d83-ad93-590af32467d2\scratch\room-tba\data\app_data.json")
    
    out_matrix_file = data_dir / "route_matrix.json"
    
    print("Loading places.json...")
    with open(places_file, 'r', encoding='utf-8') as f:
        places_data = json.load(f)
        
    print("Loading app_data.json from room-tba...")
    with open(app_data_file, 'r', encoding='utf-8') as f:
        app_data = json.load(f)
        
    buildings = app_data.get("buildings", {})
    
    print(f"Loaded {len(places_data)} places and {len(buildings)} buildings.")
    
    WALKING_SPEED_MPS = 1.2
    DETOUR_MULTIPLIER = 1.3
    
    anchors = {}
    for bldg_name, bldg_info in buildings.items():
        anchors[bldg_name] = {
            "id": bldg_name,
            "name": bldg_name,
            "lat": bldg_info.get("lat"),
            "lon": bldg_info.get("lon")
        }
        
    anchor_to_place = {}
    place_to_anchor = {}
    
    print("Calculating anchor <-> place matrix...")
    for bldg_name, bldg in anchors.items():
        if not bldg.get("lat") or not bldg.get("lon"): continue
        
        anchor_to_place[bldg_name] = {}
        for place in places_data:
            place_id = place.get("id")
            if not place_id or "lat" not in place or "lon" not in place: continue
            
            dist = haversine(bldg["lat"], bldg["lon"], place["lat"], place["lon"])
            effective_dist = dist * DETOUR_MULTIPLIER
            seconds = int(effective_dist / WALKING_SPEED_MPS)
            
            anchor_to_place[bldg_name][place_id] = seconds
            
            if place_id not in place_to_anchor:
                place_to_anchor[place_id] = {}
            place_to_anchor[place_id][bldg_name] = seconds

    print("Calculating anchor <-> anchor matrix...")
    anchor_to_anchor = {}
    for b1_name, b1 in anchors.items():
        if not b1.get("lat") or not b1.get("lon"): continue
        anchor_to_anchor[b1_name] = {}
        for b2_name, b2 in anchors.items():
            if not b2.get("lat") or not b2.get("lon"): continue
            
            if b1_name == b2_name:
                anchor_to_anchor[b1_name][b2_name] = 0
            else:
                dist = haversine(b1["lat"], b1["lon"], b2["lat"], b2["lon"])
                effective_dist = dist * DETOUR_MULTIPLIER
                seconds = int(effective_dist / WALKING_SPEED_MPS)
                anchor_to_anchor[b1_name][b2_name] = seconds

    route_matrix = {
        "schema_version": 1,
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "walking_speed_mps": WALKING_SPEED_MPS,
        "anchors": anchors,
        "anchor_to_place_seconds": anchor_to_place,
        "place_to_anchor_seconds": place_to_anchor,
        "anchor_to_anchor_seconds": anchor_to_anchor
    }
    
    with open(out_matrix_file, 'w', encoding='utf-8') as f:
        json.dump(route_matrix, f, indent=2)
        
    print(f"Successfully wrote {out_matrix_file}")

if __name__ == '__main__':
    main()
