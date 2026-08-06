import json
import urllib.request
import urllib.parse
from pathlib import Path
import sys

# Ensure UTF-8 output for Windows console
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

# Overpass query defined in the research plan
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
QUERY = """
[out:json][timeout:60];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"]
    (14.130,121.210,14.190,121.280);

  nwr["shop"~"^(bakery|deli|confectionery)$"]
    (14.130,121.210,14.190,121.280);
);
out center tags;
"""

def fetch_osm_data():
    print("Fetching data from OpenStreetMap (Overpass API)...")
    data = urllib.parse.urlencode({'data': QUERY}).encode('utf-8')
    req = urllib.request.Request(OVERPASS_URL, data=data)
    # Be polite to Overpass by setting a User-Agent
    req.add_header('User-Agent', 'KainElbi-Data-Extractor/1.0 (Student Project)')
    
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        return result

def convert_to_geojson(osm_data):
    features = []
    for element in osm_data.get('elements', []):
        # We requested 'center' for ways/relations, so they should have lat/lon or center lat/lon
        lat = element.get('lat') or (element.get('center', {}).get('lat'))
        lon = element.get('lon') or (element.get('center', {}).get('lon'))
        
        if lat is None or lon is None:
            continue
            
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": element.get('tags', {})
        }
        feature['properties']['osm_id'] = f"{element['type']}/{element['id']}"
        feature['properties']['osm_type'] = element['type']
        
        features.append(feature)
        
    return {
        "type": "FeatureCollection",
        "features": features
    }

def main():
    try:
        osm_data = fetch_osm_data()
        elements_count = len(osm_data.get('elements', []))
        print(f"Received {elements_count} elements from OSM.")
        
        geojson_data = convert_to_geojson(osm_data)
        
        output_dir = Path(__file__).parent.parent / "data" / "raw"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        output_file = output_dir / "osm-los-banos-food.geojson"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(geojson_data, f, indent=2, ensure_ascii=False)
            
        print(f"Successfully saved GeoJSON to {output_file}")
    except Exception as e:
        print(f"Error fetching or parsing OSM data: {e}")

if __name__ == "__main__":
    main()
