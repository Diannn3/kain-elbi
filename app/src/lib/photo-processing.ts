/**
 * Compresses an image file locally using an HTML5 Canvas and exports it as WebP.
 * This effectively strips EXIF data (including GPS) and reduces upload payload size.
 *
 * @param file The original image file from an <input type="file">
 * @param maxWidth The maximum width to scale down to (default: 1200)
 * @param quality WebP compression quality 0.0 to 1.0 (default: 0.8)
 * @returns A Promise that resolves to the processed File ready for upload
 */
export async function processAndStripPhoto(
	file: File,
	maxWidth = 1200,
	quality = 0.8
): Promise<File> {
	return new Promise((resolve, reject) => {
		if (!file.type.startsWith('image/')) {
			reject(new Error('File is not an image'));
			return;
		}

		const img = new Image();
		const objectUrl = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(objectUrl);

			let width = img.width;
			let height = img.height;

			if (width > maxWidth) {
				height = Math.round((height * maxWidth) / width);
				width = maxWidth;
			}

			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error('Could not get canvas context'));
				return;
			}

			// Draw image onto canvas (automatically ignores/strips EXIF rotation unless browsers auto-orient,
			// modern browsers auto-orient the image during drawImage).
			ctx.drawImage(img, 0, 0, width, height);

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						reject(new Error('Canvas toBlob failed'));
						return;
					}
					// Create a new File object from the blob
					const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
					const newFile = new File([blob], newFileName, {
						type: 'image/webp',
						lastModified: Date.now()
					});
					resolve(newFile);
				},
				'image/webp',
				quality
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error('Failed to load image'));
		};

		img.src = objectUrl;
	});
}
