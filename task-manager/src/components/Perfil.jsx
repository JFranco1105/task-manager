import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Perfil.css'

export default function Perfil({ session }) {
    const [loading, setLoading] = useState(false)
    const [nombre, setNombre] = useState('Llellesito')
    const [tag, setTag] = useState('1234')
    const [avatarUrl, setAvatarUrl] = useState('')

    const [email, setEmail] = useState('')
    const [uploading, setUploading] = useState(false)
    const [mensaje, setMensaje] = useState(null)

    useEffect(() => {
        if (session) {
            setEmail(session.user.email || '')
            getProfile()
        }
    }, [session])

    const getProfile = async () => {
        try {
            setLoading(true)
            const userId = session.user.id

            const { data, error } = await supabase
                .from('profiles')
                .select('nombre, tag, avatar_url')
                .eq('id', userId)
                .maybeSingle()

            if (data) {
                setNombre(data.nombre || 'Llellesito')
                setTag(data.tag ? data.tag.replace('#', '') : '1234')
                setAvatarUrl(data.avatar_url || '')
            } else {
                // Inicializar perfil si no existe
                await supabase.from('profiles').upsert([
                    { id: userId, nombre: 'Llellesito', tag: '1234', email: session.user.email }
                ])
                setNombre('Llellesito')
                setTag('1234')
            }
        } catch (error) {
            console.error('Error al cargar perfil:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const updateProfileInfo = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)
            setMensaje(null)
            const userId = session.user.id

            const updates = {
                id: userId,
                nombre: nombre,
                email: session.user.email,
                tag: tag
            }

            const { error } = await supabase.from('profiles').upsert(updates)
            if (error) throw error

            setMensaje({ tipo: 'exito', texto: `¡Nombre actualizado a "${nombre}" correctamente!` })
        } catch (error) {
            setMensaje({ tipo: 'error', texto: 'Error al actualizar nombre: ' + error.message })
        } finally {
            setLoading(false)
        }
    }

    // Cambio de contraseña seguro mediante enlace al correo
    const handlePasswordReset = async () => {
        try {
            setLoading(true)
            setMensaje(null)

            const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
                redirectTo: window.location.origin + '/perfil',
            })

            if (error) throw error

            setMensaje({
                tipo: 'exito',
                texto: `¡Correo de recuperación enviado a ${session.user.email}! Revisa tu bandeja de entrada.`
            })
        } catch (error) {
            setMensaje({ tipo: 'error', texto: 'Error al enviar correo: ' + error.message })
        } finally {
            setLoading(false)
        }
    }

    const updateEmail = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)
            setMensaje(null)

            if (!email || email === session.user.email) {
                throw new Error('El correo electrónico es el mismo.')
            }

            const { error } = await supabase.auth.updateUser({ email })
            if (error) throw error

            setMensaje({ tipo: 'exito', texto: '¡Solicitud de cambio de correo enviada! Revisa tu bandeja de entrada.' })
        } catch (error) {
            setMensaje({ tipo: 'error', texto: 'Error al actualizar correo: ' + error.message })
        } finally {
            setLoading(false)
        }
    }

    const uploadAvatar = async (event) => {
        try {
            setUploading(true)
            setMensaje(null)

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Debes seleccionar una imagen.')
            }

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const userId = session.user.id
            const fileName = `${userId}-${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            // 1. Subir al bucket 'avatars'
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                throw new Error("Bucket not found o error de permisos. Asegúrate de haber creado el bucket 'avatars' como público en Supabase Storage.")
            }

            // 2. Obtener URL pública
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
            const urlPublica = data.publicUrl

            // 3. Guardar la URL en la tabla 'profiles' en la columna 'avatar_url'
            const { error: updateError } = await supabase
                .from('profiles')
                .upsert({ id: userId, email: session.user.email, avatar_url: urlPublica })

            if (updateError) throw updateError

            setAvatarUrl(urlPublica)
            setMensaje({ tipo: 'exito', texto: '¡Foto de perfil subida y guardada en la base de datos con éxito!' })
        } catch (error) {
            setMensaje({ tipo: 'error', texto: error.message })
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="perfil-container" style={{ maxWidth: '650px', margin: '0 auto', padding: '24px' }}>
            <h2>Configuración de Cuenta</h2>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>Actualiza tus datos personales, foto y credenciales.</p>

            {mensaje && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', background: mensaje.tipo === 'exito' ? '#dcfce7' : '#fee2e2', color: mensaje.tipo === 'exito' ? '#166534' : '#991b1b', fontWeight: 500, border: `1px solid ${mensaje.tipo === 'exito' ? '#bbf7d0' : '#fecaca'}` }}>
                    {mensaje.texto}
                </div>
            )}

            {/* FOTO DE PERFIL */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.8rem', fontWeight: 'bold', flexShrink: 0 }}>
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        nombre ? nombre.charAt(0).toUpperCase() : 'L'
                    )}
                </div>

                <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#1e293b' }}>Tu foto de perfil</h4>
                    <label style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                        {uploading ? 'Subiendo...' : 'Cambiar foto'}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={uploadAvatar}
                            disabled={uploading}
                            style={{ display: 'none' }}
                        />
                    </label>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '6px 0 0 0' }}>PNG, JPG o WEBP (máx. 2MB).</p>
                </div>
            </div>

            {/* INFORMACIÓN PERSONAL */}
            <form onSubmit={updateProfileInfo} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px 0', color: '#1e293b' }}>Información personal</h3>

                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Nombre</label>
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Tag de usuario</label>
                    <input
                        type="text"
                        value={`#${tag}`}
                        disabled
                        style={{ width: '120px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#64748b', fontSize: '0.95rem' }}
                    />
                </div>

                <button type="submit" disabled={loading} style={{ background: '#0f172a', color: '#fff', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', alignSelf: 'flex-start' }}>
                    {loading ? 'Guardando...' : 'Guardar nombre'}
                </button>
            </form>

            {/* SEGURIDAD Y ACCESO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.1rem', margin: '0', color: '#1e293b' }}>Seguridad y Acceso</h3>

                <form onSubmit={updateEmail} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Correo electrónico</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                        />
                        <button type="submit" disabled={loading} style={{ background: '#334155', color: '#fff', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                            Cambiar correo
                        </button>
                    </div>
                </form>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />

                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Contraseña</label>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 12px 0' }}>Se enviará un enlace de verificación a tu correo electrónico para cambiar la contraseña de forma segura.</p>
                    <button
                        type="button"
                        onClick={handlePasswordReset}
                        disabled={loading}
                        style={{ background: '#0f172a', color: '#fff', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        Enviar enlace para cambiar contraseña
                    </button>
                </div>
            </div>
        </div>
    )
}