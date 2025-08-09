// notifications.js - simple polling fallback for new notifications
setInterval(async ()=>{
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch('/api/notifications', { headers: { Authorization: 'Bearer '+token }});
    if (!res.ok) return;
    const data = await res.json();
    const unread = (data.notifications || []).filter(n=>!n.read).length;
    document.getElementById('notif-count').textContent = unread;
  } catch (e) { /* silent */ }
}, 20000);
