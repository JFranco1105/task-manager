import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./TareaDetalle.css";

export default function TareaDetalle({ session }) {
    const { id: proyectoId, tareaId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const esModoEdicion = location.state?.editable || false;

    const [tarea, setTarea] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [miembrosProyecto, setMiembrosProyecto] = useState([]);
    const [esAdmin, setEsAdmin] = useState(false);
    const [esAsignado, setEsAsignado] = useState(false);

    const [titulo, setTitulo] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [estado, setEstado] = useState("Pendiente");
    const [color, setColor] = useState("#3b82f6");
    const [fechaLimite, setFechaLimite] = useState("");
    const [horaLimite, setHoraLimite] = useState("20:00");
    const [asignados, setAsignados] = useState([]);
    const [completadoPor, setCompletadoPor] = useState("");

    useEffect(() => {
        if (tareaId && proyectoId && session) {
            fetchTodo();
        }
    }, [tareaId, proyectoId, session]);

    const fetchTodo = async () => {
        try {
            setCargando(true);
            const userId = session.user.id;

            // 1. Cargar datos del proyecto y verificar rol del usuario
            const { data: proyectoData } = await supabase
                .from("grupos")
                .select("creador_id")
                .eq("id", proyectoId)
                .single();

            const { data: miembroData } = await supabase
                .from("miembros_grupo")
                .select("rol")
                .eq("grupo_id", proyectoId)
                .eq("usuario_id", userId)
                .maybeSingle();

            const rolUser = miembroData?.rol || 'usuario';
            const esDuenoReal = proyectoData?.creador_id === userId || rolUser === 'dueño' || rolUser === 'dueno';
            const esAdminReal = esDuenoReal || rolUser === 'administrador' || rolUser === 'Administrador';
            setEsAdmin(esAdminReal);

            // 2. Cargar datos de la tarea
            const { data: tareaData, error: tareaError } = await supabase
                .from("tareas")
                .select("*")
                .eq("id", tareaId)
                .single();

            if (tareaError) throw tareaError;

            if (tareaData) {
                setTarea(tareaData);
                setTitulo(tareaData.titulo || "");
                setDescripcion(tareaData.descripcion || "");
                setColor(tareaData.color || "#3b82f6");
                setCompletadoPor(tareaData.completado_por || "");

                const idsAsignados = Array.isArray(tareaData.asignados_ids) ? tareaData.asignados_ids : [];
                setAsignados(idsAsignados);

                // Validar si el usuario actual está asignado
                const usuarioEstaAsignado = idsAsignados.includes(userId);
                setEsAsignado(usuarioEstaAsignado);

                let fStr = "";
                let hStr = "20:00";

                if (tareaData.fecha_limite) {
                    const [f, h] = tareaData.fecha_limite.split("T");
                    fStr = f || "";
                    hStr = h ? h.substring(0, 5) : "20:00";
                    setFechaLimite(fStr);
                    setHoraLimite(hStr);
                }

                let estadoActual = tareaData.estado || "Pendiente";
                if (tareaData.fecha_limite && estadoActual !== "Completada" && estadoActual !== "completada") {
                    const fechaLimiteObj = new Date(tareaData.fecha_limite);
                    const ahora = new Date();
                    if (ahora > fechaLimiteObj) {
                        estadoActual = "Atrasada";
                    }
                }

                setEstado(estadoActual);
            }

            // 3. Cargar miembros del proyecto
            let perfilesMapeados = [];
            const { data: miembrosData, error: miembrosError } = await supabase
                .from("miembros_grupo")
                .select("usuario_id, profiles(id, nombre, email, avatar_url)")
                .eq("grupo_id", proyectoId);

            if (!miembrosError && miembrosData && miembrosData.length > 0) {
                perfilesMapeados = miembrosData.map(m => m.profiles).filter(Boolean);
            }

            if (perfilesMapeados.length === 0) {
                const { data: todosPerfiles, error: errorProfiles } = await supabase
                    .from("profiles")
                    .select("id, nombre, email, avatar_url");

                if (!errorProfiles && todosPerfiles) {
                    perfilesMapeados = todosPerfiles;
                }
            }

            setMiembrosProyecto(perfilesMapeados);

        } catch (error) {
            console.error("Error al cargar datos de la tarea:", error);
        } finally {
            setCargando(false);
        }
    };

    const handleGuardar = async () => {
        if (!esModoEdicion || !esAdmin) return;
        try {
            const fechaCompleta = fechaLimite ? `${fechaLimite}T${horaLimite}:00` : null;

            const { error } = await supabase
                .from("tareas")
                .update({
                    titulo,
                    descripcion,
                    estado,
                    color,
                    fecha_limite: fechaCompleta,
                    asignados_ids: asignados,
                })
                .eq("id", tareaId);

            if (error) throw error;
            alert("¡Tarea actualizada con éxito!");
            navigate(`/proyecto/${proyectoId}`);
        } catch (error) {
            console.error("Error al guardar tarea:", error);
            alert("Hubo un error al guardar los cambios.");
        }
    };

    const toggleCompletado = async () => {
        // Solo puede si es admin o si está estrictamente asignado a la tarea
        if (!esAdmin && !esAsignado) {
            alert("Solo los usuarios asignados a esta tarea pueden completarla.");
            return;
        }

        const esCompletada = estado === 'Completada' || estado === 'completada';
        const nuevoEstado = esCompletada ? 'Pendiente' : 'Completada';

        // Obtener nombre del usuario actual para la etiqueta
        const usuarioActualNombre = session.user.user_metadata?.nombre || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario';
        const nuevoCompletadoPor = esCompletada ? "" : usuarioActualNombre;

        try {
            const { error } = await supabase
                .from("tareas")
                .update({
                    estado: nuevoEstado,
                    completado_por: nuevoCompletadoPor
                })
                .eq("id", tareaId);

            if (error) throw error;
            setEstado(nuevoEstado);
            setCompletadoPor(nuevoCompletadoPor);
            fetchTodo();
        } catch (error) {
            console.error("Error al actualizar estado:", error);
            alert("Hubo un error al cambiar el estado de la tarea.");
        }
    };

    const handleEliminarTarea = async () => {
        if (!esModoEdicion || !esAdmin) return;
        if (!window.confirm("⚠️ ¿Estás seguro de eliminar esta tarea permanentemente?")) return;
        try {
            const { error } = await supabase
                .from("tareas")
                .delete()
                .eq("id", tareaId);

            if (error) throw error;
            navigate(`/proyecto/${proyectoId}`);
        } catch (error) {
            console.error("Error al eliminar la tarea:", error);
            alert("No se pudo eliminar la tarea.");
        }
    };

    if (cargando) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#64748b' }}>
                Cargando detalle de la tarea...
            </div>
        );
    }

    const puedeCompletar = esAdmin || esAsignado;

    return (
        <div className="tarea-detalle-container">
            <div>
                <button
                    onClick={() => navigate(`/proyecto/${proyectoId}`)}
                    style={{ background: 'transparent', border: 'none', color: '#4f46e5', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', padding: 0 }}
                >
                    ← Volver al Panel del Proyecto
                </button>
            </div>

            <div className="tarea-detalle-content">
                {/* Cabecera */}
                <div className="tarea-detalle-header">
                    <div>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>
                            {esModoEdicion ? 'Gestión de Tarea Individual (Modo Edición)' : 'Vista de Tarea (Solo Lectura)'}
                        </span>
                        <input
                            type="text"
                            value={titulo}
                            disabled={!esModoEdicion}
                            onChange={(e) => setTitulo(e.target.value)}
                            className="tarea-detalle-titulo-input"
                            style={{ cursor: esModoEdicion ? 'text' : 'default' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Color:</span>
                        <input
                            type="color"
                            value={color}
                            disabled={!esModoEdicion}
                            onChange={(e) => setColor(e.target.value)}
                            style={{ width: '36px', height: '36px', border: 'none', borderRadius: '8px', cursor: esModoEdicion ? 'pointer' : 'default', background: 'transparent' }}
                        />
                    </div>
                </div>

                {/* Aviso visual de quién completó la tarea si está terminada */}
                {(estado === 'Completada' || estado === 'completada') && completadoPor && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '8px', color: '#047857', fontSize: '0.85rem', fontWeight: 600 }}>
                        ✅ COMPLETADO POR: {completadoPor.toUpperCase()}
                    </div>
                )}

                {/* Cuerpo principal en grid */}
                <div className="tarea-detalle-grid">
                    <div className="tarea-detalle-col-izquierda">
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Descripción de la tarea</label>
                            <textarea
                                value={descripcion}
                                disabled={!esModoEdicion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                rows={5}
                                className="tarea-detalle-textarea"
                                style={{ background: esModoEdicion ? '#fff' : '#f8fafc', cursor: esModoEdicion ? 'text' : 'default' }}
                                placeholder="Añade una descripción..."
                            />
                        </div>

                        <div className="tarea-detalle-fechas-grid">
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>📅 Fecha de Entrega</label>
                                <input
                                    type="date"
                                    value={fechaLimite}
                                    disabled={!esModoEdicion}
                                    onChange={(e) => setFechaLimite(e.target.value)}
                                    className="tarea-detalle-input"
                                    style={{ background: esModoEdicion ? '#fff' : '#f8fafc', cursor: esModoEdicion ? 'default' : 'not-allowed' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>⏱️ Hora Límite</label>
                                <input
                                    type="time"
                                    value={horaLimite}
                                    disabled={!esModoEdicion}
                                    onChange={(e) => setHoraLimite(e.target.value)}
                                    className="tarea-detalle-input"
                                    style={{ background: esModoEdicion ? '#fff' : '#f8fafc', cursor: esModoEdicion ? 'default' : 'not-allowed' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="tarea-detalle-col-derecha">
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: '#1e293b' }}>
                                👥 Integrantes Asignados
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                                {esModoEdicion ? 'Selecciona colaboradores para esta tarea:' : 'Colaboradores asignados:'}
                            </p>
                        </div>

                        {esModoEdicion && (
                            <select
                                onChange={(e) => {
                                    const selectedId = e.target.value;
                                    if (!selectedId) return;
                                    if (!asignados.includes(selectedId)) {
                                        setAsignados([...asignados, selectedId]);
                                    }
                                    e.target.value = "";
                                }}
                                defaultValue=""
                                className="tarea-detalle-input"
                                style={{ background: '#fff', cursor: 'pointer' }}
                            >
                                <option value="" disabled>Añadir integrante...</option>
                                {miembrosProyecto.map((m) => {
                                    if (asignados.includes(m.id)) return null;
                                    return (
                                        <option key={m.id} value={m.id}>
                                            {m.nombre || m.email}
                                        </option>
                                    );
                                })}
                            </select>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                            {asignados.length === 0 ? (
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Ningún integrante asignado</span>
                            ) : (
                                asignados.map((idAsignado) => {
                                    const miembro = miembrosProyecto.find(m => m.id === idAsignado);
                                    if (!miembro) return null;
                                    return (
                                        <div key={idAsignado} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{miembro.nombre || 'Sin nombre'}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{miembro.email}</div>
                                            </div>
                                            {esModoEdicion && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAsignados(asignados.filter(item => item !== idAsignado))}
                                                    style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', padding: '0 4px' }}
                                                    title="Quitar"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Barra inferior de acciones */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {puedeCompletar && (
                            <button
                                type="button"
                                onClick={toggleCompletado}
                                style={{
                                    background: (estado === 'Completada' || estado === 'completada') ? '#f1f5f9' : '#f0fdf4',
                                    color: (estado === 'Completada' || estado === 'completada') ? '#334155' : '#047857',
                                    border: `1px solid ${(estado === 'Completada' || estado === 'completada') ? '#cbd5e1' : '#bbf7d0'}`,
                                    padding: '10px 18px',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {(estado === 'Completada' || estado === 'completada') ? '↩️ Descompletar tarea' : '✅ Marcar como completada'}
                            </button>
                        )}

                        {esModoEdicion && esAdmin && (
                            <button
                                type="button"
                                onClick={handleEliminarTarea}
                                style={{
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    padding: '10px 18px',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                🗑️ Eliminar tarea
                            </button>
                        )}
                    </div>

                    {esModoEdicion && esAdmin && (
                        <button
                            type="button"
                            onClick={handleGuardar}
                            style={{
                                background: '#4f46e5',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 22px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                cursor: 'pointer'
                            }}
                        >
                            Guardar Cambios
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}