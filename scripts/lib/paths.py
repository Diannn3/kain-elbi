from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
REPORTS_DIR = DATA_DIR / "reports"
EDITORIAL_DIR = DATA_DIR / "editorial"
UPSTREAM_DIR = DATA_DIR / "upstream"
ROOM_TBA_DIR = UPSTREAM_DIR / "room-tba"

PLACES_FILE = DATA_DIR / "places.json"
REGISTRY_FILE = DATA_DIR / "place_identity_registry.json"
MANIFEST_FILE = DATA_DIR / "manifest.json"
ROUTE_MATRIX_FILE = DATA_DIR / "route_matrix.json"
COLLECTIONS_FILE = DATA_DIR / "collections.json"
ZONES_FILE = DATA_DIR / "zones.json"
FRESHIE_FILE = DATA_DIR / "freshie.json"

OSM_RAW_FILE = RAW_DIR / "osm-los-banos-food.geojson"
OVERTURE_RAW_FILE = RAW_DIR / "overture-los-banos-food.geojson"
ROOM_TBA_GRAPH_FILE = ROOM_TBA_DIR / "walk-graph.json"
ROOM_TBA_METADATA_FILE = ROOM_TBA_DIR / "metadata.json"
