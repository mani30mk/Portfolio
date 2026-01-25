import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Please provide both username and password' },
                { status: 400 }
            );
        }

        const admin = await Admin.findOne({ username });

        if (!admin) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Login successful
        const response = NextResponse.json(
            { message: 'Login successful' },
            { status: 200 }
        );

        // Set cookie
        response.cookies.set('admin_session', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24, // 1 day
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
