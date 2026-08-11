from PIL import Image

try:
    img = Image.open('app/public/brand/uppetite-no-text.png')
    img = img.convert('RGBA')
    w, h = img.size
    
    min_x, min_y = w, h
    max_x, max_y = 0, 0
    
    # The background is a maroon gradient. The top left pixel is (91, 4, 11)
    # The logo has white, orange, green. White is (255,255,255).
    # Let's find anything that has G > 40 OR B > 40 (since white has high B and G, orange has high G, green has high G).
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = img.getpixel((x, y))
            if (g > 40 or b > 40) and a > 10: 
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
                
    print(f"Computed Bbox: {min_x, min_y, max_x, max_y}")
    
    if max_x >= min_x and max_y >= min_y:
        logo_w = max_x - min_x
        logo_h = max_y - min_y
        
        center_x = min_x + logo_w // 2
        center_y = min_y + logo_h // 2
        
        # We want a square crop that contains the logo with some padding.
        # Let's use 1.2x the max dimension.
        size = int(max(logo_w, logo_h) * 1.2)
        
        crop_x1 = max(0, center_x - size // 2)
        crop_y1 = max(0, center_y - size // 2)
        crop_x2 = min(w, crop_x1 + size)
        crop_y2 = min(h, crop_y1 + size)
        
        # Ensure it's a perfect square
        actual_size = min(crop_x2 - crop_x1, crop_y2 - crop_y1)
        crop_x2 = crop_x1 + actual_size
        crop_y2 = crop_y1 + actual_size
        
        print(f"Cropping square from {crop_x1},{crop_y1} to {crop_x2},{crop_y2}")
        
        square = img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
        
        square.save('app/public/brand/uppetite-icon-cropped-new.png')
        
        square.resize((32, 32), Image.Resampling.LANCZOS).save('app/public/favicon.ico')
        square.resize((192, 192), Image.Resampling.LANCZOS).save('app/public/icons/uppetite-192.png')
        square.resize((512, 512), Image.Resampling.LANCZOS).save('app/public/icons/uppetite-512.png')
        square.resize((512, 512), Image.Resampling.LANCZOS).save('app/public/icons/uppetite-maskable-512.png')
        
        print("Cropped and saved.")
    else:
        print("Could not compute a valid bounding box.")

except Exception as e:
    print(f"Error: {e}")
