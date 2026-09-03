const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/db');
const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);

// Cloud Architecture & Workload Sizing Telemetry Endpoint
app.get('/api/system/workload', (req, res) => {
    return res.status(200).json({
        success: true,
        platformName: 'Cloud-Ready Smart Campus Service Request and Incident Response Platform',
        courseCode: 'CSA15 - Cloud Computing and Big Data Analytics',
        faculty: 'Dr. C. Rajesh Babu',
        innovation: 'Emergency Priority-Based Request Handling',
        workloadSizing: {
            registeredUsers: 3000,
            dailyActiveUsers: 750, // 25% of 3,000
            peakActiveUsers: 150,  // 20% of 750
            userActivityRate: '1.5 API actions / active user / min',
            peakFactor: 2.0,
            peakRequestRateRpm: 450, // 150 * 1.5 * 2.0
            peakRequestRateRps: 7.5, // 450 / 60
            averageCpuTimePerReq: '100 ms',
            targetCpuUtilization: '65%',
            calculatedCpuRequirement: '1.15 vCPU',
            cpuWith25PercentHeadroom: '1.44 vCPU',
            selectedCpuAllocation: '2 vCPU',
            baseRamRequirement: '2 GB',
            ramWith25PercentHeadroom: '2.5 GB',
            selectedRamAllocation: '4 GB RAM',
            storageBreakdown: {
                businessDataAnnual: '3.06 GB (including 30% DB index overhead)',
                evidenceUploadsAnnual: '26.73 GB',
                logsRetention30Days: '37.2 GB',
                totalEstimatedStorage: '66.99 GB',
                storageWith25PercentHeadroom: '83.74 GB',
                selectedStorageAllocation: '100 GB'
            },
            availabilityTarget: '99.5% uptime SLA',
            deploymentMode: 'Docker Container / Virtualized Cloud Pod'
        },
        systemStatus: {
            uptime: Math.floor(process.uptime()),
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        }
    });
});

// Root API Health Check
app.get('/api/health', (req, res) => {
    return res.status(200).json({
        status: 'UP',
        service: 'Smart Campus Service Request & Incident Response API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Fallback to index.html for SPA frontend routing
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ success: false, error: 'API route not found' });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message
    });
});

// Bootstrap Server
async function startServer(port = PORT) {
    try {
        await initDatabase();
        return new Promise((resolve) => {
            const server = app.listen(port, () => {
                console.log(`=============================================================`);
                console.log(`🚀 Smart Campus Service Platform is running on port ${port}`);
                console.log(`🔗 Local URL: http://localhost:${port}`);
                console.log(`📚 API Health: http://localhost:${port}/api/health`);
                console.log(`📊 Cloud Workload Sizing: http://localhost:${port}/api/system/workload`);
                console.log(`=============================================================`);
                resolve(server);
            });
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };

