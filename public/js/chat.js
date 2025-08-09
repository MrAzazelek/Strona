// chat.js - connects to socket.io and handles messages
const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    // Pobierz elementy DOM
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatWindow = document.getElementById('chat-window');
    const chatLoginPrompt = document.getElementById('chat-login-prompt');
    const clearChatBtn = document.getElementById('clear-chat');
    const navChatLink = document.querySelector('nav a[href="chat.html"]'); // Pobierz link do chatu
    const navTitle = document.title; // Tytuł strony

    // Zmienne stanu powiadomień
    let notificationCount = 0;
    let isChatFocused = true;

    // Symulacja bazy danych użytkowników
    const users = JSON.parse(localStorage.getItem('users')) || {};

    // Pobierz bieżącego użytkownika i jego rolę
    const currentUser = localStorage.getItem('currentUser');
    const userRole = currentUser ? users[currentUser].role : 'guest';
    const isAdmin = userRole === 'admin';

    // Pokaż odpowiednie elementy dla zalogowanego użytkownika
    if (currentUser) {
        chatForm.style.display = 'flex';
        chatLoginPrompt.style.display = 'none';
    }

    // Pokaż przycisk czyszczenia czatu tylko dla administratora
    if (isAdmin) {
        clearChatBtn.classList.remove('hidden');
    }

    // Obsługa zdarzeń skupienia okna (dla powiadomień)
    window.addEventListener('focus', () => {
        isChatFocused = true;
        resetNotifications();
    });

    window.addEventListener('blur', () => {
        isChatFocused = false;
    });

    // Obsługa socket.io
    socket.on('connect', () => {
        console.log('socket connected');
        if (currentUser) {
            socket.emit('identify', { username: currentUser, role: userRole });
        }
    });

    socket.on('chat:history', (messages) => {
        chatWindow.innerHTML = '';
        messages.forEach(addMsg);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    });

    socket.on('chat:message', (m) => {
        addMsg(m);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        if (!isChatFocused && m.username !== currentUser) {
            showNotification(m);
        }
    });

    socket.on('chat:system', (m) => {
        addSystemMsg(m);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    });
    
    socket.on('chat:cleared', () => {
        chatWindow.innerHTML = `<div class="system-message">Chat został wyczyszczony przez administratora.</div>`;
        chatWindow.scrollTop = chatWindow.scrollHeight;
    });
    
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text || !currentUser) return;

            const usernameToSend = currentUser;
            const roleToSend = userRole;

            socket.emit('chat:send', { text, username: usernameToSend, role: roleToSend, createdAt: new Date() });
            chatInput.value = '';
        });
    }

    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            if (isAdmin && confirm('Czy na pewno chcesz wyczyścić cały chat?')) {
                socket.emit('chat:clear');
            }
        });
    }

    function addMsg(m) {
        const el = document.createElement('div');
        el.className = 'chat-message';

        const isSelf = m.username === currentUser;
        el.classList.add(isSelf ? 'self' : 'other');

        let authorHtml;
        if (m.role === 'admin') {
            authorHtml = `<span class="chat-author chat-admin">Administrator: ${escapeHtml(m.username)}</span>`;
        } else {
            authorHtml = `<span class="chat-author">${escapeHtml(m.username)}</span>`;
        }

        el.innerHTML = `
            ${authorHtml}
            <div class="chat-message-content">${escapeHtml(m.text)}</div>
            <span class="chat-timestamp">${new Date(m.createdAt).toLocaleTimeString()}</span>
        `;
        
        // Dodaj animację wejścia
        el.style.animation = 'fadeIn 0.5s ease-out';

        chatWindow.appendChild(el);
    }
    
    function addSystemMsg(m) {
        const el = document.createElement('div');
        el.className = 'system-message';
        el.textContent = m.text;
        chatWindow.appendChild(el);
    }
    
    // Funkcja wyświetlająca powiadomienia
    function showNotification(message) {
        // Zwiększ licznik i zaktualizuj tytuł strony
        notificationCount++;
        document.title = `(${notificationCount}) Nowe wiadomości!`;
        
        // Zaktualizuj powiadomienie na ikonie dzwonka w nawigacji
        if (navChatLink) {
            navChatLink.classList.add('new-message');
        }
    }

    // Funkcja resetująca powiadomienia
    function resetNotifications() {
        notificationCount = 0;
        document.title = navTitle;
        if (navChatLink) {
            navChatLink.classList.remove('new-message');
        }
    }
});

// Funkcja zabezpieczająca przed XSS
function escapeHtml(s = '') {
    return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}