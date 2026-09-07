'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export default function CardapioPublico() {
  const params = useParams();
  const slug = params.slug;

  const [restaurante, setRestaurante] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (slug) carregarCardapio();
  }, [slug]);

  async function carregarCardapio() {
    setCarregando(true);
    setErro('');

    try {
      const {
        data: restaurantData,
        error: restaurantError
      } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .in('status', ['demo', 'active'])
        .maybeSingle();

      if (restaurantError) {
        throw restaurantError;
      }

      if (!restaurantData) {
        setRestaurante(null);
        setCarregando(false);
        return;
      }

      const {
        data: categoryData,
        error: categoryError
      } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (categoryError) {
        throw categoryError;
      }

      const {
        data: productData,
        error: productError
      } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (productError) {
        throw productError;
      }

      setRestaurante(restaurantData);
      setCategorias(categoryData || []);
      setProdutos(productData || []);
    } catch (error) {
      console.error(error);

      setErro(
        error?.message ||
          'Não foi possível carregar o cardápio.'
      );
    }

    setCarregando(false);
  }

  const produtosSemCategoria = useMemo(() => {
    return produtos.filter(
      (produto) => !produto.category_id
    );
  }, [produtos]);

  function dinheiro(valor) {
    return Number(valor || 0).toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    );
  }

  if (carregando) {
    return (
      <main style={styles.loading}>
        <div>
          <div style={styles.loadingIcon}>🍽️</div>
          <strong>Carregando cardápio...</strong>
        </div>
      </main>
    );
  }

  if (!restaurante) {
    return (
      <main style={styles.loading}>
        <div style={styles.notFound}>
          <div style={styles.loadingIcon}>🍽️</div>

          <h1>Cardápio não encontrado</h1>

          <p>
            Este restaurante não está disponível.
          </p>

          {erro && (
            <small style={styles.errorText}>
              {erro}
            </small>
          )}
        </div>
      </main>
    );
  }

  const primaria =
    restaurante.primary_color || '#6d5dfc';

  const secundaria =
    restaurante.secondary_color || '#111827';

  return (
    <main
      style={{
        ...styles.page,
        '--cor-principal': primaria
      }}
    >
      <section style={styles.menu}>
        <header
          style={{
            ...styles.hero,
            background: secundaria
          }}
        >
          {restaurante.cover_url ? (
            <div style={styles.coverBox}>
              <img
                src={restaurante.cover_url}
                alt={`Capa de ${restaurante.name}`}
                style={styles.cover}
              />

              <div style={styles.coverShade} />
            </div>
          ) : (
            <div
              style={{
                ...styles.noCover,
                background: secundaria
              }}
            />
          )}

          <div style={styles.restaurantInfo}>
            {restaurante.logo_url ? (
              <img
                src={restaurante.logo_url}
                alt={`Logo de ${restaurante.name}`}
                style={styles.logo}
              />
            ) : (
              <div
                style={{
                  ...styles.logoFallback,
                  background: primaria
                }}
              >
                🍽️
              </div>
            )}

            <div style={styles.restaurantText}>
              <h1 style={styles.restaurantName}>
                {restaurante.name}
              </h1>

              <div style={styles.statusLine}>
                <span style={styles.openDot} />

                <span>Cardápio online</span>
              </div>
            </div>
          </div>
        </header>

        <section style={styles.details}>
          {restaurante.address && (
            <div style={styles.detailItem}>
              <span>📍</span>

              <span>{restaurante.address}</span>
            </div>
          )}

          <div style={styles.detailItem}>
            <span>🛵</span>

            <span>
              {Number(restaurante.delivery_fee || 0) ===
              0
                ? 'Entrega grátis'
                : `Entrega ${dinheiro(
                    restaurante.delivery_fee
                  )}`}
            </span>
          </div>

          {Number(restaurante.minimum_order || 0) >
            0 && (
            <div style={styles.detailItem}>
              <span>🛒</span>

              <span>
                Pedido mínimo{' '}
                {dinheiro(
                  restaurante.minimum_order
                )}
              </span>
            </div>
          )}
        </section>

        {produtos.length === 0 ? (
          <section style={styles.empty}>
            <div style={styles.emptyIcon}>🍕</div>

            <h2>Cardápio sendo preparado</h2>

            <p>
              Os produtos aparecerão aqui em
              breve.
            </p>
          </section>
        ) : (
          <section style={styles.content}>
            {categorias.map((categoria) => {
              const itens = produtos.filter(
                (produto) =>
                  produto.category_id ===
                  categoria.id
              );

              if (itens.length === 0) {
                return null;
              }

              return (
                <Categoria
                  key={categoria.id}
                  categoria={categoria}
                  produtos={itens}
                  primaria={primaria}
                  dinheiro={dinheiro}
                />
              );
            })}

            {produtosSemCategoria.length > 0 && (
              <Categoria
                categoria={{
                  id: 'outros',
                  name: 'Outros'
                }}
                produtos={produtosSemCategoria}
                primaria={primaria}
                dinheiro={dinheiro}
              />
            )}
          </section>
        )}

        <footer style={styles.footer}>
          <span>Cardápio digital</span>

          <strong>MenuFlow</strong>
        </footer>
      </section>
    </main>
  );
}

function Categoria({
  categoria,
  produtos,
  primaria,
  dinheiro
}) {
  return (
    <section style={styles.category}>
      <h2 style={styles.categoryTitle}>
        {categoria.name}
      </h2>

      <div style={styles.products}>
        {produtos.map((produto) => (
          <article
            key={produto.id}
            style={styles.product}
          >
            <div style={styles.productInfo}>
              {produto.featured && (
                <span
                  style={{
                    ...styles.featured,
                    color: primaria,
                    background: `${primaria}15`
                  }}
                >
                  ⭐ Destaque
                </span>
              )}

              <h3 style={styles.productName}>
                {produto.name}
              </h3>

              {produto.description && (
                <p style={styles.description}>
                  {produto.description}
                </p>
              )}

              <strong
                style={{
                  ...styles.price,
                  color: primaria
                }}
              >
                {dinheiro(produto.price)}
              </strong>

              <button
                type="button"
                style={{
                  ...styles.addButton,
                  background: primaria
                }}
                onClick={() =>
                  alert(
                    `Próxima etapa: adicionar "${produto.name}" ao pedido.`
                  )
                }
              >
                Adicionar
              </button>
            </div>

            {produto.image_url ? (
              <img
                src={produto.image_url}
                alt={produto.name}
                style={styles.productImage}
              />
            ) : (
              <div style={styles.noImage}>
                🍕
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f3f4f6',
    fontFamily: 'Arial, sans-serif',
    color: '#111827'
  },

  menu: {
    width: '100%',
    maxWidth: '760px',
    minHeight: '100vh',
    margin: '0 auto',
    background: '#f8f9fb',
    boxShadow: '0 0 35px rgba(0,0,0,.06)'
  },

  loading: {
    minHeight: '100vh',
    background: '#f5f6fa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '30px',
    fontFamily: 'Arial, sans-serif',
    color: '#111827'
  },

  loadingIcon: {
    fontSize: '50px',
    marginBottom: '15px'
  },

  notFound: {
    maxWidth: '420px'
  },

  errorText: {
    color: '#dc2626'
  },

  hero: {
    position: 'relative',
    color: '#fff',
    overflow: 'hidden'
  },

  coverBox: {
    height: '230px',
    position: 'relative'
  },

  cover: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },

  coverShade: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, transparent 35%, rgba(0,0,0,.58))'
  },

  noCover: {
    height: '100px'
  },

  restaurantInfo: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '16px',
    padding: '0 22px 24px',
    marginTop: '-48px',
    position: 'relative',
    zIndex: 2
  },

  logo: {
    width: '92px',
    height: '92px',
    objectFit: 'contain',
    background: '#fff',
    border: '5px solid #fff',
    borderRadius: '22px',
    boxShadow: '0 8px 25px rgba(0,0,0,.22)'
  },

  logoFallback: {
    width: '82px',
    height: '82px',
    border: '5px solid #fff',
    borderRadius: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '35px'
  },

  restaurantText: {
    paddingBottom: '5px'
  },

  restaurantName: {
    fontSize: '27px',
    margin: '0 0 7px'
  },

  statusLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '14px'
  },

  openDot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    background: '#22c55e'
  },

  details: {
    background: '#fff',
    padding: '17px 22px',
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    borderBottom: '1px solid #e5e7eb'
  },

  detailItem: {
    whiteSpace: 'nowrap',
    padding: '10px 13px',
    background: '#f3f4f6',
    borderRadius: '12px',
    fontSize: '13px'
  },

  content: {
    padding: '10px 18px 40px'
  },

  category: {
    marginTop: '28px'
  },

  categoryTitle: {
    margin: '0 0 14px',
    fontSize: '23px'
  },

  products: {
    display: 'grid',
    gap: '13px'
  },

  product: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '17px',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '14px',
    boxShadow: '0 3px 12px rgba(0,0,0,.03)'
  },

  productInfo: {
    flex: 1,
    minWidth: 0
  },

  featured: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '800',
    padding: '5px 8px',
    borderRadius: '20px',
    marginBottom: '8px'
  },

  productName: {
    margin: '0 0 7px',
    fontSize: '17px'
  },

  description: {
    margin: '0 0 10px',
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: '1.45'
  },

  price: {
    display: 'block',
    fontSize: '18px',
    marginBottom: '12px'
  },

  addButton: {
    border: 0,
    color: '#fff',
    borderRadius: '10px',
    padding: '9px 15px',
    fontWeight: '800',
    cursor: 'pointer'
  },

  productImage: {
    width: '115px',
    height: '115px',
    objectFit: 'cover',
    borderRadius: '14px',
    flexShrink: 0
  },

  noImage: {
    width: '115px',
    height: '115px',
    borderRadius: '14px',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '38px',
    flexShrink: 0
  },

  empty: {
    margin: '40px 20px',
    padding: '45px 25px',
    textAlign: 'center',
    background: '#fff',
    borderRadius: '20px'
  },

  emptyIcon: {
    fontSize: '50px'
  },

  footer: {
    padding: '25px',
    textAlign: 'center',
    color: '#9ca3af',
    display: 'flex',
    justifyContent: 'center',
    gap: '5px',
    fontSize: '12px'
  }
};
