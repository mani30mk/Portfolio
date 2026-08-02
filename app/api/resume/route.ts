import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Resume from '@/models/Resume';

// Public endpoint to download/view the resume
export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const resume = await Resume.findOne().sort({ uploadedAt: -1 });

        if (!resume) {
            // Fallback: redirect to the static file if no resume in DB
            const origin = req.nextUrl.origin;
            return NextResponse.redirect(`${origin}/assets/Manikandan_Resume.pdf`);
        }

        // Convert base64 back to buffer
        const buffer = Buffer.from(resume.data, 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${resume.filename}"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Error serving resume:', error);
        // Fallback to static file
        const origin = req.nextUrl.origin;
        return NextResponse.redirect(`${origin}/assets/Manikandan_Resume.pdf`);
    }
}
