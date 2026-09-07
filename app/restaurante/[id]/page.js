'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export default function EditorRestaurante() {
  const params = useParams();
  const id = params.id;

  const [restaurante, setRestaurante] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (id) {
      carregarRestaurante();
    }
  }, [id]);

  async function carregarRestaurante() {
    setCarregando(true);
    setErro('');

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(error);
      setErro('Não foi possível carregar o restaurante.');
      setCarregando(false);
      return;
    }

    setRestaurante(data);
    setCarregando(false);
  }

  if (carregando) {
    return (
      <main style={styles.loading}>
        Carregando restaurante...
      </main>
    );
  }

  if (erro || !restaurante) {
    return (
      <main style={styles.loading}>
        <div>
          <h2>Restaurante não encontrado</h2>
          <p>{erro}</p>

          <button
            style={styles.backButton}
            onClick={() => {
              window.location.href = '/';
            }}
          >
            ← Voltar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <button
            style={styles.back}
            onClick={() => {
              window.location.href = '/';
            }}
          >
            ← Voltar
          </button>

          <p style={styles.eyebrow}>EDITOR DO CARDÁPIO</p>

          <h1 style={styles.title}>
            {restaurante.name}
          </h1>

          <p style={styles.subtitle}>
            Monte e personalize o cardápio deste restaurante.
          </p>
        </div>

        <span style={styles.badge}>
          {restaurante.status === 'active'
            ? 'Ativo'
            : restaurante.status === 'paused'
            ? 'Pausado'
            : 'Demonstração'}
        </span>
      </header>

      <section style={styles.grid}>
        <button style={styles.card}>
          <span style={styles.icon}>📂</span>
          <strong style={styles.cardTitle}>
            Categorias
          </strong>
          <small style={styles.cardText}>
            Pizzas, bebidas, porções e mais.
          </small>
        </button>

        <button style={styles.card}>
          <span style={styles.icon}>🍕</span>
          <strong style={styles.cardTitle}>
            Produtos
          </strong>
          <small style={styles.cardText}>
            Cadastre produtos, preços e fotos.
          </small>
        </button>

        <button style={styles.card}>
          <span style={styles.icon}>➕</span>
          <strong style={styles.cardTitle}>
            Adicionais
          </strong>
          <small style={styles.cardText}>
            Bordas, sabores e complementos.
          </small>
        </button>

        <button style={styles.card}>
          <span style={styles.icon}>🎨</span>
          <strong style={styles.cardTitle}>
            Aparência
          </strong>
          <small style={styles.cardText}>
            Logo, capa e cores do cardápio.
          </small>
        </button>

        <button style={styles.card}>
          <span style={styles.icon}>📱</span>
          <strong style={styles.cardTitle}>
            Informações
          </strong>
          <small style={styles.cardText}>
            WhatsApp, endereço e entrega.
          </small>
        </button>

        <button style={styles.card}>
          <span style={styles.icon}>👁️</span>
          <strong style={styles.cardTitle}>
            Visualizar cardápio
          </strong>
          <small style={styles.cardText}>
            Veja como ficará para o cliente.
          </small>
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5f6fa',
    padding: '32px 20px 60px',
    fontFamily: 'Arial, sans-serif'
  },

  header: {
    maxWidth: '1100px',
    margin: '0 auto 35px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px'
  },

  back: {
    border: 'none',
    background: 'transparent',
    padding: '0',
    marginBottom: '25px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer'
  },

  eyebrow: {
    color: '#6d5dfc',
    fontWeight: '800',
    fontSize: '12px',
    letterSpacing: '1.5px',
    margin: '0 0 8px'
  },

  title: {
    fontSize: '34px',
    margin: '0 0 8px',
    color: '#111827'
  },

  subtitle: {
    color: '#6b7280',
    margin: '0'
  },

  badge: {
    background: '#fff4c2',
    color: '#8a6500',
    padding: '10px 15px',
    borderRadius: '30px',
    fontWeight: '700',
    fontSize: '13px'
  },

  grid: {
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '18px'
  },

  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '20px',
    padding: '28px',
    textAlign: 'left',
    cursor: 'pointer',
    minHeight: '180px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    boxShadow: '0 6px 20px rgba(0,0,0,0.04)'
  },

  icon: {
    fontSize: '34px',
    marginBottom: '22px'
  },

  cardTitle: {
    fontSize: '19px',
    color: '#111827',
    marginBottom: '7px'
  },

  cardText: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5'
  },

  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center'
  },

  backButton: {
    marginTop: '20px',
    background: '#6d5dfc',
    color: '#fff',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '10px',
    fontWeight: '700'
  }
};
