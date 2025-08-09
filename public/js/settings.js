// js/settings.js - handles user settings page
document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:3000/api';

    // ---- DOM Elements ----
    const settingsForm = document.getElementById('settings-form');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const bioTextarea = document.getElementById('bio');
    const settingsMessage = document.getElementById('settings-message');

    // ---- Helper functions ----
    const fetchUserData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            settingsMessage.textContent = 'Musisz być zalogowany, aby zobaczyć ustawienia.';
            settingsForm.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            
            if (response.ok) {
                usernameInput.value = data.user.username;
                emailInput.value = data.user.email;
                bioTextarea.value = data.user.user.bio || '';
                settingsForm.style.display = 'block';
            } else {
                settingsMessage.textContent = `Błąd: ${data.error}`;
                settingsForm.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            settingsMessage.textContent = 'Wystąpił błąd podczas ładowania danych.';
            settingsForm.style.display = 'none';
        }
    };
    
    const showMessage = (message, isSuccess = true) => {
        settingsMessage.textContent = message;
        settingsMessage.className = isSuccess ? 'success' : 'error';
        settingsMessage.style.display = 'block';
        setTimeout(() => {
            settingsMessage.textContent = '';
            settingsMessage.className = 'muted';
            settingsMessage.style.display = 'none';
        }, 5000);
    };

    // ---- Event Listeners ----
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const token = localStorage.getItem('token');
            if (!token) return;

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const bio = bioTextarea.value;
            
            const payload = {
                bio: bio
            };

            // Tylko jeśli hasła są wpisane, dodajemy je do payloadu
            if (currentPassword && newPassword) {
                payload.currentPassword = currentPassword;
                payload.newPassword = newPassword;
            } else if (newPassword && !currentPassword) {
                showMessage('Aby zmienić hasło, musisz podać obecne hasło.', false);
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/profile`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                
                if (response.ok) {
                    showMessage('Ustawienia zaktualizowano pomyślnie!', true);
                    // Wyczyść pola hasła po udanej zmianie
                    currentPasswordInput.value = '';
                    newPasswordInput.value = '';
                } else {
                    showMessage(`Błąd aktualizacji: ${data.error}`, false);
                }
            } catch (error) {
                console.error('Error updating settings:', error);
                showMessage('Wystąpił błąd podczas zapisywania zmian.', false);
            }
        });
    }

    fetchUserData();
});