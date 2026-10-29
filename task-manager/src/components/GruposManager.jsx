import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './GruposManager.css'

export default function GruposManager({ session, grupos, onGrupoCreado }) {
    const [nombreGrupo, setNombreGrupo] = useState('')
    const [emailInvitado, setEmailInvitado] = useState('')
    const [grupoSeleccionado, setGrupoSeleccionado] = useState('')
    const [loading, setLoading] = useState(false)
    const [mensaje, setMensaje] = useState(null)

    const handleCrearGrupo = async (e) => {
        e.preventDefault()
        if (!nombreGrupo.trim()) return

        setLoading(true)
        setMensaje(null)
        const userId = session.user.id

        // 1. Crear el grupo
        const { data: nuevoGrupo, error: errorGrupo } = await supabase
            .from('grupos')
            .insert([{ nombre: nombreGrupo, creador_id: userId }])
            .select()
            .single()

        if (errorGrupo) {
            setMensaje({ tipo: 'error', texto: 'Error al crear grupo: ' + errorGrupo.message })
            setLoading(false)
            return
        }

        // 2. Añadir automáticamente al creador como miembro del grupo
        const { error: errorMiembro } = await supabase
            .from('miembros_grupo')
            .insert([{ grupo_id: nuevoGrupo.id, usuario_id: userId }])

        if (errorMiembro) {
            setMensaje({ tipo: 'error', texto: 'Grupo creado, pero falló la membresía: ' + errorMiembro.message })
        } else {
            setMensaje({ tipo: 'exito', texto: `¡Grupo "${nombreGrupo}" creado con éxito!` })
            setNombreGrupo('')
            if (onGrupoCreado) onGrupoCreado()
        }
        setLoading(false)
    }

    const handleInvitarMiembro = async (e) => {
        e.preventDefault()
        if (!emailInvitado.trim() || !grupoSeleccionado) return

        setLoading(true)
        setMensaje(null)

        // 1. Buscar al usuario por email en la tabla 'profiles'
        const { data: perfilInvitado, error: errorPerfil } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', emailInvitado.trim())
            .maybeSingle()

        if (errorPerfil || !perfilInvitado) {
            setMensaje({ tipo: 'error', texto: 'No se encontró ningún usuario registrado con ese correo.' })
            setLoading(false)
            return
        }

        // 2. Añadir al usuario a 'miembros_grupo'
        const { error: errorInsert } = await supabase
            .from('miembros_grupo')
            .insert([{ grupo_id: grupoSeleccionado, usuario_id: perfilInvitado.id }])

        if (errorInsert) {
            if (errorInsert.code === '23505') {
                setMensaje({ tipo: 'error', texto: 'Este usuario ya forma parte del grupo.' })
            } else {
                setMensaje({ tipo: 'error', texto: 'Error al invitar: ' + errorInsert.message })
            }
        } else {
            setMensaje({ tipo: 'exito', texto: '¡Usuario añadido al grupo correctamente!' })
            setEmailInvitado('')
        }
        setLoading(false)
    }

    return (
        <div className="gm-container">
            <h2 className="gm-title">Gestión de Proyectos y Equipos</h2>

            {mensaje && (
                <div className={`gm-alert ${mensaje.tipo}`}>
                    {mensaje.texto}
                </div>
            )}

            <div className="gm-grid">
                {/* Formulario para Crear Grupo */}
                <div className="gm-card">
                    <h3>Crear un nuevo proyecto</h3>
                    <form onSubmit={handleCrearGrupo} className="gm-form">
                        <input
                            type="text"
                            placeholder="Nombre del proyecto (ej. Rediseño Web)"
                            value={nombreGrupo}
                            onChange={(e) => setNombreGrupo(e.target.value)}
                            required
                            className="gm-input"
                        />
                        <button type="submit" disabled={loading} className="gm-button">
                            {loading ? 'Creando...' : 'Crear proyecto'}
                        </button>
                    </form>
                </div>

                {/* Formulario para Invitar Miembros */}
                <div className="gm-card">
                    <h3>Invitar integrante</h3>
                    <form onSubmit={handleInvitarMiembro} className="gm-form">
                        <select
                            value={grupoSeleccionado}
                            onChange={(e) => setGrupoSeleccionado(e.target.value)}
                            required
                            className="gm-input"
                        >
                            <option value="">Selecciona un proyecto</option>
                            {grupos.map((g) => (
                                <option key={g.id} value={g.id}>{g.nombre}</option>
                            ))}
                        </select>
                        <input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={emailInvitado}
                            onChange={(e) => setEmailInvitado(e.target.value)}
                            required
                            className="gm-input"
                        />
                        <button type="submit" disabled={loading} className="gm-button">
                            {loading ? 'Enviando...' : 'Añadir miembro'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}