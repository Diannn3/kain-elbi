from PIL import Image

try:
    img = Image.open('app/public/brand/uppetite-no-text.png')
    img = img.convert('RGBA')
    w, h = img.size
    
    min_x, min_y = w, h
    max_x, max_y = 0, 0
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = img.getpixel((x, y))
            # The background is maroon (high R, very low G and B).
            # The icon is green and yellow. Both have high green (or at least > 40).
            # So let's look for pixels with g > 40.
            if g > 40 and a > 10: 
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
                
    print(f"Computed Bbox: {min_x, min_y, max_x, max_y}")
    
    if max_x >= min_x and max_y >= min_y:
        # Add a little padding if we want, or just crop tightly to the green square.
        # Actually, let's just crop exactly to the bounding box.
        cropped = img.crop((min_x, min_y, max_x + 1, max_y + 1))
        
        # Make square
        cw, ch = cropped.size
        size = max(cw, ch)
        square = Image.new('RGBA', (size, size), (0,0,0,0))
        square.paste(cropped, ((size - cw) // 2, (size - ch) // 2))
        
        square.save('app/public/brand/uppetite-icon-cropped.png')
        
        square.resize((32, 32)).save('app/public/favicon.ico')
        square.resize((192, 192)).save('app/public/icons/uppetite-192.png')
        square.resize((512, 512)).save('app/public/icons/uppetite-512.png')
        square.resize((512, 512)).save('app/public/icons/uppetite-maskable-512.png')
        
        print("Cropped and saved.")
    else:
        print("Could not compute a valid bounding box.")

except Exception as e:
    print(f"Error: {e}")
