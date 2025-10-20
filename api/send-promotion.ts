
import type { VercelRequest, VercelResponse } from '@vercel/node';

// This is a placeholder file. The actual logic for sending promotions is currently
// handled on the client-side via `src/api.ts`. This file exists to prevent
// build errors if the deployment environment expects an API route.

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(404).json({ message: 'This endpoint is not implemented. Promotion logic is client-side.' });
}
