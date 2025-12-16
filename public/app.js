// CREDENCIALES
const SUPABASE_URL = 'https://oyxpjgjwhyzgywohwldd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95eHBqZ2p3aHl6Z3l3b2h3bGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2ODE5ODMsImV4cCI6MjA4MTI1Nzk4M30.pa7FgzW6oSfdOS3CCQ32aAM02Xyedme6Rv_1onFj15Q';
//1
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. DETECTAR SESIÓN AL CARGAR
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Debug: mostrar la URL completa
        console.log('URL completa:', window.location.href);
        console.log('Search:', window.location.search);
        console.log('Hash:', window.location.hash);

        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));

        const queryAccessToken = searchParams.get('access_token');
        const queryToken = searchParams.get('token'); // por si el template usa token
        const queryEmail = searchParams.get('email');
        const queryRefreshToken = searchParams.get('refresh_token');
        const queryType = searchParams.get('type');
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');

        console.log('Query params:', { queryAccessToken: !!queryAccessToken, queryToken: !!queryToken, queryEmail: !!queryEmail, queryRefreshToken: !!queryRefreshToken, queryType });
        console.log('Hash params:', { hashAccessToken: !!hashAccessToken, hashRefreshToken: !!hashRefreshToken, hashType });

        // No esperar; procesar inmediato para evitar expiración

        // Caso 1: hash típico de Supabase: #access_token & refresh_token
        if (hashAccessToken && hashRefreshToken && hashType === 'recovery') {
            const { error } = await _supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken,
            });
            if (error) throw error;
            console.log('Sesión de recuperación establecida (hash)');
            return;
        }

        // Caso 2: query con token + email (template custom)
        if (queryToken && queryEmail && queryType === 'recovery') {
            const { error } = await _supabase.auth.verifyOtp({
                email: queryEmail,
                token: queryToken,
                type: 'recovery',
            });
            if (error) {
                // Mensaje amigable si expiró
                if (error.message?.toLowerCase().includes('expired')) {
                    throw new Error('El enlace expiró, solicita un nuevo correo de recuperación.');
                }
                throw error;
            }
            console.log('Sesión de recuperación establecida (query token+email)');
            return;
        }

        // Caso 3: query con access_token sin refresh (intentar verifyOtp)
        if (queryAccessToken && queryType === 'recovery') {
            let error;
            ({ error } = await _supabase.auth.verifyOtp({ token_hash: queryAccessToken, type: 'recovery' }));
            if (error) ({ error } = await _supabase.auth.verifyOtp({ token: queryAccessToken, type: 'recovery' }));
            if (error) throw error;
            console.log('Sesión de recuperación establecida (query access_token)');
            return;
        }

        // Último intento: sesión ya guardada
        const { data: { session }, error } = await _supabase.auth.getSession();
        console.log('Session result:', { session: !!session, error });
        if (error) throw error;
        if (!session) throw new Error('Auth session missing!');
        console.log('Sesión de recuperación establecida (cache)');
    } catch (error) {
        document.getElementById('error').textContent = error.message;
        document.getElementById('error').style.display = 'block';
        console.error('Error:', error);
    }
});

// 2. ENVIAR NUEVA CONTRASEÑA
document.getElementById('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('error');
    const successDiv = document.getElementById('success');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    if (password !== confirmPassword) {
        errorDiv.textContent = 'Las contraseñas no coinciden';
        errorDiv.style.display = 'block';
        return;
    }

    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';

    try {
        // Al usar implicit flow, la sesión ya está activa en el navegador gracias al paso 1
        const { error } = await _supabase.auth.updateUser({
            password: password
        });

        if (error) throw error;

        successDiv.textContent = '¡Contraseña actualizada exitosamente!';
        successDiv.style.display = 'block';
        document.getElementById('resetForm').reset();

        setTimeout(() => window.close(), 3000);

    } catch (error) {
        errorDiv.textContent = error.message || 'Error al actualizar';
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
});