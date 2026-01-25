import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a title for this project.'],
        maxlength: [60, 'Title cannot be more than 60 characters'],
    },
    description: {
        type: String,
        required: [true, 'Please provide a description for this project.'],
    },
    imageUrl: {
        type: String,
        // Made optional as it might not be available immediately from GitHub
    },
    technologies: {
        type: [String],
        default: [],
    },
    link: {
        type: String,
    },
    githubUrl: {
        type: String,
    },
    githubRepoName: {
        type: String,
        unique: true, // Useful for syncing
        required: false
    },
    isVisible: {
        type: Boolean,
        default: false,
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
