import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username.'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide a password.'],
    },
});

export default mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
