const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'campus_service.db');

let dbInstance = null;
let SQL = null;

/**
 * Persist SQLite Database to Disk
 */
function saveToDisk() {
    if (!dbInstance) return;
    try {
        const data = dbInstance.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    } catch (err) {
        console.error('Error saving SQLite database to disk:', err);
    }
}

/**
 * Initialize SQLite Database & Schema
 */
async function initDatabase() {
    if (!SQL) {
        SQL = await initSqlJs();
    }

    if (fs.existsSync(dbPath)) {
        try {
            const fileBuffer = fs.readFileSync(dbPath);
            dbInstance = new SQL.Database(fileBuffer);
        } catch (e) {
            console.warn('Failed reading existing db file, initializing new database:', e.message);
            dbInstance = new SQL.Database();
        }
    } else {
        dbInstance = new SQL.Database();
    }

    // Enable foreign keys
    dbInstance.run('PRAGMA foreign_keys = ON;');

    // 1. Create users table
    dbInstance.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('student', 'staff')),
            full_name TEXT NOT NULL,
            department TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. Create service_requests table
    dbInstance.run(`
        CREATE TABLE IF NOT EXISTS service_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_code TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('Electrical', 'Network', 'Infrastructure', 'Water', 'Cleanliness', 'Security', 'Other')),
            location TEXT NOT NULL,
            description TEXT NOT NULL,
            priority TEXT NOT NULL CHECK(priority IN ('Low', 'Medium', 'High', 'Emergency')),
            status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'In Progress', 'Resolved')),
            is_emergency INTEGER NOT NULL DEFAULT 0,
            staff_notes TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `);

    seedInitialData();
    saveToDisk();
    return dbInstance;
}

/**
 * Seed demo users and initial test requests
 */
function seedInitialData() {
    // Check users
    const userRes = dbInstance.exec('SELECT COUNT(*) as count FROM users');
    const userCount = (userRes.length && userRes[0].values.length) ? userRes[0].values[0][0] : 0;

    if (userCount === 0) {
        const stmt = dbInstance.prepare(`
            INSERT INTO users (username, password, role, full_name, department)
            VALUES (?, ?, ?, ?, ?)
        `);

        stmt.run(['student', 'student123', 'student', 'Alex Johnson (Student)', 'Computer Science & Engineering']);
        stmt.run(['staff', 'staff123', 'staff', 'Dr. Rajesh Staff Admin', 'Campus Facilities & Incident Management']);
        stmt.run(['student2', 'student123', 'student', 'Priya Sharma (Student)', 'Electronics Engineering']);
        stmt.free();
    }

    // Check requests
    const reqRes = dbInstance.exec('SELECT COUNT(*) as count FROM service_requests');
    const reqCount = (reqRes.length && reqRes[0].values.length) ? reqRes[0].values[0][0] : 0;

    if (reqCount === 0) {
        const stmt = dbInstance.prepare(`
            INSERT INTO service_requests (request_code, user_id, username, category, location, description, priority, status, is_emergency, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
        `);

        // 1. Emergency sample request
        stmt.run([
            'REQ-1001',
            1,
            'student',
            'Security',
            'Main Science Block - Ground Floor Lab 04',
            'Smoke detected near high-voltage server racks and power distribution unit. Immediate hazard response required.',
            'Emergency',
            'Pending',
            1,
            '-30 minutes',
            '-30 minutes'
        ]);

        // 2. High priority sample request
        stmt.run([
            'REQ-1002',
            1,
            'student',
            'Network',
            'Central Library - 2nd Floor Digital Study Wing',
            'Core WiFi access point offline affecting 100+ students during mid-term exam preparation.',
            'High',
            'In Progress',
            0,
            '-2 hours',
            '-1 hour'
        ]);

        // 3. Medium priority sample request
        stmt.run([
            'REQ-1003',
            3,
            'student2',
            'Water',
            'Engineering Hostel Block B - 3rd Floor Restroom',
            'Continuous pipe leakage causing water accumulation near corridor entrance.',
            'Medium',
            'Pending',
            0,
            '-5 hours',
            '-5 hours'
        ]);

        // 4. Low priority sample request
        stmt.run([
            'REQ-1004',
            1,
            'student',
            'Cleanliness',
            'Auditorium East Wing Foyer',
            'Post-seminar paper flyers and discarded cups require disposal and floor sweeping.',
            'Low',
            'Resolved',
            0,
            '-1 day',
            '-3 hours'
        ]);

        // 5. Additional High priority request
        stmt.run([
            'REQ-1005',
            3,
            'student2',
            'Infrastructure',
            'Mechanical Workshop Gate 2',
            'Overhead rolling shutter stuck midway, blocking equipment transit vehicle.',
            'High',
            'Pending',
            0,
            '-45 minutes',
            '-45 minutes'
        ]);

        stmt.free();
    }
}

/**
 * Utility: Convert sql.js query result to Array of Objects
 */
function rowsToObjects(res) {
    if (!res || !res.length || !res[0].values) return [];
    const columns = res[0].columns;
    return res[0].values.map(row => {
        const obj = {};
        columns.forEach((col, idx) => {
            obj[col] = row[idx];
        });
        return obj;
    });
}

/**
 * Database Service Interface
 */
const dbService = {
    findUserByUsername(username) {
        if (!dbInstance) return null;
        const stmt = dbInstance.prepare('SELECT * FROM users WHERE username = ?');
        stmt.bind([username]);
        let user = null;
        if (stmt.step()) {
            user = stmt.getAsObject();
        }
        stmt.free();
        return user;
    },

    findUserById(id) {
        if (!dbInstance) return null;
        const stmt = dbInstance.prepare('SELECT id, username, role, full_name, department, created_at FROM users WHERE id = ?');
        stmt.bind([id]);
        let user = null;
        if (stmt.step()) {
            user = stmt.getAsObject();
        }
        stmt.free();
        return user;
    },

    getAllRequests(filters = {}) {
        if (!dbInstance) return [];

        let sql = 'SELECT * FROM service_requests WHERE 1=1';
        const params = [];

        if (filters.category) {
            sql += ' AND category = ?';
            params.push(filters.category);
        }

        if (filters.priority) {
            sql += ' AND priority = ?';
            params.push(filters.priority);
        }

        if (filters.status) {
            sql += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.user_id) {
            sql += ' AND user_id = ?';
            params.push(Number(filters.user_id));
        }

        if (filters.search) {
            sql += ' AND (request_code LIKE ? OR location LIKE ? OR description LIKE ? OR category LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Emergency Priority-Based Request Handling Rule:
        // Emergency priority requests always sort at the very top,
        // then sorted by Priority weight, then newest first.
        sql += ` ORDER BY 
            is_emergency DESC, 
            CASE priority 
                WHEN 'Emergency' THEN 1 
                WHEN 'High' THEN 2 
                WHEN 'Medium' THEN 3 
                WHEN 'Low' THEN 4 
                ELSE 5 
            END ASC, 
            created_at DESC`;

        const stmt = dbInstance.prepare(sql);
        if (params.length > 0) {
            stmt.bind(params);
        }

        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    },

    getRequestById(idOrCode) {
        if (!dbInstance) return null;
        let stmt;
        if (/^\d+$/.test(idOrCode)) {
            stmt = dbInstance.prepare('SELECT * FROM service_requests WHERE id = ?');
            stmt.bind([parseInt(idOrCode, 10)]);
        } else {
            stmt = dbInstance.prepare('SELECT * FROM service_requests WHERE request_code = ?');
            stmt.bind([String(idOrCode).trim()]);
        }

        let req = null;
        if (stmt.step()) {
            req = stmt.getAsObject();
        }
        stmt.free();
        return req;
    },

    createRequest({ user_id, username, category, location, description, priority }) {
        if (!dbInstance) return null;

        // Calculate next request code sequence
        const res = dbInstance.exec('SELECT MAX(id) as maxId FROM service_requests');
        const maxId = (res.length && res[0].values.length && res[0].values[0][0]) ? res[0].values[0][0] : 0;
        const nextNum = maxId + 1001;
        const requestCode = `REQ-${nextNum}`;
        const isEmergency = priority === 'Emergency' ? 1 : 0;

        const stmt = dbInstance.prepare(`
            INSERT INTO service_requests (request_code, user_id, username, category, location, description, priority, status, is_emergency, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, datetime('now'), datetime('now'))
        `);

        stmt.run([requestCode, user_id, username, category, location, description, priority, isEmergency]);
        stmt.free();

        saveToDisk();

        // Return newly created object
        return this.getRequestById(requestCode);
    },

    updateRequestStatus(idOrCode, newStatus, staffNotes = '') {
        const existing = this.getRequestById(idOrCode);
        if (!existing) return null;

        const stmt = dbInstance.prepare(`
            UPDATE service_requests 
            SET status = ?, 
                staff_notes = CASE WHEN ? != '' THEN ? ELSE staff_notes END,
                updated_at = datetime('now')
            WHERE id = ?
        `);

        stmt.run([newStatus, staffNotes, staffNotes, existing.id]);
        stmt.free();

        saveToDisk();
        return this.getRequestById(existing.id);
    },

    getStats(userId = null) {
        if (!dbInstance) {
            return { total: 0, pending: 0, inProgress: 0, resolved: 0, emergency: 0 };
        }

        const all = this.getAllRequests(userId ? { user_id: userId } : {});
        return {
            total: all.length,
            pending: all.filter(r => r.status === 'Pending').length,
            inProgress: all.filter(r => r.status === 'In Progress').length,
            resolved: all.filter(r => r.status === 'Resolved').length,
            emergency: all.filter(r => r.priority === 'Emergency').length
        };
    },

    resetToDemo() {
        if (!dbInstance) return;
        dbInstance.run('DELETE FROM service_requests;');
        dbInstance.run('DELETE FROM users;');
        seedInitialData();
        saveToDisk();
    }
};

module.exports = {
    initDatabase,
    saveToDisk,
    dbService
};
