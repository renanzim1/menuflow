'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';

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

        const idsProdutos = listaProdutos.map(
          (produto) => produto.id
        );

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
            console.error(
              'Erro ao carregar grupos:',
              groupError
            );
          } else {
            groupData = grupos || [];
          }

          const idsGrupos = groupData.map(
            (grupo) => grupo.id
          );

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
              console.error(
                'Erro ao carregar adicionais:',
                addonError
              );
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

  function abrirProduto(produto) {
    const grupos = gruposDoProduto(produto.id);

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
            (itemId) => itemId !== adicional.id
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

    const grupos = gruposDoProduto(
      produtoAberto.id
    );

    const pendente = grupos.find((grupo) => {
      if (!grupo.required) return false;

      const quantidade =
        (selecionados[grupo.id] || []).length;

      const minimo = Math.max(
        1,
        Number(grupo.min_select) || 1
      );

      return quantidade < minimo;
    });

    if (pendente) {
      alert(
        `Escolha uma opção em "${pendente.name}".`
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
        <div className="loader">🍽️</div>

        <strong>
          Preparando o cardápio...
        </strong>

        <style jsx>{`
          .loading {
            min-height: 100vh;
            background: #05070d;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            font-family: Arial, sans-serif;
          }

          .loader {
            font-size: 48px;
            animation: pulse 1.5s infinite;
          }

          @keyframes pulse {
            50% {
              transform: scale(1.12);
              opacity: 0.6;
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

          {erro && <small>{erro}</small>}
        </div>

        <style jsx>{`
          .notFound {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 30px;
            text-align: center;
            background: #05070d;
            color: white;
            font-family: Arial, sans-serif;
          }

          .notFoundIcon {
            font-size: 52px;
          }

          small {
            color: #ff7777;
          }
        `}</style>
      </main>
    );
  }

  const primaria =
    restaurante.primary_color || '#2455ff';

  const secundaria =
    restaurante.secondary_color || '#111827';

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
      <div className="backgroundGlow glow1" />
      <div className="backgroundGlow glow2" />

      <div className="smoke smoke1" />
      <div className="smoke smoke2" />

      <div className="menu">

        {/* TOPO */}

        <header className="hero">

          <div className="heroDecoration" />

          <div className="heroBrand">

            {restaurante.logo_url ? (
              <div className="logoBox">
                <img
                  src={restaurante.logo_url}
                  alt={`Logo ${restaurante.name}`}
                  className="logo"
                  style={{
                    left: `${logoPositionX}%`,
                    top: `${logoPositionY}%`,
                    transform: `translate(-50%, -50%) scale(${logoZoom})`
                  }}
                />
              </div>
            ) : (
              <div className="logoFallback">
                🍽️
              </div>
            )}

            <div className="heroTitle">

              <div className="brandLine">
                <span />
                <small>RESTAURANTE</small>
                <span />
              </div>

              <h1>
                {restaurante.name}
              </h1>

              <p>
                SABOR EM CADA PEDIDO
              </p>

            </div>

          </div>

        </header>

        {/* CATEGORIAS */}

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

        {/* CONTEÚDO */}

        <section className="content">

          {produtos.length === 0 ? (
            <div className="empty">
              <div>🍽️</div>

              <h2>
                Nosso menu está sendo preparado
              </h2>

              <p>
                Em breve teremos novidades.
              </p>
            </div>
          ) : (
            <>
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
            </>
          )}

        </section>

        {/* RODAPÉ */}

        <footer className="restaurantFooter">

          <div className="footerInfo">

            {restaurante.address && (
              <div className="footerItem">

                <span className="footerIcon">
                  📍
                </span>

                <div>
                  <strong>
                    {restaurante.address}
                  </strong>

                  <small>
                    Endereço do restaurante
                  </small>
                </div>

              </div>
            )}

            <div className="footerItem">

              <span className="footerIcon">
                🛵
              </span>

              <div>
                <strong>
                  {Number(
                    restaurante.delivery_fee || 0
                  ) === 0
                    ? 'Entrega grátis'
                    : `Entrega ${dinheiro(
                        restaurante.delivery_fee
                      )}`}
                </strong>

                {Number(
                  restaurante.minimum_order || 0
                ) > 0 && (
                  <small>
                    Mínimo{' '}
                    {dinheiro(
                      restaurante.minimum_order
                    )}
                  </small>
                )}
              </div>

            </div>

            {restaurante.whatsapp && (
              <div className="footerItem">

                <span className="footerIcon">
                  📱
                </span>

                <div>
                  <strong>
                    {restaurante.whatsapp}
                  </strong>

                  <small>
                    Faça seu pedido
                  </small>
                </div>

              </div>
            )}

          </div>

          <div className="footerBrand">

            <span />

            <div>
              <strong>
                {restaurante.name}
              </strong>

              <small>
                CARDÁPIO DIGITAL
              </small>
            </div>

            <span />

          </div>

          <p className="menuflow">
            MenuFlow
          </p>

        </footer>

      </div>

      {/* MODAL */}

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

                          {grupo.max_select || 1}
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
                              key={adicional.id}
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
                <small>TOTAL</small>

                <strong>
                  {dinheiro(totalModal)}
                </strong>
              </div>

              <button
                type="button"
                className="confirm"
                onClick={confirmarProduto}
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
          background: #05070d;
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

          position: relative;

          overflow: hidden;

          color: #f7f7f7;

          font-family:
            Arial,
            Helvetica,
            sans-serif;

          background:
            radial-gradient(
              circle at 50% -10%,
              color-mix(
                in srgb,
                var(--primary) 12%,
                transparent
              ),
              transparent 30%
            ),
            linear-gradient(
              180deg,
              #060811 0%,
              #080a13 55%,
              #05070b 100%
            );
        }

        .menu {
          position: relative;

          z-index: 5;

          width: 100%;

          max-width: 1180px;

          min-height: 100vh;

          margin: 0 auto;
        }

        .backgroundGlow {
          position: fixed;

          width: 400px;
          height: 400px;

          border-radius: 50%;

          filter: blur(120px);

          pointer-events: none;

          opacity: 0.08;
        }

        .glow1 {
          left: -200px;
          top: 30%;

          background:
            var(--primary);
        }

        .glow2 {
          right: -200px;
          bottom: 10%;

          background:
            var(--primary);
        }

        /* FUMAÇA SUTIL */

        .smoke {
          position: fixed;

          bottom: -280px;

          width: 360px;
          height: 360px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(
                255,
                255,
                255,
                0.07
              ),
              rgba(
                255,
                255,
                255,
                0.02
              ) 45%,
              transparent 72%
            );

          filter: blur(38px);

          pointer-events: none;

          z-index: 1;

          opacity: 0;

          will-change:
            transform,
            opacity;
        }

        .smoke1 {
          left: -120px;

          animation:
            smokeFloatOne
            22s
            linear
            infinite;
        }

        .smoke2 {
          right: -130px;

          animation:
            smokeFloatTwo
            27s
            linear
            infinite
            7s;
        }

        @keyframes smokeFloatOne {
          0% {
            transform:
              translate3d(
                0,
                0,
                0
              )
              scale(0.8);

            opacity: 0;
          }

          15% {
            opacity: 0.25;
          }

          55% {
            transform:
              translate3d(
                80px,
                -65vh,
                0
              )
              scale(1.35);

            opacity: 0.15;
          }

          100% {
            transform:
              translate3d(
                -20px,
                -125vh,
                0
              )
              scale(1.8);

            opacity: 0;
          }
        }

        @keyframes smokeFloatTwo {
          0% {
            transform:
              translate3d(
                0,
                0,
                0
              )
              scale(0.7);

            opacity: 0;
          }

          18% {
            opacity: 0.2;
          }

          60% {
            transform:
              translate3d(
                -90px,
                -70vh,
                0
              )
              scale(1.4);

            opacity: 0.12;
          }

          100% {
            transform:
              translate3d(
                20px,
                -125vh,
                0
              )
              scale(1.9);

            opacity: 0;
          }
        }

        /* CABEÇALHO */

        .hero {
          min-height: 170px;

          position: relative;

          display: flex;

          align-items: center;

          justify-content: center;

          padding: 25px 24px;

          overflow: hidden;

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.12
            );

          background:
            linear-gradient(
              180deg,
              rgba(
                255,
                255,
                255,
                0.025
              ),
              rgba(
                0,
                0,
                0,
                0.1
              )
            );
        }

        .heroDecoration {
          position: absolute;

          inset: 0;

          background:
            radial-gradient(
              circle at 20% 20%,
              color-mix(
                in srgb,
                var(--primary) 12%,
                transparent
              ),
              transparent 30%
            );

          pointer-events: none;
        }

        .heroBrand {
          position: relative;

          z-index: 2;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 22px;

          width: 100%;
        }

        .logoBox,
        .logoFallback {
          width: 105px;
          height: 105px;

          flex:
            0 0 105px;

          border-radius: 22px;

          position: relative;

          overflow: hidden;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 60%,
              #ffffff
            );

          background: #0b0d13;

          box-shadow:
            0 0 30px
            color-mix(
              in srgb,
              var(--primary) 12%,
              transparent
            );
        }

        .logo {
          position: absolute;

          width: 100%;
          height: 100%;

          object-fit: contain;

          transform-origin:
            center center;

          user-select: none;
        }

        .logoFallback {
          display: grid;
          place-items: center;

          font-size: 42px;
        }

        .heroTitle {
          text-align: center;

          min-width: 0;
        }

        .brandLine {
          display: flex;

          align-items: center;

          justify-content: center;

          gap: 10px;

          margin-bottom: 5px;
        }

        .brandLine span {
          width: 55px;
          height: 1px;

          background:
            var(--primary);
        }

        .brandLine small {
          color:
            color-mix(
              in srgb,
              var(--primary) 75%,
              white
            );

          letter-spacing: 3px;

          font-size: 9px;
        }

        .hero h1 {
          margin: 5px 0;

          font-size:
            clamp(
              30px,
              6vw,
              52px
            );

          line-height: 1;

          text-transform: uppercase;

          letter-spacing: -1px;
        }

        .heroTitle p {
          margin: 9px 0 0;

          font-size: 9px;

          letter-spacing: 3px;

          color: #b8b8b8;
        }

        /* NAVEGAÇÃO */

        .categoryNav {
          position: sticky;

          top: 0;

          z-index: 100;

          display: flex;

          gap: 12px;

          overflow-x: auto;

          padding: 14px 24px;

          scrollbar-width: none;

          background:
            rgba(
              5,
              7,
              13,
              0.9
            );

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          backdrop-filter:
            blur(18px);
        }

        .categoryNav::-webkit-scrollbar {
          display: none;
        }

        .categoryNav button {
          flex:
            1 0 auto;

          min-width: 125px;

          padding: 11px 20px;

          border-radius: 100px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.18
            );

          background:
            rgba(
              255,
              255,
              255,
              0.02
            );

          color: #f4f4f4;

          text-transform: uppercase;

          font-size: 11px;

          font-weight: 800;

          cursor: pointer;

          transition:
            0.2s ease;
        }

        .categoryNav button:active {
          background:
            color-mix(
              in srgb,
              var(--primary) 22%,
              transparent
            );

          border-color:
            var(--primary);

          box-shadow:
            0 0 20px
            color-mix(
              in srgb,
              var(--primary) 25%,
              transparent
            );

          transform:
            scale(0.96);
        }

        /* CONTEÚDO */

        .content {
          width: 100%;

          padding:
            10px
            24px
            45px;
        }

        .empty {
          margin: 50px auto;

          max-width: 700px;

          padding: 50px 20px;

          text-align: center;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.1
            );

          border-radius: 22px;

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );
        }

        .empty div {
          font-size: 45px;
        }

        .empty p {
          color: #888;
        }

        /* RODAPÉ */

        .restaurantFooter {
          padding:
            25px
            24px
            30px;

          border-top:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 40%,
              #222
            );

          background:
            rgba(
              0,
              0,
              0,
              0.22
            );
        }

        .footerInfo {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 20px;

          max-width: 900px;

          margin: 0 auto;
        }

        .footerItem {
          display: flex;

          align-items: center;

          gap: 12px;

          min-width: 0;
        }

        .footerIcon {
          font-size: 25px;
        }

        .footerItem div {
          display: grid;

          gap: 4px;

          min-width: 0;
        }

        .footerItem strong {
          font-size: 12px;

          overflow: hidden;

          text-overflow: ellipsis;
        }

        .footerItem small {
          color: #888;

          font-size: 10px;
        }

        .footerBrand {
          display: flex;

          align-items: center;

          justify-content: center;

          gap: 12px;

          margin-top: 28px;

          text-align: center;
        }

        .footerBrand > span {
          width: 70px;
          height: 1px;

          background:
            var(--primary);
        }

        .footerBrand div {
          display: grid;

          gap: 3px;
        }

        .footerBrand strong {
          font-size: 12px;

          text-transform: uppercase;
        }

        .footerBrand small {
          color: #777;

          font-size: 7px;

          letter-spacing: 2px;
        }

        .menuflow {
          margin:
            15px
            0
            0;

          text-align: center;

          color: #505158;

          font-size: 9px;

          letter-spacing: 2px;
        }

        /* MODAL */

        .modalOverlay {
          position: fixed;

          inset: 0;

          z-index: 9999;

          display: flex;

          align-items: flex-end;

          justify-content: center;

          padding: 20px;

          background:
            rgba(
              0,
              0,
              0,
              0.78
            );

          backdrop-filter:
            blur(8px);
        }

        .modal {
          width: 100%;

          max-width: 620px;

          max-height: 88vh;

          overflow-y: auto;

          padding: 24px;

          border-radius: 25px;

          color: white;

          background: #101219;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 35%,
              #333
            );

          box-shadow:
            0 -20px 70px
            rgba(
              0,
              0,
              0,
              0.65
            );
        }

        .modalHandle {
          display: none;

          width: 45px;
          height: 4px;

          margin:
            0
            auto
            18px;

          border-radius: 10px;

          background: #3c3d42;
        }

        .modalTop {
          display: flex;

          justify-content:
            space-between;

          align-items:
            flex-start;

          gap: 20px;

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

          letter-spacing: 1.7px;
        }

        .modalTop h2 {
          margin: 7px 0;

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

          gap: 15px;
        }

        .addonGroup h3 {
          margin: 0 0 4px;

          font-size: 17px;
        }

        .addonGroup small {
          color: #85878d;
        }

        .required {
          height: fit-content;

          color:
            var(--primary);

          border:
            1px solid
            var(--primary);

          padding: 5px 8px;

          border-radius: 100px;

          font-size: 7px;

          font-weight: 900;
        }

        .addonList {
          display: grid;

          gap: 9px;
        }

        .addonItem {
          width: 100%;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 15px;

          padding: 14px;

          text-align: left;

          color: white;

          border-radius: 14px;

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
          width: 28px;
          height: 28px;

          flex:
            0 0 28px;

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
              16,
              18,
              25,
              0.97
            );

          border-top:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
        }

        .total {
          display: grid;

          gap: 3px;
        }

        .total small {
          color: #777;

          font-size: 8px;

          letter-spacing: 1.5px;
        }

        .total strong {
          color:
            var(--primary);

          font-size: 20px;
        }

        .confirm {
          border: 0;

          padding:
            14px
            18px;

          border-radius: 12px;

          color: white;

          background:
            var(--primary);

          font-weight: 800;

          cursor: pointer;
        }

        /* CELULAR */

        @media (max-width: 650px) {
          .menu {
            max-width: none;
          }

          .hero {
            min-height: 145px;

            padding:
              18px
              15px;
          }

          .heroBrand {
            gap: 12px;
          }

          .logoBox,
          .logoFallback {
            width: 76px;
            height: 76px;

            flex-basis: 76px;

            border-radius: 17px;
          }

          .hero h1 {
            font-size: 28px;

            line-height: 0.98;
          }

          .brandLine span {
            width: 35px;
          }

          .brandLine small {
            font-size: 7px;

            letter-spacing: 2px;
          }

          .heroTitle p {
            font-size: 7px;

            letter-spacing: 2px;
          }

          .categoryNav {
            padding:
              12px
              14px;

            gap: 9px;
          }

          .categoryNav button {
            min-width: 120px;

            padding:
              10px
              15px;

            font-size: 10px;
          }

          .content {
            padding:
              4px
              12px
              30px;
          }

          .restaurantFooter {
            padding:
              22px
              16px
              26px;
          }

          .footerInfo {
            grid-template-columns:
              repeat(
                3,
                minmax(0, 1fr)
              );

            gap: 8px;
          }

          .footerItem {
            align-items:
              flex-start;

            gap: 6px;
          }

          .footerIcon {
            font-size: 17px;
          }

          .footerItem strong {
            font-size: 9px;
          }

          .footerItem small {
            font-size: 7px;
          }

          .footerBrand {
            margin-top: 22px;
          }

          .modalOverlay {
            padding: 0;
          }

          .modal {
            max-height: 92vh;

            padding:
              15px
              20px
              20px;

            border-radius:
              25px
              25px
              0
              0;

            border-left: 0;
            border-right: 0;
            border-bottom: 0;
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
              14px;

            font-size: 11px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .smoke {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

/* ============================================================
   CATEGORIA
============================================================ */

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

        <div className="categoryTitle">

          <span className="number">
            {String(index + 1).padStart(
              2,
              '0'
            )}
          </span>

          <h2>
            {categoria.name}
          </h2>

        </div>

        <div className="line" />

        <span className="phrase">
          SABOR
          <br />
          EM CADA PEDIDO
        </span>

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
          width: 100%;

          padding-top: 32px;

          scroll-margin-top:
            75px;

          opacity: 0;

          animation:
            reveal
            0.55s
            ease
            forwards;
        }

        @keyframes reveal {
          from {
            opacity: 0;

            transform:
              translateY(16px);
          }

          to {
            opacity: 1;

            transform:
              translateY(0);
          }
        }

        .categoryHeader {
          width: 100%;

          display: flex;

          align-items:
            flex-end;

          gap: 15px;

          padding:
            0
            5px
            15px;
        }

        .categoryTitle {
          flex-shrink: 0;
        }

        .number {
          display: block;

          margin-bottom: 5px;

          color:
            var(--primary);

          font-size: 10px;

          font-weight: 900;

          letter-spacing: 2px;
        }

        h2 {
          margin: 0;

          color: #f5f5f5;

          font-size:
            clamp(
              25px,
              5vw,
              37px
            );

          line-height: 0.95;

          text-transform:
            uppercase;

          letter-spacing:
            -1px;
        }

        .line {
          flex: 1;

          min-width: 20px;

          height: 1px;

          margin-bottom: 8px;

          background:
            linear-gradient(
              90deg,
              var(--primary),
              transparent
            );
        }

        .phrase {
          flex-shrink: 0;

          margin-bottom: 1px;

          color:
            color-mix(
              in srgb,
              var(--primary) 55%,
              #ffdca2
            );

          text-align: right;

          font-size: 8px;

          font-weight: 800;

          line-height: 1.4;

          letter-spacing:
            1.5px;
        }

        .products {
          display: grid;

          gap: 12px;
        }

        @media (max-width: 650px) {
          .category {
            padding-top: 28px;
          }

          .categoryHeader {
            gap: 10px;

            padding-bottom: 12px;
          }

          h2 {
            font-size: 27px;
          }

          .phrase {
            max-width: 85px;

            font-size: 7px;
          }

          .products {
            gap: 10px;
          }
        }
      `}</style>
    </section>
  );
}

/* ============================================================
   PRODUTO
============================================================ */

function Produto({
  produto,
  dinheiro,
  index,
  abrirProduto
}) {
  const [pressionado, setPressionado] =
    useState(false);

  function clicar() {
    setPressionado(true);

    setTimeout(() => {
      setPressionado(false);
    }, 220);

    abrirProduto(produto);
  }

  return (
    <article
      className={`product ${
        pressionado ? 'pressed' : ''
      }`}
      style={{
        animationDelay:
          `${index * 0.06}s`
      }}
    >

      <div className="imageSide">

        {produto.image_url ? (
          <img
            src={produto.image_url}
            alt={produto.name}
          />
        ) : (
          <div className="noImage">
            🍽️
          </div>
        )}

        <div className="imageShade" />

        {produto.featured && (
          <span className="featured">
            ★ DESTAQUE
          </span>
        )}

      </div>

      <div className="productInfo">

        <div className="text">

          <h3>
            {produto.name}
          </h3>

          {produto.description && (
            <p>
              {produto.description}
            </p>
          )}

          <strong className="price">
            {dinheiro(
              produto.price
            )}
          </strong>

        </div>

        <button
          type="button"
          className="add"
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

      <div className="edgeGlow" />

      <style jsx>{`
        .product {
          width: 100%;

          min-height: 150px;

          display: grid;

          grid-template-columns:
            minmax(
              250px,
              37%
            )
            1fr;

          position: relative;

          overflow: hidden;

          border-radius: 20px;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 32%,
              #676767
            );

          background:
            linear-gradient(
              120deg,
              #15171c,
              #0d1017
            );

          box-shadow:
            0 14px 40px
              rgba(
                0,
                0,
                0,
                0.25
              );

          opacity: 0;

          animation:
            productReveal
            0.5s
            ease
            forwards;

          transition:
            transform
            0.2s ease;
        }

        @keyframes productReveal {
          from {
            opacity: 0;

            transform:
              translateY(14px);
          }

          to {
            opacity: 1;

            transform:
              translateY(0);
          }
        }

        .product.pressed {
          transform:
            scale(0.99);
        }

        .imageSide {
          position: relative;

          min-height: 150px;

          overflow: hidden;

          background: #111;
        }

        .imageSide img {
          position: absolute;

          inset: 0;

          width: 100%;
          height: 100%;

          object-fit: cover;

          display: block;
        }

        .noImage {
          width: 100%;
          height: 100%;

          min-height: 150px;

          display: grid;

          place-items: center;

          font-size: 38px;

          background:
            radial-gradient(
              circle,
              #1c2029,
              #0d0f14
            );
        }

        .imageShade {
          position: absolute;

          inset: 0;

          background:
            linear-gradient(
              90deg,
              transparent 65%,
              rgba(
                13,
                16,
                23,
                0.55
              )
            );

          pointer-events: none;
        }

        .featured {
          position: absolute;

          left: 10px;
          top: 10px;

          z-index: 3;

          padding:
            5px
            8px;

          border-radius: 100px;

          color:
            var(--primary);

          border:
            1px solid
            var(--primary);

          background:
            rgba(
              0,
              0,
              0,
              0.7
            );

          font-size: 7px;

          font-weight: 900;

          letter-spacing: 1px;
        }

        .productInfo {
          min-width: 0;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 20px;

          padding:
            20px
            20px;
        }

        .text {
          min-width: 0;

          flex: 1;
        }

        h3 {
          margin: 0;

          color: #f7f7f7;

          font-size: 20px;

          line-height: 1.15;
        }

        p {
          margin:
            6px
            0
            15px;

          color: #a4a6ab;

          font-size: 12px;

          line-height: 1.4;
        }

        .price {
          display: block;

          color:
            var(--primary);

          font-size: 21px;

          line-height: 1;
        }

        .add {
          flex:
            0 0 auto;

          min-width: 145px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 18px;

          padding:
            10px
            10px
            10px
            17px;

          color: white;

          border-radius: 100px;

          border:
            1px solid
            var(--primary);

          background:
            color-mix(
              in srgb,
              var(--primary) 10%,
              transparent
            );

          box-shadow:
            0 0 20px
            color-mix(
              in srgb,
              var(--primary) 8%,
              transparent
            );

          font-size: 11px;

          font-weight: 800;

          cursor: pointer;
        }

        .plus {
          width: 31px;
          height: 31px;

          display: grid;

          place-items: center;

          border-radius: 50%;

          color: white;

          background:
            var(--primary);

          box-shadow:
            0 0 14px
            color-mix(
              in srgb,
              var(--primary) 55%,
              transparent
            );

          font-size: 22px;

          line-height: 1;
        }

        .edgeGlow {
          position: absolute;

          right: 0;
          bottom: 0;

          width: 45%;
          height: 1px;

          background:
            linear-gradient(
              90deg,
              transparent,
              var(--primary)
            );

          opacity: 0.55;

          pointer-events: none;
        }

        /* CELULAR */

        @media (max-width: 650px) {
          .product {
            min-height: 132px;

            grid-template-columns:
              37%
              63%;

            border-radius: 17px;
          }

          .imageSide,
          .noImage {
            min-height: 132px;
          }

          .productInfo {
            gap: 7px;

            padding:
              13px
              10px
              13px
              12px;
          }

          h3 {
            font-size: 15px;
          }

          p {
            margin:
              4px
              0
              10px;

            font-size: 9px;

            line-height: 1.3;

            display:
              -webkit-box;

            -webkit-line-clamp: 2;

            -webkit-box-orient:
              vertical;

            overflow: hidden;
          }

          .price {
            font-size: 18px;
          }

          .add {
            min-width: 0;

            padding:
              7px;

            border-radius: 100px;

            gap: 0;
          }

          .add > span:first-child {
            display: none;
          }

          .plus {
            width: 29px;
            height: 29px;

            font-size: 21px;
          }
        }

        @media (min-width: 420px) and (max-width: 650px) {
          .productInfo {
            padding:
              14px
              12px
              14px
              15px;
          }

          .add {
            min-width: 108px;

            padding:
              7px
              7px
              7px
              13px;

            gap: 9px;
          }

          .add > span:first-child {
            display: inline;
          }

          .plus {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
    </article>
  );
          }
