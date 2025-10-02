// Privacy and Data Protection Module
class PrivacyManager {
    constructor() {
        this.dataRetentionPeriod = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
        this.encryptionKey = this.generateEncryptionKey();
    }

    // Data Encryption
    generateEncryptionKey() {
        // In a real application, this would be generated server-side
        return 'timeex_encryption_key_' + Date.now();
    }

    encryptData(data) {
        // Simple base64 encoding for demo - in production, use proper encryption
        return btoa(JSON.stringify(data));
    }

    decryptData(encryptedData) {
        try {
            return JSON.parse(atob(encryptedData));
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    // Data Retention
    checkDataRetention() {
        const now = Date.now();
        const cutoffDate = now - this.dataRetentionPeriod;
        
        // Check if any data should be purged
        this.purgeExpiredData(cutoffDate);
    }

    purgeExpiredData(cutoffDate) {
        const users = JSON.parse(localStorage.getItem('timeex_users') || '[]');
        const cutoffDateString = new Date(cutoffDate).toISOString();
        
        users.forEach(user => {
            const userEntries = JSON.parse(localStorage.getItem(`timeex_entries_${user.id}`) || '[]');
            const filteredEntries = userEntries.filter(entry => 
                new Date(entry.createdAt).toISOString() > cutoffDateString
            );
            
            if (filteredEntries.length !== userEntries.length) {
                localStorage.setItem(`timeex_entries_${user.id}`, JSON.stringify(filteredEntries));
                console.log(`Purged ${userEntries.length - filteredEntries.length} expired entries for user ${user.id}`);
            }
        });
    }

    // Data Export
    exportUserData(userId) {
        const userEntries = JSON.parse(localStorage.getItem(`timeex_entries_${userId}`) || '[]');
        const user = JSON.parse(localStorage.getItem('timeex_users') || '[]').find(u => u.id === userId);
        
        const exportData = {
            user: {
                id: user?.id,
                name: user?.name,
                email: user?.email,
                createdAt: user?.createdAt
            },
            entries: userEntries,
            exportDate: new Date().toISOString(),
            totalEntries: userEntries.length,
            totalHours: userEntries.reduce((sum, entry) => sum + entry.duration, 0)
        };
        
        return exportData;
    }

    // Data Anonymization
    anonymizeData(userId) {
        const userEntries = JSON.parse(localStorage.getItem(`timeex_entries_${userId}`) || '[]');
        const anonymizedEntries = userEntries.map(entry => ({
            id: this.generateAnonymizedId(),
            date: entry.date,
            project: 'Anonymized Project',
            description: 'Anonymized Entry',
            duration: entry.duration,
            createdAt: entry.createdAt
        }));
        
        return anonymizedEntries;
    }

    generateAnonymizedId() {
        return 'anon_' + Math.random().toString(36).substr(2, 9);
    }

    // GDPR Compliance
    handleDataDeletion(userId) {
        // Remove all user data
        localStorage.removeItem(`timeex_entries_${userId}`);
        
        // Remove user from users list
        const users = JSON.parse(localStorage.getItem('timeex_users') || '[]');
        const filteredUsers = users.filter(u => u.id !== userId);
        localStorage.setItem('timeex_users', JSON.stringify(filteredUsers));
        
        console.log(`All data deleted for user ${userId}`);
    }

    // Privacy Settings
    updatePrivacySettings(userId, settings) {
        const privacySettings = {
            dataRetention: settings.dataRetention || false,
            dataExport: settings.dataExport || false,
            analytics: settings.analytics || false,
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`timeex_privacy_${userId}`, JSON.stringify(privacySettings));
    }

    getPrivacySettings(userId) {
        const settings = localStorage.getItem(`timeex_privacy_${userId}`);
        return settings ? JSON.parse(settings) : {
            dataRetention: false,
            dataExport: false,
            analytics: false
        };
    }

    // Cookie Consent
    showCookieConsent() {
        if (!localStorage.getItem('timeex_cookie_consent')) {
            const consentBanner = document.createElement('div');
            consentBanner.className = 'cookie-consent';
            consentBanner.innerHTML = `
                <div class="cookie-content">
                    <h4>Cookie Consent</h4>
                    <p>We use cookies to enhance your experience and analyze site usage. By continuing to use this site, you consent to our use of cookies.</p>
                    <div class="cookie-actions">
                        <button class="btn btn-primary" onclick="privacyManager.acceptCookies()">Accept</button>
                        <button class="btn btn-secondary" onclick="privacyManager.declineCookies()">Decline</button>
                        <a href="#privacy" class="privacy-link">Privacy Policy</a>
                    </div>
                </div>
            `;
            
            document.body.appendChild(consentBanner);
        }
    }

    acceptCookies() {
        localStorage.setItem('timeex_cookie_consent', 'accepted');
        document.querySelector('.cookie-consent')?.remove();
    }

    declineCookies() {
        localStorage.setItem('timeex_cookie_consent', 'declined');
        document.querySelector('.cookie-consent')?.remove();
    }

    // Data Security
    validateDataIntegrity() {
        const users = JSON.parse(localStorage.getItem('timeex_users') || '[]');
        let issues = [];
        
        users.forEach(user => {
            const entries = JSON.parse(localStorage.getItem(`timeex_entries_${user.id}`) || '[]');
            
            // Check for invalid entries
            const invalidEntries = entries.filter(entry => 
                !entry.id || !entry.date || entry.duration < 0
            );
            
            if (invalidEntries.length > 0) {
                issues.push(`User ${user.id} has ${invalidEntries.length} invalid entries`);
            }
        });
        
        return issues;
    }

    // Audit Logging
    logAuditEvent(userId, action, details) {
        const auditLog = {
            userId,
            action,
            details,
            timestamp: new Date().toISOString(),
            ipAddress: 'local', // In production, get real IP
            userAgent: navigator.userAgent
        };
        
        const existingLogs = JSON.parse(localStorage.getItem('timeex_audit_logs') || '[]');
        existingLogs.push(auditLog);
        
        // Keep only last 1000 audit logs
        if (existingLogs.length > 1000) {
            existingLogs.splice(0, existingLogs.length - 1000);
        }
        
        localStorage.setItem('timeex_audit_logs', JSON.stringify(existingLogs));
    }
}

// Initialize privacy manager
const privacyManager = new PrivacyManager();

// Add cookie consent styles
const cookieConsentStyles = `
.cookie-consent {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #333;
    color: white;
    padding: 1rem;
    z-index: 1000;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
}

.cookie-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.cookie-content h4 {
    margin: 0 0 0.5rem 0;
    color: #fff;
}

.cookie-content p {
    margin: 0;
    flex: 1;
    min-width: 300px;
}

.cookie-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
}

.privacy-link {
    color: #667eea;
    text-decoration: none;
    margin-left: 1rem;
}

.privacy-link:hover {
    text-decoration: underline;
}

@media (max-width: 768px) {
    .cookie-content {
        flex-direction: column;
        text-align: center;
    }
    
    .cookie-actions {
        justify-content: center;
    }
}
`;

// Inject cookie consent styles
const styleSheet = document.createElement('style');
styleSheet.textContent = cookieConsentStyles;
document.head.appendChild(styleSheet);

// Show cookie consent on page load
document.addEventListener('DOMContentLoaded', () => {
    privacyManager.showCookieConsent();
});
