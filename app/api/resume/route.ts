import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Resume from '@/models/Resume';

// Public endpoint to download/view the resume
export async function GET() {
    try {
        await dbConnect();
        const resume = await Resume.findOne().sort({ uploadedAt: -1 });

        if (!resume) {
            // Fallback: redirect to the static file if no resume in DB
            return NextResponse.redirect(new URL('/assets/Manikandan_Resume.pdf', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
        }

        // Convert base64 back to buffer
        const buffer = Buffer.from(resume.data, 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${resume.filename}"`,
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('Error serving resume:', error);
        // Fallback to static file
        return NextResponse.redirect(new URL('/assets/Manikandan_Resume.pdf', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
    }
}
