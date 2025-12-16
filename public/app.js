// CREDENCIALES
const SUPABASE_URL = 'https://dusuulvonleasrpbjhed.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1c3V1bHZvbmxlYXNycGJqaGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTc4NzUsImV4cCI6MjA4MDg5Mzg3NX0.bSV9-9gqXZCtWrxGjYo_7QWxjJxtn_h312yjuEPIgn8';
//1
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. DETECTAR SESIÓN AL CARGAR
document.addEventListener('DOMContentLoaded', async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));

    const queryAccessToken = searchParams.get('access_token');
    const queryType = searchParams.get('type');
    const hashAccessToken = hashParams.get('access_token');
    const hashRefreshToken = hashParams.get('refresh_token');
    const hashType = hashParams.get('type');

    try {
        if (queryAccessToken && queryType === 'recovery') {
            // Intentar ambas formas: primero token_hash, luego token
            let error;
            
            ({ error } = await _supabase.auth.verifyOtp({
                token_hash: queryAccessToken,
                type: 'recovery',
            }));
            
            if (error) {
                // Si falla token_hash, intentar como token plano
                ({ error } = await _supabase.auth.verifyOtp({
                    token: queryAccessToken,
                    type: 'recovery',
                }));
            }
            
            if (error) throw error;
            console.log('Sesión de recuperación establecida via verifyOtp (query)');
            return;
        }

        if (hashAccessToken && hashRefreshToken && hashType === 'recovery') {
            const { error } = await _supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken,
            });
            if (error) throw error;
            console.log('Sesión de recuperación establecida via setSession (hash)');
            return;
        }

        const { data: { session }, error } = await _supabase.auth.getSession();
        if (error) throw error;
        if (!session) throw new Error('Auth session missing!');
        console.log('Sesión recuperada de la caché del navegador');
    } catch (error) {
        document.getElementById('error').textContent = error.message;
        document.getElementById('error').style.display = 'block';
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