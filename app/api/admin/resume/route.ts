import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Resume from '@/models/Resume';
import { cookies } from 'next/headers';

// GET: Check if resume exists (returns metadata only)
export async function GET() {
    try {
        await dbConnect();
        const resume = await Resume.findOne().sort({ uploadedAt: -1 }).select('filename uploadedAt');
        
        if (!resume) {
            return NextResponse.json({ filename: null });
        }

        return NextResponse.json({
            filename: resume.filename,
            uploadedAt: resume.uploadedAt,
        });
    } catch (error) {
        console.error('Error checking resume:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Upload new resume (admin only)
export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('admin_session');

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!file.name.endsWith('.pdf')) {
            return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
        }

        // Convert to base64
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');

        // Delete old resumes and save new one
        await Resume.deleteMany({});
        const resume = await Resume.create({
            filename: file.name,
            data: base64,
            contentType: 'application/pdf',
        });

        return NextResponse.json({
            message: 'Resume uploaded successfully',
            filename: resume.filename,
        });
    } catch (error) {
        console.error('Error uploading resume:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
