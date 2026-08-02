/**
 * Seed script to add demo video URLs to existing projects.
 * 
 * Usage: npx tsx scripts/seed-demo-videos.ts
 * 
 * Make sure MONGODB_URI is set in your .env.local file.
 */

import fs from 'fs';
import path from 'path';

// Manually load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
                const key = trimmed.substring(0, eqIdx).trim();
                let value = trimmed.substring(eqIdx + 1).trim();
                // Remove surrounding quotes
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        }
    }
}

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found. Make sure .env.local exists with MONGODB_URI.');
    process.exit(1);
}

// Video mappings: match by title pattern
const VIDEO_MAPPINGS = [
    {
        // Faith XAI project
        titlePattern: /faith/i,
        repoPattern: /faith/i,
        demoVideoUrl: 'https://res.cloudinary.com/drrooaesq/video/upload/v1781679344/Screencast_from_2026-07-30_20-45-01_jvptr5.webm'
    },
    {
        // AI Document / Document AI Chatbot
        titlePattern: /document|llmtrace/i,
        repoPattern: /document|llmtrace/i,
        demoVideoUrl: 'https://res.cloudinary.com/drrooaesq/video/upload/v1781679344/Screencast_from_2026-06-17_12-21-06_hvmitf.webm'
    },
    {
        // Self Evolving Neural Network
        titlePattern: /evolv|neural|hybrid/i,
        repoPattern: /evolv|neural|hybrid/i,
        demoVideoUrl: 'https://res.cloudinary.com/drrooaesq/video/upload/v1769319750/frontend_and_5_more_pages_-_Personal_-_Microsoft_Edge_2026-01-25_11-08-34_uf0k1e.mp4'
    }
];

async function seedDemoVideos() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI!);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }
        const collection = db.collection('projects');

        // Get all projects
        const projects = await collection.find({}).toArray();
        console.log(`📁 Found ${projects.length} projects in database\n`);

        let updated = 0;

        for (const project of projects) {
            const title = project.title || '';
            const repoName = project.githubRepoName || '';

            for (const mapping of VIDEO_MAPPINGS) {
                if (mapping.titlePattern.test(title) || mapping.repoPattern.test(repoName)) {
                    const result = await collection.updateOne(
                        { _id: project._id },
                        { $set: { demoVideoUrl: mapping.demoVideoUrl } }
                    );

                    if (result.modifiedCount > 0) {
                        console.log(`✅ Updated "${title}" (${repoName})`);
                        console.log(`   → ${mapping.demoVideoUrl.substring(0, 80)}...`);
                        updated++;
                    } else {
                        console.log(`ℹ️  "${title}" already has this video URL`);
                    }
                    break;
                }
            }
        }

        console.log(`\n🎬 Done! Updated ${updated} project(s) with demo video URLs.`);

        // List all projects and their video status
        console.log('\n📋 Current project video status:');
        const updatedProjects = await collection.find({}).toArray();
        for (const p of updatedProjects) {
            const hasVideo = p.demoVideoUrl ? '🎥' : '⬜';
            console.log(`   ${hasVideo} ${p.title || p.githubRepoName} ${p.demoVideoUrl ? '(has video)' : '(no video)'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

seedDemoVideos();
