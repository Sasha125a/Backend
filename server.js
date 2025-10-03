// server.js
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Временное хранилище (в реальном приложении используйте базу данных)
let users = [];
let messages = [];
let friendships = [];

// Генерация уникального кода
function generateUserCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Регистрация пользователя
app.post('/api/register', (req, res) => {
    const { name, phone } = req.body;

    // Проверяем, существует ли пользователь
    const existingUser = users.find(user => user.phone === phone);
    if (existingUser) {
        return res.json({
            success: false,
            message: 'Пользователь с таким номером уже существует'
        });
    }

    // Создаем нового пользователя
    const user = {
        id: uuidv4(),
        code: generateUserCode(),
        name,
        phone,
        createdAt: new Date()
    };

    users.push(user);

    res.json({
        success: true,
        user: {
            code: user.code,
            name: user.name,
            phone: user.phone
        }
    });
});

// Добавление друга
app.post('/api/add-friend', (req, res) => {
    const { userCode, friendCode } = req.body;

    const user = users.find(u => u.code === userCode);
    const friend = users.find(u => u.code === friendCode);

    if (!user || !friend) {
        return res.json({
            success: false,
            message: 'Пользователь не найден'
        });
    }

    if (user.code === friend.code) {
        return res.json({
            success: false,
            message: 'Нельзя добавить самого себя'
        });
    }

    // Проверяем, не добавлен ли уже друг
    const existingFriendship = friendships.find(f => 
        (f.user1 === user.code && f.user2 === friend.code) ||
        (f.user1 === friend.code && f.user2 === user.code)
    );

    if (existingFriendship) {
        return res.json({
            success: false,
            message: 'Пользователь уже в списке друзей'
        });
    }

    // Создаем дружбу
    friendships.push({
        id: uuidv4(),
        user1: user.code,
        user2: friend.code,
        createdAt: new Date()
    });

    res.json({
        success: true,
        message: 'Друг успешно добавлен'
    });
});

// Получение чатов пользователя
app.get('/api/chats/:userCode', (req, res) => {
    const { userCode } = req.params;

    const userFriendships = friendships.filter(f => 
        f.user1 === userCode || f.user2 === userCode
    );

    const chats = userFriendships.map(friendship => {
        const friendCode = friendship.user1 === userCode ? friendship.user2 : friendship.user1;
        const friend = users.find(u => u.code === friendCode);
        
        if (!friend) return null;

        // Находим последнее сообщение в чате
        const chatMessages = messages.filter(m => 
            (m.fromUser === userCode && m.toUser === friendCode) ||
            (m.fromUser === friendCode && m.toUser === userCode)
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const lastMessage = chatMessages[0] ? chatMessages[0].text : null;

        return {
            userCode: friend.code,
            name: friend.name,
            lastMessage: lastMessage
        };
    }).filter(chat => chat !== null);

    res.json({
        success: true,
        chats
    });
});

// Отправка сообщения
app.post('/api/send-message', (req, res) => {
    const { fromUser, toUser, text } = req.body;

    const fromUserObj = users.find(u => u.code === fromUser);
    const toUserObj = users.find(u => u.code === toUser);

    if (!fromUserObj || !toUserObj) {
        return res.json({
            success: false,
            message: 'Пользователь не найден'
        });
    }

    // Проверяем, являются ли пользователи друзьями
    const friendship = friendships.find(f => 
        (f.user1 === fromUser && f.user2 === toUser) ||
        (f.user1 === toUser && f.user2 === fromUser)
    );

    if (!friendship) {
        return res.json({
            success: false,
            message: 'Пользователь не в списке друзей'
        });
    }

    const message = {
        id: uuidv4(),
        fromUser,
        toUser,
        text,
        timestamp: new Date()
    };

    messages.push(message);

    res.json({
        success: true,
        message: 'Сообщение отправлено'
    });
});

// Получение сообщений
app.get('/api/messages/:userCode/:friendCode', (req, res) => {
    const { userCode, friendCode } = req.params;

    const chatMessages = messages.filter(m => 
        (m.fromUser === userCode && m.toUser === friendCode) ||
        (m.fromUser === friendCode && m.toUser === userCode)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
        success: true,
        messages: chatMessages
    });
});

// Получение информации о пользователе
app.get('/api/user/:userCode', (req, res) => {
    const { userCode } = req.params;
    const user = users.find(u => u.code === userCode);

    if (!user) {
        return res.json({
            success: false,
            message: 'Пользователь не найден'
        });
    }

    res.json({
        success: true,
        user: {
            code: user.code,
            name: user.name,
            phone: user.phone
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
