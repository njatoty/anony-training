const request = require('supertest');
const app = require('./server'); // Si `server.js` exporte l'application.

describe('User API', () => {
    it('should create a new user', async () => {
        const response = await request(app).post('/users').send({
            name: 'Test User',
            email: 'test2@example.com',
            age: 30,
        });
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
    });

    it('should fetch all users', async () => {
        const response = await request(app).get('/users');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('should fetch a single user by ID', async () => {
        const newUser = await request(app).post('/users').send({
            name: 'Single User',
            email: 'single@example.com',
            age: 25,
        });
        const response = await request(app).get(`/users/${newUser.body._id}`);
        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Single User');
    });

    it('should update a user by ID', async () => {
        const newUser = await request(app).post('/users').send({
            name: 'Update User',
            email: 'update@example.com',
            age: 40,
        });
        const response = await request(app)
            .put(`/users/${newUser.body._id}`)
            .send({ age: 45 });
        expect(response.status).toBe(200);
        expect(response.body.age).toBe(45);
    });

    it('should delete a user by ID', async () => {
        const newUser = await request(app).post('/users').send({
            name: 'Delete User',
            email: 'delete@example.com',
            age: 35,
        });
        const response = await request(app).delete(`/users/${newUser.body._id}`);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User deleted');
    });
});
