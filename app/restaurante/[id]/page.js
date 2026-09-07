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
  const [categorias, setCategorias] = useState([]);
  const [tela, setTela] = useState('inicio');

  const [novaCategoria, setNovaCategoria] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (id) {
      carregarDados();
    }
  }, [id]);

  async function carregarDados() {
    setCarregando(true);
    setErro('');

    const { data: restaurantData, error: restaurantError } =
      await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single();

    if (restaurantError) {
      console.error(restaurantError);
      setErro('Não foi possível carregar o restaurante.');
      setCarregando(false);
      return;
    }

    const { data: categoryData, error: categoryError } =
      await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

    if (categoryError) {
      console.error(categoryError);
      setErro('Não foi possível carregar as categorias.');
    }

    setRestaurante(restaurantData);
    setCategorias(categoryData || []);
    setCarregando(false);
  }

  async function criarCategoria(e) {
    e.preventDefault();

    const nome = novaCategoria.trim();

    if (!nome || salvando) return;

    setSalvando(true);
    setErro('');

    const { data, error } = await supabase
      .from('categories')
      .insert({
        restaurant_id: id,
        name: nome,
        sort_order: categorias.length,
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      setErro(`Erro ao criar categoria: ${error.message}`);
      setSalvando(false);
      return;
    }

    setCategorias((atual) => [...atual, data]);
    setNovaCategoria('');
    setSalvando(false);
  }

  async function renomearCategoria(categoria) {
    const novoNome = window.prompt(
      'Novo nome da categoria:',
      categoria.name
    );

    if (!novoNome || !novoNome.trim()) return;

    const { data, error } = await supabase
      .from('categories')
      .update({
        name: novoNome.trim()
      })
      .eq('id', categoria.id)
      .eq('restaurant_id', id)
      .select()
      .single();

    if (error) {
      console.error(error);
      setErro(`Erro ao editar categoria: ${error.message}`);
      return;
    }

    setCategorias((atual) =>
      atual.map((item) =>
        item.id === categoria.id ? data : item
      )
    );
  }

  async function excluirCategoria(categoria) {
    const confirmou = window.confirm(
      `Excluir a categoria "${categoria.name}"?`
    );

    if (!confirmou) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoria.id)
      .eq('restaurant_id', id);

    if (error) {
      console.error(error);
      setErro(`Erro ao excluir categoria: ${error.message}`);
      return;
    }

    setCategorias((atual) =>
      atual.filter((item) => item.id !== categoria.id)
    );
  }

  if (carregando) {
    return (
      <main style={styles.centralizado}>
        Carregando restaurante...
      </main>
    );
  }

  if (!restaurante) {
    return (
      <main style={styles.centralizado}>
        <div>
          <h2>Restaurante não encontrado</h2>
          <p>{erro}</p>

          <button
            style={styles.primaryButton}
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

  if (tela === 'categorias') {
    return (
      <main style={styles.page}>
        <section style={styles.container}>
          <button
            style={styles.back}
            onClick={() => {
              setTela('inicio');
              setErro('');
            }}
          >
            ← Voltar ao editor
          </button>

          <div style={styles.categoryHeader}>
            <div>
              <p style={styles.eyebrow}>
                {restaurante.name.toUpperCase()}
              </p>

              <h1 style={styles.title}>
                Categorias
              </h1>

              <p style={styles.subtitle}>
                Organize os produtos do seu cardápio.
              </p>
            </div>

            <span style={styles.counter}>
              {categorias.length}{' '}
              {categorias.length === 1
                ? 'categoria'
                : 'categorias'}
            </span>
          </div>

          <form
            style={styles.categoryForm}
            onSubmit={criarCategoria}
          >
            <input
              style={styles.input}
              value={novaCategoria}
              onChange={(e) =>
                setNovaCategoria(e.target.value)
              }
              placeholder="Ex.: Pizzas"
              maxLength={60}
            />

            <button
              style={styles.addButton}
              type="submit"
              disabled={salvando}
            >
              {salvando
                ? 'Salvando...'
                : '+ Adicionar'}
            </button>
          </form>

          {erro && (
            <div style={styles.error}>
              {erro}
            </div>
          )}

          {categorias.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>📂</div>

              <h3 style={styles.emptyTitle}>
                Nenhuma categoria ainda
              </h3>

              <p style={styles.emptyText}>
                Comece criando Pizzas, Bebidas,
                Porções ou qualquer categoria
                que seu restaurante precisar.
              </p>
            </div>
          ) : (
            <div style={styles.categoryList}>
              {categorias.map((categoria, index) => (
                <div
                  style={styles.categoryItem}
                  key={categoria.id}
                >
                  <div style={styles.categoryInfo}>
                    <div style={styles.categoryIcon}>
                      📁
                    </div>

                    <div>
                      <strong
                        style={styles.categoryName}
                      >
                        {categoria.name}
                      </strong>

                      <small
                        style={styles.categorySmall}
                      >
                        Categoria {index + 1}
                      </small>
                    </div>
                  </div>

                  <div style={styles.categoryActions}>
                    <button
                      style={styles.editButton}
                      onClick={() =>
                        renomearCategoria(categoria)
                      }
                    >
                      Editar
                    </button>

                    <button
                      style={styles.deleteButton}
                      onClick={() =>
                        excluirCategoria(categoria)
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.container}>
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

            <p style={styles.eyebrow}>
              EDITOR DO CARDÁPIO
            </p>

            <h1 style={styles.title}>
              {restaurante.name}
            </h1>

            <p style={styles.subtitle}>
              Monte e personalize o cardápio
              deste restaurante.
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

        {erro && (
          <div style={styles.error}>
            {erro}
          </div>
        )}

        <section style={styles.grid}>
          <button
            style={styles.card}
            onClick={() => {
              setTela('categorias');
              setErro('');
            }}
          >
            <span style={styles.icon}>📂</span>

            <strong style={styles.cardTitle}>
              Categorias
            </strong>

            <small style={styles.cardText}>
              {categorias.length === 0
                ? 'Pizzas, bebidas, porções e mais.'
                : `${categorias.length} ${
                    categorias.length === 1
                      ? 'categoria cadastrada'
                      : 'categorias cadastradas'
                  }`}
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
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5f6fa',
    padding: '32px 20px 60px',
    fontFamily: 'Arial, sans-serif',
    color: '#111827'
  },

  container: {
    maxWidth: '1100px',
    margin: '0 auto'
  },

  centralizado: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center'
  },

  header: {
    marginBottom: '35px',
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
    cursor: 'pointer',
    color: '#111827'
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
    margin: '0 0 8px'
  },

  subtitle: {
    color: '#6b7280',
    margin: '0',
    lineHeight: '1.5'
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
    marginBottom: '7px'
  },

  cardText: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5'
  },

  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '20px',
    marginBottom: '28px'
  },

  counter: {
    background: '#ede9fe',
    color: '#6d5dfc',
    padding: '9px 14px',
    borderRadius: '30px',
    fontWeight: '700',
    fontSize: '13px'
  },

  categoryForm: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '16px',
    display: 'flex',
    gap: '10px',
    marginBottom: '22px'
  },

  input: {
    flex: 1,
    minWidth: 0,
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '16px',
    outline: 'none'
  },

  addButton: {
    border: 'none',
    background: '#6d5dfc',
    color: '#ffffff',
    borderRadius: '12px',
    padding: '13px 18px',
    fontWeight: '700',
    cursor: 'pointer'
  },

  categoryList: {
    display: 'grid',
    gap: '12px'
  },

  categoryItem: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px'
  },

  categoryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '13px'
  },

  categoryIcon: {
    width: '45px',
    height: '45px',
    borderRadius: '12px',
    background: '#f5f3ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px'
  },

  categoryName: {
    display: 'block',
    fontSize: '16px',
    marginBottom: '4px'
  },

  categorySmall: {
    color: '#9ca3af'
  },

  categoryActions: {
    display: 'flex',
    gap: '8px'
  },

  editButton: {
    border: '1px solid #ddd6fe',
    background: '#f5f3ff',
    color: '#6d5dfc',
    borderRadius: '9px',
    padding: '9px 12px',
    fontWeight: '700',
    cursor: 'pointer'
  },

  deleteButton: {
    border: '1px solid #fecaca',
    background: '#fff1f2',
    color: '#dc2626',
    borderRadius: '9px',
    padding: '9px 12px',
    fontWeight: '700',
    cursor: 'pointer'
  },

  empty: {
    background: '#ffffff',
    border: '1px dashed #d1d5db',
    borderRadius: '20px',
    padding: '55px 25px',
    textAlign: 'center'
  },

  emptyIcon: {
    fontSize: '42px',
    marginBottom: '15px'
  },

  emptyTitle: {
    margin: '0 0 8px',
    fontSize: '19px'
  },

  emptyText: {
    color: '#6b7280',
    maxWidth: '430px',
    margin: '0 auto',
    lineHeight: '1.6'
  },

  error: {
    background: '#fff1f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '13px 15px',
    marginBottom: '18px'
  },

  primaryButton: {
    marginTop: '20px',
    background: '#6d5dfc',
    color: '#ffffff',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '10px',
    fontWeight: '700'
  }
};
