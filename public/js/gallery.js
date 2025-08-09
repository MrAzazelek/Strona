// gallery.js - handles gallery functionality
document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'http://localhost:3000/api';

    // ---- DOM Elements ----
    const dropZone = document.getElementById('drop-zone');
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryForm = document.getElementById('gallery-upload');
    const galleryUrlInput = document.getElementById('gallery-url');
    const galleryTitleInput = document.getElementById('gallery-title');
    const noGalleryItemsMessage = document.getElementById('no-gallery-items');

    // ---- Helper Functions ----

    // Funkcja do renderowania pojedynczego elementu galerii
    const renderGalleryItem = (item) => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('gallery-item');
        itemElement.innerHTML = `
            <img src="${item.url}" alt="${item.title || 'Zdjęcie w galerii'}">
            <div class="gallery-info">
                <h4>${escapeHtml(item.title || 'Bez tytułu')}</h4>
                <p>Autor: ${escapeHtml(item.author)}</p>
            </div>
        `;
        galleryGrid.appendChild(itemElement);
    };

    // Funkcja do pobierania i renderowania wszystkich obrazków
    const fetchAndRenderGallery = async () => {
        try {
            const response = await fetch(`${API_URL}/gallery`);
            const { gallery } = await response.json();

            galleryGrid.innerHTML = '';
            
            if (gallery.length === 0) {
                noGalleryItemsMessage.style.display = 'block';
            } else {
                noGalleryItemsMessage.style.display = 'none';
                gallery.forEach(renderGalleryItem);
            }
        } catch (error) {
            console.error('Error fetching gallery items:', error);
            noGalleryItemsMessage.textContent = 'Nie udało się załadować galerii. Spróbuj ponownie później.';
            noGalleryItemsMessage.style.display = 'block';
        }
    };
    
    // Funkcja do przesyłania obrazka do API
    const uploadImage = async (url, title) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Musisz być zalogowany, aby dodawać zdjęcia.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/gallery`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ url, title })
            });

            if (response.ok) {
                alert('Zdjęcie dodano do galerii!');
                await fetchAndRenderGallery();
            } else {
                const error = await response.json();
                alert(`Błąd dodawania zdjęcia: ${error.error}`);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Wystąpił błąd podczas dodawania zdjęcia.');
        }
    };

    // ---- Event Listeners ----

    // Obsługa formularza dodawania URL
    if (galleryForm) {
        galleryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const url = galleryUrlInput.value.trim();
            const title = galleryTitleInput.value.trim();
            if (url) {
                uploadImage(url, title);
                galleryUrlInput.value = '';
                galleryTitleInput.value = '';
            }
        });
    }

    // Obsługa Drag and Drop
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('hover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('hover'), false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            // W tej prostej wersji, obsługujemy tylko URL z tekstu, a nie pliki
            if (dt.getData('text/plain')) {
                const url = dt.getData('text/plain');
                uploadImage(url, '');
            } else if (files && files.length > 0) {
                 // Można dodać obsługę przesyłania plików na serwer
                alert('Przesyłanie plików nie jest jeszcze zaimplementowane. Użyj URL.');
            }
        }, false);
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
    
    // Uruchom pobieranie galerii po załadowaniu strony
    fetchAndRenderGallery();
});