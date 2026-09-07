'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export default function Home() {
  const [restaurantes, setRestaurantes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarRestaurantes();
  }, []);

  async function carregarRestaurantes() {
    setCarregando(true);
    setErro('');

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      setErro('Não foi possível carregar os restaurantes.');
      setCarregando(false);
      return;
    }

    setRestaurantes(data || []);
    setCarregando(false);
  }

  const filtrados = useMemo(() => {
    return restaurantes.filter((r) =>
      r.name.toLowerCase().includes(busca.toLowerCase())
    );
  }, [restaurantes, busca]);

  function abrirNovo() {
    setNome('');
    setWhatsapp('');
    setErro('');
    setModalOpen(true);
  }

  function criarSlug(texto) {
    const base = texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return `${base}-${Date.now().toString().slice(-6)}`;
  }

  async function criarRestaurante(e) {
    e.preventDefault();

    if (!nome.trim() || salvando) return;

    setSalvando(true);
    setErro('');

    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        name: nome.trim(),
        slug: criarSlug(nome),
        whatsapp: whatsapp.trim() || null,
        status: 'demo'
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      setErro('Não foi possível criar o restaurante.');
      setSalvando(false);
      return;
    }

    setRestaurantes((atual) => [...atual, data]);
    setModalOpen(false);
    setNome('');
    setWhatsapp('');
    setSalvando(false);
  }

  const ativos = restaurantes.filter(
    (restaurante) => restaurante.status === 'active'
  ).length;

  const demonstracoes = restaurantes.filter(
    (restaurante) => restaurante.status === 'demo'
  ).length;

  return (
    <main className="dashboard">

      <aside className="sidebar">
        <div className="logo">
          Menu<span>Flow</span>
        </div>

        <nav>
          <button className="active">🏠 Visão geral</button>
          <button>🍽️ Restaurantes</button>
          <button>⚡ Demonstrações</button>
          <button>🛒 Pedidos</button>
          <button>📊 Analytics</button>
          <button>💳 Planos</button>
          <button>⚙️ Configurações</button>
        </nav>
      </aside>

      <section className="content">

        <header>
          <div>
            <p className="eyebrow">PAINEL ADMINISTRATIVO</p>

            <h1>Seus restaurantes</h1>

            <p className="subtitle">
              Crie, personalize e publique cardápios em minutos.
            </p>
          </div>

          <button
            className="newRestaurant"
            onClick={abrirNovo}
          >
            + Novo restaurante
          </button>
        </header>

        <div className="stats">

          <div className="stat">
            <span>Restaurantes</span>
            <strong>{restaurantes.length}</strong>
          </div>

          <div className="stat">
            <span>Ativos</span>
            <strong>{ativos}</strong>
          </div>

          <div className="stat">
            <span>Demonstrações</span>
            <strong>{demonstracoes}</strong>
          </div>

          <div className="stat">
            <span>Pedidos</span>
            <strong>0</strong>
          </div>

        </div>

        <div className="sectionTitle">

          <div>
            <h2>Restaurantes</h2>
            <p>Gerencie todos os cardápios em um só lugar.</p>
          </div>

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar restaurante..."
          />

        </div>

        {erro && (
          <p style={{ color: '#dc2626', marginBottom: 20 }}>
            {erro}
          </p>
        )}

        {carregando ? (
          <p>Carregando restaurantes...</p>
        ) : (
          <div className="restaurantGrid">

            {filtrados.map((restaurante) => (

              <article
                className="restaurantCard"
                key={restaurante.id}
              >

                <div className="restaurantCover">

                  <span className="badge">
                    {restaurante.status === 'active'
                      ? 'Ativo'
                      : restaurante.status === 'paused'
                      ? 'Pausado'
                      : 'Demonstração'}
                  </span>

                  <div className="restaurantIcon">
                    🍕
                  </div>

                </div>

                <div className="restaurantBody">

                  <h3>{restaurante.name}</h3>

                  <p>Cardápio digital • WhatsApp</p>

                  <div className="miniStats">

                    <span>
                      <strong>0</strong>
                      acessos
                    </span>

                    <span>
                      <strong>0</strong>
                      pedidos
                    </span>

                  </div>

                  <div className="actions">
                    <button className="edit">
                      Editar
                    </button>

                    <button>
                      Visualizar
                    </button>

                    <button>
                      ⋮
                    </button>
                  </div>

                </div>

              </article>

            ))}

            <button
              className="createCard"
              onClick={abrirNovo}
            >
              <span>+</span>

              <strong>
                Criar restaurante
              </strong>

              <small>
                Monte uma nova demonstração
              </small>
            </button>

          </div>
        )}

      </section>

      {modalOpen && (

        <div
          className="modalBackdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModalOpen(false);
            }
          }}
        >

          <form
            className="modal"
            onSubmit={criarRestaurante}
          >

            <div className="modalHeader">

              <div>
                <p className="eyebrow">
                  NOVO CARDÁPIO
                </p>

                <h2>
                  Criar restaurante
                </h2>
              </div>

              <button
                type="button"
                className="closeModal"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>

            </div>

            <label>
              Nome do restaurante

              <input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Pizzaria do João"
                required
              />
            </label>

            <label>
              WhatsApp

              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(67) 99999-9999"
                inputMode="tel"
              />
            </label>

            {erro && (
              <p style={{ color: '#dc2626', marginTop: 15 }}>
                {erro}
              </p>
            )}

            <p className="formHint">
              Depois vamos adicionar categorias,
              produtos, preços e fotos.
            </p>

            <div className="modalActions">

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                className="saveRestaurant"
                type="submit"
                disabled={salvando}
              >
                {salvando
                  ? 'Criando...'
                  : 'Criar restaurante'}
              </button>

            </div>

          </form>

        </div>

      )}

    </main>
  );
}
