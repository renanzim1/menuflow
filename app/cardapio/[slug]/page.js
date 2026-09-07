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

        if (restaurantError) throw restaurantError;

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

        if (categoryError) throw categoryError;

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

        if (productError) throw productError;

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

          if (!groupError) {
            groupData = grupos || [];

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

              if (!addonError) {
                addonData = itens || [];
              }
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
    function atualizar() {
      if (document.visibilityState === 'visible') {
        carregarCardapio(false);
      }
    }

    function atualizarFoco() {
      carregarCardapio(false);
    }

    document.addEventListener('visibilitychange', atualizar);
    window.addEventListener('focus', atualizarFoco);

    return () => {
      document.removeEventListener('visibilitychange', atualizar);
      window.removeEventListener('focus', atualizarFoco);
    };
  }, [carregarCardapio]);

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
      const existe = listaAtual.includes(adicional.id);

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
        [grupo.id]: [...listaAtual, adicional.id]
      };
    });
  }

  function confirmarProduto() {
    if (!produtoAberto) return;

    const grupos = gruposDoProduto(produtoAberto.id);

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
      alert(`Escolha uma opção em "${pendente.name}".`);
      return;
    }

    alert(
      `"${produtoAberto.name}" configurado. Na próxima etapa vamos ligar isso ao carrinho.`
    );

    fecharProduto();
  }

  const totalModal = useMemo(() => {
    if (!produtoAberto) return 0;

    let total = Number(produtoAberto.price || 0);

    Object.values(selecionados)
      .flat()
      .forEach((id) => {
        const adicional = adicionais.find(
          (item) => item.id === id
        );

        if (adicional) {
          total += Number(adicional.price || 0);
        }
      });

    return total;
  }, [produtoAberto, selecionados, adicionais]);

  if (carregando) {
    return (
      <main className="loading">
        <div className="plate">🍽️</div>
        <strong>Preparando o cardápio...</strong>

        <style jsx>{`
          .loading {
            min-height: 100vh;
            display: grid;
            place-content: center;
            justify-items: center;
            gap: 16px;
            background: #07080c;
            color: white;
            font-family: Arial, sans-serif;
          }

          .plate {
            font-size: 48px;
            animation: pulse 1.5s infinite;
          }

          @keyframes pulse {
            50% {
              transform: scale(1.1);
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
          <div>🍽️</div>
          <h1>Cardápio não encontrado</h1>
          <p>Este restaurante não está disponível.</p>
          {erro && <small>{erro}</small>}
        </div>

        <style jsx>{`
          .notFound {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 30px;
            text-align: center;
            background: #07080c;
            color: white;
            font-family: Arial, sans-serif;
          }

          .notFound > div > div {
            font-size: 50px;
          }

          small {
            color: #ff7373;
          }
        `}</style>
      </main>
    );
  }

  const primaria =
    restaurante.primary_color || '#123cff';

  const secundaria =
    restaurante.secondary_color || '#050816';

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
        <header className="hero">
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
                  transform: `translate(-50%, -50%) scale(${logoZoom})`
                }}
              />
            </div>
          ) : (
            <div className="logoFallback">🍽️</div>
          )}

          <div className="heroLabel">
            <span />
            RESTAURANTE
            <span />
          </div>

          <h1>{restaurante.name}</h1>

          <div className="slogan">
            SABOR EM CADA PEDIDO
          </div>
        </header>

        {categorias.length > 0 && (
          <nav className="categoryNav">
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                onClick={() =>
                  scrollCategoria(categoria.id)
                }
              >
                {categoria.name}
              </button>
            ))}
          </nav>
        )}

        {produtos.length === 0 ? (
          <section className="empty">
            <span>🍽️</span>
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
                  abrirProduto={abrirProduto}
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
                abrirProduto={abrirProduto}
              />
            )}
          </section>
        )}

        <section className="restaurantInfo">
          {restaurante.address && (
            <div className="infoItem">
              <span className="infoIcon">📍</span>

              <div>
                <small>ENDEREÇO</small>
                <strong>{restaurante.address}</strong>
              </div>
            </div>
          )}

          <div className="infoItem">
            <span className="infoIcon">🛵</span>

            <div>
              <small>ENTREGA</small>
              <strong>
                {Number(restaurante.delivery_fee || 0) === 0
                  ? 'Entrega grátis'
                  : dinheiro(restaurante.delivery_fee)}
              </strong>
            </div>
          </div>

          {Number(restaurante.minimum_order || 0) > 0 && (
            <div className="infoItem">
              <span className="infoIcon">🛒</span>

              <div>
                <small>PEDIDO MÍNIMO</small>
                <strong>
                  {dinheiro(restaurante.minimum_order)}
                </strong>
              </div>
            </div>
          )}

          {restaurante.whatsapp && (
            <div className="infoItem">
              <span className="infoIcon">☎️</span>

              <div>
                <small>CONTATO</small>
                <strong>{restaurante.whatsapp}</strong>
              </div>
            </div>
          )}
        </section>

        <footer>
          <div className="footerBrand">
            <span />
            <strong>{restaurante.name}</strong>
            <span />
          </div>

          <small>
            CARDÁPIO DIGITAL • MENUFLOW
          </small>
        </footer>
      </div>

      {produtoAberto && (
        <div
          className="modalOverlay"
          onClick={fecharProduto}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHandle" />

            <div className="modalHeader">
              <div>
                <small>PERSONALIZE SEU PEDIDO</small>
                <h2>{produtoAberto.name}</h2>
                <strong>
                  {dinheiro(produtoAberto.price)}
                </strong>
              </div>

              <button
                className="close"
                type="button"
                onClick={fecharProduto}
              >
                ×
              </button>
            </div>

            <div className="addonGroups">
              {gruposDoProduto(produtoAberto.id).map(
                (grupo) => {
                  const itens =
                    adicionaisDoGrupo(grupo.id);

                  if (!itens.length) return null;

                  return (
                    <section
                      key={grupo.id}
                      className="addonGroup"
                    >
                      <div className="addonTitle">
                        <div>
                          <h3>{grupo.name}</h3>

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
                          <span>OBRIGATÓRIO</span>
                        )}
                      </div>

                      <div className="addonList">
                        {itens.map((adicional) => {
                          const marcado =
                            adicionalSelecionado(
                              grupo.id,
                              adicional.id
                            );

                          return (
                            <button
                              key={adicional.id}
                              type="button"
                              className={`addon ${
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

                                <small>
                                  {Number(
                                    adicional.price || 0
                                  ) === 0
                                    ? 'Sem acréscimo'
                                    : `+ ${dinheiro(
                                        adicional.price
                                      )}`}
                                </small>
                              </div>

                              <span className="check">
                                {marcado ? '✓' : '+'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                }
              )}
            </div>

            <div className="modalFooter">
              <div>
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

        html,
        body {
          margin: 0;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          background: #05060a;
        }

        html {
          scroll-behavior: smooth;
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
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
          color: #f6f5f2;
          background:
            radial-gradient(
              circle at 50% 5%,
              color-mix(
                in srgb,
                var(--primary) 10%,
                transparent
              ),
              transparent 28%
            ),
            linear-gradient(
              180deg,
              #070811 0%,
              #060712 42%,
              #08090d 100%
            );
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .menu {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          position: relative;
          z-index: 5;
        }

        .backgroundGlow {
          position: fixed;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.08;
          pointer-events: none;
        }

        .glow1 {
          top: 100px;
          left: -180px;
          background: var(--primary);
        }

        .glow2 {
          right: -180px;
          bottom: 100px;
          background: var(--primary);
        }

        .smoke {
          position: fixed;
          bottom: -180px;
          width: 250px;
          height: 350px;
          border-radius: 50%;
          background:
            radial-gradient(
              ellipse,
              rgba(255, 255, 255, 0.055),
              rgba(255, 255, 255, 0.018) 45%,
              transparent 72%
            );
          filter: blur(45px);
          opacity: 0;
          pointer-events: none;
          z-index: 1;
        }

        .smoke1 {
          left: -70px;
          animation: smoke 18s linear infinite;
        }

        .smoke2 {
          right: -70px;
          animation: smoke 22s linear infinite 7s;
        }

        @keyframes smoke {
          0% {
            transform: translateY(150px) scale(0.7);
            opacity: 0;
          }

          15% {
            opacity: 0.25;
          }

          55% {
            opacity: 0.13;
          }

          100% {
            transform: translateY(-120vh) scale(1.7);
            opacity: 0;
          }
        }

        .hero {
          width: 100%;
          padding: 34px 20px 25px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .logoBox,
        .logoFallback {
          width: 112px;
          height: 112px;
          border-radius: 26px;
          flex-shrink: 0;
        }

        .logoBox {
          position: relative;
          overflow: hidden;
          background: #0d0e13;
          border:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 60%,
              #353535
            );
          box-shadow:
            0 15px 40px rgba(0, 0, 0, 0.38),
            0 0 25px
              color-mix(
                in srgb,
                var(--primary) 12%,
                transparent
              );
        }

        .logoBox::after {
          content: '';
          position: absolute;
          inset: 5px;
          z-index: 5;
          pointer-events: none;
          border-radius: 21px;
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .logoGlow {
          position: absolute;
          inset: 20%;
          border-radius: 50%;
          background: var(--primary);
          filter: blur(35px);
          opacity: 0.13;
        }

        .logo {
          position: absolute;
          width: 100%;
          height: 100%;
          object-fit: contain;
          transform-origin: center;
          user-select: none;
          z-index: 2;
        }

        .logoFallback {
          display: grid;
          place-items: center;
          font-size: 40px;
          background:
            linear-gradient(
              135deg,
              var(--primary),
              var(--secondary)
            );
        }

        .heroLabel {
          margin-top: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--primary);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 4px;
        }

        .heroLabel span {
          display: block;
          width: 38px;
          height: 2px;
          background:
            linear-gradient(
              90deg,
              transparent,
              var(--primary)
            );
        }

        .heroLabel span:last-child {
          transform: rotate(180deg);
        }

        .hero h1 {
          width: 100%;
          margin: 7px 0 8px;
          font-size: clamp(30px, 8vw, 48px);
          line-height: 0.98;
          letter-spacing: -1.5px;
          text-transform: uppercase;
          overflow-wrap: anywhere;
        }

        .slogan {
          color: #9b9ca3;
          font-size: 9px;
          letter-spacing: 4px;
          font-weight: 700;
        }

        .categoryNav {
          width: 100%;
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 14px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(6, 7, 12, 0.9);
          scrollbar-width: none;
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(15px);
        }

        .categoryNav::-webkit-scrollbar {
          display: none;
        }

        .categoryNav button {
          min-width: 145px;
          flex: 1 0 auto;
          height: 45px;
          padding: 0 20px;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.02);
          color: #f2f2f2;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          white-space: nowrap;
          cursor: pointer;
        }

        .categoryNav button:active {
          border-color: var(--primary);
          color: var(--primary);
          background:
            color-mix(
              in srgb,
              var(--primary) 10%,
              transparent
            );
        }

        .content {
          width: 100%;
          padding: 0 16px 30px;
        }

        .empty {
          margin: 35px 16px;
          padding: 45px 20px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.025);
        }

        .empty span {
          font-size: 40px;
        }

        .empty p {
          color: #888a91;
        }

        .restaurantInfo {
          margin-top: 10px;
          padding: 24px 16px;
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 16px;
          border-top:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 30%,
              #222
            );
          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.05);
          background: rgba(0, 0, 0, 0.22);
        }

        .infoItem {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .infoIcon {
          font-size: 20px;
        }

        .infoItem div {
          min-width: 0;
        }

        .infoItem small {
          display: block;
          margin-bottom: 4px;
          color: var(--primary);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 1.3px;
        }

        .infoItem strong {
          display: block;
          color: #d7d7d7;
          font-size: 10px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        footer {
          padding: 24px 16px 35px;
          text-align: center;
        }

        .footerBrand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .footerBrand span {
          width: 40px;
          height: 1px;
          background: var(--primary);
          opacity: 0.6;
        }

        .footerBrand strong {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        footer small {
          color: #686970;
          font-size: 7px;
          letter-spacing: 2px;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          padding: 20px;
          background: rgba(0, 0, 0, 0.78);
          backdrop-filter: blur(8px);
        }

        .modal {
          width: 100%;
          max-width: 620px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
          border-radius: 25px;
          background: #111216;
          color: white;
          border:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 30%,
              #333
            );
        }

        .modalHandle {
          display: none;
          width: 45px;
          height: 4px;
          margin: 0 auto 18px;
          border-radius: 20px;
          background: #44464c;
        }

        .modalHeader {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .modalHeader small {
          color: var(--primary);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .modalHeader h2 {
          margin: 7px 0;
          font-size: 25px;
        }

        .modalHeader strong {
          color: var(--primary);
          font-size: 19px;
        }

        .close {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          border: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          font-size: 24px;
        }

        .addonGroups {
          display: grid;
          gap: 24px;
          padding: 22px 0;
        }

        .addonTitle {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .addonTitle h3 {
          margin: 0 0 4px;
          font-size: 16px;
        }

        .addonTitle small {
          color: #888a90;
          font-size: 10px;
        }

        .addonTitle > span {
          height: fit-content;
          padding: 5px 7px;
          border: 1px solid var(--primary);
          border-radius: 50px;
          color: var(--primary);
          font-size: 7px;
          font-weight: 900;
        }

        .addonList {
          display: grid;
          gap: 8px;
        }

        .addon {
          width: 100%;
          min-height: 58px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 12px 14px;
          text-align: left;
          color: white;
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
        }

        .addon.selected {
          border-color: var(--primary);
          background:
            color-mix(
              in srgb,
              var(--primary) 10%,
              #111216
            );
        }

        .addon > div {
          display: grid;
          gap: 4px;
        }

        .addon > div small {
          color: #888a90;
        }

        .check {
          width: 28px;
          height: 28px;
          flex: 0 0 28px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          font-weight: 900;
        }

        .modalFooter {
          position: sticky;
          bottom: -24px;
          margin: 0 -24px -24px;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: rgba(17, 18, 22, 0.97);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .modalFooter > div {
          display: grid;
          gap: 3px;
        }

        .modalFooter small {
          color: #777;
          font-size: 8px;
          letter-spacing: 1px;
        }

        .modalFooter strong {
          color: var(--primary);
          font-size: 19px;
        }

        .confirm {
          padding: 13px 16px;
          border: 0;
          border-radius: 12px;
          background: var(--primary);
          color: white;
          font-weight: 800;
        }

        @media (max-width: 600px) {
          .hero {
            padding: 25px 16px 21px;
          }

          .logoBox,
          .logoFallback {
            width: 96px;
            height: 96px;
            border-radius: 22px;
          }

          .logoBox::after {
            border-radius: 17px;
          }

          .heroLabel {
            margin-top: 14px;
            font-size: 8px;
            letter-spacing: 3px;
          }

          .heroLabel span {
            width: 30px;
          }

          .hero h1 {
            margin-top: 7px;
            font-size: clamp(28px, 9vw, 39px);
            letter-spacing: -1.3px;
          }

          .slogan {
            font-size: 8px;
            letter-spacing: 3px;
          }

          .categoryNav {
            padding: 12px;
            gap: 8px;
          }

          .categoryNav button {
            min-width: 130px;
            height: 42px;
            padding: 0 16px;
            font-size: 10px;
          }

          .content {
            padding:
              0
              12px
              25px;
          }

          .restaurantInfo {
            padding: 20px 16px;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .modalOverlay {
            padding: 0;
          }

          .modal {
            max-height: 92vh;
            padding: 15px 18px 20px;
            border-radius: 25px 25px 0 0;
            border-left: 0;
            border-right: 0;
            border-bottom: 0;
          }

          .modalHandle {
            display: block;
          }

          .modalFooter {
            bottom: -20px;
            margin:
              0
              -18px
              -20px;
            padding: 15px 18px;
          }

          .confirm {
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

function Categoria({
  categoria,
  produtos,
  dinheiro,
  index,
  abrirProduto
}) {
  const frases = [
    'TRADIÇÃO EM SABOR',
    'QUALIDADE EM CADA MORDIDA',
    'SABOR EM CADA PEDIDO',
    'REFRESQUE SEU DIA'
  ];

  return (
    <section
      id={`categoria-${categoria.id}`}
      className="category"
    >
      <div className="categoryHeader">
        <div className="categoryTitle">
          <span>
            {String(index + 1).padStart(2, '0')}
          </span>

          <h2>{categoria.name}</h2>
        </div>

        <div className="line" />

        <small>
          {frases[index % frases.length]}
        </small>
      </div>

      <div className="products">
        {produtos.map((produto) => (
          <Produto
            key={produto.id}
            produto={produto}
            dinheiro={dinheiro}
            abrirProduto={abrirProduto}
          />
        ))}
      </div>

      <style jsx>{`
        .category {
          width: 100%;
          padding-top: 31px;
          scroll-margin-top: 75px;
        }

        .categoryHeader {
          width: 100%;
          display: flex;
          align-items: flex-end;
          gap: 14px;
          margin-bottom: 14px;
        }

        .categoryTitle {
          flex: 0 1 auto;
          min-width: 0;
        }

        .categoryTitle span {
          display: block;
          margin-bottom: 5px;
          color: var(--primary);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        h2 {
          margin: 0;
          color: #f6f5f1;
          font-size: clamp(23px, 5vw, 31px);
          line-height: 1;
          letter-spacing: -0.7px;
          text-transform: uppercase;
          overflow-wrap: anywhere;
        }

        .line {
          flex: 1;
          min-width: 25px;
          height: 1px;
          margin-bottom: 5px;
          background:
            linear-gradient(
              90deg,
              var(--primary),
              transparent
            );
          opacity: 0.65;
        }

        .categoryHeader small {
          max-width: 105px;
          flex: 0 0 auto;
          margin-bottom: 1px;
          color:
            color-mix(
              in srgb,
              var(--primary) 60%,
              #ffd889
            );
          text-align: right;
          font-size: 7px;
          font-weight: 800;
          line-height: 1.4;
          letter-spacing: 1.5px;
        }

        .products {
          width: 100%;
          display: grid;
          gap: 10px;
        }

        @media (max-width: 600px) {
          .category {
            padding-top: 27px;
          }

          .categoryHeader {
            gap: 10px;
            margin-bottom: 12px;
          }

          h2 {
            font-size: clamp(22px, 7vw, 30px);
          }

          .categoryHeader small {
            max-width: 82px;
            font-size: 6px;
            letter-spacing: 1px;
          }
        }
      `}</style>
    </section>
  );
}

function Produto({
  produto,
  dinheiro,
  abrirProduto
}) {
  return (
    <article className="product">
      <div className="imageSide">
        {produto.image_url ? (
          <img
            src={produto.image_url}
            alt={produto.name}
          />
        ) : (
          <div className="noImage">
            <span>🍽️</span>
          </div>
        )}

        {produto.featured && (
          <span className="featured">
            ★ DESTAQUE
          </span>
        )}
      </div>

      <div className="productInfo">
        <div className="text">
          <h3>{produto.name}</h3>

          {produto.description && (
            <p>{produto.description}</p>
          )}

          <strong className="price">
            {dinheiro(produto.price)}
          </strong>
        </div>

        <button
          type="button"
          className="add"
          aria-label={`Adicionar ${produto.name}`}
          onClick={() => abrirProduto(produto)}
        >
          <span className="addText">
            Adicionar
          </span>

          <span className="plus">+</span>
        </button>
      </div>

      <style jsx>{`
        .product {
          width: 100%;
          min-width: 0;
          height: 142px;
          display: grid;
          grid-template-columns: 36% 64%;
          overflow: hidden;
          position: relative;
          border-radius: 18px;
          border:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 38%,
              #3a3a3a
            );
          background:
            linear-gradient(
              110deg,
              #15161a,
              #101116
            );
          box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.28),
            inset 0 -1px 0
              color-mix(
                in srgb,
                var(--primary) 20%,
                transparent
              );
        }

        .imageSide {
          min-width: 0;
          height: 100%;
          position: relative;
          overflow: hidden;
          background: #111217;
        }

        .imageSide img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .noImage {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.055),
              transparent 65%
            ),
            #111217;
        }

        .noImage span {
          font-size: 30px;
          opacity: 0.65;
        }

        .featured {
          position: absolute;
          top: 8px;
          left: 8px;
          padding: 5px 7px;
          border-radius: 50px;
          color: var(--primary);
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid var(--primary);
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.6px;
        }

        .productInfo {
          min-width: 0;
          height: 100%;
          padding: 15px 14px 14px 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .text {
          min-width: 0;
          flex: 1;
        }

        h3 {
          margin: 0;
          color: #f7f6f3;
          font-size: 17px;
          line-height: 1.1;
          overflow-wrap: anywhere;
        }

        p {
          margin: 6px 0 10px;
          color: #96979d;
          font-size: 10px;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .price {
          display: block;
          color: var(--primary);
          font-size: 18px;
          line-height: 1;
          white-space: nowrap;
        }

        .add {
          flex: 0 0 auto;
          min-width: 116px;
          height: 45px;
          padding: 5px 7px 5px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-radius: 100px;
          border:
            1px solid
            color-mix(
              in srgb,
              var(--primary) 75%,
              transparent
            );
          background:
            color-mix(
              in srgb,
              var(--primary) 9%,
              #101116
            );
          color: white;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 0 15px
              color-mix(
                in srgb,
                var(--primary) 8%,
                transparent
              );
        }

        .plus {
          width: 31px;
          height: 31px;
          flex: 0 0 31px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          font-size: 21px;
          font-weight: 900;
          box-shadow:
            0 0 16px
              color-mix(
                in srgb,
                var(--primary) 35%,
                transparent
              );
        }

        @media (max-width: 600px) {
          .product {
            height: 124px;
            grid-template-columns:
              minmax(104px, 34%)
              minmax(0, 66%);
            border-radius: 15px;
          }

          .productInfo {
            padding: 11px 10px 11px 13px;
            gap: 7px;
          }

          h3 {
            font-size: 14px;
          }

          p {
            margin: 4px 0 8px;
            font-size: 9px;
            -webkit-line-clamp: 2;
          }

          .price {
            font-size: 16px;
          }

          .add {
            min-width: 38px;
            width: 38px;
            height: 38px;
            padding: 0;
            display: grid;
            place-items: center;
            border-radius: 50%;
          }

          .addText {
            display: none;
          }

          .plus {
            width: 30px;
            height: 30px;
            flex-basis: 30px;
            font-size: 20px;
          }
        }

        @media (min-width: 601px) {
          .product {
            height: 160px;
            grid-template-columns: 38% 62%;
          }

          h3 {
            font-size: 20px;
          }

          p {
            font-size: 11px;
          }

          .price {
            font-size: 20px;
          }
        }
      `}</style>
    </article>
  );
                                    }
