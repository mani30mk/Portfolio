import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    // Vercel / serverless environments have ephemeral file systems.
    // Standard file uploads to local disk DO NOT work.
    // We recommend using S3, Cloudinary, or UploadThing for file hosting.
    // For now, we will disable this endpoint to prevent user confusion.

    return NextResponse.json(
        {
            error: "File upload is not supported in this serverless environment. Please host your image externally (e.g., GitHub, Imgur, Cloudinary) and paste the URL."
        },
        { status: 400 }
    );
}
