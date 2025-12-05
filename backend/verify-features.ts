import fetch from 'node-fetch';

const API_URL = 'http://localhost:3014/api';
const TEST_USER = {
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User',
    mobile: `9${Math.floor(Math.random() * 1000000000)}`
};

let token = '';
let userId = '';

const request = async (url: string, method: string, body?: any, headers: any = {}) => {
    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw { response: { data } };
    return { data };
};

const runTests = async () => {
    console.log('--- Starting Verification Tests ---');

    // 1. Register
    try {
        console.log('1. Registering user...');
        const res = await request(`${API_URL}/register`, 'POST', TEST_USER);
        token = res.data.token;
        userId = res.data.user.id;
        console.log('   Success! Token received.');
    } catch (err: any) {
        console.error('   Failed:', err.response?.data || err);
        return;
    }

    // 2. Login
    try {
        console.log('2. Logging in...');
        const res = await request(`${API_URL}/login`, 'POST', { identifier: TEST_USER.email, password: TEST_USER.password });
        token = res.data.token;
        console.log('   Success! Logged in.');
    } catch (err: any) {
        console.error('   Failed:', err.response?.data || err);
    }

    // 3. Save Data (Workspace)
    try {
        console.log('3. Saving dataset...');
        await request(`${API_URL}/data`, 'POST', {
            name: 'Test Dataset',
            data: [{ id: 1, value: 100 }],
            columns: [{ key: 'id', label: 'ID', type: 'number' }, { key: 'value', label: 'Value', type: 'number' }]
        }, { Authorization: `Bearer ${token}` });
        console.log('   Success! Dataset saved.');
    } catch (err: any) {
        console.error('   Failed:', err.response?.data || err);
    }

    // 4. List Data (Workspace)
    try {
        console.log('4. Listing datasets...');
        const res = await request(`${API_URL}/data`, 'GET', undefined, { Authorization: `Bearer ${token}` });
        if (Array.isArray(res.data) && res.data.length > 0 && res.data[0].name === 'Test Dataset') {
            console.log('   Success! Dataset found.');
        } else {
            console.error('   Failed: Dataset not found or name mismatch.');
        }
    } catch (err: any) {
        console.error('   Failed:', err.response?.data || err);
    }

    // 5. Send OTP
    try {
        console.log('5. Sending OTP...');
        const res = await request(`${API_URL}/auth/send-otp`, 'POST', {}, { Authorization: `Bearer ${token}` });
        console.log('   Success!', res.data.message);
        console.log('   (Check backend console for the actual code)');
    } catch (err: any) {
        console.error('   Failed:', err.response?.data || err);
    }

    console.log('--- Verification Tests Completed ---');
};

runTests();
