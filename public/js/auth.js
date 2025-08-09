// auth.js - handles user authentication (register, login, logout, UI updates)
document.addEventListener('DOMContentLoaded', () => {
    // ---- API configuration ----
    const API_URL = 'http://localhost:3000/api';

    // ---- DOM Elements ----
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const userGreeting = document.getElementById('user-greeting');
    const logoutBtn = document.getElementById('logout-btn');
    const settingsLink = document.getElementById('settings-link'); // Nowy element
    
    // Blog page elements
    const newPostBtn = document.getElementById('new-post-btn');
    
    // Chat page elements
    const chatForm = document.getElementById('chat-form');
    const chatLoginPrompt = document.getElementById('chat-login-prompt');
    const adminClearChatBtn = document.getElementById('clear-chat');

    // ---- Helper functions ----

    // Funkcja aktualizująca interfejs na podstawie statusu i roli
    const updateUI = (user) => {
        if (user) {
            // Użytkownik zalogowany
            if (authButtons) authButtons.style.display = 'none';
            if (userInfo) {
                userInfo.style.display = 'flex';
                // Pokaż rolę w powitaniu
                if (userGreeting) userGreeting.textContent = `Witaj, ${user.username} (${user.role})`;
            }
            if (settingsLink) settingsLink.style.display = 'block'; // Pokaż link do ustawień

            // Prawa do pisania na blogu
            const canWriteBlog = user.role === 'user' || user.role === 'moderator' || user.role === 'admin';
            if (newPostBtn) newPostBtn.style.display = canWriteBlog ? 'block' : 'none';
            
            // Prawa do pisania na czacie
            if (chatForm) chatForm.style.display = 'flex';
            if (chatLoginPrompt) chatLoginPrompt.style.display = 'none';

            // Uprawnienia administracyjne
            const isAdmin = user.role === 'admin';
            if (adminClearChatBtn) adminClearChatBtn.style.display = isAdmin ? 'block' : 'none';
        } else {
            // Użytkownik wylogowany
            if (authButtons) authButtons.style.display = 'flex';
            if (userInfo) userInfo.style.display = 'none';
            if (settingsLink) settingsLink.style.display = 'none'; // Ukryj link do ustawień
            if (newPostBtn) newPostBtn.style.display = 'none';
            if (chatForm) chatForm.style.display = 'none';
            if (chatLoginPrompt) chatLoginPrompt.style.display = 'block';
            if (adminClearChatBtn) adminClearChatBtn.style.display = 'none';
        }
    };

    // Funkcja sprawdzająca status logowania na podstawie tokenu JWT
    const checkLoginStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            updateUI(null);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            
            if (response.ok) {
                // Użytkownik jest zalogowany, zaktualizuj UI
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                updateUI(data.user);
            } else {
                // Token jest niepoprawny lub wygasł
                console.error('Token invalid or expired:', data.error);
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                updateUI(null);
            }
        } catch (error) {
            console.error('Error checking login status:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            updateUI(null);
        }
    };

    // ---- Event Handlers ----

    // Obsługa formularza rejestracji
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const passwordConfirm = document.getElementById('register-password-confirm').value;
            const messageElement = document.getElementById('register-message');

            if (password !== passwordConfirm) {
                messageElement.textContent = 'Hasła nie pasują do siebie.';
                messageElement.style.color = 'red';
                return;
            }

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await response.json();

                if (response.ok) {
                    messageElement.textContent = 'Konto stworzone pomyślnie! Przekierowuję...';
                    messageElement.style.color = 'green';
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    setTimeout(() => window.location.href = 'index.html', 1500);
                } else {
                    messageElement.textContent = `Błąd rejestracji: ${data.error}`;
                    messageElement.style.color = 'red';
                }
            } catch (error) {
                console.error('Registration failed:', error);
                messageElement.textContent = 'Wystąpił błąd podczas rejestracji.';
                messageElement.style.color = 'red';
            }
        });
    }

    // Obsługa formularza logowania
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameOrEmail = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const messageElement = document.getElementById('login-message');

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usernameOrEmail, password })
                });
                const data = await response.json();

                if (response.ok) {
                    messageElement.textContent = 'Zalogowano pomyślnie! Przekierowuję...';
                    messageElement.style.color = 'green';
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    setTimeout(() => window.location.href = 'index.html', 1500);
                } else {
                    messageElement.textContent = `Błąd logowania: ${data.error}`;
                    messageElement.style.color = 'red';
                }
            } catch (error) {
                console.error('Login failed:', error);
                messageElement.textContent = 'Wystąpił błąd podczas logowania.';
                messageElement.style.color = 'red';
            }
        });
    }

    // Obsługa wylogowania
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            updateUI(null);
            window.location.href = 'index.html';
        });
    }

    // Sprawdź status logowania przy każdym załadowaniu strony
    checkLoginStatus();
});