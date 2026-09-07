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
  const [gruposAdicionais, setGruposAdicionais] = useState([]);
  const [adicionais, setAdicionais] = useState([]);

  const [tela, setTela] = useState('inicio');

  // Categorias
  const [novaCategoria, setNovaCategoria] = useState('');

  // Produtos
  const [nomeProduto, setNomeProduto] = useState('');
  const [descricaoProduto, setDescricaoProduto] = useState('');
  const [precoProduto, setPrecoProduto] = useState('');
  const [categoriaProduto, setCategoriaProduto] = useState('');
  const [fotoProduto, setFotoProduto] = useState(null);
  const [destaqueProduto, setDestaqueProduto] = useState(false);

  // Adicionais
  const [produtoAdicional, setProdutoAdicional] = useState('');
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [grupoObrigatorio, setGrupoObrigatorio] = useState(false);
  const [maxSelecoes, setMaxSelecoes] = useState('1');

  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [nomeAdicional, setNomeAdicional] = useState('');
  const [precoAdicional, setPrecoAdicional] = useState('');

  // Aparência
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [logoArquivo, setLogoArquivo] = useState(null);
  const [coverArquivo, setCoverArquivo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  const [corPrimaria, setCorPrimaria] = useState('#6d5dfc');
  const [corSecundaria, setCorSecundaria] = useState('#111827');

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

    if (categoryError) console.error(categoryError);

    const { data: productData, error: productError } =
      await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

    if (productError) console.error(productError);

    const idsProdutos = (productData || []).map(
      (produto) => produto.id
    );

    let groupData = [];
    let addonData = [];

    if (idsProdutos.length > 0) {
      const { data: grupos, error: groupError } =
        await supabase
          .from('addon_groups')
          .select('*')
          .in('product_id', idsProdutos)
          .order('sort_order', { ascending: true });

      if (groupError) {
        console.error(groupError);
      } else {
        groupData = grupos || [];
      }

      const idsGrupos = groupData.map((grupo) => grupo.id);

      if (idsGrupos.length > 0) {
        const { data: itens, error: addonError } =
          await supabase
            .from('addons')
            .select('*')
            .in('group_id', idsGrupos)
            .order('sort_order', { ascending: true });

        if (addonError) {
          console.error(addonError);
        } else {
          addonData = itens || [];
        }
      }
    }

    setRestaurante(restaurantData);
    setCategorias(categoryData || []);
    setProdutos(productData || []);
    setGruposAdicionais(groupData);
    setAdicionais(addonData);

    setLogoUrl(restaurantData.logo_url || '');
    setCoverUrl(restaurantData.cover_url || '');
    setLogoPreview(restaurantData.logo_url || '');
    setCoverPreview(restaurantData.cover_url || '');

    setCorPrimaria(
      restaurantData.primary_color || '#6d5dfc'
    );

    setCorSecundaria(
      restaurantData.secondary_color || '#111827'
    );

    setCarregando(false);
  }

  // =========================
  // CATEGORIAS
  // =========================

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
      .update({
        name: nome.trim()
      })
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

  // =========================
  // UPLOAD
  // =========================

  async function uploadImagem(file, pasta = 'produtos') {
    if (!file) return null;

    if (file.size > 5 * 1024 * 1024) {
      throw new Error(
        'A imagem deve ter no máximo 5 MB.'
      );
    }

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!tiposPermitidos.includes(file.type)) {
      throw new Error(
        'Formato inválido. Use JPG, PNG ou WebP.'
      );
    }

    const extensao =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
        ? 'webp'
        : 'jpg';

    const nomeArquivo =
      `${id}/${pasta}/${crypto.randomUUID()}.${extensao}`;

    const arrayBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(nomeArquivo, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(
        `Falha ao enviar imagem: ${error.message}`
      );
    }

    const { data: publicData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  }

  // =========================
  // PRODUTOS
  // =========================

  async function criarProduto(e) {
    e.preventDefault();

    if (
      !nomeProduto.trim() ||
      !precoProduto ||
      salvando
    ) {
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      let imageUrl = null;

      if (fotoProduto) {
        imageUrl = await uploadImagem(
          fotoProduto,
          'produtos'
        );
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

      const input =
        document.getElementById('fotoProduto');

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
      .update({
        active: !produto.active
      })
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

  // =========================
  // ADICIONAIS
  // =========================

  async function criarGrupoAdicional(e) {
    if (e?.preventDefault) e.preventDefault();

    if (
      !produtoAdicional ||
      !nomeGrupo.trim() ||
      salvando
    ) {
      return;
    }

    setSalvando(true);
    setErro('');

    const maximo = Math.max(
      1,
      Number(maxSelecoes) || 1
    );

    const { data, error } = await supabase
      .from('addon_groups')
      .insert({
        product_id: produtoAdicional,
        name: nomeGrupo.trim(),
        required: grupoObrigatorio,
        min_select: grupoObrigatorio ? 1 : 0,
        max_select: maximo,
        sort_order: gruposAdicionais.filter(
          (grupo) =>
            grupo.product_id === produtoAdicional
        ).length
      })
      .select()
      .single();

    if (error) {
      setErro(`Erro: ${error.message}`);
      setSalvando(false);
      return;
    }

    setGruposAdicionais((atual) => [
      ...atual,
      data
    ]);

    setNomeGrupo('');
    setGrupoObrigatorio(false);
    setMaxSelecoes('1');
    setSalvando(false);
  }

  async function criarAdicional(grupoId) {
    if (
      !grupoId ||
      !nomeAdicional.trim() ||
      salvando
    ) {
      return;
    }

    setSalvando(true);
    setErro('');

    const preco = Number(
      (precoAdicional || '0').replace(',', '.')
    );

    if (Number.isNaN(preco) || preco < 0) {
      setErro('Digite um preço válido.');
      setSalvando(false);
      return;
    }

    const { data, error } = await supabase
      .from('addons')
      .insert({
        group_id: grupoId,
        name: nomeAdicional.trim(),
        price: preco,
        active: true,
        sort_order: adicionais.filter(
          (item) => item.group_id === grupoId
        ).length
      })
      .select()
      .single();

    if (error) {
      setErro(`Erro: ${error.message}`);
      setSalvando(false);
      return;
    }

    setAdicionais((atual) => [...atual, data]);

    setGrupoSelecionado(grupoId);
    setNomeAdicional('');
    setPrecoAdicional('');
    setSalvando(false);
  }

  async function excluirGrupoAdicional(grupo) {
    if (
      !window.confirm(`Excluir "${grupo.name}"?`)
    ) {
      return;
    }

    const { error } = await supabase
      .from('addon_groups')
      .delete()
      .eq('id', grupo.id);

    if (error) {
      setErro(`Erro: ${error.message}`);
      return;
    }

    setGruposAdicionais((atual) =>
      atual.filter((item) => item.id !== grupo.id)
    );

    setAdicionais((atual) =>
      atual.filter(
        (item) => item.group_id !== grupo.id
      )
    );
  }

  async function excluirAdicional(adicional) {
    if (
      !window.confirm(
        `Excluir "${adicional.name}"?`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from('addons')
      .delete()
      .eq('id', adicional.id);

    if (error) {
      setErro(`Erro: ${error.message}`);
      return;
    }

    setAdicionais((atual) =>
      atual.filter(
        (item) => item.id !== adicional.id
      )
    );
  }

  // =========================
  // APARÊNCIA
  // =========================

  function escolherLogo(file) {
    if (!file) return;

    setLogoArquivo(file);

    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);
  }

  function escolherCapa(file) {
    if (!file) return;

    setCoverArquivo(file);

    const preview = URL.createObjectURL(file);
    setCoverPreview(preview);
  }

  async function salvarAparencia() {
    if (salvando) return;

    setSalvando(true);
    setErro('');

    try {
      let novaLogoUrl = logoUrl;
      let novaCoverUrl = coverUrl;

      if (logoArquivo) {
        novaLogoUrl = await uploadImagem(
          logoArquivo,
          'aparencia/logo'
        );
      }

      if (coverArquivo) {
        novaCoverUrl = await uploadImagem(
          coverArquivo,
          'aparencia/capa'
        );
      }

      const { data, error } = await supabase
        .from('restaurants')
        .update({
          logo_url: novaLogoUrl || null,
          cover_url: novaCoverUrl || null,
          primary_color: corPrimaria,
          secondary_color: corSecundaria,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setRestaurante(data);

      setLogoUrl(novaLogoUrl || '');
      setCoverUrl(novaCoverUrl || '');

      setLogoPreview(novaLogoUrl || '');
      setCoverPreview(novaCoverUrl || '');

      setLogoArquivo(null);
      setCoverArquivo(null);

      alert('Aparência salva com sucesso!');
    } catch (error) {
      console.error(error);
      setErro(`Erro: ${error.message}`);
    }

    setSalvando(false);
  }

  function dinheiro(valor) {
    return Number(valor || 0).toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    );
  }

  function voltarEditor() {
    setTela('inicio');
    setErro('');
  }

  // =========================
  // CARREGANDO
  // =========================

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

  // =========================
  // APARÊNCIA
  // =========================

  if (tela === 'aparencia') {
    return (
      <main style={styles.page}>
        <section style={styles.container}>
          <button
            style={styles.back}
            onClick={voltarEditor}
          >
            ← Voltar ao editor
          </button>

          <p style={styles.eyebrow}>
            {restaurante.name.toUpperCase()}
          </p>

          <h1 style={styles.title}>Aparência</h1>

          <p style={styles.subtitle}>
            Personalize a identidade visual do seu
            cardápio.
          </p>

          <div style={styles.productForm}>
            <label style={styles.label}>
              Logo do restaurante

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={styles.input}
                onChange={(e) =>
                  escolherLogo(
                    e.target.files?.[0]
                  )
                }
              />
            </label>

            {logoPreview && (
              <div style={styles.logoPreviewBox}>
                <img
                  src={logoPreview}
                  alt="Logo"
                  style={styles.logoPreview}
                />
              </div>
            )}

            <label style={styles.label}>
              Imagem de capa

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={styles.input}
                onChange={(e) =>
                  escolherCapa(
                    e.target.files?.[0]
                  )
                }
              />
            </label>

            {coverPreview && (
              <img
                src={coverPreview}
                alt="Capa"
                style={styles.coverPreview}
              />
            )}

            <small style={styles.hint}>
              JPG, PNG ou WebP. Máximo 5 MB por
              imagem.
            </small>

            <label style={styles.label}>
              Cor principal

              <input
                type="color"
                value={corPrimaria}
                onChange={(e) =>
                  setCorPrimaria(e.target.value)
                }
                style={styles.colorInput}
              />
            </label>

            <label style={styles.label}>
              Cor secundária

              <input
                type="color"
                value={corSecundaria}
                onChange={(e) =>
                  setCorSecundaria(e.target.value)
                }
                style={styles.colorInput}
              />
            </label>

            <div
              style={{
                ...styles.preview,
                background: corSecundaria
              }}
            >
              {coverPreview && (
                <img
                  src={coverPreview}
                  alt=""
                  style={styles.previewCover}
                />
              )}

              <div style={styles.previewContent}>
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt=""
                    style={styles.previewLogo}
                  />
                )}

                <strong style={{ fontSize: 20 }}>
                  {restaurante.name}
                </strong>

                <p>
                  Veja como a identidade do seu
                  cardápio ficará.
                </p>

                <button
                  type="button"
                  style={{
                    ...styles.previewButton,
                    background: corPrimaria
                  }}
                >
                  Adicionar ao pedido
                </button>
              </div>
            </div>

            {erro && (
              <div style={styles.error}>
                {erro}
              </div>
            )}

            <button
              style={{
                ...styles.primary,
                background: corPrimaria
              }}
              type="button"
              onClick={salvarAparencia}
              disabled={salvando}
            >
              {salvando
                ? 'Salvando...'
                : 'Salvar aparência'}
            </button>
          </div>
        </section>
      </main>
    );
  }

  // =========================
  // CATEGORIAS
  // =========================

  if (tela === 'categorias') {
    return (
      <main style={styles.page}>
        <section style={styles.container}>
          <button
            style={styles.back}
            onClick={voltarEditor}
          >
            ← Voltar ao editor
          </button>

          <p style={styles.eyebrow}>
            {restaurante.name.toUpperCase()}
          </p>

          <h1 style={styles.title}>
            Categorias
          </h1>

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

            <button
              style={styles.primary}
              type="submit"
              disabled={salvando}
            >
              + Adicionar
            </button>
          </form>

          {erro && (
            <div style={styles.error}>
              {erro}
            </div>
          )}

          <div style={styles.list}>
            {categorias.map((categoria) => (
              <div
                key={categoria.id}
                style={styles.listItem}
              >
                <strong>
                  {categoria.name}
                </strong>

                <div style={styles.actions}>
                  <button
                    style={styles.secondary}
                    type="button"
                    onClick={() =>
                      renomearCategoria(categoria)
                    }
                  >
                    Editar
                  </button>

                  <button
                    style={styles.danger}
                    type="button"
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

  // =========================
  // PRODUTOS
  // =========================

  if (tela === 'produtos') {
    return (
      <main style={styles.page}>
        <section style={styles.container}>
          <button
            style={styles.back}
            onClick={voltarEditor}
          >
            ← Voltar ao editor
          </button>

          <p style={styles.eyebrow}>
            {restaurante.name.toUpperCase()}
          </p>

          <h1 style={styles.title}>
            Produtos
          </h1>

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
                  setCategoriaProduto(
                    e.target.value
                  )
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
                  setDescricaoProduto(
                    e.target.value
                  )
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
              Foto do produto

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
            </label>

            <small style={styles.hint}>
              JPG, PNG ou WebP. Máximo 5 MB.
            </small>

            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={destaqueProduto}
                onChange={(e) =>
                  setDestaqueProduto(
                    e.target.checked
                  )
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

          {erro && (
            <div style={styles.error}>
              {erro}
            </div>
          )}

          <h2 style={styles.sectionTitle}>
            Produtos cadastrados (
            {produtos.length})
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
                  <div style={styles.noImage}>
                    🍕
                  </div>
                )}

                <div style={styles.productBody}>
                  <div style={styles.productTop}>
                    <strong
                      style={styles.productName}
                    >
                      {produto.name}
                    </strong>

                    {!produto.active && (
                      <span
                        style={styles.inactive}
                      >
                        Inativo
                      </span>
                    )}
                  </div>

                  {produto.description && (
                    <p
                      style={styles.description}
                    >
                      {produto.description}
                    </p>
                  )}

                  <strong style={styles.price}>
                    {dinheiro(produto.price)}
                  </strong>

                  <div style={styles.actions}>
                    <button
                      style={styles.secondary}
                      type="button"
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
                      type="button"
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

  // =========================
  // ADICIONAIS
  // =========================

  if (tela === 'adicionais') {
    return (
      <main style={styles.page}>
        <section style={styles.container}>
          <button
            style={styles.back}
            onClick={voltarEditor}
          >
            ← Voltar ao editor
          </button>

          <p style={styles.eyebrow}>
            {restaurante.name.toUpperCase()}
          </p>

          <h1 style={styles.title}>
            Adicionais
          </h1>

          <p style={styles.subtitle}>
            Crie bordas, sabores e complementos.
          </p>

          <div style={styles.productForm}>
            <h2 style={styles.formTitle}>
              Novo grupo de adicionais
            </h2>

            <label style={styles.label}>
              Produto

              <select
                style={styles.input}
                value={produtoAdicional}
                onChange={(e) =>
                  setProdutoAdicional(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Selecione um produto
                </option>

                {produtos.map((produto) => (
                  <option
                    key={produto.id}
                    value={produto.id}
                  >
                    {produto.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.label}>
              Nome do grupo

              <input
                style={styles.input}
                value={nomeGrupo}
                onChange={(e) =>
                  setNomeGrupo(e.target.value)
                }
                placeholder="Ex.: Escolha a borda"
              />
            </label>

            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={grupoObrigatorio}
                onChange={(e) =>
                  setGrupoObrigatorio(
                    e.target.checked
                  )
                }
              />

              Escolha obrigatória
            </label>

            <label style={styles.label}>
              Máximo de escolhas

              <input
                style={styles.input}
                type="number"
                min="1"
                value={maxSelecoes}
                onChange={(e) =>
                  setMaxSelecoes(e.target.value)
                }
              />
            </label>

            <button
              style={styles.primary}
              type="button"
              onClick={criarGrupoAdicional}
              disabled={salvando}
            >
              {salvando
                ? 'Salvando...'
                : '+ Criar grupo'}
            </button>
          </div>

          {erro && (
            <div style={styles.error}>
              {erro}
            </div>
          )}

          <h2 style={styles.sectionTitle}>
            Grupos cadastrados (
            {gruposAdicionais.length})
          </h2>

          <div style={styles.list}>
            {gruposAdicionais.map((grupo) => {
              const produto = produtos.find(
                (item) =>
                  item.id === grupo.product_id
              );

              const itensGrupo =
                adicionais.filter(
                  (item) =>
                    item.group_id === grupo.id
                );

              return (
                <div
                  key={grupo.id}
                  style={styles.productForm}
                >
                  <div>
                    <strong
                      style={styles.productName}
                    >
                      {grupo.name}
                    </strong>

                    <p
                      style={styles.description}
                    >
                      Produto:{' '}
                      {produto?.name || 'Produto'}
                    </p>

                    <small style={styles.hint}>
                      {grupo.required
                        ? 'Obrigatório'
                        : 'Opcional'}
                      {' • '}
                      Máximo: {grupo.max_select}
                    </small>
                  </div>

                  <div style={styles.addonForm}>
                    <input
                      style={styles.input}
                      value={
                        grupoSelecionado ===
                        grupo.id
                          ? nomeAdicional
                          : ''
                      }
                      onFocus={() =>
                        setGrupoSelecionado(
                          grupo.id
                        )
                      }
                      onChange={(e) => {
                        setGrupoSelecionado(
                          grupo.id
                        );
                        setNomeAdicional(
                          e.target.value
                        );
                      }}
                      placeholder="Ex.: Catupiry"
                    />

                    <input
                      style={styles.input}
                      value={
                        grupoSelecionado ===
                        grupo.id
                          ? precoAdicional
                          : ''
                      }
                      onFocus={() =>
                        setGrupoSelecionado(
                          grupo.id
                        )
                      }
                      onChange={(e) => {
                        setGrupoSelecionado(
                          grupo.id
                        );
                        setPrecoAdicional(
                          e.target.value
                        );
                      }}
                      placeholder="Preço"
                      inputMode="decimal"
                    />

                    <button
                      style={styles.primary}
                      type="button"
                      onClick={() =>
                        criarAdicional(grupo.id)
                      }
                    >
                      + Adicionar
                    </button>
                  </div>

                  {itensGrupo.map(
                    (adicional) => (
                      <div
                        key={adicional.id}
                        style={styles.listItem}
                      >
                        <div>
                          <strong>
                            {adicional.name}
                          </strong>

                          <div
                            style={styles.price}
                          >
                            {dinheiro(
                              adicional.price
                            )}
                          </div>
                        </div>

                        <button
                          style={styles.danger}
                          type="button"
                          onClick={() =>
                            excluirAdicional(
                              adicional
                            )
                          }
                        >
                          Excluir
                        </button>
                      </div>
                    )
                  )}

                  <button
                    style={styles.danger}
                    type="button"
                    onClick={() =>
                      excluirGrupoAdicional(grupo)
                    }
                  >
                    Excluir grupo
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  // =========================
  // INÍCIO DO EDITOR
  // =========================

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
              Monte e personalize o cardápio deste
              restaurante.
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
          <button
            style={styles.card}
            onClick={() =>
              setTela('categorias')
            }
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

          <button
            style={styles.card}
            onClick={() =>
              setTela('adicionais')
            }
          >
            <span style={styles.icon}>➕</span>

            <strong style={styles.cardTitle}>
              Adicionais
            </strong>

            <small style={styles.cardText}>
              {gruposAdicionais.length} grupos
              cadastrados
            </small>
          </button>

          <button
            style={styles.card}
            onClick={() =>
              setTela('aparencia')
            }
          >
            <span style={styles.icon}>🎨</span>

            <strong style={styles.cardTitle}>
              Aparência
            </strong>

            <small style={styles.cardText}>
              Logo, capa e cores.
            </small>
          </button>

          <EditorCard
            icon="📱"
            title="Informações"
            text="WhatsApp, endereço e entrega."
          />

          <EditorCard
            icon="👁️"
            title="Visualizar cardápio"
            text="Veja o cardápio como o cliente."
          />
        </section>
      </section>
    </main>
  );
}

function EditorCard({ icon, title, text }) {
  return (
    <button style={styles.card}>
      <span style={styles.icon}>
        {icon}
      </span>

      <strong style={styles.cardTitle}>
        {title}
      </strong>

      <small style={styles.cardText}>
        {text}
      </small>
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
    flexWrap: 'wrap',
    gap: '10px',
    margin: '25px 0'
  },

  addonForm: {
    background: '#f9fafb',
    padding: '15px',
    borderRadius: '15px',
    display: 'grid',
    gap: '10px'
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
  },

  colorInput: {
    width: '100%',
    height: '55px',
    border: '1px solid #d1d5db',
    borderRadius: '11px',
    cursor: 'pointer'
  },

  logoPreviewBox: {
    background: '#f3f4f6',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center'
  },

  logoPreview: {
    width: '120px',
    height: '120px',
    objectFit: 'contain',
    borderRadius: '16px'
  },

  coverPreview: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderRadius: '16px'
  },

  preview: {
    overflow: 'hidden',
    borderRadius: '18px',
    color: '#fff'
  },

  previewCover: {
    width: '100%',
    height: '150px',
    objectFit: 'cover',
    display: 'block'
  },

  previewContent: {
    padding: '22px'
  },

  previewLogo: {
    width: '70px',
    height: '70px',
    objectFit: 'contain',
    background: '#fff',
    borderRadius: '14px',
    padding: '5px',
    display: 'block',
    marginBottom: '15px'
  },

  previewButton: {
    border: 0,
    padding: '12px 18px',
    borderRadius: '10px',
    color: '#fff',
    fontWeight: '800'
  }
};
