import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const uploadEvidence = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file provided' });
  }

  const file = req.file;
  const fileExt = file.originalname.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `scans/${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from('evidences')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('evidences')
      .getPublicUrl(filePath);

    return res.status(200).json({
      status: 'success',
      data: {
        evidence_url: publicUrlData.publicUrl
      }
    });
  } catch (e: any) {
    console.error('Upload error:', e);
    return res.status(500).json({ status: 'error', message: e.message || 'Failed to upload evidence' });
  }
};
