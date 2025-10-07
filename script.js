// ADMIN PANEL FUNCTIONALITY
class AdminPanel {
    constructor() {
        this.isVisible = false;
        this.isAuthenticated = false;
        this.userData = {};
        this.validKeys = ['HUYPRO123', 'ADMIN888', 'SUPERKEY456']; // Thay bằng keys thật
        
        this.init();
    }

    init() {
        this.createPanel();
        this.setupEventListeners();
        this.setupKeyHandlers();
    }

    createPanel() {
        // Panel đã được thêm trong HTML
    }

    setupEventListeners() {
        // Submit key
        document.getElementById('submit-key').addEventListener('click', () => {
            this.validateKey();
        });

        // Enter để submit key
        document.getElementById('key-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.validateKey();
            }
        });

        // Các nút control
        document.getElementById('refresh-data').addEventListener('click', () => {
            this.collectUserData();
        });

        document.getElementById('export-data').addEventListener('click', () => {
            this.exportUserData();
        });

        document.getElementById('close-panel').addEventListener('click', () => {
            this.hidePanel();
        });
    }

    setupKeyHandlers() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                this.togglePanel();
            }

            // ESC để đóng panel
            if (e.key === 'Escape' && this.isVisible) {
                this.hidePanel();
            }
        });
    }

    togglePanel() {
        const panel = document.getElementById('admin-panel');
        if (this.isVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    showPanel() {
        const panel = document.getElementById('admin-panel');
        panel.classList.remove('hidden');
        this.isVisible = true;
        
        // Reset form nếu chưa auth
        if (!this.isAuthenticated) {
            this.showKeyForm();
        } else {
            this.showMainForm();
        }
    }

    hidePanel() {
        const panel = document.getElementById('admin-panel');
        panel.classList.add('hidden');
        this.isVisible = false;
    }

    showKeyForm() {
        document.getElementById('key-form').classList.remove('hidden');
        document.getElementById('main-form').classList.add('hidden');
        document.getElementById('key-input').focus();
    }

    showMainForm() {
        document.getElementById('key-form').classList.add('hidden');
        document.getElementById('main-form').classList.remove('hidden');
        this.collectUserData();
    }

    validateKey() {
        const keyInput = document.getElementById('key-input');
        const keyStatus = document.getElementById('key-status');
        const key = keyInput.value.trim();

        if (this.validKeys.includes(key)) {
            keyStatus.textContent = '✅ KEY HỢP LỆ!';
            keyStatus.style.color = '#00ff00';
            this.isAuthenticated = true;
            
            setTimeout(() => {
                this.showMainForm();
            }, 1000);
        } else {
            keyStatus.textContent = '❌ KEY KHÔNG HỢP LỆ!';
            keyStatus.style.color = '#ff0000';
            keyInput.value = '';
        }
    }

    async collectUserData() {
        try {
            // Lấy IP và thông tin cơ bản
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            this.userData.ip = ipData.ip;

            // Lấy thông tin vị trí chi tiết
            const locationResponse = await fetch(`https://ipapi.co/${this.userData.ip}/json/`);
            const locationData = await locationResponse.json();
            
            this.userData = {
                ...this.userData,
                city: locationData.city,
                region: locationData.region,
                country: locationData.country_name,
                postal: locationData.postal,
                timezone: locationData.timezone,
                org: locationData.org,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                accuracy: locationData.accuracy || 'High'
            };

            // Lấy thông tin thiết bị
            this.getDeviceInfo();

            // Thử lấy vị trí chính xác hơn từ GPS
            this.getPreciseLocation();

            this.updateDisplay();

        } catch (error) {
            console.error('Lỗi thu thập dữ liệu:', error);
            this.getFallbackData();
        }
    }

    getDeviceInfo() {
        const ua = navigator.userAgent;
        this.userData.device = {
            browser: this.getBrowserInfo(ua),
            os: this.getOSInfo(ua),
            platform: navigator.platform,
            cores: navigator.hardwareConcurrency || 'Unknown',
            memory: navigator.deviceMemory || 'Unknown',
            language: navigator.language,
            screen: `${screen.width}x${screen.height}`,
            colorDepth: `${screen.colorDepth} bit`
        };
    }

    getBrowserInfo(ua) {
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Unknown';
    }

    getOSInfo(ua) {
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Mac')) return 'MacOS';
        if (ua.includes('Linux')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iOS')) return 'iOS';
        return 'Unknown';
    }

    getPreciseLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userData.preciseLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: `${position.coords.accuracy}m`,
                        altitude: position.coords.altitude,
                        speed: position.coords.speed
                    };
                    this.updateDisplay();
                },
                (error) => {
                    console.warn('Không thể lấy vị trí GPS:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        }
    }

    getFallbackData() {
        // Fallback data nếu API fail
        this.userData = {
            ip: 'Unknown',
            city: 'Unknown',
            region: 'Unknown', 
            country: 'Unknown',
            latitude: 'Unknown',
            longitude: 'Unknown',
            device: {
                browser: this.getBrowserInfo(navigator.userAgent),
                os: this.getOSInfo(navigator.userAgent),
                screen: `${screen.width}x${screen.height}`
            }
        };
        this.updateDisplay();
    }

    updateDisplay() {
        // Update IP
        document.getElementById('ip-address').textContent = this.userData.ip || 'Đang lấy...';
        
        // Update location
        const locationText = this.userData.city ? 
            `${this.userData.city}, ${this.userData.region}, ${this.userData.country}` : 
            'Đang xác định...';
        document.getElementById('location').textContent = locationText;
        
        // Update coordinates
        let coordsText = 'Đang thu thập...';
        if (this.userData.latitude && this.userData.longitude) {
            coordsText = `${this.userData.latitude}, ${this.userData.longitude}`;
            if (this.userData.preciseLocation) {
                coordsText += ` (GPS: ${this.userData.preciseLocation.latitude}, ${this.userData.preciseLocation.longitude})`;
            }
        }
        document.getElementById('coordinates').textContent = coordsText;
        
        // Update ISP
        document.getElementById('isp').textContent = this.userData.org || 'Đang phân tích...';
        
        // Update device info
        const deviceText = this.userData.device ? 
            `${this.userData.device.browser} on ${this.userData.device.os} - ${this.userData.device.screen}` : 
            'Đang nhận diện...';
        document.getElementById('device-info').textContent = deviceText;
    }

    exportUserData() {
        const dataStr = JSON.stringify(this.userData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `user_data_${this.userData.ip || 'unknown'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ Đã xuất thông tin người dùng!');
    }
}

// Khởi tạo admin panel khi trang load
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});

// Thêm vào phần khởi tạo three.js của mày
console.log('🔐 Admin Panel: Nhấn P để mở panel admin');
