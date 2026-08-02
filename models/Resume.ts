import mongoose from 'mongoose';

const ResumeSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true,
    },
    data: {
        type: String, // Base64 encoded PDF
        required: true,
    },
    contentType: {
        type: String,
        default: 'application/pdf',
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);
