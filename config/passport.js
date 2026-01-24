const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const db = require('../database/db');

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            try {
                // 1. Verificar se o usuário existe
                const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
                
                if (result.rows.length === 0) {
                    return done(null, false, { message: 'Este email não está cadastrado.' });
                }

                const user = result.rows[0];

                // 2. Verificar senha
                const isMatch = await bcrypt.compare(password, user.password);
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Senha incorreta.' });
                }
            } catch (err) {
                console.error('Erro na autenticação:', err);
                return done(err);
            }
        })
    );

    // Serializar usuário para a sessão (apenas o ID)
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Desserializar: recuperar usuário completo pelo ID
    passport.deserializeUser(async (id, done) => {
        try {
            // Buscando perfil junto para ter dados completos na sessão
            const query = `
                SELECT u.id, u.name, u.email, u.role, p.weight, p.height 
                FROM users u 
                LEFT JOIN profiles p ON u.id = p.user_id 
                WHERE u.id = $1
            `;
            const result = await db.query(query, [id]);
            
            // Se achou, monta o objeto user
            if (result.rows.length > 0) {
                const row = result.rows[0];
                const user = {
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    role: row.role,
                    profile: { // Garante que profile existe mesmo se vazio
                        weight: row.weight,
                        height: row.height
                    }
                };
                done(null, user);
            } else {
                done(new Error('User not found'), null);
            }
        } catch (err) {
            done(err, null);
        }
    });
};
