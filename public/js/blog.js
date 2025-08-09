// blog.js - handles blog posts interaction via server API
document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:3000/api';

    // ---- DOM Elements ----
    const newPostBtn = document.getElementById('new-post-btn');
    const postEditor = document.getElementById('post-editor');
    const postTitleInput = document.getElementById('post-title');
    const postContentTextarea = document.getElementById('post-content');
    const publishPostBtn = document.getElementById('publish-post');
    const cancelPostBtn = document.getElementById('cancel-post');
    const postsContainer = document.getElementById('posts');
    const noPostsMessage = document.getElementById('no-posts');

    // ---- Helper functions ----

    // Funkcja do renderowania pojedynczego wpisu
    const renderPost = (post) => {
        const postElement = document.createElement('div');
        postElement.classList.add('post');
        postElement.innerHTML = `
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.content)}</p>
            <span class="post-author">Autor: ${escapeHtml(post.author)}</span>
        `;
        postsContainer.appendChild(postElement);
    };

    // Funkcja do pobierania i renderowania wszystkich wpisów
    const fetchAndRenderPosts = async () => {
        try {
            const response = await fetch(`${API_URL}/posts`);
            const { posts } = await response.json();

            postsContainer.innerHTML = ''; // Wyczyść kontener przed renderowaniem
            
            if (posts.length === 0) {
                if (noPostsMessage) noPostsMessage.style.display = 'block';
            } else {
                if (noPostsMessage) noPostsMessage.style.display = 'none';
                posts.forEach(renderPost);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
            if (noPostsMessage) noPostsMessage.textContent = 'Nie udało się załadować wpisów. Spróbuj ponownie później.';
            if (noPostsMessage) noPostsMessage.style.display = 'block';
        }
    };

    const showPostEditor = () => {
        if (postEditor) postEditor.style.display = 'block';
        if (newPostBtn) newPostBtn.style.display = 'none';
    };

    const hidePostEditor = () => {
        if (postEditor) postEditor.style.display = 'none';
        if (postTitleInput) postTitleInput.value = '';
        if (postContentTextarea) postContentTextarea.value = '';
        if (newPostBtn) newPostBtn.style.display = 'block';
    };
    
    // ---- Event Listeners ----
    
    // Uruchom pobieranie wpisów po załadowaniu strony
    fetchAndRenderPosts();

    if (newPostBtn) {
        newPostBtn.addEventListener('click', () => {
            // Logika sprawdzania, czy użytkownik jest zalogowany, jest teraz w auth.js
            showPostEditor();
        });
    }

    if (cancelPostBtn) {
        cancelPostBtn.addEventListener('click', hidePostEditor);
    }
    
    if (publishPostBtn) {
        publishPostBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('token');
            const postTitle = postTitleInput.value;
            const postContent = postContentTextarea.value;

            if (!token) {
                alert('Błąd: Brak autoryzacji. Zaloguj się, aby publikować.');
                return;
            }

            if (postTitle.trim() === '' || postContent.trim() === '') {
                alert('Tytuł i treść wpisu nie mogą być puste.');
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/posts`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ title: postTitle, content: postContent })
                });

                if (response.ok) {
                    alert('Wpis opublikowany pomyślnie!');
                    await fetchAndRenderPosts(); // Odśwież wpisy po dodaniu nowego
                    hidePostEditor();
                } else {
                    const error = await response.json();
                    alert(`Błąd publikacji: ${error.error}`);
                }
            } catch (error) {
                console.error('Publishing post failed:', error);
                alert('Wystąpił błąd podczas publikowania wpisu.');
            }
        });
    }
    
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
});