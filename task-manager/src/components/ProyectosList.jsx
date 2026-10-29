import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './Home.css'

export default function ProyectosList({ session }) {
    const [grupos, setGrupos] = useState([])
    const [loading, setLoading] = useState(true)
    const [modalNuevoProyecto, setModalNuevoProyecto] = useState(false)
    const [nombreNuevoProyecto, setNombreNuevoProyecto] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        fetchGrupos()
    }, [])

    const fetchGrupos = async () => {
        setLoading(true)
        const userId = session.user.id

        const { data: gruposData, error } = await supabase
            .from('miembros_grupo')
            .select('grupo_id, grupos ( id, nombre, creador_id )')
            .eq('usuario_id', userId)

        if (error) console.error('Error cargando proyectos:', error)

        const formattedGroups = gruposData ? gruposData.map(m => m.grupos).filter(Boolean) : []
        setGrupos(formattedGroups)
        setLoading(false)
    }

    const handleCrearProyecto = async (e) => {
        e.preventDefault()
        if (!nombreNuevoProyecto.trim()) return

        const userId = session.user.id

        const { data: grupoCreado, error: errGrupo } = await supabase
            .from('grupos')
            .insert([{ nombre: nombreNuevoProyecto.trim(), creador_id: userId }])
            .select()
            .single()

        if (errGrupo) {
            alert('Error al crear el proyecto: ' + errGrupo.message)
            return
        }

        if (grupoCreado) {
            await supabase
                .from('miembros_grupo')
                .insert([{ grupo_id: grupoCreado.id, usuario_id: userId }])
        }

        setNombreNuevoProyecto('')
        setModalNuevoProyecto(false)
        fetchGrupos()
    }

    if (loading) return <div className="loading-container">Cargando proyectos...</div>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '24px' }}>
                <button onClick={() => setModalNuevoProyecto(true)} className="pd-btn-primary">
                    + Crear proyecto
                </button>
            </div>

            {grupos.length === 0 ? (
                <p className="empty-text">No perteneces a ningún proyecto todavía. ¡Crea uno nuevo para empezar!</p>
            ) : (
                <div className="cards-grid">
                    {grupos.map((g) => (
                        <div
                            key={g.id}
                            className="card-stat"
                            onClick={() => navigate(`/proyecto/${g.id}`)}
                            style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
                        >
                            <h4 className="task-card-title" style={{ color: 'var(--primary)' }}>📁 {g.nombre}</h4>
                            <p className="task-card-desc">Haz clic para abrir el espacio de trabajo, añadir tareas y miembros →</p>
                        </div>
                    ))}
                </div>
            )}

            {modalNuevoProyecto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Crear nuevo proyecto</h3>
                            <button onClick={() => setModalNuevoProyecto(false)} className="modal-close">×</button>
                        </div>
                        <form onSubmit={handleCrearProyecto} className="modal-form">
                            <div className="form-group">
                                <label>Nombre del proyecto</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Rediseño Web, Campaña Q3..."
                                    value={nombreNuevoProyecto}
                                    onChange={(e) => setNombreNuevoProyecto(e.target.value)}
                                    required
                                    className="pd-input"
                                    autoFocus
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setModalNuevoProyecto(false)} className="pd-btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="pd-btn-primary">
                                    Crear proyecto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}