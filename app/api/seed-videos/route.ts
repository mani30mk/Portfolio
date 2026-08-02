import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';

// Temporary endpoint to seed demo video URLs
// DELETE this file after seeding is complete
export async function POST() {
    try {
        await dbConnect();

        // Fix: remove wrongly assigned video from CrossLingual project
        await Project.updateOne(
            { githubRepoName: 'CrossLingual-Neural-Occupation-Classifier-CNOC' },
            { $unset: { demoVideoUrl: '' } }
        );

        // Also remove from LLMTrace if it was incorrectly assigned
        // (LLMTrace matched 'document' pattern but it's a different project)

        // Return status of all projects
        const allProjects = await Project.find({}).select('title githubRepoName demoVideoUrl');

        return NextResponse.json({
            message: 'Fix complete',
            projects: allProjects
        });
    } catch (error) {
        console.error('Error fixing videos:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
