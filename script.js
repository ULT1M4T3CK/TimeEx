// TimeEX - Time Tracking Application
class TimeTracker {
    constructor() {
        this.currentUser = null;
        this.timeEntries = [];
        this.timer = {
            isRunning: false,
            startTime: null,
            elapsed: 0,
            interval: null
        };
        this.currentCycle = this.getCurrentCycle();
        this.customCycle = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        
        // Initialize demo data for GitHub Pages
        this.initializeDemoData();
        
        // Check for existing session first
        if (!this.checkExistingSession()) {
            this.showAuthSection();
        } else {
            this.loadUserData();
            this.updateDashboard();
            
            // Setup auto-archive if previously configured
            this.initializeAutoArchive();
        }
    }

    async initializeAutoArchive() {
        const archiveInfo = this.getArchiveInfo();
        if (archiveInfo && archiveInfo.enabled) {
            // Don't automatically restore the directory handle on load
            // User will need to grant permission again if they want to use it
            console.log('Archive directory was previously set up:', archiveInfo.name);
            console.log('Click "Setup Archive Folder" to restore access');
        }
        
        // Setup periodic check for auto-archiving (every hour)
        this.setupPeriodicArchive();
    }

    setupPeriodicArchive() {
        // Check once per hour if we should auto-archive
        const oneHour = 60 * 60 * 1000;
        
        setInterval(async () => {
            const archiveInfo = this.getArchiveInfo();
            if (archiveInfo && archiveInfo.enabled && this.archiveDirHandle) {
                console.log('Running periodic archive check...');
                await this.checkAndArchiveNewReports();
            }
        }, oneHour);
    }

    async checkAndArchiveNewReports() {
        try {
            // Get all archived reports
            const archived = this.getArchivedReports();
            const archivedFilenames = new Set(archived.map(r => r.filename));
            
            // Get all cycles that have entries
            const cycles = this.getAllCycles();
            let newArchives = 0;
            
            for (const cycle of cycles) {
                const entries = this.getCycleEntries(cycle);
                if (entries.length > 0) {
                    // Generate expected filename
                    const filename = `timeex-report-${cycle.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}-`;
                    
                    // Check if this cycle has been archived (check if any filename starts with this)
                    const isArchived = Array.from(archivedFilenames).some(f => f.startsWith(filename.substring(0, 30)));
                    
                    if (!isArchived) {
                        // Archive this report
                        const reportData = {
                            cycle: cycle,
                            entries: entries,
                            summary: {
                                totalHours: entries.reduce((sum, entry) => sum + entry.duration, 0),
                                totalEntries: entries.length,
                                totalEarnings: entries.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0)
                            }
                        };
                        
                        const csv = this.generateCSV(reportData);
                        const success = await this.autoArchiveReport(csv, cycle);
                        
                        if (success) {
                            newArchives++;
                        }
                    }
                }
            }
            
            if (newArchives > 0) {
                console.log(`Auto-archived ${newArchives} new report(s)`);
                this.showNotification(`Auto-archived ${newArchives} new report(s)`, 'success');
            }
        } catch (error) {
            console.error('Error during periodic archive check:', error);
        }
    }

    setupEventListeners() {
        // Authentication
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchAuthTab(e));
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.navigate(e));
        });

        // Timer controls
        document.getElementById('startTimer').addEventListener('click', () => this.startTimer());
        document.getElementById('pauseTimer').addEventListener('click', () => this.pauseTimer());
        document.getElementById('stopTimer').addEventListener('click', () => this.stopTimer());

        // Timer rate calculation
        document.getElementById('currentHourlyRate').addEventListener('input', () => this.calculateTimerTotal());

        // Manual entry
        document.getElementById('manualEntryBtn').addEventListener('click', () => this.openEntryModal());
        document.getElementById('entryForm').addEventListener('submit', (e) => this.handleEntrySubmit(e));
        document.getElementById('closeEntryModal').addEventListener('click', () => this.closeEntryModal());
        document.getElementById('cancelEntry').addEventListener('click', () => this.closeEntryModal());

        // Hourly rate calculation
        document.getElementById('entryDuration').addEventListener('input', () => this.calculateTotalAmount());
        document.getElementById('entryHourlyRate').addEventListener('input', () => this.calculateTotalAmount());

        // Password visibility toggles
        document.getElementById('showLoginPassword').addEventListener('change', () => this.togglePasswordVisibility('loginPassword'));
        document.getElementById('showRegisterPassword').addEventListener('change', () => this.toggleRegisterPasswordVisibility());

        // Timeframe selector
        document.getElementById('timeframe').addEventListener('change', (e) => this.changeTimeframe(e));
        document.getElementById('applyCustomCycle').addEventListener('click', () => this.applyCustomCycle());

        // Download report
        document.getElementById('downloadReportBtn').addEventListener('click', () => this.downloadReport());

        // Reports functionality
        document.getElementById('reportsTimeframe').addEventListener('change', (e) => this.changeReportsTimeframe(e));
        document.getElementById('generateCustomReport').addEventListener('click', () => this.generateCustomReport());
        document.getElementById('downloadCustomReport').addEventListener('click', () => this.downloadCustomReport());

        // Profile form
        document.getElementById('profileForm').addEventListener('submit', (e) => this.updateProfile(e));

        // Archive management
        const setupArchiveBtn = document.getElementById('setupArchiveBtn');
        if (setupArchiveBtn) {
            setupArchiveBtn.addEventListener('click', () => this.setupArchiveDirectory());
        }
        
        const archiveAllBtn = document.getElementById('archiveAllBtn');
        if (archiveAllBtn) {
            archiveAllBtn.addEventListener('click', () => this.archiveAllReports());
        }
        
        const disableArchiveBtn = document.getElementById('disableArchiveBtn');
        if (disableArchiveBtn) {
            disableArchiveBtn.addEventListener('click', () => this.disableArchive());
        }

        const viewArchivedBtn = document.getElementById('viewArchivedBtn');
        if (viewArchivedBtn) {
            viewArchivedBtn.addEventListener('click', () => this.showArchivedReports());
        }

        // Modal backdrop click
        document.getElementById('entryModal').addEventListener('click', (e) => {
            if (e.target.id === 'entryModal') {
                this.closeEntryModal();
            }
        });
    }

    // Authentication Methods
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const user = await this.authenticateUser(email, password);
            if (user) {
                this.currentUser = user;
                this.showNotification('Login successful!', 'success');
                this.showDashboard();
            } else {
                this.showNotification('Invalid credentials', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        try {
            const user = await this.createUser({ name, email, password });
            this.currentUser = user;
            this.showNotification('Registration successful!', 'success');
            this.showDashboard();
        } catch (error) {
            this.showNotification('Registration failed. Please try again.', 'error');
        }
    }

    async authenticateUser(email, password) {
        try {
            // Simulate API call - in real app, this would be a server request
            const users = this.getStoredUsers();
            const user = users.find(u => u.email === email && u.password === password);
            
            if (user) {
                // Store user session
                const userSession = { ...user, password: undefined, loginTime: Date.now() };
                localStorage.setItem('timeex_current_user', JSON.stringify(userSession));
                return userSession;
            }
            return null;
        } catch (error) {
            console.error('Authentication error:', error);
            return null;
        }
    }

    async createUser(userData) {
        // Simulate API call - in real app, this would be a server request
        const users = this.getStoredUsers();
        const newUser = {
            id: Date.now().toString(),
            ...userData,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        localStorage.setItem('timeex_users', JSON.stringify(users));
        return { ...newUser, password: undefined };
    }

    getStoredUsers() {
        try {
            const stored = localStorage.getItem('timeex_users');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading stored users:', error);
            return [];
        }
    }

    logout() {
        this.currentUser = null;
        // Clear user session
        localStorage.removeItem('timeex_current_user');
        this.showAuthSection();
        this.showNotification('Logged out successfully', 'success');
    }

    switchAuthTab(e) {
        const tab = e.target.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        e.target.classList.add('active');
        document.getElementById(tab + 'Form').classList.add('active');
    }

    // Navigation
    navigate(e) {
        e.preventDefault();
        const section = e.target.dataset.section;
        
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
        
        e.target.classList.add('active');
        document.getElementById(section).classList.add('active');
        
        // Ensure header is visible when navigating
        document.querySelector('.header').classList.remove('hidden');
        // Remove full height class
        document.querySelector('.main').classList.remove('full-height');
        
        if (section === 'reports') {
            this.loadReports();
        }
    }

    showAuthSection() {
        document.getElementById('auth-section').style.display = 'flex';
        document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
        // Hide header on login page
        document.querySelector('.header').classList.add('hidden');
        // Make main content full height
        document.querySelector('.main').classList.add('full-height');
    }

    showDashboard() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        // Show header when logged in
        document.querySelector('.header').classList.remove('hidden');
        // Remove full height class
        document.querySelector('.main').classList.remove('full-height');
        this.updateDashboard();
        this.updateArchiveStatus();
    }

    // Check for existing session on page load
    checkExistingSession() {
        try {
            const storedUser = localStorage.getItem('timeex_current_user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                // Check if session is still valid (24 hours)
                const sessionAge = Date.now() - (user.loginTime || 0);
                const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (sessionAge < maxSessionAge) {
                    this.currentUser = user;
                    this.showDashboard();
                    return true;
                } else {
                    // Session expired
                    localStorage.removeItem('timeex_current_user');
                }
            }
        } catch (error) {
            console.error('Session check error:', error);
            localStorage.removeItem('timeex_current_user');
        }
        return false;
    }

    // Initialize demo data for GitHub Pages
    initializeDemoData() {
        try {
            const users = this.getStoredUsers();
            if (users.length === 0) {
                // Create demo user
                const demoUser = {
                    id: 'demo-user-001',
                    name: 'Demo User',
                    email: 'demo@timeex.com',
                    password: 'demo123',
                    createdAt: new Date().toISOString()
                };
                users.push(demoUser);
                localStorage.setItem('timeex_users', JSON.stringify(users));
                console.log('Demo user created: demo@timeex.com / demo123');
            }
        } catch (error) {
            console.error('Error initializing demo data:', error);
        }
    }

    // Password visibility toggle functions
    togglePasswordVisibility(passwordFieldId) {
        const passwordField = document.getElementById(passwordFieldId);
        const checkbox = document.getElementById('showLoginPassword');
        
        if (checkbox.checked) {
            passwordField.type = 'text';
        } else {
            passwordField.type = 'password';
        }
    }

    toggleRegisterPasswordVisibility() {
        const passwordField = document.getElementById('registerPassword');
        const confirmPasswordField = document.getElementById('confirmPassword');
        const checkbox = document.getElementById('showRegisterPassword');
        
        if (checkbox.checked) {
            passwordField.type = 'text';
            confirmPasswordField.type = 'text';
        } else {
            passwordField.type = 'password';
            confirmPasswordField.type = 'password';
        }
    }

    // Timer Methods
    startTimer() {
        if (!this.timer.isRunning) {
            this.timer.isRunning = true;
            this.timer.startTime = Date.now() - this.timer.elapsed;
            this.timer.interval = setInterval(() => this.updateTimerDisplay(), 1000);
            
            document.getElementById('startTimer').disabled = true;
            document.getElementById('pauseTimer').disabled = false;
            document.getElementById('stopTimer').disabled = false;
        }
    }

    pauseTimer() {
        if (this.timer.isRunning) {
            this.timer.isRunning = false;
            this.timer.elapsed = Date.now() - this.timer.startTime;
            clearInterval(this.timer.interval);
            
            document.getElementById('startTimer').disabled = false;
            document.getElementById('pauseTimer').disabled = true;
        }
    }

    async stopTimer() {
        if (this.timer.isRunning || this.timer.elapsed > 0) {
            this.timer.isRunning = false;
            this.timer.elapsed = Date.now() - this.timer.startTime;
            clearInterval(this.timer.interval);
            
            // Save the entry
            await this.saveTimerEntry();
            
            // Reset timer
            this.timer.elapsed = 0;
            this.timer.startTime = null;
            
            document.getElementById('startTimer').disabled = false;
            document.getElementById('pauseTimer').disabled = true;
            document.getElementById('stopTimer').disabled = true;
            document.getElementById('timerDisplay').textContent = '00:00:00';
        }
    }

    updateTimerDisplay() {
        const elapsed = Date.now() - this.timer.startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        document.getElementById('timerDisplay').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update total amount calculation
        this.calculateTimerTotal();
    }

    calculateTimerTotal() {
        const elapsed = this.timer.isRunning ? Date.now() - this.timer.startTime : this.timer.elapsed;
        const hours = elapsed / 3600000; // Convert to hours
        const hourlyRate = parseFloat(document.getElementById('currentHourlyRate').value) || 0;
        const totalAmount = hours * hourlyRate;
        
        document.getElementById('currentTotalAmount').value = totalAmount.toFixed(2);
    }

    async saveTimerEntry() {
        const project = document.getElementById('currentProject').value;
        const duration = this.timer.elapsed / 3600000; // Convert to hours
        const hourlyRate = parseFloat(document.getElementById('currentHourlyRate').value) || 0;
        const totalAmount = duration * hourlyRate;
        
        if (duration > 0) {
            const entry = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                project: project || 'Untitled Task',
                description: 'Timer entry',
                duration: duration,
                hourlyRate: hourlyRate,
                totalAmount: totalAmount,
                createdAt: new Date().toISOString()
            };
            
            this.timeEntries.push(entry);
            this.saveEntries();
            this.updateDashboard();
            this.showNotification('Time entry saved!', 'success');
            
            // Auto-archive if enabled
            if (this.archiveDirHandle) {
                await this.checkAndArchiveNewReports();
            }
            
            // Clear inputs
            document.getElementById('currentProject').value = '';
            document.getElementById('currentHourlyRate').value = '';
            document.getElementById('currentTotalAmount').value = '0.00';
        }
    }

    // Entry Modal Methods
    openEntryModal() {
        console.log('Opening entry modal...');
        document.getElementById('entryModal').classList.add('active');
        document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
        
        // Clear and reset the hourly rate fields
        document.getElementById('entryHourlyRate').value = '';
        document.getElementById('entryTotalAmount').value = '0.00';
        
        this.calculateTotalAmount();
        console.log('Entry modal opened successfully');
    }

    closeEntryModal() {
        document.getElementById('entryModal').classList.remove('active');
        document.getElementById('entryForm').reset();
    }

    calculateTotalAmount() {
        const duration = parseFloat(document.getElementById('entryDuration').value) || 0;
        const hourlyRate = parseFloat(document.getElementById('entryHourlyRate').value) || 0;
        const totalAmount = duration * hourlyRate;
        
        console.log('Calculating total amount:', { duration, hourlyRate, totalAmount });
        
        document.getElementById('entryTotalAmount').value = totalAmount.toFixed(2);
    }

    async handleEntrySubmit(e) {
        e.preventDefault();
        
        const entry = {
            id: Date.now().toString(),
            date: document.getElementById('entryDate').value,
            project: document.getElementById('entryProject').value,
            description: document.getElementById('entryDescription').value,
            duration: parseFloat(document.getElementById('entryDuration').value),
            hourlyRate: parseFloat(document.getElementById('entryHourlyRate').value) || 0,
            totalAmount: parseFloat(document.getElementById('entryTotalAmount').value) || 0,
            createdAt: new Date().toISOString()
        };
        
        this.timeEntries.push(entry);
        this.saveEntries();
        this.updateDashboard();
        this.closeEntryModal();
        this.showNotification('Entry added successfully!', 'success');
        
        // Auto-archive if enabled
        if (this.archiveDirHandle) {
            await this.checkAndArchiveNewReports();
        }
    }

    // Dashboard Methods
    updateDashboard() {
        this.loadEntries();
        this.updateSummary();
        this.updateEntriesTable();
    }

    updateSummary() {
        const cycleEntries = this.getCycleEntries();
        const totalHours = cycleEntries.reduce((sum, entry) => sum + entry.duration, 0);
        const totalEntries = cycleEntries.length;
        const totalEarnings = cycleEntries.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0);
        const avgDaily = totalHours / Math.max(1, this.getWorkingDaysInCycle());
        
        document.getElementById('totalHours').textContent = this.formatHours(totalHours);
        document.getElementById('totalEntries').textContent = totalEntries;
        document.getElementById('totalEarnings').textContent = this.formatCurrency(totalEarnings);
        document.getElementById('avgDaily').textContent = this.formatHours(avgDaily);
    }

    updateEntriesTable() {
        const tbody = document.getElementById('entriesTableBody');
        const cycleEntries = this.getCycleEntries();
        
        tbody.innerHTML = cycleEntries.map(entry => `
            <tr>
                <td>${this.formatDate(entry.date)}</td>
                <td>${entry.project}</td>
                <td>${this.formatHours(entry.duration)}</td>
                <td>${this.formatCurrency(entry.hourlyRate || 0)}</td>
                <td>${this.formatCurrency(entry.totalAmount || 0)}</td>
                <td>${entry.description || '-'}</td>
                <td class="entry-actions">
                    <button class="btn btn-secondary" onclick="timeTracker.editEntry('${entry.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="timeTracker.deleteEntry('${entry.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    editEntry(id) {
        const entry = this.timeEntries.find(e => e.id === id);
        if (entry) {
            document.getElementById('entryDate').value = entry.date;
            document.getElementById('entryProject').value = entry.project;
            document.getElementById('entryDescription').value = entry.description;
            document.getElementById('entryDuration').value = entry.duration;
            document.getElementById('entryHourlyRate').value = entry.hourlyRate || 0;
            document.getElementById('entryTotalAmount').value = entry.totalAmount || 0;
            
            // Store the entry ID for updating
            document.getElementById('entryForm').dataset.editingId = id;
            this.openEntryModal();
        }
    }

    deleteEntry(id) {
        if (confirm('Are you sure you want to delete this entry?')) {
            this.timeEntries = this.timeEntries.filter(e => e.id !== id);
            this.saveEntries();
            this.updateDashboard();
            this.showNotification('Entry deleted', 'success');
        }
    }

    // Reports Methods
    loadReports() {
        this.updateReportsDisplay();
    }

    changeReportsTimeframe(e) {
        const timeframe = e.target.value;
        const customSelector = document.getElementById('reportsCustomSelector');
        
        if (timeframe === 'custom') {
            customSelector.style.display = 'block';
            // Set default dates (current week)
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            
            document.getElementById('reportsStartDate').value = startOfWeek.toISOString().split('T')[0];
            document.getElementById('reportsEndDate').value = endOfWeek.toISOString().split('T')[0];
            
            // Populate project filter
            this.populateProjectFilter();
        } else {
            customSelector.style.display = 'none';
            this.updateReportsDisplay(timeframe);
        }
    }

    populateProjectFilter() {
        const projectFilter = document.getElementById('reportsProjectFilter');
        const allEntries = this.timeEntries;
        const uniqueProjects = [...new Set(allEntries.map(entry => entry.project))].sort();
        
        // Clear existing options except "All Projects"
        projectFilter.innerHTML = '<option value="">All Projects</option>';
        
        // Add project options
        uniqueProjects.forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            projectFilter.appendChild(option);
        });
    }

    generateCustomReport() {
        const startDate = document.getElementById('reportsStartDate').value;
        const endDate = document.getElementById('reportsEndDate').value;
        const projectFilter = document.getElementById('reportsProjectFilter').value;
        
        if (!startDate || !endDate) {
            this.showNotification('Please select both start and end dates', 'error');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            this.showNotification('Start date must be before end date', 'error');
            return;
        }
        
        const customCycle = {
            id: `custom-report-${startDate}-${endDate}`,
            name: `Custom Report: ${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
            startDate: startDate,
            endDate: endDate,
            projectFilter: projectFilter
        };
        
        this.updateReportsDisplay('custom', customCycle);
        this.showNotification('Custom report generated successfully!', 'success');
    }

    updateReportsDisplay(timeframe = 'current', customCycle = null) {
        let cycle;
        
        switch (timeframe) {
            case 'current':
                cycle = this.currentCycle;
                break;
            case 'previous':
                cycle = this.getPreviousCycle();
                break;
            case 'custom':
                cycle = customCycle;
                break;
            case 'all':
                cycle = {
                    id: 'all-time',
                    name: 'All Time',
                    startDate: '1900-01-01',
                    endDate: '2100-12-31'
                };
                break;
            default:
                cycle = this.currentCycle;
        }
        
        const entries = this.getCycleEntries(cycle);
        this.displayReportSummary(cycle, entries);
        this.displayReportEntries(entries);
        
        // Show download button for custom reports
        const downloadBtn = document.getElementById('downloadCustomReport');
        if (timeframe === 'custom' || timeframe === 'all') {
            downloadBtn.style.display = 'inline-flex';
            downloadBtn.onclick = () => this.downloadCustomReport(cycle);
        } else {
            downloadBtn.style.display = 'none';
        }
    }

    displayReportSummary(cycle, entries) {
        const totalHours = entries.reduce((sum, entry) => sum + entry.duration, 0);
        const totalEntries = entries.length;
        const totalEarnings = entries.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0);
        const avgDaily = totalHours / Math.max(1, this.getWorkingDaysInCycle(cycle));
        const workingDays = this.getWorkingDaysInCycle(cycle);
        
        const summaryHtml = `
            <div class="report-summary-stats">
                <div class="report-stat">
                    <span class="report-stat-value">${this.formatHours(totalHours)}</span>
                    <span class="report-stat-label">Total Hours</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-value">${totalEntries}</span>
                    <span class="report-stat-label">Entries</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-value">${this.formatCurrency(totalEarnings)}</span>
                    <span class="report-stat-label">Total Earnings</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-value">${this.formatHours(avgDaily)}</span>
                    <span class="report-stat-label">Avg Daily</span>
                </div>
                <div class="report-stat">
                    <span class="report-stat-value">${workingDays}</span>
                    <span class="report-stat-label">Working Days</span>
                </div>
            </div>
            <div class="report-cycle-info">
                <h4>${cycle.name}</h4>
                <p><strong>Period:</strong> ${this.formatDate(cycle.startDate)} - ${this.formatDate(cycle.endDate)}</p>
                ${cycle.projectFilter ? `<p><strong>Project Filter:</strong> ${cycle.projectFilter}</p>` : ''}
            </div>
        `;
        
        document.getElementById('reportSummary').innerHTML = summaryHtml;
    }

    displayReportEntries(entries) {
        if (entries.length === 0) {
            document.getElementById('reportEntries').innerHTML = '<p>No entries found for the selected time range.</p>';
            return;
        }
        
        const entriesHtml = `
            <table class="report-entries-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Project/Task</th>
                        <th>Duration</th>
                        <th>Rate ($)</th>
                        <th>Total ($)</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${entries.map(entry => `
                        <tr>
                            <td>${this.formatDate(entry.date)}</td>
                            <td>${entry.project}</td>
                            <td>${this.formatHours(entry.duration)}</td>
                            <td>${this.formatCurrency(entry.hourlyRate || 0)}</td>
                            <td>${this.formatCurrency(entry.totalAmount || 0)}</td>
                            <td>${entry.description || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.getElementById('reportEntries').innerHTML = entriesHtml;
    }

    async downloadCustomReport(cycle) {
        await this.generateReport(cycle);
    }

    showCycleDetails(cycleId) {
        const cycle = this.getCycleById(cycleId);
        if (cycle) {
            const details = document.getElementById('reportDetails');
            details.innerHTML = `
                <h4>${cycle.name}</h4>
                <p><strong>Period:</strong> ${this.formatDate(cycle.startDate)} - ${this.formatDate(cycle.endDate)}</p>
                <p><strong>Total Hours:</strong> ${this.formatHours(cycle.totalHours)}</p>
                <p><strong>Entries:</strong> ${cycle.entryCount}</p>
                <p><strong>Average Daily:</strong> ${this.formatHours(cycle.avgDaily)}</p>
            `;
        }
    }

    downloadCycleReport(cycleId) {
        const cycle = this.getCycleById(cycleId);
        if (cycle) {
            this.generateReport(cycle);
        }
    }

    async downloadReport() {
        const activeCycle = this.customCycle || this.currentCycle;
        await this.generateReport(activeCycle);
    }

    async generateReport(cycle, useFileSystem = true) {
        const entries = this.getCycleEntries(cycle);
        const reportData = {
            cycle: cycle,
            entries: entries,
            summary: {
                totalHours: entries.reduce((sum, entry) => sum + entry.duration, 0),
                totalEntries: entries.length,
                avgDaily: entries.reduce((sum, entry) => sum + entry.duration, 0) / Math.max(1, this.getWorkingDaysInCycle(cycle)),
                totalEarnings: entries.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0)
            }
        };
        
        console.log('Generating report for cycle:', cycle);
        console.log('Entries found:', entries.length);
        console.log('Report data:', reportData);
        
        // Generate CSV report
        const csv = this.generateCSV(reportData);
        console.log('Generated CSV content:', csv.substring(0, 200) + '...');
        
        const filename = `timeex-report-${cycle.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}.csv`;
        console.log('Generating file:', filename);
        
        // Use File System Access API if available and enabled
        if (useFileSystem && window.showSaveFilePicker) {
            await this.saveReportToFile(csv, filename);
            
            // Auto-archive if enabled
            if (this.archiveDirHandle) {
                await this.autoArchiveReport(csv, cycle);
            }
        } else {
            this.downloadFile(csv, filename, 'text/csv');
        }
    }

    generateCSV(data) {
        try {
            const headers = ['Date', 'Project/Task', 'Description', 'Duration (Hours)', 'Hourly Rate ($)', 'Total Amount ($)', 'Notes'];
            const rows = data.entries.map(entry => [
                entry.date || '',
                entry.project || '',
                entry.description || '',
                entry.duration || 0,
                entry.hourlyRate || 0,
                entry.totalAmount || 0,
                ''
            ]);
            
            // Add summary row
            const totalHours = data.entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
            const totalEarnings = data.entries.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0);
            const summaryRow = ['', '', 'TOTAL', totalHours, '', totalEarnings, ''];
            
            const csvContent = [
                headers,
                ...rows,
                summaryRow
            ]
            .map(row => row.map(cell => {
                // Escape quotes and wrap in quotes
                const escaped = String(cell).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(','))
            .join('\n');
            
            // Add BOM for Excel compatibility
            return '\uFEFF' + csvContent;
            
        } catch (error) {
            console.error('CSV generation failed:', error);
            return 'Date,Project/Task,Description,Duration (Hours),Hourly Rate ($),Total Amount ($),Notes\n"Error generating report","","","","","",""';
        }
    }

    downloadFile(content, filename, mimeType) {
        try {
            // Create blob with proper MIME type
            const blob = new Blob([content], { 
                type: mimeType || 'text/csv;charset=utf-8;' 
            });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            // Set link attributes
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            // Add to DOM, click, and remove
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
            this.showNotification('Report downloaded successfully!', 'success');
            
        } catch (error) {
            console.error('Download failed:', error);
            this.showNotification('Download failed. Please try again.', 'error');
            
            // Fallback: try to open in new window
            try {
                const newWindow = window.open();
                newWindow.document.write(`
                    <html>
                        <head><title>TimeEX Report</title></head>
                        <body>
                            <h2>TimeEX Report</h2>
                            <pre>${content}</pre>
                            <p>Copy the content above and save as ${filename}</p>
                        </body>
                    </html>
                `);
            } catch (fallbackError) {
                console.error('Fallback failed:', fallbackError);
                this.showNotification('Download not supported. Please check your browser settings.', 'error');
            }
        }
    }

    // File System Access API Methods for Long-term Storage
    async saveReportToFile(content, filename) {
        try {
            // Check if File System Access API is supported
            if (!window.showSaveFilePicker) {
                console.log('File System Access API not supported, falling back to download');
                this.downloadFile(content, filename, 'text/csv');
                return;
            }

            // Request file save permission
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'CSV Files',
                    accept: { 'text/csv': ['.csv'] }
                }]
            });
            
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            
            this.showNotification('Report saved to file successfully!', 'success');
            
            // Log the save for archive tracking
            this.logArchivedReport(filename, handle);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('User cancelled file save');
            } else {
                console.error('File save error:', error);
                this.showNotification('Failed to save file. Falling back to download.', 'warning');
                this.downloadFile(content, filename, 'text/csv');
            }
        }
    }

    async setupArchiveDirectory() {
        try {
            // Check if File System Access API is supported
            if (!window.showDirectoryPicker) {
                this.showNotification('File System Access API not supported in this browser. Use Chrome or Edge.', 'error');
                return false;
            }

            // Request directory permission
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            
            // Store directory info (we can't store the handle directly in localStorage)
            const archiveInfo = {
                name: dirHandle.name,
                setupDate: new Date().toISOString(),
                enabled: true
            };
            
            localStorage.setItem(`timeex_archive_info_${this.currentUser.id}`, JSON.stringify(archiveInfo));
            this.archiveDirHandle = dirHandle;
            
            this.showNotification(`Archive directory set to: ${dirHandle.name}`, 'success');
            this.updateArchiveStatus();
            
            return true;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('User cancelled directory selection');
            } else {
                console.error('Directory setup error:', error);
                this.showNotification('Failed to set up archive directory', 'error');
            }
            return false;
        }
    }

    async autoArchiveReport(reportData, cycle) {
        if (!this.archiveDirHandle) {
            console.log('No archive directory set up');
            return false;
        }

        try {
            // Verify we still have permission
            const permission = await this.archiveDirHandle.queryPermission({ mode: 'readwrite' });
            if (permission !== 'granted') {
                const newPermission = await this.archiveDirHandle.requestPermission({ mode: 'readwrite' });
                if (newPermission !== 'granted') {
                    this.showNotification('Archive permission denied. Please set up archive directory again.', 'warning');
                    return false;
                }
            }

            // Generate filename
            const filename = `timeex-report-${cycle.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}-${Date.now()}.csv`;
            
            // Create or overwrite file in archive directory
            const fileHandle = await this.archiveDirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(reportData);
            await writable.close();
            
            console.log(`Report auto-archived: ${filename}`);
            this.logArchivedReport(filename, fileHandle);
            
            return true;
            
        } catch (error) {
            console.error('Auto-archive error:', error);
            return false;
        }
    }

    async archiveAllReports() {
        if (!this.archiveDirHandle) {
            const success = await this.setupArchiveDirectory();
            if (!success) return;
        }

        try {
            // Get all entries grouped by cycle
            const allEntries = this.timeEntries;
            const cycles = this.getAllCycles();
            
            let archivedCount = 0;
            
            for (const cycle of cycles) {
                const entries = this.getCycleEntries(cycle);
                if (entries.length > 0) {
                    const reportData = {
                        cycle: cycle,
                        entries: entries,
                        summary: {
                            totalHours: entries.reduce((sum, entry) => sum + entry.duration, 0),
                            totalEntries: entries.length,
                            totalEarnings: entries.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0)
                        }
                    };
                    
                    const csv = this.generateCSV(reportData);
                    const success = await this.autoArchiveReport(csv, cycle);
                    
                    if (success) {
                        archivedCount++;
                    }
                }
            }
            
            this.showNotification(`Successfully archived ${archivedCount} report(s)!`, 'success');
            
        } catch (error) {
            console.error('Archive all reports error:', error);
            this.showNotification('Failed to archive all reports', 'error');
        }
    }

    getAllCycles() {
        // Get unique cycles from all entries
        const cycles = new Set();
        
        // Add current and previous cycles
        cycles.add(JSON.stringify(this.currentCycle));
        cycles.add(JSON.stringify(this.getPreviousCycle()));
        
        // Generate cycles from all entry dates
        this.timeEntries.forEach(entry => {
            const entryDate = new Date(entry.date);
            const cycleStart = new Date(entryDate);
            cycleStart.setDate(entryDate.getDate() - entryDate.getDay());
            
            const cycleEnd = new Date(cycleStart);
            cycleEnd.setDate(cycleStart.getDate() + 13);
            
            const cycle = {
                id: `cycle-${cycleStart.getFullYear()}-${cycleStart.getMonth()}-${cycleStart.getDate()}`,
                name: `Cycle ${this.formatDate(cycleStart.toISOString().split('T')[0])} - ${this.formatDate(cycleEnd.toISOString().split('T')[0])}`,
                startDate: cycleStart.toISOString().split('T')[0],
                endDate: cycleEnd.toISOString().split('T')[0]
            };
            
            cycles.add(JSON.stringify(cycle));
        });
        
        return Array.from(cycles).map(c => JSON.parse(c));
    }

    logArchivedReport(filename, fileHandle) {
        try {
            const archived = this.getArchivedReports();
            archived.push({
                filename: filename,
                archivedAt: new Date().toISOString(),
                userId: this.currentUser.id
            });
            
            // Keep only last 100 archived reports in log
            if (archived.length > 100) {
                archived.splice(0, archived.length - 100);
            }
            
            localStorage.setItem(`timeex_archived_reports_${this.currentUser.id}`, JSON.stringify(archived));
        } catch (error) {
            console.error('Error logging archived report:', error);
        }
    }

    getArchivedReports() {
        try {
            const stored = localStorage.getItem(`timeex_archived_reports_${this.currentUser.id}`);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading archived reports:', error);
            return [];
        }
    }

    getArchiveInfo() {
        try {
            const stored = localStorage.getItem(`timeex_archive_info_${this.currentUser.id}`);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            return null;
        }
    }

    updateArchiveStatus() {
        const archiveInfo = this.getArchiveInfo();
        const statusEl = document.getElementById('archiveStatus');
        
        if (statusEl) {
            if (archiveInfo && archiveInfo.enabled) {
                statusEl.innerHTML = `
                    <div class="archive-status active">
                        <i class="fas fa-check-circle"></i>
                        <span>Archive Active: ${archiveInfo.name}</span>
                        <span class="archive-date">Since: ${this.formatDate(archiveInfo.setupDate.split('T')[0])}</span>
                    </div>
                `;
            } else {
                statusEl.innerHTML = `
                    <div class="archive-status inactive">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>No archive directory set up</span>
                    </div>
                `;
            }
        }
    }

    disableArchive() {
        const archiveInfo = this.getArchiveInfo();
        if (archiveInfo) {
            archiveInfo.enabled = false;
            localStorage.setItem(`timeex_archive_info_${this.currentUser.id}`, JSON.stringify(archiveInfo));
        }
        this.archiveDirHandle = null;
        this.updateArchiveStatus();
        this.showNotification('Archive disabled', 'success');
    }

    showArchivedReports() {
        const archived = this.getArchivedReports();
        
        if (archived.length === 0) {
            this.showNotification('No archived reports found', 'info');
            return;
        }
        
        // Create a modal or display area for archived reports
        let html = `
            <div class="archived-reports-list">
                <h4>Archived Reports (${archived.length})</h4>
                <table class="report-entries-table">
                    <thead>
                        <tr>
                            <th>Filename</th>
                            <th>Archived Date</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        archived.reverse().forEach(report => {
            html += `
                <tr>
                    <td>${report.filename}</td>
                    <td>${this.formatDate(report.archivedAt.split('T')[0])} ${new Date(report.archivedAt).toLocaleTimeString()}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        // Display in the reports section
        const reportSummary = document.getElementById('reportSummary');
        if (reportSummary) {
            reportSummary.innerHTML = html;
        }
        
        this.showNotification(`Showing ${archived.length} archived report(s)`, 'success');
    }

    // Profile Methods
    updateProfile(e) {
        e.preventDefault();
        const name = document.getElementById('profileName').value;
        const email = document.getElementById('profileEmail').value;
        
        if (this.currentUser) {
            this.currentUser.name = name;
            this.currentUser.email = email;
            this.saveUserData();
            this.showNotification('Profile updated successfully!', 'success');
        }
    }

    // Utility Methods
    getCurrentCycle() {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 13); // 2-week cycle
        
        return {
            id: `cycle-${startOfWeek.getFullYear()}-${startOfWeek.getMonth()}-${startOfWeek.getDate()}`,
            name: `Cycle ${this.formatDate(startOfWeek.toISOString().split('T')[0])} - ${this.formatDate(endOfWeek.toISOString().split('T')[0])}`,
            startDate: startOfWeek.toISOString().split('T')[0],
            endDate: endOfWeek.toISOString().split('T')[0]
        };
    }

    getCycleEntries(cycle = null) {
        const activeCycle = cycle || this.customCycle || this.currentCycle;
        let filteredEntries = this.timeEntries.filter(entry => 
            entry.date >= activeCycle.startDate && entry.date <= activeCycle.endDate
        );
        
        // Apply project filter if specified
        if (activeCycle.projectFilter && activeCycle.projectFilter !== '') {
            filteredEntries = filteredEntries.filter(entry => 
                entry.project === activeCycle.projectFilter
            );
        }
        
        return filteredEntries;
    }

    getPreviousCycles() {
        // In a real app, this would fetch from a database
        // For now, return empty array
        return [];
    }

    getPreviousCycle() {
        // Get the previous cycle (2 weeks before current)
        const now = new Date();
        const startOfPreviousWeek = new Date(now);
        startOfPreviousWeek.setDate(now.getDate() - now.getDay() - 14);
        
        const endOfPreviousWeek = new Date(startOfPreviousWeek);
        endOfPreviousWeek.setDate(startOfPreviousWeek.getDate() + 13);
        
        return {
            id: `cycle-${startOfPreviousWeek.getFullYear()}-${startOfPreviousWeek.getMonth()}-${startOfPreviousWeek.getDate()}`,
            name: `Previous Cycle: ${this.formatDate(startOfPreviousWeek.toISOString().split('T')[0])} - ${this.formatDate(endOfPreviousWeek.toISOString().split('T')[0])}`,
            startDate: startOfPreviousWeek.toISOString().split('T')[0],
            endDate: endOfPreviousWeek.toISOString().split('T')[0]
        };
    }

    getCycleById(id) {
        return this.getPreviousCycles().find(cycle => cycle.id === id);
    }

    getWorkingDaysInCycle(cycle = null) {
        const activeCycle = cycle || this.customCycle || this.currentCycle;
        const start = new Date(activeCycle.startDate);
        const end = new Date(activeCycle.endDate);
        let workingDays = 0;
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (d.getDay() !== 0 && d.getDay() !== 6) { // Not Sunday or Saturday
                workingDays++;
            }
        }
        
        return workingDays;
    }

    formatHours(hours) {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    changeTimeframe(e) {
        const timeframe = e.target.value;
        const customSelector = document.getElementById('customCycleSelector');
        
        if (timeframe === 'custom') {
            customSelector.style.display = 'block';
            // Set default dates (current week)
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            
            document.getElementById('cycleStartDate').value = startOfWeek.toISOString().split('T')[0];
            document.getElementById('cycleEndDate').value = endOfWeek.toISOString().split('T')[0];
        } else {
            customSelector.style.display = 'none';
            this.customCycle = null;
            this.updateDashboard();
        }
    }

    applyCustomCycle() {
        const startDate = document.getElementById('cycleStartDate').value;
        const endDate = document.getElementById('cycleEndDate').value;
        
        if (!startDate || !endDate) {
            this.showNotification('Please select both start and end dates', 'error');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            this.showNotification('Start date must be before end date', 'error');
            return;
        }
        
        this.customCycle = {
            id: `custom-${startDate}-${endDate}`,
            name: `Custom: ${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
            startDate: startDate,
            endDate: endDate
        };
        
        this.updateDashboard();
        this.showNotification('Custom cycle applied successfully!', 'success');
    }

    // Data Persistence
    loadUserData() {
        if (this.currentUser) {
            this.loadEntries();
        }
    }

    loadEntries() {
        const stored = localStorage.getItem(`timeex_entries_${this.currentUser?.id}`);
        this.timeEntries = stored ? JSON.parse(stored) : [];
    }

    saveEntries() {
        if (this.currentUser) {
            localStorage.setItem(`timeex_entries_${this.currentUser.id}`, JSON.stringify(this.timeEntries));
        }
    }

    saveUserData() {
        if (this.currentUser) {
            const users = this.getStoredUsers();
            const userIndex = users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex !== -1) {
                users[userIndex] = { ...users[userIndex], ...this.currentUser };
                localStorage.setItem('timeex_users', JSON.stringify(users));
            }
        }
    }

    // Notifications
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.getElementById('notifications').appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize the application
const timeTracker = new TimeTracker();
