// server.js - Simple Express + Socket.IO server
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const DB_FILE = path.join(__dirname, 'db.json');

let db = {
    users: {},
    posts: {},
    comments: {},
    messages: [],
    notifications: {},
    gallery: []
};

async function loadDB() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        db = JSON.parse(data);
        console.log('Database loaded successfully from db.json.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('db.json not found, creating a new one.');
            await saveDB();
        } else {
            console.error('Failed to load database:', error);
        }
    }
}

async function saveDB() {
    try {
        const data = JSON.stringify(db, null, 2);
        await fs.writeFile(DB_FILE, data, 'utf8');
        console.log('Database saved to db.json.');
    } catch (error) {
        console.error('Failed to save database:', error);
    }
}

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

// --- KLUCZOWA ZMIANA ---
// Najpierw serwuj pliki statyczne z katalogu 'public'.
// To jest krytyczne, bo zasoby takie jak CSS i JS będą ładowane w pierwszej kolejności.
app.use(express.static(path.join(__dirname, 'public')));


// Helper auth middleware
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Routes
// (reszta tras API pozostaje bez zmian)
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    
    if (Object.values(db.users).find(u => u.username === username || u.email === email)) {
        return res.status(400).json({ error: 'User already exists' });
    }
    
    const id = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    
    db.users[id] = { 
        id, 
        username, 
        email, 
        passwordHash: hash, 
        role: 'user', 
        avatar: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png', 
        bio: '', 
        points: 0, 
        createdAt: Date.now() 
    };
    
    await saveDB();
    
    const token = jwt.sign({ id, username, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, username, email, role: 'user' } });
});

app.post('/api/login', async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    const user = Object.values(db.users).find(u => u.username === usernameOrEmail || u.email === usernameOrEmail);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar, bio: user.bio } });
});

app.get('/api/me', authMiddleware, (req, res) => {
    const user = db.users[req.user.id];
    if (!user) return res.status(404).json({ error: 'No user' });
    
    const { passwordHash, ...rest } = user;
    res.json({ user: rest });
});

app.get('/api/posts', (req, res) => {
    const postsWithAuthor = Object.values(db.posts).sort((a, b) => b.createdAt - a.createdAt).map(post => {
        const author = db.users[post.authorId]?.username || 'Anonim';
        return { ...post, author };
    });
    res.json({ posts: postsWithAuthor });
});

app.post('/api/posts', authMiddleware, async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Missing fields' });
    
    const id = uuidv4();
    const post = { id, title, content, authorId: req.user.id, createdAt: Date.now(), likes: 0, comments: [] };
    db.posts[id] = post;
    
    Object.keys(db.users).forEach(uid => {
        if (!db.notifications[uid]) db.notifications[uid] = [];
        db.notifications[uid].push({ id: uuidv4(), text: `Nowy wpis: ${title}`, createdAt: Date.now(), read: false });
    });
    
    await saveDB();
    
    res.json({ post });
});

app.post('/api/posts/:postId/comments', authMiddleware, async (req, res) => {
    const { postId } = req.params;
    const { text } = req.body;
    if (!db.posts[postId]) return res.status(404).json({ error: 'Post not found' });
    
    const id = uuidv4();
    const c = { id, postId, authorId: req.user.id, text, createdAt: Date.now() };
    db.comments[id] = c;
    db.posts[postId].comments.push(id);
    
    await saveDB();
    
    res.json({ comment: c });
});

app.get('/api/notifications', authMiddleware, (req, res) => {
    const notifications = db.notifications[req.user.id] || [];
    res.json({ notifications: notifications.sort((a, b) => b.createdAt - a.createdAt) });
});

app.post('/api/notifications/markread', authMiddleware, async (req, res) => {
    const list = db.notifications[req.user.id] || [];
    list.forEach(n => n.read = true);
    await saveDB();
    res.json({ ok: true });
});

app.post('/api/profile', authMiddleware, async (req, res) => {
    const { bio, avatar, currentPassword, newPassword } = req.body;
    const user = db.users[req.user.id];
    
    if (!user) return res.status(404).json({ error: 'No user' });

    if (newPassword) {
        if (!currentPassword) {
            return res.status(400).json({ error: 'Aby zmienić hasło, musisz podać obecne hasło.' });
        }
        const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!passwordMatch) {
            return res.status(400).json({ error: 'Nieprawidłowe obecne hasło.' });
        }
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        user.passwordHash = newPasswordHash;
    }

    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    await saveDB();

    const { passwordHash, ...rest } = user;
    res.json({ user: rest });
});

app.post('/api/gallery', authMiddleware, async (req, res) => {
    const { url, title } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL' });
    
    const item = { id: uuidv4(), url, title: title || '', authorId: req.user.id, createdAt: Date.now() };
    db.gallery.unshift(item);
    
    await saveDB();
    
    res.json({ item });
});

app.get('/api/gallery', (req, res) => {
    const galleryWithAuthor = db.gallery.map(item => {
        const author = db.users[item.authorId]?.username || 'Anonim';
        return { ...item, author };
    });
    res.json({ gallery: galleryWithAuthor });
});

// Trasa dla głównej strony (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

// Trasa dla innych plików HTML
// Ta trasa musi być po obsłudze plików statycznych, aby uniknąć kolizji.
app.get('/:page.html', (req, res) => {
    const page = req.params.page + '.html';
    res.sendFile(path.join(__dirname, 'html', page), (err) => {
        if (err) {
            console.error(`Błąd podczas serwowania pliku ${page}:`, err.message);
            res.status(404).send('Nie znaleziono pliku.');
        }
    });
});

// Socket.IO chat
io.on('connection', socket => {
    console.log(`User connected: ${socket.id}`);

    socket.on('identify', (data) => {
        const { username, role } = data;
        socket.user = { username, role };
        console.log(`User identified: ${username} (${role})`);
        
        io.emit('chat:system', { text: `${username} dołączył do chatu.` });
    });

    socket.on('chat:send', (data) => {
        const { text, username, role } = data;
        if (!text || !username) return;

        const message = {
            id: uuidv4(),
            text: text,
            createdAt: new Date(),
            username: username,
            role: role
        };
        db.messages.push(message);
        io.emit('chat:message', message);
    });

    socket.on('chat:clear', () => {
        if (socket.user?.role === 'admin') {
            db.messages = [];
            io.emit('chat:cleared');
            console.log('Chat cleared by admin.');
        }
    });

    socket.emit('chat:history', db.messages.slice(-200));

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        if (socket.user) {
            io.emit('chat:system', { text: `${socket.user.username} opuścił chat.` });
        }
    });
});

async function startServer() {
    await loadDB();
    
    if (Object.keys(db.users).length === 0) {
        const adminId = uuidv4();
        db.users[adminId] = {
            id: adminId,
            username: 'admin',
            email: 'admin@example.com',
            passwordHash: await bcrypt.hash('admin', 10),
            role: 'admin',
            avatar: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
            bio: 'Administrator serwisu',
            points: 9999,
            createdAt: Date.now()
        };
        await saveDB();
    }
    
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();