import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'

// Importamos tus componentes reales y funcionales
import Home from './components/Home'
import ProyectosList from './components/ProyectosList'
import ProyectoDetalle from './components/ProyectoDetalle'
import TareaDetalle from './components/TareaDetalle'
import Perfil from './components/Perfil'
import Login from './components/Login'

export default function App() {
  const [session, setSession] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoadingSession(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoadingSession(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loadingSession) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
        Cargando TaskFlow...
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/home" replace />}
        />
        <Route
          path="/*"
          element={session ? <MainLayout session={session} /> : <Navigate to="/home" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

function MainLayout({ session }) {
  const location = useLocation()
  const [miPerfil, setMiPerfil] = useState(null)

  useEffect(() => {
    fetchPerfil()
  }, [location])

  const fetchPerfil = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      if (data) setMiPerfil(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const isHome = location.pathname.includes('/home') || location.pathname === '/'
  const isGrupos = location.pathname.includes('/grupos') || location.pathname.includes('/proyecto')
  const isPerfil = location.pathname.includes('/perfil')

  let title = 'Inicio'
  if (isGrupos) title = 'Gestión de Proyectos'
  if (location.pathname.includes('/proyecto/')) title = 'Detalle de Proyecto'
  if (isPerfil) title = 'Mi Perfil'

  const inicialUsuario = miPerfil?.nombre ? miPerfil.nombre.charAt(0).toUpperCase() : 'U'

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'sans-serif', background: '#f8fafc', overflow: 'hidden' }}>

      {/* BARRA LATERAL FIJA */}
      <aside style={{ width: '240px', background: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px 12px', flexShrink: 0 }}>
        <div>
          <div style={{ padding: '0 12px 24px 12px', fontSize: '1.25rem', fontWeight: 'bold', color: '#4f46e5', letterSpacing: '-0.5px' }}>
            Task<span style={{ color: '#0f172a' }}>Flow</span>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none', color: isHome ? '#1e293b' : '#64748b', background: isHome ? '#f1f5f9' : 'transparent', fontWeight: isHome ? 600 : 500, fontSize: '0.9rem' }}>
              🏠 Inicio
            </Link>
            <Link to="/grupos" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none', color: isGrupos ? '#1e293b' : '#64748b', background: isGrupos ? '#f1f5f9' : 'transparent', fontWeight: isGrupos ? 600 : 500, fontSize: '0.9rem' }}>
              📁 Proyectos
            </Link>
            <Link to="/perfil" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', textDecoration: 'none', color: isPerfil ? '#1e293b' : '#64748b', background: isPerfil ? '#f1f5f9' : 'transparent', fontWeight: isPerfil ? 600 : 500, fontSize: '0.9rem' }}>
              ⚙️ Mi Perfil
            </Link>
          </nav>
        </div>

        <div style={{ padding: '0 12px' }}>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', padding: '8px 0', width: '100%', textAlign: 'left' }}>
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* CONTENEDOR DERECHO */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* CABECERA SUPERIOR */}
        <header style={{ height: '70px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px', flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>Panel de trabajo</span>
            <h1 style={{ margin: '0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 'bold' }}>
              {isHome ? `Buenos días, ${miPerfil?.nombre || 'Usuario'}` : title}
            </h1>
          </div>

          <Link to="/perfil" title={miPerfil ? `${miPerfil.nombre}` : ''} style={{ textDecoration: 'none' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '0.9rem', border: '2px solid #e2e8f0' }}>
              {miPerfil?.avatar_url ? (
                <img src={miPerfil.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                inicialUsuario
              )}
            </div>
          </Link>
        </header>

        {/* CONTENIDO DE LAS RUTAS */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <Routes>
            <Route path="/home" element={<Home session={session} />} />
            <Route path="/grupos" element={<ProyectosList session={session} />} />
            <Route path="/proyecto/:id" element={<ProyectoDetalle session={session} />} />
            <Route path="/proyecto/:id/tarea/:tareaId" element={<TareaDetalle session={session} />} />
            <Route path="/perfil" element={<Perfil session={session} />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>
      </div>

    </div>
  )
}