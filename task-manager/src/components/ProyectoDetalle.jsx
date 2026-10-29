import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './ProyectoDetalle.css'

export default function ProyectoDetalle({ session }) {
    const { id } = useParams()
    const navigate = useNavigate()

    const [proyecto, setProyecto] = useState(null)
    const [tareasProyecto, setTareasProyecto] = useState([])
    const [miembros, setMiembros] = useState([])
    const [miRol, setMiRol] = useState('usuario')
    const [tabProyecto, setTabProyecto] = useState('tareas')
    const [modalNuevaTarea, setModalNuevaTarea] = useState(false)

    const [nuevaTarea, setNuevaTarea] = useState({
        titulo: '',
        descripcion: '',
        asignados_ids: [],
        estado: 'pendiente',
        fecha_limite: new Date().toISOString().split('T')[0] + ' 18:00',
        color: '#6366f1'
    })

    const [emailInvitado, setEmailInvitado] = useState('')
    const [mensajeInv, setMensajeInv] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            fetchDatosProyecto()
        }
    }, [id])

    const fetchDatosProyecto = async () => {
        setLoading(true)
        const userId = session.user.id
        const userEmailSession = session.user.email
        const userMetadata = session.user.user_metadata || {}

        const { data: proyectoData, error: errProj } = await supabase
            .from('grupos')
            .select('*')
            .eq('id', id)
            .single()

        if (errProj || !proyectoData) {
            console.error('Error al cargar proyecto:', errProj)
            setLoading(false)
            return
        }
        setProyecto(proyectoData)

        const { data: tareasData } = await supabase
            .from('tareas')
            .select('*')
            .eq('grupo_id', id)

        if (tareasData) {
            setTareasProyecto(tareasData)
        }

        const { data: miembrosData, error: errMiembros } = await supabase
            .from('miembros_grupo')
            .select('usuario_id, rol')
            .eq('grupo_id', id)

        if (errMiembros) console.error('Error al cargar miembros:', errMiembros)

        if (miembrosData && miembrosData.length > 0) {
            const idsUsuarios = miembrosData.map(m => m.usuario_id)

            const { data: profilesData } = await supabase
                .from('profiles')
                .select('*')
                .in('id', idsUsuarios)

            const listaFormateada = miembrosData.map(m => {
                const perfil = profilesData?.find(p => p.id === m.usuario_id)
                let rolReal = m.rol || 'usuario'

                if (m.usuario_id === proyectoData.creador_id) {
                    rolReal = 'dueño'
                }

                const nombreReal = perfil?.nombre || perfil?.full_name || userMetadata.nombre || userMetadata.full_name || userEmailSession?.split('@')[0] || 'Usuario'
                const emailReal = perfil?.email || userEmailSession || 'Sin correo'
                const avatarReal = perfil?.avatar_url || perfil?.foto || userMetadata.avatar_url || userMetadata.foto || null

                return {
                    id: m.usuario_id,
                    nombre: nombreReal,
                    email: emailReal,
                    avatar_url: avatarReal,
                    rol: rolReal
                }
            })

            setMiembros(listaFormateada)

            const miFicha = listaFormateada.find(m => m.id === userId)
            if (miFicha) {
                setMiRol(miFicha.rol)
            } else if (proyectoData.creador_id === userId) {
                setMiRol('dueño')
            }
        } else {
            const nombreReal = userMetadata.nombre || userMetadata.full_name || userEmailSession?.split('@')[0] || 'Usuario'
            const emailReal = userEmailSession || 'Sin correo'
            const avatarReal = userMetadata.avatar_url || userMetadata.foto || null

            setMiembros([{
                id: userId,
                nombre: nombreReal,
                email: emailReal,
                avatar_url: avatarReal,
                rol: 'dueño'
            }])
            setMiRol('dueño')
        }

        setLoading(false)
    }

    const esDueno = miRol === 'dueño' || miRol === 'dueno'
    const esAdmin = miRol === 'administrador' || miRol === 'Administrador' || esDueno
    const puedeGestionarTareas = esAdmin

    const handleCrearTarea = async (e) => {
        e.preventDefault()
        if (!puedeGestionarTareas || !nuevaTarea.titulo) return

        const { error } = await supabase.from('tareas').insert([
            {
                titulo: nuevaTarea.titulo,
                descripcion: nuevaTarea.descripcion,
                estado: nuevaTarea.estado,
                asignados_ids: nuevaTarea.asignados_ids,
                grupo_id: id,
                fecha_limite: nuevaTarea.fecha_limite,
                color: nuevaTarea.color
            }
        ])

        if (!error) {
            setModalNuevaTarea(false)
            setNuevaTarea({
                titulo: '',
                descripcion: '',
                asignados_ids: [],
                estado: 'pendiente',
                fecha_limite: new Date().toISOString().split('T')[0] + ' 18:00',
                color: '#6366f1'
            })
            fetchDatosProyecto()
        } else {
            alert('Error al crear tarea: ' + error.message)
        }
    }

    const handleInvitarMiembro = async (e) => {
        e.preventDefault()
        if (!esAdmin) return
        setMensajeInv(null)
        const emailLimpio = emailInvitado.trim().toLowerCase()
        if (!emailLimpio) return

        const { data: usuarioPerfil, error: errUser } = await supabase
            .from('profiles')
            .select('id, email, nombre')
            .eq('email', emailLimpio)
            .maybeSingle()

        if (errUser || !usuarioPerfil) {
            setMensajeInv({ tipo: 'error', texto: 'No se encontró ningún usuario registrado con ese correo.' })
            return
        }

        const yaEsMiembro = miembros.some(m => m.id === usuarioPerfil.id)
        if (yaEsMiembro) {
            setMensajeInv({ tipo: 'error', texto: 'Este usuario ya forma parte de este proyecto.' })
            return
        }

        const { error: errInsert } = await supabase
            .from('miembros_grupo')
            .insert([{ grupo_id: id, usuario_id: usuarioPerfil.id, rol: 'usuario' }])

        if (errInsert) {
            setMensajeInv({ tipo: 'error', texto: 'Error al añadir integrante: ' + errInsert.message })
        } else {
            setMensajeInv({ tipo: 'exito', texto: `¡${usuarioPerfil.nombre || usuarioPerfil.email} añadido con éxito!` })
            setEmailInvitado('')
            fetchDatosProyecto()
        }
    }

    const cambiarRolMiembro = async (usuarioId, nuevoRol) => {
        if (!esDueno) return
        const { error } = await supabase
            .from('miembros_grupo')
            .update({ rol: nuevoRol })
            .eq('grupo_id', id)
            .eq('usuario_id', usuarioId)

        if (!error) fetchDatosProyecto()
        else alert('Error al cambiar rol: ' + error.message)
    }

    const eliminarMiembro = async (usuarioId) => {
        if (!esAdmin) return
        if (usuarioId === proyecto.creador_id) {
            alert('No puedes eliminar al creador principal.')
            return
        }
        if (window.confirm('¿Seguro que deseas expulsar a este usuario del proyecto?')) {
            const { error } = await supabase
                .from('miembros_grupo')
                .delete()
                .eq('grupo_id', id)
                .eq('usuario_id', usuarioId)

            if (!error) fetchDatosProyecto()
        }
    }

    const cambiarEstadoTarea = async (tareaId, nuevoEstado, e) => {
        if (e) e.stopPropagation()
        if (!esAdmin) return

        const { error } = await supabase
            .from('tareas')
            .update({ estado: nuevoEstado })
            .eq('id', tareaId)

        if (!error) {
            fetchDatosProyecto()
        } else {
            alert('Error al actualizar el estado de la tarea: ' + error.message)
        }
    }

    const eliminarTarea = async (tareaId, e) => {
        if (e) e.stopPropagation()
        if (!esAdmin) return

        if (window.confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
            const { error } = await supabase
                .from('tareas')
                .delete()
                .eq('id', tareaId)

            if (!error) {
                fetchDatosProyecto()
            } else {
                alert('Error al eliminar la tarea: ' + error.message)
            }
        }
    }

    const salirDelProyecto = async () => {
        if (esDueno) {
            alert('Como eres el dueño, no puedes salir directamente.')
            return
        }
        if (window.confirm('¿Estás seguro de que deseas salir de este proyecto?')) {
            const { error } = await supabase
                .from('miembros_grupo')
                .delete()
                .eq('grupo_id', id)
                .eq('usuario_id', session.user.id)

            if (!error) navigate('/proyectos')
            else alert('Error al salir del proyecto: ' + error.message)
        }
    }

    const eliminarGrupo = async () => {
        if (!esDueno) return
        if (window.confirm('⚠️ ADVERTENCIA: ¿Estás seguro de ELIMINAR este grupo por completo?')) {
            await supabase.from('tareas').delete().eq('grupo_id', id)
            await supabase.from('miembros_grupo').delete().eq('grupo_id', id)
            const { error } = await supabase.from('grupos').delete().eq('id', id)

            if (!error) navigate('/proyectos')
            else alert('Error al eliminar el grupo: ' + error.message)
        }
    }

    if (loading || !proyecto) return <div className="loading-container">Cargando detalles del proyecto...</div>

    const ordenarPorFecha = (a, b) => {
        if (!a.fecha_limite) return 1
        if (!b.fecha_limite) return -1
        return new Date(a.fecha_limite) - new Date(b.fecha_limite)
    }

    const ahora = new Date()

    const tareasAtrasadas = tareasProyecto.filter(t => {
        if (t.estado === 'completada' || t.estado === 'Completada') return false
        if (!t.fecha_limite) return false
        return new Date(t.fecha_limite) < ahora
    }).sort(ordenarPorFecha)

    const tareasTerminadas = tareasProyecto.filter(t => {
        return t.estado === 'completada' || t.estado === 'Completada'
    }).sort(ordenarPorFecha)

    const tareasAsignadas = tareasProyecto.filter(t => {
        if (t.estado === 'completada' || t.estado === 'Completada') return false
        if (t.fecha_limite && new Date(t.fecha_limite) < ahora) return false
        const idsAsignados = Array.isArray(t.asignados_ids) ? t.asignados_ids : []
        return idsAsignados.length > 0
    }).sort(ordenarPorFecha)

    const tareasPendientes = tareasProyecto.filter(t => {
        if (t.estado === 'completada' || t.estado === 'Completada') return false
        if (t.fecha_limite && new Date(t.fecha_limite) < ahora) return false
        const idsAsignados = Array.isArray(t.asignados_ids) ? t.asignados_ids : []
        return idsAsignados.length === 0
    }).sort(ordenarPorFecha)

    // Renderizador de tarjeta: solo muestra el botón de borrar si esAdmin (dueño o admin)
    const renderCard = (t, colorBorde, fondoCard, estadoDestino) => {
        const idsAsignados = Array.isArray(t.asignados_ids) ? t.asignados_ids : []
        const nombresAsignados = miembros.filter(m => idsAsignados.includes(m.id)).map(m => m.nombre).join(', ')
        const esTerminada = estadoDestino === 'pendiente';

        return (
            <div
                key={t.id}
                className={`kanban-card ${esTerminada ? 'opacity-card' : ''}`}
                style={{ borderColor: colorBorde, borderWidth: '2px', borderStyle: 'solid', background: fondoCard, position: 'relative' }}
                onClick={() => navigate(`/proyecto/${id}/tarea/${t.id}`)}
            >
                {/* BOTÓN DE BORRAR 🗑️: SOLAMENTE SI ES DUEÑO O ADMIN */}
                {esAdmin && (
                    <button
                        onClick={(e) => eliminarTarea(t.id, e)}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            padding: '2px 4px',
                            zIndex: 2,
                            opacity: 0.7,
                            transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                        title="Eliminar tarea"
                    >
                        🗑️
                    </button>
                )}

                <div className="kanban-card-top" style={{ paddingRight: esAdmin ? '24px' : '0' }}>
                    <h4 className={esTerminada ? 'kanban-titulo-tachado' : ''}>{t.titulo}</h4>
                </div>
                <p>{t.descripcion || 'Sin descripción'}</p>
                <div className="kanban-asignados-text">
                    👤 Asignados: <strong className="kanban-asignados-strong">{nombresAsignados || 'Sin asignar'}</strong>
                </div>
                <div className="kanban-card-footer">
                    <span className="kanban-date">⏳ {t.fecha_limite || 'Sin entrega'}</span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {esAdmin && (
                            <>
                                <button
                                    onClick={(e) => cambiarEstadoTarea(t.id, estadoDestino, e)}
                                    className="kanban-edit-btn"
                                    style={{
                                        background: esTerminada ? '#f1f5f9' : '#f0fdf4',
                                        color: esTerminada ? '#334155' : '#10b981',
                                        border: `1px solid ${esTerminada ? '#cbd5e1' : '#bbf7d0'}`
                                    }}
                                    title={esTerminada ? "Regresar a pendientes" : "Marcar como completada"}
                                >
                                    {esTerminada ? '↩️ Descompletar' : '✅ Completar'}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/proyecto/${id}/tarea/${t.id}`, { state: { editable: true } }); }}
                                    className="kanban-edit-btn"
                                    style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                                >
                                    Editar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="pd-container">
            <div className="pd-top-nav">
                <span className="pd-breadcrumb" onClick={() => navigate('/proyectos')}>← Volver a Proyectos</span>
            </div>

            <div className="pd-sub-header">
                <div>
                    <div className="pd-title-row">
                        <h2>{proyecto.nombre}</h2>
                        <span className={`pd-badge-status ${esDueno ? 'badge-dueno' : miRol === 'administrador' ? 'badge-admin' : 'badge-usuario'}`}>
                            Rol: {miRol.toUpperCase()}
                        </span>
                    </div>
                    <p className="pd-desc">Espacio de trabajo y planificación de tareas del equipo.</p>
                </div>
                {puedeGestionarTareas && (
                    <button onClick={() => setModalNuevaTarea(true)} className="pd-btn-primary">
                        + Nueva tarea
                    </button>
                )}
            </div>

            <div className="pd-tabs">
                <button className={`pd-tab-item ${tabProyecto === 'tareas' ? 'active' : ''}`} onClick={() => setTabProyecto('tareas')}>Tareas</button>
                <button className={`pd-tab-item ${tabProyecto === 'calendario' ? 'active' : ''}`} onClick={() => setTabProyecto('calendario')}>Calendario</button>
                <button className={`pd-tab-item ${tabProyecto === 'equipo' ? 'active' : ''}`} onClick={() => setTabProyecto('equipo')}>Equipo ({miembros.length})</button>
            </div>

            {tabProyecto === 'tareas' && (
                <div className="pd-kanban-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <div className="kanban-column">
                        <div className="kanban-header" style={{ borderBottomColor: '#dc2626' }}>
                            <h3 style={{ color: '#dc2626' }}>⚠️ Atrasadas</h3>
                            <span className="kanban-count">{tareasAtrasadas.length}</span>
                        </div>
                        <div className="kanban-cards">
                            {tareasAtrasadas.map(t => renderCard(t, '#dc2626', '#fef2f2', 'completada'))}
                        </div>
                    </div>

                    <div className="kanban-column">
                        <div className="kanban-header">
                            <h3>⏳ Pendientes</h3>
                            <span className="kanban-count">{tareasPendientes.length}</span>
                        </div>
                        <div className="kanban-cards">
                            {tareasPendientes.map(t => renderCard(t, t.color || '#cbd5e1', '#ffffff', 'completada'))}
                        </div>
                    </div>

                    <div className="kanban-column">
                        <div className="kanban-header">
                            <h3>👤 Asignadas</h3>
                            <span className="kanban-count">{tareasAsignadas.length}</span>
                        </div>
                        <div className="kanban-cards">
                            {tareasAsignadas.map(t => renderCard(t, t.color || '#6366f1', '#ffffff', 'completada'))}
                        </div>
                    </div>

                    <div className="kanban-column">
                        <div className="kanban-header" style={{ borderBottomColor: '#10b981' }}>
                            <h3 style={{ color: '#10b981' }}>✅ Terminadas</h3>
                            <span className="kanban-count">{tareasTerminadas.length}</span>
                        </div>
                        <div className="kanban-cards">
                            {tareasTerminadas.map(t => renderCard(t, '#10b981', '#f0fdf4', 'pendiente'))}
                        </div>
                    </div>
                </div>
            )}

            {tabProyecto === 'calendario' && (
                <div className="calendar-container calendar-custom-container">
                    <div className="calendar-header-box">
                        <h3>Calendario del Proyecto</h3>
                        <p>Haz clic en cualquier tarea para abrir su página completa.</p>
                    </div>
                    <div className="calendar-grid calendar-custom-grid">
                        {['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'].map(dia => (
                            <div key={dia} className="calendar-day-header calendar-day-header-custom">{dia}</div>
                        ))}
                        {Array.from({ length: 35 }).map((_, index) => {
                            const diaNum = index - 1
                            const esDiaValido = diaNum >= 1 && diaNum <= 30
                            const fechaStr = esDiaValido ? `2026-09-${diaNum < 10 ? '0' + diaNum : diaNum}` : ''
                            const tareasDelDia = esDiaValido ? tareasProyecto.filter(t => t.fecha_limite && t.fecha_limite.includes(fechaStr)) : []

                            return (
                                <div key={index} className={`calendar-cell ${!esDiaValido ? 'calendar-cell-empty' : ''} ${esDiaValido ? 'calendar-cell-valid' : ''}`}>
                                    {esDiaValido && <span className="calendar-date-number">{diaNum}</span>}
                                    <div className="calendar-tasks-list calendar-tasks-list-custom">
                                        {tareasDelDia.map(t => {
                                            const idsAsignados = Array.isArray(t.asignados_ids) ? t.asignados_ids : []
                                            const nombresAsignados = miembros.filter(m => idsAsignados.includes(m.id)).map(m => m.nombre).join(', ')

                                            return (
                                                <div
                                                    key={t.id}
                                                    onClick={() => navigate(`/proyecto/${id}/tarea/${t.id}`)}
                                                    className="calendar-task-item"
                                                    style={{ backgroundColor: t.color || '#eef2ff' }}
                                                >
                                                    <div className="calendar-task-title">{t.titulo}</div>
                                                    <div className="calendar-task-asignados">👤 {nombresAsignados || 'Sin asignar'}</div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {tabProyecto === 'equipo' && (
                <div className="pd-equipo-wrapper">
                    {esAdmin && (
                        <div className="pd-section-card pd-section-card-nobottom">
                            <h3>Invitar integrante a este proyecto</h3>
                            {mensajeInv && (
                                <div className={`perfil-alert ${mensajeInv.tipo} pd-mensaje-inv`}>
                                    {mensajeInv.texto}
                                </div>
                            )}
                            <form onSubmit={handleInvitarMiembro} className="pd-form-invitar">
                                <input
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    value={emailInvitado}
                                    onChange={(e) => setEmailInvitado(e.target.value)}
                                    required
                                    className="pd-input pd-input-flex"
                                />
                                <button type="submit" className="pd-btn-primary pd-btn-nowrap">+ Añadir miembro</button>
                            </form>
                        </div>
                    )}

                    <div className="pd-section-card pd-section-card-nobottom">
                        <div className="pd-equipo-header-row">
                            <h3>Integrantes actuales ({miembros.length})</h3>
                            <div>
                                {!esDueno && (
                                    <button onClick={salirDelProyecto} className="pd-btn-salir">
                                        🚪 Salir del proyecto
                                    </button>
                                )}
                                {esDueno && (
                                    <button onClick={eliminarGrupo} className="pd-btn-eliminar-grupo">
                                        🗑️ Eliminar grupo
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="pd-miembros-grid">
                            {miembros.map(m => (
                                <div key={m.id} className="pd-miembro-card">
                                    <div className="pd-miembro-info-top">
                                        {m.avatar_url ? (
                                            <img src={m.avatar_url} alt={m.nombre} className="pd-miembro-avatar-img" />
                                        ) : (
                                            <span className="pd-miembro-avatar-fallback">
                                                {m.nombre ? m.nombre.charAt(0).toUpperCase() : 'U'}
                                            </span>
                                        )}
                                        <div className="pd-miembro-text-box">
                                            <p className="pd-miembro-nombre">{m.nombre}</p>
                                            <p className="pd-miembro-email">{m.email}</p>
                                        </div>
                                    </div>

                                    <div className="pd-miembro-footer-row">
                                        <span className={`pd-miembro-rol-badge ${m.rol === 'dueño' || m.rol === 'dueno' ? 'badge-dueno' : m.rol === 'administrador' ? 'badge-admin' : 'badge-usuario'}`}>
                                            {m.rol.toUpperCase()}
                                        </span>

                                        {esDueno && m.id !== session.user.id && (
                                            <select
                                                value={m.rol}
                                                onChange={(e) => cambiarRolMiembro(m.id, e.target.value)}
                                                className="pd-select-rol"
                                            >
                                                <option value="usuario">Usuario</option>
                                                <option value="administrador">Administrador</option>
                                                <option value="dueño">Dueño</option>
                                            </select>
                                        )}

                                        {esAdmin && m.id !== session.user.id && m.id !== proyecto.creador_id && (
                                            <button onClick={() => eliminarMiembro(m.id)} className="pd-btn-expulsar">
                                                Expulsar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {modalNuevaTarea && puedeGestionarTareas && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Nueva tarea</h3>
                            <button onClick={() => setModalNuevaTarea(false)} className="modal-close">×</button>
                        </div>
                        <form onSubmit={handleCrearTarea} className="modal-form">
                            <div className="form-group">
                                <label>Título</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Diseñar página principal"
                                    value={nuevaTarea.titulo}
                                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })}
                                    required
                                    className="pd-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea
                                    placeholder="Añade detalles de la tarea..."
                                    value={nuevaTarea.descripcion}
                                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
                                    className="pd-input textarea"
                                />
                            </div>

                            <div className="form-group">
                                <label>Color personalizado</label>
                                <div className="pd-color-picker-row">
                                    <input
                                        type="color"
                                        value={nuevaTarea.color}
                                        onChange={(e) => setNuevaTarea({ ...nuevaTarea, color: e.target.value })}
                                        className="pd-color-input-real"
                                    />
                                    <span className="pd-color-hex-text">{nuevaTarea.color}</span>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Fecha y hora de entrega</label>
                                    <input
                                        type="datetime-local"
                                        value={nuevaTarea.fecha_limite.replace(' ', 'T')}
                                        onChange={(e) => setNuevaTarea({ ...nuevaTarea, fecha_limite: e.target.value.replace('T', ' ') })}
                                        className="pd-input"
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setModalNuevaTarea(false)} className="pd-btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="pd-btn-primary">
                                    Crear tarea
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}