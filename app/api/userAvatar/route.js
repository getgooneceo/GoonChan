import sharp from 'sharp';
import { NextResponse } from 'next/server';
import path from 'path';

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const avatarColor = searchParams.get('color');

    if (!avatarColor) {
      return NextResponse.json({ error: 'Avatar color is required' }, { status: 400 });
    }

    const publicDir = path.join(process.cwd(), 'public');
    const inputPath = path.join(publicDir, 'logo.webp');

    const image = sharp(inputPath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    const userRgb = hexToRgb(avatarColor);
    
    const pinkThresholdMin = { r: 200, g: 40, b: 120 };
    const pinkThresholdMax = { r: 255, g: 100, b: 180 };
    
    const pixelCount = data.length / info.channels;
    const channels = info.channels;

    for (let i = 0; i < pixelCount; i++) {
      const idx = i * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (r >= pinkThresholdMin.r && r <= pinkThresholdMax.r &&
          g >= pinkThresholdMin.g && g <= pinkThresholdMax.g &&
          b >= pinkThresholdMin.b && b <= pinkThresholdMax.b) {

        data[idx] = userRgb.r;
        data[idx + 1] = userRgb.g;
        data[idx + 2] = userRgb.b;
      }
    }

    const processedImageBuffer = await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: channels
      }
    }).webp({ quality: 90 }).toBuffer();

    return new NextResponse(processedImageBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('Error processing avatar:', error);
    return NextResponse.json({ error: 'Failed to process avatar' }, { status: 500 });
  }
}