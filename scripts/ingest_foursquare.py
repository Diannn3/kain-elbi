import json
import os
from pathlib import Path
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

def main():
    output_dir = Path(__file__).parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "foursquare-los-banos-food.geojson"

    # Los Banos Bounding Box
    min_lon, max_lon = 121.210, 121.280
    min_lat, max_lat = 14.130, 14.190

    try:
        import duckdb
        import pandas as pd
    except ImportError:
        print("Error: Required packages 'duckdb' and 'pandas' are not installed.")
        print("Please run: pip install duckdb pandas")
        return

    print("Connecting to DuckDB and loading httpfs extension...")
    con = duckdb.connect()
    
    try:
        con.execute("INSTALL httpfs; LOAD httpfs;")
    except Exception as e:
        print(f"Warning: Could not install/load httpfs extension. You may not be able to query S3. ({e})")

    # This URL targets the public S3 bucket for Foursquare OS Places
    # The 'latest' alias or specific release date can be used. We'll use a wildcard that should hit the dataset.
    # Note: If the bucket structure changes, this path might need an update to the current release date.
    # Update as of late 2024, Foursquare uses date-based releases. We'll try the common pattern.
    foursquare_s3_path = "s3://fsq-os-places-us-east-1/release/latest/places/parquet/**/*.parquet"

    print(f"Querying Foursquare OS Places data from S3 within bbox...")
    print("This might take a few moments as it reads parquet metadata from S3.")
    
    query = f"""
    SELECT 
        fsq_id,
        name,
        latitude,
        longitude,
        address,
        locality,
        region,
        country,
        fsq_category_ids,
        fsq_category_labels,
        date_created,
        date_updated
    FROM read_parquet('{foursquare_s3_path}')
    WHERE latitude BETWEEN {min_lat} AND {max_lat}
      AND longitude BETWEEN {min_lon} AND {max_lon}
    """
    
    try:
        # Fetch data into a pandas dataframe
        results = con.execute(query).df()
        
        print(f"Received {len(results)} records from Foursquare.")
        
        # Convert to GeoJSON
        features = []
        for _, row in results.iterrows():
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [row['longitude'], row['latitude']]
                },
                "properties": row.drop(['latitude', 'longitude']).to_dict()
            }
            # Clean up NaN values in properties
            for k, v in feature['properties'].items():
                if pd.isna(v):
                    feature['properties'][k] = None
            features.append(feature)
            
        geojson_data = {
            "type": "FeatureCollection",
            "features": features
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(geojson_data, f, indent=2, ensure_ascii=False)
            
        print(f"Successfully saved to {output_file}")
        
    except Exception as e:
        print(f"Error querying Foursquare data: {e}")
        print("Note: If S3 access fails, ensure AWS credentials are not incorrectly configured or try a local download of the Foursquare dataset from their developer portal.")

if __name__ == "__main__":
    main()
