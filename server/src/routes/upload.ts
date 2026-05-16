import { Router, Response } from 'express';
import supabase from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Bucket name for player photos
const BUCKET_NAME = 'player-photos';

// Initialize bucket (create if not exists)
async function ensureBucketExists() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
    });
    if (error && !error.message.includes('already exists')) {
      console.error('Failed to create bucket:', error);
    }
  }
}

// Call on startup
ensureBucketExists();

/**
 * Download image from URL and upload to Supabase Storage
 */
router.post('/from-url', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { url, filename } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Download image from URL
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(400).json({ error: `Failed to fetch image: ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    // Determine file extension
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
    else if (contentType.includes('avif')) extension = 'avif';
    else if (contentType.includes('gif')) extension = 'gif';

    // Generate unique filename
    const uniqueFilename = filename
      ? `${filename.replace(/[^a-zA-Z0-9]/g, '_')}_${uuidv4().slice(0, 8)}.${extension}`
      : `${uuidv4()}.${extension}`;

    // Upload to Supabase Storage
    const filePath = `${req.tournamentId}/${uniqueFilename}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    res.json({
      success: true,
      url: publicUrlData.publicUrl,
      path: filePath,
    });
  } catch (error: any) {
    console.error('Upload from URL error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

/**
 * Bulk download images from URLs and upload to Supabase Storage
 */
router.post('/bulk-from-url', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { images } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Images array is required' });
    }

    const results: Array<{ originalUrl: string; newUrl: string | null; error?: string }> = [];

    for (const img of images) {
      const { url, filename } = img;

      if (!url) {
        results.push({ originalUrl: url, newUrl: null, error: 'No URL provided' });
        continue;
      }

      // Skip if already a Supabase URL
      if (url.includes('supabase.co')) {
        results.push({ originalUrl: url, newUrl: url });
        continue;
      }

      try {
        // Download image
        const response = await fetch(url);
        if (!response.ok) {
          results.push({ originalUrl: url, newUrl: null, error: `HTTP ${response.status}` });
          continue;
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        // Determine extension
        let extension = 'jpg';
        if (contentType.includes('png')) extension = 'png';
        else if (contentType.includes('webp')) extension = 'webp';
        else if (contentType.includes('avif')) extension = 'avif';
        else if (contentType.includes('gif')) extension = 'gif';

        // Generate filename
        const uniqueFilename = filename
          ? `${filename.replace(/[^a-zA-Z0-9]/g, '_')}_${uuidv4().slice(0, 8)}.${extension}`
          : `${uuidv4()}.${extension}`;

        const filePath = `${req.tournamentId}/${uniqueFilename}`;

        // Upload
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, buffer, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          results.push({ originalUrl: url, newUrl: null, error: uploadError.message });
          continue;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        results.push({ originalUrl: url, newUrl: publicUrlData.publicUrl });
      } catch (err: any) {
        results.push({ originalUrl: url, newUrl: null, error: err.message });
      }
    }

    res.json({ results });
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload images' });
  }
});

export default router;
