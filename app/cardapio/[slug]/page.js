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
      const { data: restaurantData, error: restaurantError } =
        await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', slug)
          .in('status', ['demo', 'active'])
          .maybeSingle();

      if (restaurantError) throw restaurantError;

      if (!restaurantData) {
        setRestaurante(null);
        setCarregando(false);
        return;
      }

      const { data: categoryData, error: categoryError } =
        await supabase
          .from('categories')
          .select('*')
          .eq('restaurant_id', restaurantData.id)
          .eq('active', true)
          .order('sort_order', { ascending: true });

      if (categoryError) throw categoryError;

      const { data: productData, error: productError } =
        await supabase
          .from('products')
          .select('*')
          .eq('restaurant_id', restaurantData.id)
          .eq('active', true)
          .order('sort_order', { ascending: true });

      if (productError) throw productError;

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
    return produtos.filter((produto) => !produto.category_id);
  }, [produtos]);

  function dinheiro(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function scrollCategoria(id) {
    document
      .getElementById(`categoria-${id}`)
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
  }

  if (carregando) {
    return (
      <main className="loading">
        <div className="loaderPlate">🍽️</div>
        <strong>Preparando o cardápio...</strong>

        <style jsx>{`
          .loading {
            min-height: 100vh;
            background: #0b0c0f;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 18px;
            font-family: Arial, sans-serif;
          }

          .loaderPlate {
            font-size: 50px;
            animation: pulse 1.5s infinite;
          }

          @keyframes pulse {
            50% {
              transform: scale(1.12);
              opacity: 0.65;
            }
          }
        `}</style>
      </main>
    );
  }

  if (!restaurante) {
    return (
      <main className="notFound">
        <div>
          <div className="notFoundIcon">🍽️</div>
          <h1>Cardápio não encontrado</h1>
          <p>Este restaurante não está disponível.</p>
          {erro && <small>{erro}</small>}
        </div>

        <style jsx>{`
          .notFound {
            min-height: 100vh;
            display: grid;
            place-items: center;
            text-align: center;
            background: #0b0c0f;
            color: white;
            padding: 30px;
            font-family: Arial, sans-serif;
          }

          .notFoundIcon {
            font-size: 55px;
          }

          small {
            color: #ff7676;
          }
        `}</style>
      </main>
    );
  }

  const primaria =
    restaurante.primary_color || '#c89a55';

  const secundaria =
    restaurante.secondary_color || '#111827';

  return (
    <main
      className="page"
      style={{
        '--primary': primaria,
        '--secondary': secundaria
      }}
    >
      {/* FUNDO */}
      <div className="ambientLight lightOne" />
      <div className="ambientLight lightTwo" />

      {/* FUMAÇA */}
      <div className="smoke smoke1" />
      <div className="smoke smoke2" />
      <div className="smoke smoke3" />

      <div className="menu">
        {/* CABEÇALHO */}
        <header className="header">
          <div className="brand">
            {restaurante.logo_url ? (
              <div className="logoBox">
                <img
                  src={restaurante.logo_url}
                  alt={restaurante.name}
                  className="logo"
                />
              </div>
            ) : (
              <div className="logoFallback">🍽️</div>
            )}

            <div className="brandText">
              <span className="premium">
                MENU • EXPERIÊNCIA
              </span>

              <h1>{restaurante.name}</h1>

              <div className="online">
                <span className="onlineDot" />
                Cardápio online
              </div>
            </div>
          </div>

          <div className="goldLine" />
        </header>

        {/* INFORMAÇÕES */}
        <section className="restaurantDetails">
          {restaurante.address && (
            <div className="detail">
              <span className="detailIcon">📍</span>

              <div>
                <small>ENDEREÇO</small>
                <strong>{restaurante.address}</strong>
              </div>
            </div>
          )}

          <div className="detail">
            <span className="detailIcon">🛵</span>

            <div>
              <small>ENTREGA</small>

              <strong>
                {Number(restaurante.delivery_fee || 0) === 0
                  ? 'Grátis'
                  : dinheiro(restaurante.delivery_fee)}
              </strong>
            </div>
          </div>

          {Number(restaurante.minimum_order || 0) > 0 && (
            <div className="detail">
              <span className="detailIcon">🛒</span>

              <div>
                <small>PEDIDO MÍNIMO</small>

                <strong>
                  {dinheiro(restaurante.minimum_order)}
                </strong>
              </div>
            </div>
          )}
        </section>

        {/* NAVEGAÇÃO DAS CATEGORIAS */}
        {categorias.length > 0 && (
          <nav className="categoryNav">
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                onClick={() =>
                  scrollCategoria(categoria.id)
                }
              >
                {categoria.name}
              </button>
            ))}
          </nav>
        )}

        {/* CONTEÚDO */}
        {produtos.length === 0 ? (
          <section className="empty">
            <div>🍽️</div>
            <h2>Nosso menu está sendo preparado</h2>
            <p>Em breve teremos novidades por aqui.</p>
          </section>
        ) : (
          <section className="content">
            {categorias.map((categoria, index) => {
              const itens = produtos.filter(
                (produto) =>
                  produto.category_id === categoria.id
              );

              if (!itens.length) return null;

              return (
                <Categoria
                  key={categoria.id}
                  categoria={categoria}
                  produtos={itens}
                  dinheiro={dinheiro}
                  index={index}
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
                dinheiro={dinheiro}
                index={categorias.length}
              />
            )}
          </section>
        )}

        <footer>
          <div className="footerLine" />

          <span>EXPERIÊNCIA DIGITAL</span>

          <strong>MenuFlow</strong>
        </footer>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }
      `}</style>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 20% 5%,
              color-mix(
                in srgb,
                var(--primary) 12%,
                transparent
              ),
              transparent 32%
            ),
            linear-gradient(
              180deg,
              #090a0c 0%,
              #101115 48%,
              #08090b 100%
            );
          color: #f8f5ef;
          font-family: Arial, Helvetica, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .menu {
          width: 100%;
          max-width: 920px;
          min-height: 100vh;
          margin: 0 auto;
          position: relative;
          z-index: 5;
          padding-bottom: 40px;
        }

        .ambientLight {
          position: fixed;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.09;
          pointer-events: none;
        }

        .lightOne {
          top: 5%;
          left: -180px;
          background: var(--primary);
        }

        .lightTwo {
          bottom: 5%;
          right: -180px;
          background: var(--primary);
        }

        /* =========================
           FUMAÇA
        ========================= */

        .smoke {
          position: fixed;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.035);
          filter: blur(55px);
          pointer-events: none;
          z-index: 1;
        }

        .smoke1 {
          left: -90px;
          bottom: -120px;
          animation: smokeUp 15s linear infinite;
        }

        .smoke2 {
          right: -100px;
          bottom: -160px;
          animation: smokeUp 20s linear infinite 4s;
        }

        .smoke3 {
          left: 35%;
          bottom: -200px;
          animation: smokeUp 24s linear infinite 8s;
        }

        @keyframes smokeUp {
          0% {
            transform: translateY(200px) scale(0.7);
            opacity: 0;
          }

          25% {
            opacity: 0.7;
          }

          70% {
            opacity: 0.25;
          }

          100% {
            transform: translateY(-120vh) scale(1.8);
            opacity: 0;
          }
        }

        /* =========================
           CABEÇALHO
        ========================= */

        .header {
          padding: 48px 28px 26px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .logoBox {
          width: 108px;
          height: 108px;
          border-radius: 25px;
          padding: 7px;
          border: 1px solid
            color-mix(
              in srgb,
              var(--primary) 70%,
              #ffffff
            );
          background: rgba(255, 255, 255, 0.05);
          box-shadow:
            0 0 35px
              color-mix(
                in srgb,
                var(--primary) 16%,
                transparent
              ),
            inset 0 0 20px rgba(255, 255, 255, 0.03);
        }

        .logo {
          width: 100%;
          height: 100%;
          border-radius: 19px;
          object-fit: contain;
        }

        .logoFallback {
          width: 108px;
          height: 108px;
          border-radius: 25px;
          display: grid;
          place-items: center;
          font-size: 42px;
          background: var(--primary);
        }

        .brandText {
          min-width: 0;
        }

        .premium {
          color: var(--primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2.4px;
        }

        .brand h1 {
          margin: 7px 0 9px;
          font-size: clamp(27px, 5vw, 43px);
          line-height: 1;
          letter-spacing: -1.2px;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #c6c6c6;
          font-size: 13px;
        }

        .onlineDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2fd875;
          box-shadow: 0 0 12px #2fd875;
        }

        .goldLine {
          height: 1px;
          margin-top: 32px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--primary),
            transparent
          );
          opacity: 0.65;
        }

        /* =========================
           INFORMAÇÕES
        ========================= */

        .restaurantDetails {
          margin: 0 28px;
          padding: 15px;
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 9px;
          border-radius: 19px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          backdrop-filter: blur(15px);
        }

        .detail {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px;
        }

        .detailIcon {
          font-size: 18px;
        }

        .detail div {
          min-width: 0;
        }

        .detail small {
          display: block;
          color: #777b82;
          font-size: 8px;
          letter-spacing: 1.2px;
          margin-bottom: 4px;
        }

        .detail strong {
          display: block;
          color: #e8e8e8;
          font-size: 11px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* =========================
           CATEGORIAS
        ========================= */

        .categoryNav {
          padding: 24px 28px 5px;
          display: flex;
          gap: 9px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .categoryNav::-webkit-scrollbar {
          display: none;
        }

        .categoryNav button {
          flex: 0 0 auto;
          border: 1px solid
            color-mix(
              in srgb,
              var(--primary) 32%,
              #333
            );
          background: rgba(255, 255, 255, 0.035);
          color: #dedede;
          border-radius: 100px;
          padding: 10px 17px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.25s ease;
        }

        .categoryNav button:active {
          transform: scale(0.95);
          background: var(--primary);
          color: white;
        }

        .content {
          padding: 0 28px 40px;
        }

        /* =========================
           VAZIO
        ========================= */

        .empty {
          margin: 50px 28px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
          padding: 50px 25px;
          border-radius: 25px;
        }

        .empty div {
          font-size: 45px;
        }

        .empty p {
          color: #858585;
        }

        footer {
          text-align: center;
          padding: 30px;
          color: #777;
          font-size: 10px;
          letter-spacing: 2px;
        }

        footer strong {
          color: var(--primary);
          margin-left: 5px;
        }

        .footerLine {
          height: 1px;
          margin-bottom: 30px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--primary),
            transparent
          );
          opacity: 0.35;
        }

        @media (max-width: 600px) {
          .header {
            padding: 35px 20px 22px;
          }

          .brand {
            gap: 15px;
          }

          .logoBox,
          .logoFallback {
            width: 82px;
            height: 82px;
            border-radius: 20px;
          }

          .logo {
            border-radius: 15px;
          }

          .brand h1 {
            font-size: 28px;
          }

          .restaurantDetails {
            margin: 0 20px;
            display: flex;
            overflow-x: auto;
            padding: 9px;
          }

          .detail {
            flex: 0 0 auto;
            min-width: 125px;
          }

          .categoryNav {
            padding-left: 20px;
            padding-right: 20px;
          }

          .content {
            padding-left: 20px;
            padding-right: 20px;
          }
        }
      `}</style>
    </main>
  );
}

function Categoria({
  categoria,
  produtos,
  dinheiro,
  index
}) {
  return (
    <section
      id={`categoria-${categoria.id}`}
      className="category"
      style={{
        animationDelay: `${index * 0.08}s`
      }}
    >
      <div className="categoryHeader">
        <div>
          <span className="categoryNumber">
            {String(index + 1).padStart(2, '0')}
          </span>

          <h2>{categoria.name}</h2>
        </div>

        <div className="categoryLine" />
      </div>

      <div className="products">
        {produtos.map((produto, productIndex) => (
          <Produto
            key={produto.id}
            produto={produto}
            dinheiro={dinheiro}
            index={productIndex}
          />
        ))}
      </div>

      <style jsx>{`
        .category {
          padding-top: 42px;
          scroll-margin-top: 20px;
          opacity: 0;
          animation: revealCategory 0.65s ease forwards;
        }

        @keyframes revealCategory {
          from {
            opacity: 0;
            transform: translateY(20px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .categoryHeader {
          display: flex;
          align-items: flex-end;
          gap: 18px;
          margin-bottom: 17px;
        }

        .categoryHeader > div:first-child {
          flex-shrink: 0;
        }

        .categoryNumber {
          display: block;
          color: var(--primary);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2px;
          margin-bottom: 5px;
        }

        h2 {
          margin: 0;
          color: #f4f1eb;
          font-size: 28px;
          line-height: 1;
          text-transform: uppercase;
          letter-spacing: -0.5px;
        }

        .categoryLine {
          flex: 1;
          height: 1px;
          margin-bottom: 4px;
          background: linear-gradient(
            90deg,
            var(--primary),
            transparent
          );
          opacity: 0.45;
        }

        .products {
          display: grid;
          gap: 15px;
        }

        @media (max-width: 600px) {
          .category {
            padding-top: 35px;
          }

          h2 {
            font-size: 24px;
          }
        }
      `}</style>
    </section>
  );
}

function Produto({
  produto,
  dinheiro,
  index
}) {
  const [tocando, setTocando] = useState(false);

  function clicar() {
    setTocando(true);

    setTimeout(() => {
      setTocando(false);
    }, 300);

    alert(
      `Próxima etapa: vamos adicionar "${produto.name}" ao carrinho.`
    );
  }

  return (
    <article
      className={`product ${tocando ? 'touch' : ''}`}
      style={{
        animationDelay: `${index * 0.07}s`
      }}
    >
      {produto.image_url && (
        <div className="imageSide">
          <img
            src={produto.image_url}
            alt={produto.name}
          />

          <div className="imageShade" />

          {produto.featured && (
            <span className="featured">
              ★ DESTAQUE
            </span>
          )}
        </div>
      )}

      <div className="info">
        {produto.featured && !produto.image_url && (
          <span className="featuredText">
            ★ DESTAQUE
          </span>
        )}

        <div className="titleRow">
          <h3>{produto.name}</h3>

          <span className="titleLine" />

          <strong>{dinheiro(produto.price)}</strong>
        </div>

        {produto.description && (
          <p>{produto.description}</p>
        )}

        <button onClick={clicar}>
          <span>Adicionar</span>
          <span className="plus">+</span>
        </button>
      </div>

      <div className="cardGlow" />

      <style jsx>{`
        .product {
          min-height: 190px;
          display: grid;
          grid-template-columns:
            minmax(230px, 43%) 1fr;
          overflow: hidden;
          position: relative;
          border-radius: 22px;
          border: 1px solid
            color-mix(
              in srgb,
              var(--primary) 28%,
              #313131
            );
          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.055),
              rgba(255, 255, 255, 0.018)
            ),
            #121316;
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          opacity: 0;
          animation: revealProduct 0.6s ease forwards;
          transition:
            transform 0.28s ease,
            border-color 0.28s ease,
            box-shadow 0.28s ease;
        }

        @keyframes revealProduct {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .product:hover {
          transform: translateY(-3px);
          border-color: var(--primary);
          box-shadow:
            0 22px 55px rgba(0, 0, 0, 0.38),
            0 0 25px
              color-mix(
                in srgb,
                var(--primary) 9%,
                transparent
              );
        }

        .product.touch {
          transform: scale(0.985);
        }

        .imageSide {
          min-height: 190px;
          position: relative;
          overflow: hidden;
        }

        .imageSide img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s ease;
        }

        .product:hover .imageSide img {
          transform: scale(1.045);
        }

        .imageShade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              90deg,
              transparent 55%,
              rgba(18, 19, 22, 0.6)
            );
        }

        .featured {
          position: absolute;
          left: 14px;
          top: 14px;
          z-index: 2;
          background: rgba(8, 8, 8, 0.75);
          border: 1px solid var(--primary);
          color: var(--primary);
          backdrop-filter: blur(10px);
          padding: 7px 10px;
          border-radius: 100px;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .info {
          padding: 25px 25px 22px;
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .titleRow {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        h3 {
          margin: 0;
          color: #f5f3ee;
          font-size: 20px;
          line-height: 1.15;
        }

        .titleLine {
          flex: 1;
          height: 1px;
          min-width: 12px;
          background: linear-gradient(
            90deg,
            var(--primary),
            transparent
          );
          opacity: 0.4;
        }

        .titleRow strong {
          flex-shrink: 0;
          color: var(--primary);
          font-size: 17px;
        }

        p {
          color: #8e9095;
          font-size: 12px;
          line-height: 1.55;
          margin: 11px 0 20px;
          max-width: 430px;
        }

        button {
          width: fit-content;
          min-width: 126px;
          border: 1px solid
            color-mix(
              in srgb,
              var(--primary) 55%,
              transparent
            );
          background:
            color-mix(
              in srgb,
              var(--primary) 12%,
              transparent
            );
          color: #f5f5f5;
          border-radius: 11px;
          padding: 10px 12px 10px 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.25s ease;
        }

        button:hover {
          background: var(--primary);
          color: white;
          transform: translateY(-2px);
        }

        button:active {
          transform: scale(0.95);
        }

        .plus {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: var(--primary);
          color: white;
          font-size: 17px;
          line-height: 1;
        }

        button:hover .plus {
          background: rgba(0, 0, 0, 0.2);
        }

        .featuredText {
          color: var(--primary);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin-bottom: 10px;
        }

        .cardGlow {
          position: absolute;
          width: 180px;
          height: 180px;
          right: -100px;
          bottom: -120px;
          background: var(--primary);
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.06;
          pointer-events: none;
        }

        @media (max-width: 600px) {
          .product {
            min-height: 160px;
            grid-template-columns: 42% 58%;
            border-radius: 18px;
          }

          .imageSide {
            min-height: 160px;
          }

          .info {
            padding: 18px 15px;
          }

          .titleRow {
            display: block;
          }

          .titleLine {
            display: none;
          }

          h3 {
            font-size: 17px;
            margin-bottom: 7px;
          }

          .titleRow strong {
            font-size: 16px;
          }

          p {
            font-size: 10px;
            margin: 8px 0 13px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          button {
            min-width: 105px;
            padding: 8px 9px 8px 12px;
            font-size: 10px;
            gap: 10px;
          }

          .plus {
            width: 20px;
            height: 20px;
          }
        }
      `}</style>
    </article>
  );
              }
