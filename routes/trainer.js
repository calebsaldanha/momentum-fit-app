const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { Pool } = require('pg');
require('dotenv').config();

// Middleware de Autenticação do Treinador
function requireTrainer(req, res, next) {
    if (req.session.user && (req.session.user.role === 'trainer' || req.session.user.role === 'admin')) {
        return next();
    }
    res.redirect('/auth/login');
}

router.use(requireTrainer);

// Middleware para dados comuns (user)
router.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// DASHBOARD
router.get('/dashboard', async (req, res) => {
    try {
        const clientsCount = await db.query("SELECT COUNT(*) FROM clients WHERE trainer_id = $1", [req.session.user.id]);
        const workoutsCount = await db.query("SELECT COUNT(*) FROM workouts WHERE trainer_id = $1", [req.session.user.id]);
        
        // Busca alunos recentes
        const recentClients = await db.query(`
            SELECT u.name, u.profile_image, c.id as client_id 
            FROM clients c
            JOIN users u ON c.user_id = u.id
            WHERE c.trainer_id = $1
            ORDER BY c.created_at DESC LIMIT 5
        `, [req.session.user.id]);

        res.render('pages/trainer-dashboard', { 
            title: 'Painel do Treinador', 
            stats: { clients: clientsCount.rows[0].count, workouts: workoutsCount.rows[0].count },
            recentClients: recentClients.rows,
            currentPage: '/trainer/dashboard'
        });
    } catch (e) { console.error(e); res.render('pages/error'); }
});

// MEUS ALUNOS
router.get('/clients', async (req, res) => {
    const clients = await db.getTrainerClients(req.session.user.id);
    res.render('pages/trainer-clients', { title: 'Meus Alunos', clients, currentPage: '/trainer/clients' });
});

// AGENDA (NOVO)
router.get('/schedule', async (req, res) => {
    try {
        // Busca TODOS os treinos ativos vinculados a este treinador
        // Trazendo info do aluno e do treino
        const query = `
            SELECT w.id, w.title, w.day_of_week, w.status, u.name as client_name, u.profile_image
            FROM workouts w
            JOIN clients c ON w.client_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE w.trainer_id = $1
            ORDER BY 
                CASE 
                    WHEN w.day_of_week = 'Segunda' THEN 1
                    WHEN w.day_of_week = 'Terça' THEN 2
                    WHEN w.day_of_week = 'Quarta' THEN 3
                    WHEN w.day_of_week = 'Quinta' THEN 4
                    WHEN w.day_of_week = 'Sexta' THEN 5
                    WHEN w.day_of_week = 'Sábado' THEN 6
                    WHEN w.day_of_week = 'Domingo' THEN 7
                    ELSE 8
                END ASC
        `;
        const result = await db.query(query, [req.session.user.id]);
        
        // Agrupamento manual para facilitar o EJS
        const schedule = {
            'Segunda': [], 'Terça': [], 'Quarta': [], 'Quinta': [], 
            'Sexta': [], 'Sábado': [], 'Domingo': [], 'Flexível': []
        };

        result.rows.forEach(workout => {
            // Normaliza o dia (remove sufixos como "-feira" se houver inconsistência, mas o select já filtra)
            let day = workout.day_of_week.split('-')[0]; 
            if (schedule[day]) {
                schedule[day].push(workout);
            } else {
                schedule['Flexível'].push(workout);
            }
        });

        res.render('pages/trainer-schedule', { 
            title: 'Minha Agenda', 
            schedule: schedule, 
            currentPage: '/trainer/schedule' 
        });
    } catch (e) {
        console.error(e);
        res.render('pages/error', { message: 'Erro ao carregar agenda.' });
    }
});

// OUTRAS ROTAS (Stubs mantidos para não quebrar links)
router.get('/library', (req, res) => res.render('pages/trainer-library', { title: 'Biblioteca', currentPage: '/trainer/library' }));
router.get('/financial', (req, res) => res.render('pages/trainer-financial', { title: 'Financeiro', currentPage: '/trainer/financial' }));
router.get('/content', (req, res) => res.render('pages/trainer-content', { title: 'Conteúdo', currentPage: '/trainer/content' }));
router.get('/profile', (req, res) => res.render('pages/trainer-profile', { title: 'Perfil Profissional', currentPage: '/trainer/profile' }));
router.get('/settings', (req, res) => res.render('pages/trainer-settings', { title: 'Configurações', currentPage: '/trainer/settings' }));

module.exports = router;
