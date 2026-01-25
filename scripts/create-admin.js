const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Load environment variables manually since we are running this script directly with node
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

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

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

async function createAdmin() {
    try {
        const opts = {
            bufferCommands: false,
        };
        await mongoose.connect(MONGODB_URI, opts);
        console.log('Connected to MongoDB');

        const args = process.argv.slice(2);
        const username = args[0];
        const password = args[1];

        if (!username || !password) {
            console.error('Usage: node scripts/create-admin.js <username> <password>');
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const Filter = { username };
        const Update = { password: hashedPassword };

        await Admin.findOneAndUpdate(Filter, Update, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        });

        console.log(`Admin user '${username}' updated/created successfully.`);
    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createAdmin();
