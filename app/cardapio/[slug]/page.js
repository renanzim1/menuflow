'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export default function CardapioPublico() {
  const params = useParams();
  const slug = params?.slug;

  const [restaurante, setRestaurante] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [gruposAdicionais, setGruposAdicionais] = useState([]);
  const [adicionais, setAdicionais] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [produtoAberto, setProdutoAberto] = useState(null);
  const [selecionados, setSelecionados] = useState({});

  const carregarCardapio = useCallback(
    async (mostrarLoading = true) => {
      if (!slug) return;

      if (mostrarLoading) {
        setCarregando(true);
      }

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
          setCategorias([]);
          setProdutos([]);
          setGruposAdicionais([]);
          setAdicionais([]);
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
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });

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
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (productError) {
          throw productError;
        }

        const listaProdutos = productData || [];
        const idsProdutos = listaProdutos.map((produto) => produto.id);

        let groupData = [];
        let addonData = [];

        if (idsProdutos.length > 0) {
          const {
            data: grupos,
            error: groupError
          } = await supabase
            .from('addon_groups')
            .select('*')
            .in('product_id', idsProdutos)
            .order('sort_order', { ascending: true });

          if (groupError) {
            console.error('Erro ao carregar grupos:', groupError);
          } else {
            groupData = grupos || [];
          }

          const idsGrupos = groupData.map((grupo) => grupo.id);

          if (idsGrupos.length > 0) {
            const {
              data: itens,
              error: addonError
            } = await supabase
              .from('addons')
              .select('*')
              .in('group_id', idsGrupos)
              .eq('active', true)
              .order('sort_order', { ascending: true });

            if (addonError) {
              console.error('Erro ao carregar adicionais:', addonError);
            } else {
              addonData = itens || [];
            }
          }
        }

        setRestaurante(restaurantData);
        setCategorias(categoryData || []);
        setProdutos(listaProdutos);
        setGruposAdicionais(groupData);
        setAdicionais(addonData);
      } catch (error) {
        console.error(error);

        setErro(
          error?.message ||
            'Não foi possível carregar o cardápio.'
        );
      } finally {
        if (mostrarLoading) {
          setCarregando(false);
        }
      }
    },
    [slug]
  );

  useEffect(() => {
    carregarCardapio(true);
  }, [carregarCardapio]);

  useEffect(() => {
    function atualizarAoVoltar() {
      if (document.visibilityState === 'visible') {
        carregarCardapio(false);
      }
    }

    function atualizarNoFoco() {
      carregarCardapio(false);
    }

    document.addEventListener(
      'visibilitychange',
      atualizarAoVoltar
    );

    window.addEventListener(
      'focus',
      atualizarNoFoco
    );

    return () => {
      document.removeEventListener(
        'visibilitychange',
        atualizarAoVoltar
      );

      window.removeEventListener(
        'focus',
        atualizarNoFoco
      );
    };
  }, [carregarCardapio]);

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

  function scrollCategoria(id) {
    document
      .getElementById(`categoria-${id}`)
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
  }

  function abrirProduto(produto) {
    const grupos = gruposAdicionais.filter(
      (grupo) => grupo.product_id === produto.id
    );

    if (!grupos.length) {
      alert(
        `"${produto.name}" foi selecionado. O carrinho será a próxima etapa.`
      );
      return;
    }

    setProdutoAberto(produto);
    setSelecionados({});
  }

  function fecharProduto() {
    setProdutoAberto(null);
    setSelecionados({});
  }

  function gruposDoProduto(produtoId) {
    return gruposAdicionais.filter(
      (grupo) => grupo.product_id === produtoId
    );
  }

  function adicionaisDoGrupo(grupoId) {
    return adicionais.filter(
      (item) => item.group_id === grupoId
    );
  }

  function adicionalSelecionado(grupoId, adicionalId) {
    const lista = selecionados[grupoId] || [];
    return lista.includes(adicionalId);
  }

  function alternarAdicional(grupo, adicional) {
    setSelecionados((atual) => {
      const listaAtual = atual[grupo.id] || [];

      const existe = listaAtual.includes(
        adicional.id
      );

      if (existe) {
        return {
          ...atual,
          [grupo.id]: listaAtual.filter(
            (id) => id !== adicional.id
          )
        };
      }

      const maximo = Math.max(
        1,
        Number(grupo.max_select) || 1
      );

      if (maximo === 1) {
        return {
          ...atual,
          [grupo.id]: [adicional.id]
        };
      }

      if (listaAtual.length >= maximo) {
        return atual;
      }

      return {
        ...atual,
        [grupo.id]: [
          ...listaAtual,
          adicional.id
        ]
      };
    });
  }

  function confirmarProduto() {
    if (!produtoAberto) return;

    const grupos =
      gruposDoProduto(produtoAberto.id);

    const grupoPendente = grupos.find(
      (grupo) => {
        if (!grupo.required) return false;

        const quantidade =
          (selecionados[grupo.id] || []).length;

        const minimo = Math.max(
          1,
          Number(grupo.min_select) || 1
        );

        return quantidade < minimo;
      }
    );

    if (grupoPendente) {
      alert(
        `Escolha uma opção em "${grupoPendente.name}".`
      );
      return;
    }

    alert(
      `"${produtoAberto.name}" configurado. Na próxima etapa vamos ligar isso ao carrinho.`
    );

    fecharProduto();
  }

  const totalModal = useMemo(() => {
    if (!produtoAberto) return 0;

    let total = Number(
      produtoAberto.price || 0
    );

    Object.values(selecionados)
      .flat()
      .forEach((id) => {
        const adicional = adicionais.find(
          (item) => item.id === id
        );

        if (adicional) {
          total += Number(
            adicional.price || 0
          );
        }
      });

    return total;
  }, [
    produtoAberto,
    selecionados,
    adicionais
  ]);

  if (carregando) {
    return (
      <main className="loading">
        <div className="loaderPlate">
          🍽️
        </div>

        <strong>
          Preparando o cardápio...
        </strong>

        <style jsx>{`
          .loading {
            min-height: 100vh;
            background: #090a0d;
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
          <div className="notFoundIcon">
            🍽️
          </div>

          <h1>
            Cardápio não encontrado
          </h1>

          <p>
            Este restaurante não está disponível.
          </p>

          {erro && (
            <small>
              {erro}
            </small>
          )}
        </div>

        <style jsx>{`
          .notFound {
            min-height: 100vh;
            display: grid;
            place-items: center;
            text-align: center;
            background: #090a0d;
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
    restaurante.primary_color ||
    '#6d5dfc';

  const secundaria =
    restaurante.secondary_color ||
    '#111827';

  const logoZoom = Number(
    restaurante.logo_zoom ?? 1
  );

  const logoPositionX = Number(
    restaurante.logo_position_x ?? 50
  );

  const logoPositionY = Number(
    restaurante.logo_position_y ?? 50
  );

  return (
    <main
      className="page"
      style={{
        '--primary': primaria,
        '--secondary': secundaria
      }}
    >
      <div className="ambientLight lightOne" />
      <div className="ambientLight lightTwo" />

      {/* FUMAÇA NOVA */}
      <div className="smokeLayer">
        <div className="smokeStream smokeLeft">
          <span className="smokePuff puff1" />
          <span className="smokePuff puff2" />
          <span className="smokePuff puff3" />
          <span className="smokePuff puff4" />
        </div>

        <div className="smokeStream smokeCenter">
          <span className="smokePuff puff1" />
          <span className="smokePuff puff2" />
          <span className="smokePuff puff3" />
        </div>

        <div className="smokeStream smokeRight">
          <span className="smokePuff puff1" />
          <span className="smokePuff puff2" />
          <span className="smokePuff puff3" />
          <span className="smokePuff puff4" />
        </div>
      </div>

      <div className="menu">

        {restaurante.cover_url && (
          <div className="cover">
            <img
              src={restaurante.cover_url}
              alt={`Capa ${restaurante.name}`}
            />

            <div className="coverShade" />
          </div>
        )}

        <header
          className={`header ${
            restaurante.cover_url
              ? 'withCover'
              : ''
          }`}
        >
          <div className="brand">

            {restaurante.logo_url ? (
              <div className="logoBox">

                <div className="logoGlow" />

                <img
                  src={restaurante.logo_url}
                  alt={`Logo ${restaurante.name}`}
                  className="logo"
                  style={{
                    left: `${logoPositionX}%`,
                    top: `${logoPositionY}%`,
                    transform:
                      `translate(-50%, -50%) scale(${logoZoom})`
                  }}
                />

              </div>
            ) : (
              <div className="logoFallback">
                🍽️
              </div>
            )}

            <div className="brandText">

              <span className="premium">
                MENU • EXPERIÊNCIA
              </span>

              <h1>
                {restaurante.name}
              </h1>

              <div className="online">
                <span className="onlineDot" />
                Cardápio online
              </div>

            </div>

          </div>

          <div className="goldLine" />
        </header>

        <section className="restaurantDetails">

          {restaurante.address && (
            <div className="detail">
              <span className="detailIcon">
                📍
              </span>

              <div>
                <small>
                  ENDEREÇO
                </small>

                <strong>
                  {restaurante.address}
                </strong>
              </div>
            </div>
          )}

          <div className="detail">
            <span className="detailIcon">
              🛵
            </span>

            <div>
              <small>
                ENTREGA
              </small>

              <strong>
                {Number(
                  restaurante.delivery_fee || 0
                ) === 0
                  ? 'Grátis'
                  : dinheiro(
                      restaurante.delivery_fee
                    )}
              </strong>
            </div>
          </div>

          {Number(
            restaurante.minimum_order || 0
          ) > 0 && (
            <div className="detail">
              <span className="detailIcon">
                🛒
              </span>

              <div>
                <small>
                  PEDIDO MÍNIMO
                </small>

                <strong>
                  {dinheiro(
                    restaurante.minimum_order
                  )}
                </strong>
              </div>
            </div>
          )}

        </section>

        {categorias.length > 0 && (
          <nav className="categoryNav">

            {categorias.map(
              (categoria) => (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() =>
                    scrollCategoria(
                      categoria.id
                    )
                  }
                >
                  {categoria.name}
                </button>
              )
            )}

          </nav>
        )}

        {produtos.length === 0 ? (
          <section className="empty">

            <div>
              🍽️
            </div>

            <h2>
              Nosso menu está sendo preparado
            </h2>

            <p>
              Em breve teremos novidades por aqui.
            </p>

          </section>
        ) : (
          <section className="content">

            {categorias.map(
              (categoria, index) => {
                const itens =
                  produtos.filter(
                    (produto) =>
                      produto.category_id ===
                      categoria.id
                  );

                if (!itens.length) {
                  return null;
                }

                return (
                  <Categoria
                    key={categoria.id}
                    categoria={categoria}
                    produtos={itens}
                    dinheiro={dinheiro}
                    index={index}
                    abrirProduto={abrirProduto}
                  />
                );
              }
            )}

            {produtosSemCategoria.length >
              0 && (
              <Categoria
                categoria={{
                  id: 'outros',
                  name: 'Outros'
                }}
                produtos={
                  produtosSemCategoria
                }
                dinheiro={dinheiro}
                index={categorias.length}
                abrirProduto={abrirProduto}
              />
            )}

          </section>
        )}

        <footer>
          <div className="footerLine" />

          <span>
            EXPERIÊNCIA DIGITAL
          </span>

          <strong>
            MenuFlow
          </strong>
        </footer>

      </div>

      {produtoAberto && (
        <div
          className="modalOverlay"
          onClick={fecharProduto}
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modalHandle" />

            <div className="modalTop">

              <div>
                <span className="modalLabel">
                  PERSONALIZE SEU PEDIDO
                </span>

                <h2>
                  {produtoAberto.name}
                </h2>

                <strong className="modalPrice">
                  {dinheiro(
                    produtoAberto.price
                  )}
                </strong>
              </div>

              <button
                type="button"
                className="close"
                onClick={fecharProduto}
              >
                ×
              </button>

            </div>

            <div className="addonGroups">

              {gruposDoProduto(
                produtoAberto.id
              ).map((grupo) => {

                const itens =
                  adicionaisDoGrupo(
                    grupo.id
                  );

                if (!itens.length) {
                  return null;
                }

                return (
                  <section
                    className="addonGroup"
                    key={grupo.id}
                  >

                    <div className="addonGroupHeader">

                      <div>
                        <h3>
                          {grupo.name}
                        </h3>

                        <small>
                          {grupo.required
                            ? 'Obrigatório'
                            : 'Opcional'}

                          {' • '}

                          Escolha até{' '}

                          {grupo.max_select ||
                            1}
                        </small>
                      </div>

                      {grupo.required && (
                        <span className="required">
                          OBRIGATÓRIO
                        </span>
                      )}

                    </div>

                    <div className="addonList">

                      {itens.map(
                        (adicional) => {

                          const marcado =
                            adicionalSelecionado(
                              grupo.id,
                              adicional.id
                            );

                          return (
                            <button
                              type="button"
                              key={
                                adicional.id
                              }
                              className={`addonItem ${
                                marcado
                                  ? 'selected'
                                  : ''
                              }`}
                              onClick={() =>
                                alternarAdicional(
                                  grupo,
                                  adicional
                                )
                              }
                            >

                              <div>
                                <strong>
                                  {adicional.name}
                                </strong>

                                <span>
                                  {Number(
                                    adicional.price ||
                                      0
                                  ) === 0
                                    ? 'Sem acréscimo'
                                    : `+ ${dinheiro(
                                        adicional.price
                                      )}`}
                                </span>
                              </div>

                              <span className="check">
                                {marcado
                                  ? '✓'
                                  : '+'}
                              </span>

                            </button>
                          );
                        }
                      )}

                    </div>

                  </section>
                );
              })}

            </div>

            <div className="modalFooter">

              <div className="total">

                <small>
                  TOTAL
                </small>

                <strong>
                  {dinheiro(totalModal)}
                </strong>

              </div>

              <button
                type="button"
                className="confirm"
                onClick={
                  confirmarProduto
                }
              >
                Adicionar ao pedido
              </button>

            </div>

          </div>
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #090a0d;
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
              circle at 15% 5%,
              color-mix(
                in srgb,
                var(--primary) 14%,
                transparent
              ),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 55%,
              color-mix(
                in srgb,
                var(--primary) 5%,
                transparent
              ),
              transparent 28%
            ),
            linear-gradient(
              180deg,
              #08090c 0%,
              #101115 45%,
              #08090b 100%
            );

          color: #f8f5ef;

          font-family:
            Arial,
            Helvetica,
            sans-serif;

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

          background:
            var(--primary);
        }

        .lightTwo {
          bottom: 5%;
          right: -180px;

          background:
            var(--primary);
        }

        /* ==================================================
           FUMAÇA NOVA
           ================================================== */

        .smokeLayer {
          position: fixed;
          inset: 0;

          z-index: 2;

          overflow: hidden;

          pointer-events: none;

          opacity: 1;
        }

        .smokeStream {
          position: absolute;

          bottom: -180px;

          width: 180px;
          height: 520px;

          opacity: 0.55;

          animation:
            smokeTravel
            15s
            linear
            infinite;
        }

        .smokeLeft {
          left: -35px;

          animation-duration:
            17s;
        }

        .smokeCenter {
          left: 48%;

          width: 130px;

          opacity: 0.22;

          animation-duration:
            22s;

          animation-delay:
            -9s;
        }

        .smokeRight {
          right: -45px;

          animation-duration:
            20s;

          animation-delay:
            -6s;
        }

        .smokePuff {
          position: absolute;

          display: block;

          border-radius:
            50%;

          background:
            radial-gradient(
              ellipse at center,
              rgba(
                255,
                255,
                255,
                0.16
              )
              0%,
              rgba(
                220,
                225,
                230,
                0.08
              )
              35%,
              rgba(
                200,
                205,
                215,
                0.025
              )
              58%,
              transparent
              75%
            );

          filter:
            blur(18px);

          mix-blend-mode:
            screen;

          animation:
            smokeSway
            7s
            ease-in-out
            infinite
            alternate;
        }

        .puff1 {
          width: 120px;
          height: 170px;

          left: 20px;
          bottom: 0;

          opacity: 0.75;
        }

        .puff2 {
          width: 145px;
          height: 190px;

          left: -5px;
          bottom: 115px;

          opacity: 0.55;

          animation-delay:
            -2s;
        }

        .puff3 {
          width: 115px;
          height: 175px;

          left: 45px;
          bottom: 240px;

          opacity: 0.4;

          animation-delay:
            -4s;
        }

        .puff4 {
          width: 150px;
          height: 200px;

          left: 5px;
          bottom: 345px;

          opacity: 0.22;

          animation-delay:
            -5s;
        }

        @keyframes smokeTravel {
          0% {
            transform:
              translate3d(
                0,
                160px,
                0
              )
              scale(0.65);

            opacity: 0;
          }

          12% {
            opacity: 0.45;
          }

          45% {
            transform:
              translate3d(
                18px,
                -35vh,
                0
              )
              scale(1);

            opacity: 0.5;
          }

          75% {
            transform:
              translate3d(
                -12px,
                -72vh,
                0
              )
              scale(1.35);

            opacity: 0.28;
          }

          100% {
            transform:
              translate3d(
                25px,
                -125vh,
                0
              )
              scale(1.75);

            opacity: 0;
          }
        }

        @keyframes smokeSway {
          0% {
            transform:
              translateX(-16px)
              rotate(-5deg)
              scaleX(0.88);
          }

          50% {
            transform:
              translateX(15px)
              rotate(4deg)
              scaleX(1.08);
          }

          100% {
            transform:
              translateX(-4px)
              rotate(-2deg)
              scaleX(0.95);
          }
        }

        /* CAPA */

        .cover {
          height: 250px;

          position: relative;

          overflow: hidden;
        }

        .cover img {
          width: 100%;
          height: 100%;

          object-fit: cover;

          display: block;
        }

        .coverShade {
          position: absolute;

          inset: 0;

          background:
            linear-gradient(
              180deg,
              rgba(0, 0, 0, 0.1),
              rgba(8, 9, 12, 0.3) 45%,
              #08090c 100%
            );
        }

        /* CABEÇALHO */

        .header {
          padding:
            48px
            28px
            26px;
        }

        .header.withCover {
          margin-top: -65px;

          position: relative;

          z-index: 5;
        }

        .brand {
          display: flex;

          align-items: center;

          gap: 22px;
        }

        .logoBox {
          width: 118px;
          height: 118px;

          flex:
            0 0 118px;

          position: relative;

          display: flex;

          align-items: center;
          justify-content: center;

          overflow: hidden;

          border-radius: 28px;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 75%,
              #ffffff
            );

          background:
            #111216;

          box-shadow:
            0 18px 45px
              rgba(0, 0, 0, 0.4),

            0 0 28px
              color-mix(
                in srgb,
                var(--primary) 14%,
                transparent
              );

          isolation: isolate;
        }

        .logoBox::before {
          content: '';

          position: absolute;

          inset: 5px;

          border-radius: 23px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          pointer-events: none;

          z-index: 4;
        }

        .logoGlow {
          position: absolute;

          width: 80%;
          height: 80%;

          border-radius: 50%;

          background:
            var(--primary);

          filter: blur(45px);

          opacity: 0.12;

          pointer-events: none;

          z-index: 1;
        }

        .logo {
          position: absolute;

          width: 100%;
          height: 100%;

          object-fit: contain;

          object-position: center;

          transform-origin:
            center center;

          z-index: 2;

          user-select: none;
        }

        .logoFallback {
          width: 118px;
          height: 118px;

          flex:
            0 0 118px;

          border-radius: 28px;

          display: grid;

          place-items: center;

          font-size: 44px;

          color: white;

          background:
            linear-gradient(
              135deg,
              var(--primary),
              var(--secondary)
            );

          border:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 70%,
              white
            );
        }

        .brandText {
          min-width: 0;
        }

        .premium {
          color:
            var(--primary);

          font-size: 10px;

          font-weight: 800;

          letter-spacing:
            2.4px;
        }

        .brand h1 {
          margin:
            7px
            0
            9px;

          font-size:
            clamp(
              27px,
              5vw,
              43px
            );

          line-height: 1;

          letter-spacing:
            -1.2px;
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

          box-shadow:
            0 0 12px
            #2fd875;
        }

        .goldLine {
          height: 1px;

          margin-top: 32px;

          background:
            linear-gradient(
              90deg,
              transparent,
              var(--primary),
              transparent
            );

          opacity: 0.65;
        }

        /* INFORMAÇÕES */

        .restaurantDetails {
          margin:
            0
            28px;

          padding: 15px;

          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 9px;

          border-radius: 19px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );

          backdrop-filter:
            blur(15px);
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

          letter-spacing:
            1.2px;

          margin-bottom: 4px;
        }

        .detail strong {
          display: block;

          color: #e8e8e8;

          font-size: 11px;

          overflow: hidden;

          text-overflow:
            ellipsis;

          white-space: nowrap;
        }

        /* CATEGORIAS */

        .categoryNav {
          padding:
            24px
            28px
            5px;

          display: flex;

          gap: 9px;

          overflow-x: auto;

          scrollbar-width: none;
        }

        .categoryNav::-webkit-scrollbar {
          display: none;
        }

        .categoryNav button {
          flex:
            0 0 auto;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 32%,
              #333
            );

          background:
            rgba(
              255,
              255,
              255,
              0.035
            );

          color: #dedede;

          border-radius:
            100px;

          padding:
            10px
            17px;

          font-size: 12px;

          font-weight: 700;

          cursor: pointer;
        }

        .categoryNav button:active {
          transform:
            scale(0.95);

          background:
            var(--primary);

          color: white;
        }

        .content {
          padding:
            0
            28px
            40px;
        }

        .empty {
          margin:
            50px
            28px;

          text-align: center;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );

          padding:
            50px
            25px;

          border-radius:
            25px;
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
          color:
            var(--primary);

          margin-left: 5px;
        }

        .footerLine {
          height: 1px;

          margin-bottom: 30px;

          background:
            linear-gradient(
              90deg,
              transparent,
              var(--primary),
              transparent
            );

          opacity: 0.35;
        }

        /* MODAL */

        .modalOverlay {
          position: fixed;

          inset: 0;

          z-index: 9999;

          background:
            rgba(
              0,
              0,
              0,
              0.75
            );

          backdrop-filter:
            blur(8px);

          display: flex;

          align-items: flex-end;

          justify-content: center;

          padding: 20px;
        }

        .modal {
          width: 100%;

          max-width: 620px;

          max-height: 88vh;

          overflow-y: auto;

          background:
            #111216;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 30%,
              #333
            );

          border-radius:
            25px;

          box-shadow:
            0 -20px 70px
            rgba(
              0,
              0,
              0,
              0.6
            );

          padding: 24px;
        }

        .modalHandle {
          display: none;

          width: 45px;
          height: 4px;

          border-radius: 10px;

          background: #3c3d42;

          margin:
            0
            auto
            18px;
        }

        .modalTop {
          display: flex;

          justify-content:
            space-between;

          gap: 20px;

          align-items:
            flex-start;

          padding-bottom: 20px;

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
        }

        .modalLabel {
          color:
            var(--primary);

          font-size: 9px;

          font-weight: 900;

          letter-spacing:
            1.7px;
        }

        .modalTop h2 {
          margin:
            7px
            0
            7px;

          font-size: 27px;
        }

        .modalPrice {
          color:
            var(--primary);

          font-size: 19px;
        }

        .close {
          width: 38px;
          height: 38px;

          flex:
            0 0 38px;

          border: 0;

          border-radius: 50%;

          background:
            rgba(
              255,
              255,
              255,
              0.08
            );

          color: white;

          font-size: 25px;

          cursor: pointer;
        }

        .addonGroups {
          display: grid;

          gap: 25px;

          padding:
            25px
            0;
        }

        .addonGroup {
          display: grid;

          gap: 14px;
        }

        .addonGroupHeader {
          display: flex;

          justify-content:
            space-between;

          align-items:
            flex-start;

          gap: 15px;
        }

        .addonGroup h3 {
          margin:
            0
            0
            4px;

          font-size: 17px;
        }

        .addonGroup small {
          color: #85878d;
        }

        .required {
          flex-shrink: 0;

          color:
            var(--primary);

          border:
            1px solid
            var(--primary);

          padding:
            5px
            8px;

          border-radius:
            100px;

          font-size: 7px;

          font-weight: 900;
        }

        .addonList {
          display: grid;

          gap: 9px;
        }

        .addonItem {
          width: 100%;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );

          color: white;

          border-radius:
            14px;

          padding:
            14px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 15px;

          text-align: left;

          cursor: pointer;
        }

        .addonItem.selected {
          border-color:
            var(--primary);

          background:
            color-mix(
              in srgb,
              var(--primary) 12%,
              #111216
            );
        }

        .addonItem div {
          display: grid;

          gap: 4px;
        }

        .addonItem strong {
          font-size: 13px;
        }

        .addonItem span {
          color: #8d8f95;

          font-size: 11px;
        }

        .check {
          width: 27px;
          height: 27px;

          flex:
            0 0 27px;

          display: grid;

          place-items: center;

          border-radius: 50%;

          background:
            var(--primary) !important;

          color:
            white !important;

          font-size:
            16px !important;

          font-weight: 900;
        }

        .modalFooter {
          position: sticky;

          bottom: -24px;

          margin:
            0
            -24px
            -24px;

          padding: 18px 24px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 15px;

          background:
            rgba(
              17,
              18,
              22,
              0.96
            );

          border-top:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          backdrop-filter:
            blur(15px);
        }

        .total {
          display: grid;

          gap: 3px;
        }

        .total small {
          color: #777;

          font-size: 8px;

          letter-spacing:
            1.5px;
        }

        .total strong {
          color:
            var(--primary);

          font-size: 20px;
        }

        .confirm {
          border: 0;

          background:
            var(--primary);

          color: white;

          border-radius:
            12px;

          padding:
            14px
            18px;

          font-weight: 800;

          cursor: pointer;
        }

        /* CELULAR */

        @media (
          max-width: 600px
        ) {
          .cover {
            height: 190px;
          }

          .header {
            padding:
              35px
              20px
              22px;
          }

          .header.withCover {
            margin-top: -55px;
          }

          .brand {
            gap: 15px;
          }

          .logoBox,
          .logoFallback {
            width: 94px;
            height: 94px;

            flex-basis:
              94px;

            border-radius:
              23px;
          }

          .logoBox::before {
            border-radius:
              18px;
          }

          .logoFallback {
            font-size: 36px;
          }

          .brand h1 {
            font-size: 28px;
          }

          .premium {
            font-size: 9px;

            letter-spacing:
              1.8px;
          }

          .restaurantDetails {
            margin:
              0
              20px;

            display: flex;

            overflow-x: auto;

            padding: 9px;

            scrollbar-width: none;
          }

          .restaurantDetails::-webkit-scrollbar {
            display: none;
          }

          .detail {
            flex:
              0
              0
              auto;

            min-width: 125px;
          }

          .categoryNav {
            padding-left:
              20px;

            padding-right:
              20px;
          }

          .content {
            padding-left:
              20px;

            padding-right:
              20px;
          }

          .smokeLeft {
            left: -80px;
          }

          .smokeRight {
            right: -85px;
          }

          .smokeCenter {
            left: 43%;

            opacity: 0.13;
          }

          .smokeStream {
            transform:
              scale(0.8);
          }

          .modalOverlay {
            padding: 0;

            align-items:
              flex-end;
          }

          .modal {
            max-height: 92vh;

            border-radius:
              25px
              25px
              0
              0;

            border-left: 0;
            border-right: 0;
            border-bottom: 0;

            padding:
              15px
              20px
              20px;
          }

          .modalHandle {
            display: block;
          }

          .modalTop h2 {
            font-size: 22px;
          }

          .modalFooter {
            bottom: -20px;

            margin:
              0
              -20px
              -20px;

            padding:
              15px
              20px;
          }

          .confirm {
            padding:
              13px
              15px;

            font-size: 12px;
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .smokeStream,
          .smokePuff {
            animation: none;
          }

          .smokeLayer {
            opacity: 0.25;
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
  index,
  abrirProduto
}) {
  return (
    <section
      id={`categoria-${categoria.id}`}
      className="category"
      style={{
        animationDelay:
          `${index * 0.08}s`
      }}
    >
      <div className="categoryHeader">

        <div>

          <span className="categoryNumber">
            {String(index + 1).padStart(
              2,
              '0'
            )}
          </span>

          <h2>
            {categoria.name}
          </h2>

        </div>

        <div className="categoryLine" />

      </div>

      <div className="products">

        {produtos.map(
          (produto, productIndex) => (
            <Produto
              key={produto.id}
              produto={produto}
              dinheiro={dinheiro}
              index={productIndex}
              abrirProduto={abrirProduto}
            />
          )
        )}

      </div>

      <style jsx>{`
        .category {
          padding-top: 42px;

          scroll-margin-top:
            20px;

          opacity: 0;

          animation:
            revealCategory
            0.65s
            ease
            forwards;
        }

        @keyframes revealCategory {
          from {
            opacity: 0;

            transform:
              translateY(20px);
          }

          to {
            opacity: 1;

            transform:
              translateY(0);
          }
        }

        .categoryHeader {
          display: flex;

          align-items:
            flex-end;

          gap: 18px;

          margin-bottom:
            17px;
        }

        .categoryHeader
          > div:first-child {
          flex-shrink: 0;
        }

        .categoryNumber {
          display: block;

          color:
            var(--primary);

          font-size: 9px;

          font-weight: 800;

          letter-spacing:
            2px;

          margin-bottom: 5px;
        }

        h2 {
          margin: 0;

          color: #f4f1eb;

          font-size: 28px;

          line-height: 1;

          text-transform:
            uppercase;

          letter-spacing:
            -0.5px;
        }

        .categoryLine {
          flex: 1;

          height: 1px;

          margin-bottom: 4px;

          background:
            linear-gradient(
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

        @media (
          max-width: 600px
        ) {
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
  index,
  abrirProduto
}) {
  const [tocando, setTocando] =
    useState(false);

  function clicar() {
    setTocando(true);

    setTimeout(() => {
      setTocando(false);
    }, 300);

    abrirProduto(produto);
  }

  return (
    <article
      className={`product ${
        tocando ? 'touch' : ''
      }`}
      style={{
        animationDelay:
          `${index * 0.07}s`
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

        {produto.featured &&
          !produto.image_url && (
            <span className="featuredText">
              ★ DESTAQUE
            </span>
          )}

        <div className="titleRow">

          <h3>
            {produto.name}
          </h3>

          <span className="titleLine" />

          <strong>
            {dinheiro(
              produto.price
            )}
          </strong>

        </div>

        {produto.description && (
          <p>
            {produto.description}
          </p>
        )}

        <button
          type="button"
          onClick={clicar}
        >
          <span>
            Adicionar
          </span>

          <span className="plus">
            +
          </span>
        </button>

      </div>

      <div className="cardGlow" />

      <style jsx>{`
        .product {
          min-height: 190px;

          display: grid;

          grid-template-columns:
            minmax(
              230px,
              43%
            )
            1fr;

          overflow: hidden;

          position: relative;

          border-radius:
            22px;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 28%,
              #313131
            );

          background:
            linear-gradient(
              135deg,
              rgba(
                255,
                255,
                255,
                0.055
              ),
              rgba(
                255,
                255,
                255,
                0.018
              )
            ),
            #121316;

          box-shadow:
            0 18px 50px
              rgba(
                0,
                0,
                0,
                0.28
              );

          opacity: 0;

          animation:
            revealProduct
            0.6s
            ease
            forwards;

          transition:
            transform
              0.28s ease,
            border-color
              0.28s ease;
        }

        @keyframes revealProduct {
          from {
            opacity: 0;

            transform:
              translateY(24px)
              scale(0.98);
          }

          to {
            opacity: 1;

            transform:
              translateY(0)
              scale(1);
          }
        }

        .product.touch {
          transform:
            scale(0.985);
        }

        .imageSide {
          min-height: 190px;

          position: relative;

          overflow: hidden;

          background: #18191d;
        }

        .imageSide img {
          position: absolute;

          inset: 0;

          width: 100%;
          height: 100%;

          object-fit: cover;
        }

        .imageShade {
          position: absolute;

          inset: 0;

          background:
            linear-gradient(
              90deg,
              transparent 55%,
              rgba(
                18,
                19,
                22,
                0.6
              )
            );
        }

        .featured {
          position: absolute;

          left: 14px;
          top: 14px;

          z-index: 2;

          background:
            rgba(
              8,
              8,
              8,
              0.75
            );

          border:
            1px solid
            var(--primary);

          color:
            var(--primary);

          padding:
            7px
            10px;

          border-radius:
            100px;

          font-size: 8px;

          font-weight: 900;

          letter-spacing: 1px;
        }

        .info {
          padding:
            25px
            25px
            22px;

          position: relative;

          z-index: 2;

          display: flex;

          flex-direction: column;

          justify-content:
            center;
        }

        .titleRow {
          display: flex;

          align-items:
            center;

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

          background:
            linear-gradient(
              90deg,
              var(--primary),
              transparent
            );

          opacity: 0.4;
        }

        .titleRow strong {
          flex-shrink: 0;

          color:
            var(--primary);

          font-size: 17px;
        }

        p {
          color: #8e9095;

          font-size: 12px;

          line-height: 1.55;

          margin:
            11px
            0
            20px;

          max-width: 430px;
        }

        button {
          width: fit-content;

          min-width: 126px;

          border:
            1px solid
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

          border-radius:
            11px;

          padding:
            10px
            12px
            10px
            15px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 18px;

          font-size: 11px;

          font-weight: 800;

          cursor: pointer;
        }

        .plus {
          width: 22px;
          height: 22px;

          border-radius: 50%;

          display: grid;

          place-items: center;

          background:
            var(--primary);

          color: white;

          font-size: 17px;

          line-height: 1;
        }

        .featuredText {
          color:
            var(--primary);

          font-size: 8px;

          font-weight: 900;

          letter-spacing:
            1.5px;

          margin-bottom: 10px;
        }

        .cardGlow {
          position: absolute;

          width: 180px;
          height: 180px;

          right: -100px;
          bottom: -120px;

          background:
            var(--primary);

          border-radius: 50%;

          filter:
            blur(80px);

          opacity: 0.06;

          pointer-events: none;
        }

        @media (
          max-width: 600px
        ) {
          .product {
            min-height: 160px;

            grid-template-columns:
              42%
              58%;

            border-radius:
              18px;
          }

          .imageSide {
            min-height: 160px;
          }

          .info {
            padding:
              18px
              15px;
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

            margin:
              8px
              0
              13px;

            display:
              -webkit-box;

            -webkit-line-clamp: 2;

            -webkit-box-orient:
              vertical;

            overflow: hidden;
          }

          button {
            min-width: 105px;

            padding:
              8px
              9px
              8px
              12px;

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
