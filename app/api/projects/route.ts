import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const visibleOnly = searchParams.get('visible') === 'true';

        const query = visibleOnly ? { isVisible: true } : {};
        // Sort by displayOrder first, then createdAt
        const projects = await Project.find(query).sort({ displayOrder: 1, createdAt: -1 });

        return NextResponse.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('admin_session');

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await dbConnect();
        const body = await req.json();

        // Check if bulk update (array)
        if (Array.isArray(body)) {
            const operations = body.map((project: any) => {
                // If it has a githubRepoName, upsert based on that
                if (project.githubRepoName) {
                    return {
                        updateOne: {
                            filter: { githubRepoName: project.githubRepoName },
                            update: { $set: project },
                            upsert: true
                        }
                    };
                }
                // Fallback or other logic for non-github projects?
                // For now, only assume github based syncing as per user flow
                return {
                    updateOne: {
                        filter: { title: project.title }, // Fallback to title?
                        update: { $set: project },
                        upsert: true
                    }
                };
            });

            if (operations.length > 0) {
                await Project.bulkWrite(operations);
            }

            return NextResponse.json({ message: 'Projects synced successfully' });
        } else {
            // Single create
            const project = await Project.create(body);
            return NextResponse.json(project, { status: 201 });
        }

    } catch (error) {
        console.error('Error creating/syncing project:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
