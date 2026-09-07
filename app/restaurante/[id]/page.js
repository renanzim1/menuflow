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
  const [produtos, setProdutos] = useState([]);
  const [tela, setTela] = useState('inicio');

  const [novaCategoria, setNovaCategoria] = useState('');

  const [nomeProduto, setNomeProduto] = useState('');
  const [descricaoProduto, setDescricaoProduto] = useState('');
  const [precoProduto, setPrecoProduto] = useState('');
  const [categoriaProduto, setCategoriaProduto] = useState('');
  const [fotoProduto, setFotoProduto] = useState(null);
  const [destaqueProduto, setDestaqueProduto] = useState(false);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (id) carregarDados();
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
    }

    const { data: productData, error: productError } =
      await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

    if (productError) {
      console.error(productError);
    }

    setRestaurante(restaurantData);
    setCategorias(categoryData || []);
    setProdutos(productData || []);
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
      setErro(`Erro: ${error.message}`);
      setSalvando(false);
      return;
    }

    setCategorias((atual) => [...atual, data]);
    setNovaCategoria('');
    setSalvando(false);
  }

  async function renomearCategoria(categoria) {
    const nome = window.prompt(
      'Novo nome da categoria:',
      categoria.name
    );

    if (!nome || !nome.trim()) return;

    const { data, error } = await supabase
      .from('categories')
      .update({ name: nome.trim() })
      .eq('id', categoria.id)
      .eq('restaurant_id', id)
      .select()
      .single();

    if (error) {
      setErro(`Erro: ${error.message}`);
      return;
    }

    setCategorias((atual) =>
      atual.map((item) =>
        item.id === categoria.id ? data : item
      )
    );
  }

  async function excluirCategoria(categoria) {
    if (
      !window.confirm(
        `Excluir a categoria "${categoria.name}"?`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoria.id)
      .eq('restaurant_id', id);

    if (error) {
      setErro(`Erro: ${error.message}`);
      return;
    }

    setCategorias((atual) =>
      atual.filter((item) => item.id !== categoria.id)
    );
  }

  async function uploadFoto(file) {
    if (!file) return null;

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('A imagem deve ter no máximo 5 MB.');
    }

    const extensao =
      file.name.split('.').pop()?.toLowerCase() || 'jpg';

    const nomeArquivo =
      `${id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extensao}`;

    const { error } = await supabase.storage
      .from('product-images')
      .upload(nomeArquivo, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(nomeArquivo);

    return data.publicUrl;
  }

  async function criarProduto(e) {
    e.preventDefault();

    if (!nomeProduto.trim() || !precoProduto || salvando) {
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      let imageUrl = null;

      if (fotoProduto) {
        imageUrl = await uploadFoto(fotoProduto);
      }

      const preco = Number(
        precoProduto.replace(',', '.')
      );

      if (Number.isNaN(preco) || preco < 0) {
        throw new Error('Digite um preço válido.');
      }

      const { data, error } = await supabase
        .from('products')
        .insert({
          restaurant_id: id,
          category_id: categoriaProduto || null,
          name: nomeProduto.trim(),
          description:
            descricaoProduto.trim() || null,
          price: preco,
          image_url: imageUrl,
          active: true,
          featured: destaqueProduto,
          sort_order: produtos.length
        })
        .select()
        .single();

      if (error) throw error;

      setProdutos((atual) => [...atual, data]);

      setNomeProduto('');
      setDescricaoProduto('');
      setPrecoProduto('');
      setCategoriaProduto('');
      setFotoProduto(null);
      setDestaqueProduto(false);

      const input = document.getElementById('fotoProduto');
      if (input) input.value = '';
    } catch (error) {
      console.error(error);
      setErro(`Erro: ${error.message}`);
    }

    setSalvando(false);
  }

  async function alternarProduto(produto) {
    const { data, error } = await supabase
      .from('products')
      .update({ active: !produto.active })
      .eq('id', produto.id)
      .eq('restaurant_id', id)
      .select()
      .single();

    if (error) {
      setErro(`Erro: ${error.message}`);
      return;
    }

    setProdutos((atual) =>
      atual.map((item) =>
        item.id === produto.id ? data : item
      )
    );
  }

  async function excluirProduto(produto) {
    if (
      !window.confirm(
        `Excluir o produto "${produto.name}"?`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', produto.id)
      .eq('restaurant_id', id);

    if (error) {
      setErro(`Erro: ${error.message}`);
      return;
    }

    setProdutos((atual) =>
      atual.filter((item) => item.id !== produto.id)
    );
  }

  function dinheiro(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function voltarEditor() {
    setTela('inicio');
    setErro('');
  }

  if (carregando) {
    return (
      <main style={styles.center}>
        Carregando restaurante...
      </main>
    );
  }

  if (!restaurante) {
    return (
      <main style={styles.center}>
        Restaurante não encontrado.
      </main>
    );
  }

  if (tela === 'categorias') {
    return (
      <main style={styles.page}>
        <section style={styles.container}>
          <button style={styles.back} onClick={voltarEditor}>
            ← Voltar ao editor
          </button>

          <p style={styles.eyebrow}>
            {restaurante.name.toUpperCase()}
          </p>

          <h1 style={styles.title}>Categorias</h1>

          <p style={styles.subtitle}>
            Organize os produtos do seu cardápio.
          </p>

          <form
            style={styles.formBox}
            onSubmit={criarCategoria}
          >
            <input
              style={styles.input}
              value={novaCategoria}
              onChange={(e) =>
                setNovaCategoria(e.target.value)
              }
              placeholder="Ex.: Pizzas"
            />

            <button style={styles.primary} type="submit">
              + Adicionar
            </button>
          </form>

          {erro && <div style={styles.error}>{erro}</div>}

          <div style={styles.list}>
            {categorias.map((categoria) => (
              <div
                key={categoria.id}
                style={styles.listItem}
              >
                <div>
                  <strong>{categoria.name}</strong>
                </div>

                <div style={styles.actions}>
                  <button
                    style={styles.secondary}
                    onClick={() =>
                      renomearCategoria(categoria)
                    }
                  >
                    Editar
                  </button>

                  <button
                    style={styles.danger}
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
        </section>
      </main>
    );
  }

  if (tela === 'produtos') {
    return (
      <main style={styles.page}>
        <section style={styles.container}>
          <button style={styles.back} onClick={voltarEditor}>
            ← Voltar ao editor
          </button>

          <p style={styles.eyebrow}>
            {restaurante.name.toUpperCase()}
          </p>

          <h1 style={styles.title}>Produtos</h1>

          <p style={styles.subtitle}>
            Cadastre os itens do cardápio.
          </p>

          <form
            style={styles.productForm}
            onSubmit={criarProduto}
          >
            <h2 style={styles.formTitle}>
              Novo produto
            </h2>

            <label style={styles.label}>
              Nome *
              <input
                style={styles.input}
                value={nomeProduto}
                onChange={(e) =>
                  setNomeProduto(e.target.value)
                }
                placeholder="Ex.: Pizza de Frango"
                required
              />
            </label>

            <label style={styles.label}>
              Categoria
              <select
                style={styles.input}
                value={categoriaProduto}
                onChange={(e) =>
                  setCategoriaProduto(e.target.value)
                }
              >
                <option value="">
                  Sem categoria
                </option>

                {categorias.map((categoria) => (
                  <option
                    key={categoria.id}
                    value={categoria.id}
                  >
                    {categoria.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.label}>
              Descrição
              <textarea
                style={styles.textarea}
                value={descricaoProduto}
                onChange={(e) =>
                  setDescricaoProduto(e.target.value)
                }
                placeholder="Ingredientes e detalhes..."
              />
            </label>

            <label style={styles.label}>
              Preço *
              <input
                style={styles.input}
                value={precoProduto}
                onChange={(e) =>
                  setPrecoProduto(e.target.value)
                }
                placeholder="Ex.: 39,90"
                inputMode="decimal"
                required
              />
            </label>

            <label style={styles.label}>
              Foto
              <input
                id="fotoProduto"
                style={styles.input}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  setFotoProduto(
                    e.target.files?.[0] || null
                  )
                }
              />
              <small style={styles.hint}>
                JPG, PNG ou WebP. Máximo 5 MB.
              </small>
            </label>

            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={destaqueProduto}
                onChange={(e) =>
                  setDestaqueProduto(e.target.checked)
                }
              />
              Marcar como destaque
            </label>

            <button
              style={styles.primary}
              type="submit"
              disabled={salvando}
            >
              {salvando
                ? 'Salvando...'
                : '+ Cadastrar produto'}
            </button>
          </form>

          {erro && <div style={styles.error}>{erro}</div>}

          <h2 style={styles.sectionTitle}>
            Produtos cadastrados ({produtos.length})
          </h2>

          <div style={styles.productGrid}>
            {produtos.map((produto) => (
              <article
                key={produto.id}
                style={styles.productCard}
              >
                {produto.image_url ? (
                  <img
                    src={produto.image_url}
                    alt={produto.name}
                    style={styles.productImage}
                  />
                ) : (
                  <div style={styles.noImage}>🍕</div>
                )}

                <div style={styles.productBody}>
                  <div style={styles.productTop}>
                    <strong style={styles.productName}>
                      {produto.name}
                    </strong>

                    {!produto.active && (
                      <span style={styles.inactive}>
                        Inativo
                      </span>
                    )}
                  </div>

                  {produto.description && (
                    <p style={styles.description}>
                      {produto.description}
                    </p>
                  )}

                  <strong style={styles.price}>
                    {dinheiro(produto.price)}
                  </strong>

                  <div style={styles.actions}>
                    <button
                      style={styles.secondary}
                      onClick={() =>
                        alternarProduto(produto)
                      }
                    >
                      {produto.active
                        ? 'Desativar'
                        : 'Ativar'}
                    </button>

                    <button
                      style={styles.danger}
                      onClick={() =>
                        excluirProduto(produto)
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
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
            Demonstração
          </span>
        </header>

        <section style={styles.grid}>
          <button
            style={styles.card}
            onClick={() => setTela('categorias')}
          >
            <span style={styles.icon}>📂</span>
            <strong style={styles.cardTitle}>
              Categorias
            </strong>
            <small style={styles.cardText}>
              {categorias.length} cadastradas
            </small>
          </button>

          <button
            style={styles.card}
            onClick={() => setTela('produtos')}
          >
            <span style={styles.icon}>🍕</span>
            <strong style={styles.cardTitle}>
              Produtos
            </strong>
            <small style={styles.cardText}>
              {produtos.length} cadastrados
            </small>
          </button>

          <EditorCard
            icon="➕"
            title="Adicionais"
            text="Bordas, sabores e complementos."
          />

          <EditorCard
            icon="🎨"
            title="Aparência"
            text="Logo, capa e cores do cardápio."
          />

          <EditorCard
            icon="📱"
            title="Informações"
            text="WhatsApp, endereço e entrega."
          />

          <EditorCard
            icon="👁️"
            title="Visualizar cardápio"
            text="Veja como ficará para o cliente."
          />
        </section>
      </section>
    </main>
  );
}

function EditorCard({ icon, title, text }) {
  return (
    <button style={styles.card}>
      <span style={styles.icon}>{icon}</span>
      <strong style={styles.cardTitle}>{title}</strong>
      <small style={styles.cardText}>{text}</small>
    </button>
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

  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Arial, sans-serif'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    marginBottom: '35px'
  },

  back: {
    border: 0,
    background: 'transparent',
    fontWeight: '700',
    marginBottom: '25px',
    cursor: 'pointer',
    padding: 0
  },

  eyebrow: {
    color: '#6d5dfc',
    fontWeight: '800',
    fontSize: '12px',
    letterSpacing: '1.5px'
  },

  title: {
    fontSize: '34px',
    margin: '8px 0'
  },

  subtitle: {
    color: '#6b7280',
    lineHeight: '1.5'
  },

  badge: {
    background: '#fff4c2',
    color: '#8a6500',
    padding: '10px 15px',
    height: 'fit-content',
    borderRadius: '30px',
    fontWeight: '700'
  },

  grid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '18px'
  },

  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '20px',
    padding: '28px',
    minHeight: '180px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    cursor: 'pointer'
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
    color: '#6b7280'
  },

  formBox: {
    background: '#fff',
    padding: '18px',
    borderRadius: '18px',
    display: 'flex',
    gap: '10px',
    margin: '25px 0'
  },

  productForm: {
    background: '#fff',
    padding: '24px',
    borderRadius: '20px',
    display: 'grid',
    gap: '17px',
    margin: '25px 0'
  },

  formTitle: {
    margin: 0
  },

  label: {
    display: 'grid',
    gap: '7px',
    fontWeight: '700'
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '11px',
    fontSize: '16px',
    background: '#fff'
  },

  textarea: {
    width: '100%',
    minHeight: '90px',
    boxSizing: 'border-box',
    padding: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '11px',
    fontSize: '16px',
    resize: 'vertical'
  },

  checkLabel: {
    display: 'flex',
    gap: '9px',
    alignItems: 'center',
    fontWeight: '700'
  },

  hint: {
    color: '#6b7280',
    fontWeight: '400'
  },

  primary: {
    border: 0,
    background: '#6d5dfc',
    color: '#fff',
    borderRadius: '11px',
    padding: '14px 18px',
    fontWeight: '800',
    cursor: 'pointer'
  },

  secondary: {
    border: '1px solid #ddd6fe',
    background: '#f5f3ff',
    color: '#6d5dfc',
    borderRadius: '9px',
    padding: '9px 12px',
    fontWeight: '700'
  },

  danger: {
    border: '1px solid #fecaca',
    background: '#fff1f2',
    color: '#dc2626',
    borderRadius: '9px',
    padding: '9px 12px',
    fontWeight: '700'
  },

  error: {
    background: '#fff1f2',
    color: '#b91c1c',
    padding: '13px',
    borderRadius: '11px',
    margin: '15px 0'
  },

  list: {
    display: 'grid',
    gap: '12px'
  },

  listItem: {
    background: '#fff',
    padding: '18px',
    borderRadius: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px'
  },

  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '15px',
    flexWrap: 'wrap'
  },

  sectionTitle: {
    margin: '35px 0 18px'
  },

  productGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '18px'
  },

  productCard: {
    background: '#fff',
    borderRadius: '18px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb'
  },

  productImage: {
    width: '100%',
    height: '190px',
    objectFit: 'cover',
    display: 'block'
  },

  noImage: {
    height: '190px',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '55px'
  },

  productBody: {
    padding: '18px'
  },

  productTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px'
  },

  productName: {
    fontSize: '18px'
  },

  description: {
    color: '#6b7280',
    lineHeight: '1.5'
  },

  price: {
    display: 'block',
    fontSize: '20px',
    marginTop: '12px'
  },

  inactive: {
    background: '#f3f4f6',
    padding: '5px 8px',
    borderRadius: '8px',
    color: '#6b7280',
    fontSize: '11px'
  }
};
