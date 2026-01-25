import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name.replace(/\s+/g, "_")}`;
        const uploadDir = path.join(process.cwd(), "public/uploads");
        const filepath = path.join(uploadDir, filename);

        // Ensure upload directory exists
        try {
            await fs.access(uploadDir);
        } catch {
            await fs.mkdir(uploadDir, { recursive: true });
        }

        // Resize and save image using Sharp
        await sharp(buffer)
            .resize(800, 600, {
                fit: "cover", // Crop center if aspect ratio doesn't match
                position: "center"
            })
            .toFile(filepath);

        const publicUrl = `/uploads/${filename}`;

        return NextResponse.json({ success: true, url: publicUrl });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Internal server error during upload" },
            { status: 500 }
        );
    }
}
