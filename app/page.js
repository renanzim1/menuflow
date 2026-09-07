'use client';

import { useMemo, useState } from 'react';

export default function Home() {
  const [restaurantes, setRestaurantes] = useState([
    {
      id: 1,
      nome: 'Bella Pizzaria',
      whatsapp: '',
      status: 'Demonstração',
      pedidos: 0,
      acessos: 0
    }
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    return restaurantes.filter((r) =>
      r.nome.toLowerCase().includes(busca.toLowerCase())
    );
  }, [restaurantes, busca]);

  function abrirNovo() {
    setNome('');
    setWhatsapp('');
    setModalOpen(true);
  }

  function criarRestaurante(e) {
    e.preventDefault();

    if (!nome.trim()) return;

    const novo = {
      id: Date.now(),
      nome: nome.trim(),
      whatsapp: whatsapp.trim(),
      status: 'Demonstração',
      pedidos: 0,
      acessos: 0
    };

    setRestaurantes((atual) => [...atual, novo]);
    setModalOpen(false);
  }

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
            <strong>0</strong>
          </div>

          <div className="stat">
            <span>Demonstrações</span>
            <strong>{restaurantes.length}</strong>
          </div>

          <div className="stat">
            <span>Pedidos</span>
            <strong>
              {restaurantes.reduce(
                (total, restaurante) =>
                  total + restaurante.pedidos,
                0
              )}
            </strong>
          </div>

        </div>

        <div className="sectionTitle">

          <div>
            <h2>Restaurantes</h2>
            <p>
              Gerencie todos os cardápios em um só lugar.
            </p>
          </div>

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar restaurante..."
          />

        </div>

        <div className="restaurantGrid">

          {filtrados.map((restaurante) => (

            <article
              className="restaurantCard"
              key={restaurante.id}
            >

              <div className="restaurantCover">

                <span className="badge">
                  {restaurante.status}
                </span>

                <div className="restaurantIcon">
                  🍕
                </div>

              </div>

              <div className="restaurantBody">

                <h3>{restaurante.nome}</h3>

                <p>
                  Cardápio digital • WhatsApp
                </p>

                <div className="miniStats">

                  <span>
                    <strong>
                      {restaurante.acessos}
                    </strong>
                    acessos
                  </span>

                  <span>
                    <strong>
                      {restaurante.pedidos}
                    </strong>
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
                onClick={() =>
                  setModalOpen(false)
                }
              >
                ×
              </button>

            </div>

            <label>
              Nome do restaurante

              <input
                autoFocus
                value={nome}
                onChange={(e) =>
                  setNome(e.target.value)
                }
                placeholder="Ex.: Pizzaria do João"
                required
              />
            </label>

            <label>
              WhatsApp

              <input
                value={whatsapp}
                onChange={(e) =>
                  setWhatsapp(e.target.value)
                }
                placeholder="(67) 99999-9999"
                inputMode="tel"
              />
            </label>

            <p className="formHint">
              Depois vamos adicionar categorias,
              produtos, preços e fotos.
            </p>

            <div className="modalActions">

              <button
                type="button"
                onClick={() =>
                  setModalOpen(false)
                }
              >
                Cancelar
              </button>

              <button
                className="saveRestaurant"
                type="submit"
              >
                Criar restaurante
              </button>

            </div>

          </form>

        </div>

      )}

    </main>
  );
}
