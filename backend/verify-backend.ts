
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3014/api'; // Updated port
let token = '';
let userId = 0;
let datasetId = 0;

const runTests = async () => {
    console.log('Starting Backend Verification...');

    // 1. Register
    try {
        const email = `test${Date.now()}@example.com`;
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password123',
                mobile: `123456${Date.now().toString().slice(-4)}`,
                name: 'Test User'
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        token = data.token;
        userId = data.user.id;
        console.log('✅ Register Success:', data.user.email);
        console.log('User Data:', data.user); // Debug log

        if (data.user.name !== 'Test User') console.error('❌ Name mismatch. Got:', data.user.name);
        else console.log('✅ Name saved correctly');

    } catch (e: any) {
        console.error('❌ Register Failed:', e.message);
        return;
    }

    // 2. Login
    try {
        const res = await fetch(`${API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        console.log('✅ Auth Check (Me) Success:', data.email);
    } catch (e: any) {
        console.error('❌ Auth Check Failed:', e.message);
    }

    // 3. Save Data (Workspace)
    try {
        const res = await fetch(`${API_URL}/data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Test Dataset',
                data: [{ id: 1, val: 100 }],
                columns: [{ key: 'id', label: 'ID', type: 'number' }]
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        datasetId = data.id;
        console.log('✅ Save Data Success. ID:', datasetId);
    } catch (e: any) {
        console.error('❌ Save Data Failed:', e.message);
    }

    // 4. List Data
    try {
        const res = await fetch(`${API_URL}/data`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.length > 0 && data[0].name === 'Test Dataset') {
            console.log('✅ List Data Success');
        } else {
            console.error('❌ List Data Error: Dataset not found');
        }
    } catch (e: any) {
        console.error('❌ List Data Failed:', e.message);
    }

    // 5. Rename Data
    try {
        const res = await fetch(`${API_URL}/data/${datasetId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: 'Renamed Dataset' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.dataset.name === 'Renamed Dataset') {
            console.log('✅ Rename Data Success');
        } else {
            console.error('❌ Rename Data Error');
        }
    } catch (e: any) {
        console.error('❌ Rename Data Failed:', e.message);
    }

    // 6. Change Password
    try {
        const res = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword: 'password123', newPassword: 'newpassword456' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        console.log('✅ Change Password Success');
    } catch (e: any) {
        console.error('❌ Change Password Failed:', e.message);
    }

    // 7. Delete Data
    try {
        const res = await fetch(`${API_URL}/data/${datasetId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        console.log('✅ Delete Data Success');
    } catch (e: any) {
        console.error('❌ Delete Data Failed:', e.message);
    }

    console.log('Verification Complete.');
    process.exit(0);
};

runTests();
