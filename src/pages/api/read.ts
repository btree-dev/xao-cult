import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const uploadDir = path.join(process.cwd(), "public","uploads");

    if (!fs.existsSync(uploadDir)) {
      return res.status(200).json([]);
    }

    const files = fs.readdirSync(uploadDir).map((file) => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);

      return {
        id: file,
        name: path.parse(file).name,
        fileName: file,
        size: `${(stats.size / 1024).toFixed(2)} KB`,
        uploadDate: stats.birthtime.toLocaleDateString(),
      };
    });

    res.status(200).json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to read uploaded files" });
  }
}
