// src/pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import handler from "../../backend/tax-services/upload";

export const config = {
  api: { bodyParser: false },
};

export default function uploadApi(req: NextApiRequest, res: NextApiResponse) {
  return handler(req, res);
}