'use client';

import { useState } from 'react';

export default function Home() {
  const [restaurantes] = useState([
    {
      id: 1,
      nome: 'Bella Pizzaria',
      status: 'Demonstração',
      pedidos: 0,
      acessos: 0
    }
  ]);

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

          <button className="newRestaurant">
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
            <strong>1</strong>
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

          <input placeholder="Buscar restaurante..." />
        </div>

        <div className="restaurantGrid">
          {restaurantes.map((restaurante) => (
            <article className="restaurantCard" key={restaurante.id}>
              <div className="restaurantCover">
                <span className="badge">{restaurante.status}</span>
                <div className="restaurantIcon">🍕</div>
              </div>

              <div className="restaurantBody">
                <h3>{restaurante.nome}</h3>
                <p>Cardápio digital • WhatsApp</p>

                <div className="miniStats">
                  <span>
                    <strong>{restaurante.acessos}</strong>
                    acessos
                  </span>

                  <span>
                    <strong>{restaurante.pedidos}</strong>
                    pedidos
                  </span>
                </div>

                <div className="actions">
                  <button className="edit">Editar</button>
                  <button>Visualizar</button>
                  <button>⋮</button>
                </div>
              </div>
            </article>
          ))}

          <button className="createCard">
            <span>+</span>
            <strong>Criar restaurante</strong>
            <small>Monte uma nova demonstração</small>
          </button>
        </div>
      </section>
    </main>
  );
}
