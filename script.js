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

    stopTimer() {
        if (this.timer.isRunning || this.timer.elapsed > 0) {
            this.timer.isRunning = false;
            this.timer.elapsed = Date.now() - this.timer.startTime;
            clearInterval(this.timer.interval);
            
            // Save the entry
            this.saveTimerEntry();
            
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

    saveTimerEntry() {
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

    handleEntrySubmit(e) {
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

    downloadCustomReport(cycle) {
        this.generateReport(cycle);
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

    downloadReport() {
        const activeCycle = this.customCycle || this.currentCycle;
        this.generateReport(activeCycle);
    }

    generateReport(cycle) {
        const entries = this.getCycleEntries(cycle);
        const reportData = {
            cycle: cycle,
            entries: entries,
            summary: {
                totalHours: entries.reduce((sum, entry) => sum + entry.duration, 0),
                totalEntries: entries.length,
                avgDaily: entries.reduce((sum, entry) => sum + entry.duration, 0) / Math.max(1, this.getWorkingDaysInCycle(cycle))
            }
        };
        
        console.log('Generating report for cycle:', cycle);
        console.log('Entries found:', entries.length);
        console.log('Report data:', reportData);
        
        // Generate CSV report
        const csv = this.generateCSV(reportData);
        console.log('Generated CSV content:', csv.substring(0, 200) + '...');
        
        const filename = `timeex-report-${cycle.name.replace(/\s+/g, '-')}.csv`;
        console.log('Downloading file:', filename);
        
        this.downloadFile(csv, filename, 'text/csv');
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
