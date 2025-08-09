// main.js: client-side glue for posts, gallery, theme, notifications
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  bindUI();
  loadPosts();
  loadGallery();
  loadNotifications();
});

function bindUI() {
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('new-post-btn').addEventListener('click', () => {
    document.getElementById('post-editor').classList.remove('hidden');
  });
  document.getElementById('cancel-post').addEventListener('click', () => {
    document.getElementById('post-editor').classList.add('hidden');
  });
  document.getElementById('publish-post').addEventListener('click', publishPost);

  const galleryForm = document.getElementById('gallery-upload');
  if (galleryForm) {
    galleryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = document.getElementById('gallery-url').value.trim();
      const title = document.getElementById('gallery-title').value.trim();
      if (!url) return alert('Podaj URL obrazka');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/gallery', {
          method:'POST',
          headers: { 'Content-Type':'application/json', Authorization: token ? 'Bearer '+token : '' },
          body: JSON.stringify({ url, title })
        });
        if (!res.ok) throw await res.json();
        document.getElementById('gallery-url').value = '';
        document.getElementById('gallery-title').value = '';
        loadGallery();
      } catch (err) { alert('Błąd: ' + (err.error||err.message||err)); }
    });
  }
}

function initTheme() {
  const dark = localStorage.getItem('darkmode') === '1';
  setTheme(dark);
}
function toggleTheme() {
  const dark = document.documentElement.classList.toggle('darkmode');
  localStorage.setItem('darkmode', dark ? '1':'0');
}
function setTheme(dark) {
  if (dark) document.documentElement.classList.add('darkmode');
  else document.documentElement.classList.remove('darkmode');
}

// POSTS
async function loadPosts() {
  const res = await fetch('/api/posts');
  const data = await res.json();
  const postsEl = document.getElementById('posts');
  postsEl.innerHTML = '';
  if (!data.posts || data.posts.length === 0) {
    document.getElementById('no-posts').style.display = 'block';
    return;
  }
  document.getElementById('no-posts').style.display = 'none';
  data.posts.forEach(p => {
    const el = document.createElement('div'); el.className = 'post';
    el.innerHTML = `<div class="meta">${new Date(p.createdAt).toLocaleString()} • ${p.authorId ? p.authorId.slice(0,6) : 'Anon'}</div>
      <h3>${escapeHtml(p.title)}</h3>
      <div class="content">${escapeHtml(p.content).slice(0,400)}${p.content.length>400?'...':''}</div>
      <div class="actions">
        <button data-id="${p.id}" class="open-post">Otwórz</button>
      </div>`;
    postsEl.appendChild(el);
  });
  document.querySelectorAll('.open-post').forEach(b => b.addEventListener('click', (e)=>{
    const id = e.target.dataset.id;
    openPostModal(id);
  }));
}

function escapeHtml(s='') { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function publishPost() {
  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  if (!title || !content) return alert('Uzupełnij tytuł i treść');
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/posts', {
      method:'POST',
      headers: { 'Content-Type':'application/json', Authorization: token? 'Bearer '+token : '' },
      body: JSON.stringify({ title, content })
    });
    if (!res.ok) throw await res.json();
    document.getElementById('post-title').value=''; document.getElementById('post-content').value='';
    document.getElementById('post-editor').classList.add('hidden');
    loadPosts();
  } catch (err) { alert('Błąd: '+(err.error||err.message||err)); }
}

function openPostModal(id) {
  // Simple modal showing post + comments via comments.js
  // We will call comments.showPostModal(id)
  if (window.comments) window.comments.showPostModal(id);
}

// GALLERY
async function loadGallery() {
  try {
    const res = await fetch('/api/gallery');
    const data = await res.json();
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';
    (data.gallery || []).forEach(item => {
      const div = document.createElement('div');
      div.innerHTML = `<img src="${item.url}" alt="${escapeHtml(item.title||'')}" /><div class="muted">${escapeHtml(item.title||'')}</div>`;
      grid.appendChild(div);
    });
  } catch (err) { console.error(err); }
}

// Notifications (light)
async function loadNotifications() {
  try {
    const token = localStorage.getItem('token');
    if (!token) { document.getElementById('notif-container').style.display = 'none'; return; }
    const res = await fetch('/api/notifications', { headers: { Authorization: 'Bearer '+token }});
    if (!res.ok) return;
    const data = await res.json();
    const list = data.notifications || [];
    document.getElementById('notif-count').textContent = list.filter(n => !n.read).length;
    document.getElementById('notif-container').style.display = 'inline-block';
  } catch (err) { console.error(err); }
}
