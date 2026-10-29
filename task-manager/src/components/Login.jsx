import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Login.css'

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [nombre, setNombre] = useState('')
    const [isRegistering, setIsRegistering] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isRegistering) {
                const { error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { nombre } }
                })
                if (authError) throw authError
                alert('¡Cuenta creada con éxito! Ya puedes iniciar sesión.')
                setIsRegistering(false)
            } else {
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (loginError) throw loginError
                onLogin()
            }
        } catch (err) {
            setError(err.message || 'Ocurrió un error inesperado.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                <div className="auth-logo">Task<span>Manager</span></div>
                <h2>{isRegistering ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h2>
                <p className="auth-subtitle">
                    {isRegistering ? 'Empieza a organizar tu primer proyecto.' : 'Organiza tu equipo y tus proyectos en un solo lugar.'}
                </p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleAuth} className="auth-form">
                    {isRegistering && (
                        <div className="auth-field">
                            <label>Nombre</label>
                            <input
                                type="text"
                                placeholder="Tu nombre"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                required
                                className="auth-input"
                            />
                        </div>
                    )}
                    <div className="auth-field">
                        <label>Correo electrónico</label>
                        <input
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="auth-input"
                        />
                    </div>
                    <div className="auth-field">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="auth-input"
                        />
                    </div>
                    <button type="submit" disabled={loading} className="auth-button">
                        {loading ? 'Procesando...' : (isRegistering ? 'Crear cuenta' : 'Iniciar sesión')}
                    </button>
                </form>

                <div className="auth-footer">
                    {isRegistering ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                    <span onClick={() => setIsRegistering(!isRegistering)} className="auth-link">
                        {isRegistering ? 'Iniciar sesión' : 'Crear una cuenta'}
                    </span>
                </div>
            </div>
        </div>
    )
}