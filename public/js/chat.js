const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatWindow = document.getElementById('chat-window');
    const chatLoginPrompt = document.getElementById('chat-login-prompt');
    const clearChatBtn = document.getElementById('clear-chat');
    const navChatLink = document.querySelector('nav a[href="/chat.html"]');
    const navTitle = document.title;
    let notificationCount = 0;
    let isChatFocused = true;

    // Użyj localStorage do pobierania danych użytkownika
    const currentUserData = JSON.parse(localStorage.getItem('currentUser'));
    const currentUser = currentUserData ? currentUserData.username : null;
    const userRole = currentUserData ? currentUserData.role : 'guest';
    const isAdmin = userRole === 'admin';

    // Aktualizacja UI
    if (currentUser) {
        if (chatForm) chatForm.style.display = 'flex';
        if (chatLoginPrompt) chatLoginPrompt.style.display = 'none';
    } else {
        if (chatForm) chatForm.style.display = 'none';
        if (chatLoginPrompt) chatLoginPrompt.style.display = 'block';
    }

    if (isAdmin) {
        if (clearChatBtn) clearChatBtn.classList.remove('hidden');
    } else {
        if (clearChatBtn) clearChatBtn.classList.add('hidden');
    }

    // Obsługa zdarzeń okna
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
        if (currentUserData) {
            socket.emit('identify', { username: currentUserData.username, role: currentUserData.role });
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
            if (!text || !currentUserData) return;
            socket.emit('chat:send', { 
                text, 
                username: currentUserData.username, 
                role: currentUserData.role, 
                createdAt: new Date() 
            });
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

    // Funkcje renderujące
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

        el.style.animation = 'fadeIn 0.5s ease-out';
        chatWindow.appendChild(el);
    }

    function addSystemMsg(m) {
        const el = document.createElement('div');
        el.className = 'system-message';
        el.textContent = m.text;
        chatWindow.appendChild(el);
    }

    // Funkcje powiadomień
    function showNotification(message) {
        notificationCount++;
        document.title = `(${notificationCount}) Nowe wiadomości!`;
        if (navChatLink) {
            navChatLink.classList.add('new-message');
        }
    }

    function resetNotifications() {
        notificationCount = 0;
        document.title = navTitle;
        if (navChatLink) {
            navChatLink.classList.remove('new-message');
        }
    }

    function escapeHtml(s = '') {
        return s.replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }
});