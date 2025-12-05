import fetch from 'node-fetch';

const API_URL = 'http://localhost:3014/api';

async function verifyAuth() {
    console.log('--- Starting Auth Verification ---');

    const email = `test_reset_${Date.now()}@example.com`;
    const password = 'password123';
    const newPassword = 'newpassword456';

    // 1. Register User
    console.log('1. Registering user...');
    const regRes = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'Reset Tester', mobile: Math.floor(Math.random() * 10000000000).toString() })
    });
    const regData = await regRes.json();
    if (!regRes.ok) {
        console.error('Registration failed:', regData);
        return;
    }
    console.log('   Success! User registered.');

    // 2. Forgot Password (Send OTP)
    console.log('2. Requesting Forgot Password OTP...');
    const forgotRes = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const forgotData = await forgotRes.json();
    if (!forgotRes.ok) {
        console.error('Forgot Password failed:', forgotData);
        return;
    }
    console.log('   Success! OTP sent.');

    // NOTE: In a real test we'd need to fetch the OTP from the DB or logs. 
    // Since we can't easily read the server logs programmatically here without complex setup,
    // we will just verify the endpoint didn't crash. 
    // To actually reset, we'd need the code. 
    // For now, we assume if the endpoint returned 200, it works.

    console.log('--- Auth Verification Completed (Partial) ---');
    console.log('To fully test reset, check server logs for OTP and use the UI.');
}

verifyAuth();
