import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { Fields, Files, Part } from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ✅ Ensure uploads dir exists
  const uploadDir = path.join(process.cwd(),"public","uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    multiples: true,
    uploadDir,
    keepExtensions: true,
    filter: (part: Part) => {
      console.log("📥 Incoming part:", part.mimetype, part.originalFilename);
      return part.mimetype === "application/pdf";
       

    },
    filename: (name, ext, part) => {
      
      return part.originalFilename?.replace(/\s+/g, "_") || "upload.pdf";
    },
  });

  try {
    const { fields, files } = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const uploadedFiles = Object.values(files)
      .flat()
      .map((file: any) => ({
        originalFilename: file.originalFilename,
        filepath: file.filepath,
        size: file.size,
        mimetype: file.mimetype,
      }));

    return res.status(200).json({ success: true, files: uploadedFiles });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "File upload failed", details: error.message });
  }
}
