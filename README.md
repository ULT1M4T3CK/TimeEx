# TimeEX - Time Tracking & Management System

A secure, mobile-friendly web application for tracking and managing working hours with automated report generation for invoice documentation.

## Features

### 🕒 Core Functionality
- **Live Timer Tracking**: Start, pause, and stop timers for real-time hour tracking
- **Manual Entry**: Add time entries manually with project/task details
- **Two-Week Cycles**: Automatic cycle management with customizable timeframes
- **Report Generation**: Automated CSV/PDF report generation for invoicing
- **Long-term Storage**: File System Access API integration for automatic report archiving
- **Mobile Responsive**: Optimized for all device sizes

### 🔐 Security & Privacy
- **Secure Authentication**: User registration and login system
- **Data Encryption**: Local data encryption for privacy protection
- **GDPR Compliance**: Data retention policies and user data export
- **Privacy Controls**: User-configurable privacy settings
- **Audit Logging**: Complete activity tracking for security

### 📊 Dashboard & Analytics
- **Real-time Dashboard**: Current cycle overview with statistics
- **Time Summary**: Total hours, entries count, and daily averages
- **Entry Management**: Edit, delete, and organize time entries
- **Historical Reports**: Access to previous cycle reports
- **Export Options**: Multiple format support for reports

## Quick Start

1. **Open the Application**
   ```bash
   # Simply open index.html in your web browser
   open index.html
   ```

2. **Register/Login**
   - Create a new account or login with existing credentials
   - All data is stored locally in your browser

3. **Start Tracking**
   - Use the live timer for real-time tracking
   - Add manual entries for past work
   - Organize by project/task with descriptions

4. **Generate Reports**
   - Download cycle reports in CSV format
   - Perfect for invoice documentation
   - Historical report access

## User Interface

### Dashboard
- **Timer Controls**: Start, pause, stop live tracking
- **Quick Actions**: Manual entry and report download
- **Cycle Summary**: Total hours, entries, and averages
- **Entries Table**: View, edit, and delete time entries

### Reports Section
- **Previous Cycles**: List of completed cycles
- **Report Details**: Detailed breakdown by day/task
- **Download Options**: CSV export for invoicing

### Account Settings
- **Profile Management**: Update name and email
- **Privacy Settings**: Data retention and export controls
- **Security Options**: Password and account management

## Technical Features

### Data Management
- **Local Storage**: All data stored securely in browser
- **File System Archive**: Automatic report archiving to local folder
- **Data Retention**: Automatic cleanup of old entries
- **Export/Import**: Full data portability
- **Backup Options**: Manual and automatic data backup capabilities
- **Archive History**: Track all archived reports with timestamps

### Privacy & Security
- **No Server Required**: Complete client-side operation
- **Data Encryption**: Local encryption for sensitive data
- **Cookie Consent**: GDPR-compliant cookie management
- **Audit Trail**: Complete activity logging

### Performance
- **Fast Loading**: Optimized for quick access
- **Offline Capable**: Works without internet connection
- **Mobile Optimized**: Touch-friendly interface
- **Responsive Design**: Adapts to any screen size

## Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## File Structure

```
TimeEX/
├── index.html          # Main application file
├── styles.css          # Complete styling and responsive design
├── script.js           # Core application logic
├── privacy.js          # Privacy and security features
└── README.md           # This documentation
```

## Usage Examples

### Starting a Timer
1. Enter project/task name in the timer section
2. Click "Start" to begin tracking
3. Use "Pause" to temporarily stop
4. Click "Stop" to save the entry

### Manual Entry
1. Click "Manual Entry" button
2. Fill in date, project, description, and duration
3. Save to add to your time log

### Generating Reports
1. Navigate to "Reports" section
2. Select a cycle from the list
3. Click download button for CSV export
4. Use exported data for invoicing

### Setting Up Long-term Storage (Archive)
1. Navigate to "Account" section
2. Scroll to "Report Archive Settings"
3. Click "Setup Archive Folder"
4. Select a folder on your computer (e.g., Documents/TimeEX-Reports)
5. All new reports will automatically be saved to this folder
6. Use "Archive All Reports" to backup existing reports

**Note:** This feature requires Chrome or Edge browser and uses the File System Access API for secure, user-controlled file storage.

## Privacy Policy

TimeEX is designed with privacy in mind:
- All data stored locally in your browser
- No data sent to external servers
- Complete user control over data retention
- GDPR-compliant data handling
- Optional data export and deletion

## Support

For questions or issues:
1. Check browser console for error messages
2. Ensure JavaScript is enabled
3. Clear browser cache if experiencing issues
4. Use modern browser for best experience

## License

This project is open source and available under the MIT License.

---

**TimeEX** - Efficient time tracking for modern professionals.
