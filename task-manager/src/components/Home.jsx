import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Home.css'

export default function Home({ session }) {
    const [tareas, setTareas] = useState([])
    const [grupos, setGrupos] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchHomeData()
    }, [])

    const fetchHomeData = async () => {
        setLoading(true)
        const userId = session.user.id

        // Cargar grupos
        const { data: gruposData } = await supabase
            .from('miembros_grupo')
            .select('grupo_id, grupos ( id, nombre, creador_id )')
            .eq('usuario_id', userId)

        const formattedGroups = gruposData ? gruposData.map(m => m.grupos).filter(Boolean) : []
        setGrupos(formattedGroups)

        // Cargar tareas
        const { data: tareasData } = await supabase
            .from('tareas')
            .select('*')
            .eq('asignado_a', userId)

        setTareas(tareasData || [])
        setLoading(false)
    }

    const cambiarEstadoTarea = async (id, estadoActual) => {
        const nuevoEstado = estadoActual === 'completada' ? 'pendiente' : 'completada'
        const { error } = await supabase
            .from('tareas')
            .update({ estado: nuevoEstado })
            .eq('id', id)

        if (!error) fetchHomeData()
    }

    if (loading) return <div className="loading-container">Cargando inicio...</div>

    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente' || !t.estado)
    const totalPendientes = tareasPendientes.length

    return (
        <div>
            <section className="cards-grid">
                <div className="card-stat">
                    <h4>Tareas pendientes</h4>
                    <div className="stat-number">{totalPendientes}</div>
                </div>
                <div className="card-stat">
                    <h4>Grupos activos</h4>
                    <div className="stat-number">{grupos.length}</div>
                </div>
            </section>

            <h3 className="section-title" style={{ marginTop: '32px' }}>Mis tareas pendientes asignadas</h3>
            {tareasPendientes.length === 0 ? (
                <p className="empty-text">¡Felicidades! No tienes tareas pendientes asignadas actualmente.</p>
            ) : (
                <div className="cards-grid">
                    {tareasPendientes.map((t) => (
                        <div key={t.id} className="card-stat task-card-item">
                            <div>
                                <h4 className="task-card-title">{t.titulo}</h4>
                                <p className="task-card-desc">{t.descripcion || 'Sin descripción'}</p>
                            </div>
                            <div className="task-card-footer">
                                <span className="task-status pendiente">
                                    ⏳ {t.fecha_limite || 'Sin entrega'}
                                </span>
                                <button
                                    onClick={() => cambiarEstadoTarea(t.id, t.estado)}
                                    className="task-action-btn"
                                >
                                    Completar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}