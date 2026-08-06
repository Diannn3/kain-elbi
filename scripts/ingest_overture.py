import sys
import subprocess
from pathlib import Path

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

def main():
    output_dir = Path(__file__).parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "overture-los-banos-food.geojson"

    # Los Baños Bounding Box (west, south, east, north)
    # Overpass bbox was (14.130, 121.210, 14.190, 121.280) -> (min_lat, min_lon, max_lat, max_lon)
    # Overturemaps bbox is W, S, E, N -> min_lon, min_lat, max_lon, max_lat
    bbox = "121.210,14.130,121.280,14.190"

    print(f"Downloading Overture Maps Places data for bounding box {bbox}...")
    print("Note: This requires the 'overturemaps' python package to be installed.")
    
    # We will use the official overturemaps CLI
    cmd = [
        sys.executable, "-m", "overturemaps", "download",
        "--bbox", bbox,
        "-f", "geojson",
        "--type", "place",
        "-o", str(output_file)
    ]
    
    try:
        subprocess.run(cmd, check=True)
        print(f"Successfully saved Overture Places to {output_file}")
    except subprocess.CalledProcessError as e:
        print(f"Error running overturemaps: {e}")
        print("Please ensure 'overturemaps' is installed (pip install overturemaps).")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()
