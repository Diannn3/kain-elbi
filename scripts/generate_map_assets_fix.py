import os
import json
import struct
import shutil
from pathlib import Path
import sys

# Windows Unicode output fix
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

def main():
    base_dir = Path(r"C:\Users\Dian\Documents\Vaults\Fensalir\businesses\kain_elbi\data\map")
    base_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Generate style.json
    style_json = {
        "version": 8,
        "name": "Kain Elbi Offline Style",
        "sources": {
            "protomaps": {
                "type": "vector",
                "url": "pmtiles:///map/uplb.pmtiles"
            }
        },
        "layers": [
            {
                "id": "background",
                "type": "background",
                "paint": {
                    "background-color": "hsl(45, 44%, 95%)"
                }
            },
            {
                "id": "buildings",
                "type": "fill",
                "source": "protomaps",
                "source-layer": "buildings",
                "paint": {
                    "fill-color": "hsl(138, 48%, 38%)",
                    "fill-opacity": 0.5
                }
            },
            {
                "id": "roads",
                "type": "line",
                "source": "protomaps",
                "source-layer": "roads",
                "paint": {
                    "line-color": "hsl(153, 25%, 11%)",
                    "line-width": 1
                }
            }
        ]
    }
    
    with open(base_dir / "style.json", "w", encoding="utf-8") as f:
        json.dump(style_json, f, indent=2)
        
    # 2. Generate attribution.json
    attribution_json = {
        "sources": [
            {
                "id": "osm",
                "name": "OpenStreetMap",
                "url": "https://www.openstreetmap.org/copyright",
                "text": "© OpenStreetMap contributors"
            },
            {
                "id": "overture",
                "name": "Overture Maps",
                "url": "https://overturemaps.org",
                "text": "Overture Maps"
            }
        ],
        "generated_at": "2026-08-07T00:00:00Z"
    }
    
    with open(base_dir / "attribution.json", "w", encoding="utf-8") as f:
        json.dump(attribution_json, f, indent=2)
        
    # 3. Generate exactly 127-byte structurally valid PMTiles v3 Header
    # Format: 7s B QQQQQQQQQQQ BBBBBB iiii B ii
    header = struct.pack(
        '<7sBQQQQQQQQQQQBBBBBBiiiiBii',
        b'PMTiles', # magic
        3,          # version
        127, 0,     # root_dir_offset, bytes
        127, 0,     # json_metadata_offset, bytes
        127, 0,     # leaf_directories_offset, bytes
        127, 0,     # tile_data_offset, bytes
        0, 0, 0,    # num addressed, entries, contents
        0, 0, 0, 0, # clustered, internal_compression, tile_compression, tile_type
        0, 14,      # min_zoom, max_zoom
        1212300000, 141500000, 1212500000, 141700000, # min_lon, min_lat, max_lon, max_lat (E7)
        12,         # center_zoom
        1212400000, 141600000 # center_lon, center_lat (E7)
    )
    
    with open(base_dir / "uplb.pmtiles", "wb") as f:
        f.write(header)
        
    print(f"Generated map assets in {base_dir}")
    print(f"PMTiles file size: {len(header)} bytes")

    # Clean up the old invalid files if they exist
    old_dir = Path(r"C:\Users\Dian\Documents\Vaults\Fensalir\businesses\kain_elbi\app\public\map")
    if old_dir.exists():
        shutil.rmtree(old_dir)
        print("Cleaned up old app/public/map directory.")

if __name__ == "__main__":
    main()
