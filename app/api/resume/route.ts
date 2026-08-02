import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Resume from '@/models/Resume';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Public endpoint to download/view the resume
export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const resume = await Resume.findOne().sort({ uploadedAt: -1 });

        if (!resume) {
            return new NextResponse('No resume found', { status: 404 });
        }

        // Convert base64 back to buffer
        const buffer = Buffer.from(resume.data, 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${resume.filename}"`,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error('Error serving resume:', error);
        return new NextResponse('Error loading resume', { status: 500 });
    }
}
