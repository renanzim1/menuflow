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

  // CATEGORIAS
  const [novaCategoria, setNovaCategoria] = useState('');

  // PRODUTOS
  const [nomeProduto, setNomeProduto] = useState('');
  const [descricaoProduto, setDescricaoProduto] = useState('');
  const [precoProduto, setPrecoProduto] = useState('');
  const [categoriaProduto, setCategoriaProduto] = useState('');
  const [fotoProduto, setFotoProduto] = useState(null);
  const [destaqueProduto, setDestaqueProduto] = useState(false);

  // ADICIONAIS
  const [produtoAdicional, setProdutoAdicional] = useState('');
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [grupoObrigatorio, setGrupoObrigatorio] = useState(false);
  const [maxSelecoes, setMaxSelecoes] = useState('1');

  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [nomeAdicional, setNomeAdicional] = useState('');
  const [precoAdicional, setPrecoAdicional] = useState('');

  // APARÊNCIA
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const [logoArquivo, setLogoArquivo] = useState(null);
  const [coverArquivo, setCoverArquivo] = useState(null);

  const [logoPreview, setLogoPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  const [corPrimaria, setCorPrimaria] = useState('#6d5dfc');
  const [corSecundaria, setCorSecundaria] = useState('#111827');

  // INFORMAÇÕES
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState('');
  const [taxaEntrega, setTaxaEntrega] = useState('0');
  const [pedidoMinimo, setPedidoMinimo] = useState('0');

  // GERAL
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (id) {
      carregarDados();
    }
  }, [id]);

  // ============================================================
  // CARREGAR DADOS
  // ============================================================

  async function carregarDados() {
    setCarregando(true);
    setErro('');

    try {
      const {
        data: restaurantData,
        error: restaurantError
      } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
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
        .eq('restaurant_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (categoryError) {
        console.error('Erro categorias:', categoryError);
      }

      const {
        data: productData,
        error: productError
      } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (productError) {
        console.error('Erro produtos:', productError);
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
          console.error('Erro grupos:', groupError);
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
            .order('sort_order', { ascending: true });

          if (addonError) {
            console.error('Erro adicionais:', addonError);
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

      // Carrega as informações já salvas
      setWhatsapp(restaurantData.whatsapp || '');
      setEndereco(restaurantData.address || '');

      setTaxaEntrega(
        String(restaurantData.delivery_fee ?? 0).replace('.', ',')
      );

      setPedidoMinimo(
        String(restaurantData.minimum_order ?? 0).replace('.', ',')
      );
    } catch (error) {
      console.error(error);

      setErro(
        `Erro ao carregar: ${
          error?.message || 'erro desconhecido'
        }`
      );
    }

    setCarregando(false);
  }

  // ============================================================
  // CATEGORIAS
  // ============================================================

  async function criarCategoria(e) {
    e.preventDefault();

    const nome = novaCategoria.trim();

    if (!nome || salvando) return;

    setSalvando(true);
    setErro('');

    try {
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

      if (error) throw error;

      setCategorias((atual) => [
        ...atual,
        data
      ]);

      setNovaCategoria('');
    } catch (error) {
      console.error(error);

      setErro(
        `Erro: ${
          error?.message ||
          'Não foi possível criar a categoria.'
        }`
      );
    }

    setSalvando(false);
  }

  async function renomearCategoria(categoria) {
    const nome = window.prompt(
      'Novo nome da categoria:',
      categoria.name
    );

    if (!nome || !nome.trim()) return;

    setErro('');

    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: nome.trim()
        })
        .eq('id', categoria.id)
        .eq('restaurant_id', id);

      if (error) throw error;

      setCategorias((atual) =>
        atual.map((item) =>
          item.id === categoria.id
            ? {
                ...item,
                name: nome.trim()
              }
            : item
        )
      );
    } catch (error) {
      console.error(error);
      setErro(`Erro: ${error.message}`);
    }
  }

  async function excluirCategoria(categoria) {
    const confirmar = window.confirm(
      `Excluir a categoria "${categoria.name}"?`
    );

    if (!confirmar) return;

    setErro('');

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoria.id)
        .eq('restaurant_id', id);

      if (error) throw error;

      setCategorias((atual) =>
        atual.filter(
          (item) => item.id !== categoria.id
        )
      );
    } catch (error) {
      console.error(error);
      setErro(`Erro: ${error.message}`);
    }
  }

  // ============================================================
  // UPLOAD DE IMAGENS
  // ============================================================

  async function uploadImagem(file, pasta = 'produtos') {
    if (!file) return null;

    const limite = 5 * 1024 * 1024;

    if (file.size > limite) {
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

    let extensao = 'jpg';

    if (file.type === 'image/png') {
      extensao = 'png';
    }

    if (file.type === 'image/webp') {
      extensao = 'webp';
    }

    const nomeArquivo =
      `${id}/${pasta}/${crypto.randomUUID()}.${extensao}`;

    const { data, error } =
      await supabase.storage
        .from('product-images')
        .upload(nomeArquivo, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

    if (error) {
      console.error('Erro upload:', error);

      throw new Error(
        `Falha ao enviar imagem: ${error.message}`
      );
    }

    const { data: publicData } =
      supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

    if (!publicData?.publicUrl) {
      throw new Error(
        'Imagem enviada, mas não foi possível gerar a URL.'
      );
    }

    return publicData.publicUrl;
  }

  // ============================================================
  // PRODUTOS
  // ============================================================

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
      const preco = Number(
        precoProduto
          .replace(/\./g, '')
          .replace(',', '.')
      );

      if (Number.isNaN(preco) || preco < 0) {
        throw new Error(
          'Digite um preço válido.'
        );
      }

      let imageUrl = null;

      if (fotoProduto) {
        imageUrl = await uploadImagem(
          fotoProduto,
          'produtos'
        );
      }

      const { data, error } = await supabase
        .from('products')
        .insert({
          restaurant_id: id,
          category_id:
            categoriaProduto || null,
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

      setProdutos((atual) => [
        ...atual,
        data
      ]);

      setNomeProduto('');
      setDescricaoProduto('');
      setPrecoProduto('');
      setCategoriaProduto('');
      setFotoProduto(null);
      setDestaqueProduto(false);

      const input =
        document.getElementById(
          'fotoProduto'
        );

      if (input) {
        input.value = '';
      }
    } catch (error) {
      console.error(error);

      setErro(
        `Erro: ${
          error?.message ||
          'Não foi possível cadastrar o produto.'
        }`
      );
    }

    setSalvando(false);
  }

  async function alternarProduto(produto) {
    setErro('');

    const novoEstado = !produto.active;

    try {
      const { error } = await supabase
        .from('products')
        .update({
          active: novoEstado,
          updated_at: new Date().toISOString()
        })
        .eq('id', produto.id)
        .eq('restaurant_id', id);

      if (error) throw error;

      setProdutos((atual) =>
        atual.map((item) =>
          item.id === produto.id
            ? {
                ...item,
                active: novoEstado
              }
            : item
        )
      );
    } catch (error) {
      console.error(error);
      setErro(`Erro: ${error.message}`);
    }
  }

  async function excluirProduto(produto) {
    const confirmar = window.confirm(
      `Excluir o produto "${produto.name}"?`
    );

    if (!confirmar) return;

    setErro('');

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', produto.id)
        .eq('restaurant_id', id);

      if (error) throw error;

      setProdutos((atual) =>
        atual.filter(
          (item) => item.id !== produto.id
        )
      );
    } catch (error) {
      console.error(error);
      setErro(`Erro: ${error.message}`);
    }
  }

  // ============================================================
  // ADICIONAIS
  // ============================================================

  async function criarGrupoAdicional(e) {
    if (e?.preventDefault) {
      e.preventDefault();
    }

    if (
      !produtoAdicional ||
      !nomeGrupo.trim() ||
      salvando
    ) {
      return;
    }

    setSalvando(true);
    setErro('');

    try {
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
          min_select:
            grupoObrigatorio ? 1 : 0,
          max_select: maximo,
          sort_order:
            gruposAdicionais.filter(
              (grupo) =>
                grupo.product_id ===
                produtoAdicional
            ).length
        })
        .select()
        .single();

      if (error) throw error;

      setGruposAdicionais((atual) => [
        ...atual,
        data
      ]);

      setNomeGrupo('');
      setGrupoObrigatorio(false);
      setMaxSelecoes('1');
    } catch (error) {
      console.error(error);
      setErro(`Erro: ${error.message}`);
    }

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

    try {
      const preco = Number(
        (precoAdicional || '0')
          .replace(/\./g, '')
          .replace(',', '.')
      );

      if (Number.isNaN(preco) || preco < 0) {
        throw new Error(
          'Digite um preço válido.'
        );
      }

      const { data, error } = await supabase
        .from('addons')
        .insert({
          group_id: grupoId,
          name: nomeAdicional.trim(),
          price: preco,
          active: true,
          sort_order:
            adicionais.filter(
              (item) =>
                item.group_id === grupoId
            ).length
        })
        .select()
        .single();

      if (error) throw error;

      setAdicionais((atual) => [
        ...atual,
        data
      ]);

      setGrupoSelecionado(grupoId);
      setNomeAdicional('');
      setPrecoAdicional('');
    } catch (error) {
      console.error(error);
      setErro(`Erro: ${error.message}`);
    }

    setSalvando(false);
  }

  async function excluirGrupoAdicional(grupo) {
    const confirmar = window.confirm(
      `Excluir "${grupo.name}"?`
    );

    if (!confirmar) return;

    setErro('');

    try {
      const { error } = await supabase
        .from('addon_groups')
        .delete()
        .eq('id', grupo.id);

      if (error) throw error;

      setGruposAdicionais((atual) =>
        atual.filter(
          (item) => item.id !== grupo.id
        )
      );

      setAdicionais((atual) =>
        atual.filter(
          (item) =>
            item.group_id !== grupo.id
        )
      );
    } catch (error) {
      console.error(error);
      setErro(`Erro: ${error.message}`);
    }
  }

  async function excluirAdicional(adicional) {
    const confirmar = window.confirm(
      `Excluir "${adicional.name}"?`
    );

    if (!confirmar) return;

    setErro('');

    try {
      const { error } = await supabase
        .from('addons')
        .delete()
        .eq('id', adicional.id);

      if (error) throw error;

      setAdicionais((atual) =>
        atual.filter(
          (item) =>
            item.id !== adicional.id
        )
      );
    } catch (error) {
      console.error(error);
      setErro(`Erro: ${error.message}`);
    }
  }

  // ============================================================
  // APARÊNCIA
  // ============================================================

  function escolherLogo(file) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErro(
        'A logo deve ter no máximo 5 MB.'
      );
      return;
    }

    setErro('');
    setLogoArquivo(file);

    const preview =
      URL.createObjectURL(file);

    setLogoPreview(preview);
  }

  function escolherCapa(file) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErro(
        'A capa deve ter no máximo 5 MB.'
      );
      return;
    }

    setErro('');
    setCoverArquivo(file);

    const preview =
      URL.createObjectURL(file);

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

      const { error } = await supabase
        .from('restaurants')
        .update({
          logo_url:
            novaLogoUrl || null,
          cover_url:
            novaCoverUrl || null,
          primary_color:
            corPrimaria,
          secondary_color:
            corSecundaria,
          updated_at:
            new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      setRestaurante((atual) => ({
        ...atual,
        logo_url:
          novaLogoUrl || null,
        cover_url:
          novaCoverUrl || null,
        primary_color:
          corPrimaria,
        secondary_color:
          corSecundaria
      }));

      setLogoUrl(novaLogoUrl || '');
      setCoverUrl(novaCoverUrl || '');

      setLogoPreview(
        novaLogoUrl || ''
      );

      setCoverPreview(
        novaCoverUrl || ''
      );

      setLogoArquivo(null);
      setCoverArquivo(null);

      const inputLogo =
        document.getElementById(
          'logoRestaurante'
        );

      const inputCapa =
        document.getElementById(
          'capaRestaurante'
        );

      if (inputLogo) {
        inputLogo.value = '';
      }

      if (inputCapa) {
        inputCapa.value = '';
      }

      alert(
        'Aparência salva com sucesso!'
      );
    } catch (error) {
      console.error(
        'Erro ao salvar aparência:',
        error
      );

      setErro(
        `Erro: ${
          error?.message ||
          'Não foi possível salvar a aparência.'
        }`
      );
    }

    setSalvando(false);
  }

  // ============================================================
  // INFORMAÇÕES
  // ============================================================

  function converterDinheiro(valor) {
    const texto = String(valor || '0')
      .trim()
      .replace(/\s/g, '')
      .replace('R$', '');

    if (!texto) return 0;

    // Formato brasileiro: 1.234,56
    if (texto.includes(',')) {
      return Number(
        texto
          .replace(/\./g, '')
          .replace(',', '.')
      );
    }

    return Number(texto);
  }

  async function salvarInformacoes(e) {
    if (e?.preventDefault) {
      e.preventDefault();
    }

    if (salvando) return;

    setSalvando(true);
    setErro('');

    try {
      const taxa = converterDinheiro(
        taxaEntrega
      );

      const minimo = converterDinheiro(
        pedidoMinimo
      );

      if (
        Number.isNaN(taxa) ||
        taxa < 0
      ) {
        throw new Error(
          'Digite uma taxa de entrega válida.'
        );
      }

      if (
        Number.isNaN(minimo) ||
        minimo < 0
      ) {
        throw new Error(
          'Digite um pedido mínimo válido.'
        );
      }

      const { error } = await supabase
        .from('restaurants')
        .update({
          whatsapp:
            whatsapp.trim() || null,
          address:
            endereco.trim() || null,
          delivery_fee: taxa,
          minimum_order: minimo,
          updated_at:
            new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      setRestaurante((atual) => ({
        ...atual,
        whatsapp:
          whatsapp.trim() || null,
        address:
          endereco.trim() || null,
        delivery_fee: taxa,
        minimum_order: minimo
      }));

      alert(
        'Informações salvas com sucesso!'
      );
    } catch (error) {
      console.error(
        'Erro ao salvar informações:',
        error
      );

      setErro(
        `Erro: ${
          error?.message ||
          'Não foi possível salvar as informações.'
        }`
      );
    }

    setSalvando(false);
  }

  // ============================================================
  // UTILIDADES
  // ============================================================

  function dinheiro(valor) {
    return Number(
      valor || 0
    ).toLocaleString(
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

  // ============================================================
  // CARREGAMENTO
  // ============================================================

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
        <div>
          <h2>
            Restaurante não encontrado.
          </h2>

          {erro && (
            <p style={{ color: '#dc2626' }}>
              {erro}
            </p>
          )}
        </div>
      </main>
    );
  }

  // ============================================================
  // TELA INFORMAÇÕES
  // ============================================================

  if (tela === 'informacoes') {
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
            Informações
          </h1>

          <p style={styles.subtitle}>
            Configure os dados de contato,
            endereço e entrega.
          </p>

          <form
            style={styles.productForm}
            onSubmit={salvarInformacoes}
          >
            <h2 style={styles.formTitle}>
              Dados do restaurante
            </h2>

            <label style={styles.label}>
              WhatsApp

              <input
                style={styles.input}
                type="tel"
                inputMode="tel"
                value={whatsapp}
                onChange={(e) =>
                  setWhatsapp(
                    e.target.value
                  )
                }
                placeholder="Ex.: (67) 99999-9999"
              />

              <small style={styles.hint}>
                Número que receberá os pedidos
                dos clientes.
              </small>
            </label>

            <label style={styles.label}>
              Endereço

              <textarea
                style={styles.textarea}
                value={endereco}
                onChange={(e) =>
                  setEndereco(
                    e.target.value
                  )
                }
                placeholder="Ex.: Rua das Flores, 123 - Centro"
              />
            </label>

            <label style={styles.label}>
              Taxa de entrega

              <div style={styles.moneyField}>
                <span style={styles.moneyPrefix}>
                  R$
                </span>

                <input
                  style={styles.moneyInput}
                  value={taxaEntrega}
                  onChange={(e) =>
                    setTaxaEntrega(
                      e.target.value
                    )
                  }
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </div>

              <small style={styles.hint}>
                Use 0,00 para entrega grátis.
              </small>
            </label>

            <label style={styles.label}>
              Pedido mínimo

              <div style={styles.moneyField}>
                <span style={styles.moneyPrefix}>
                  R$
                </span>

                <input
                  style={styles.moneyInput}
                  value={pedidoMinimo}
                  onChange={(e) =>
                    setPedidoMinimo(
                      e.target.value
                    )
                  }
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </div>

              <small style={styles.hint}>
                Valor mínimo necessário para
                fazer um pedido.
              </small>
            </label>

            <div style={styles.infoPreview}>
              <strong>
                Prévia das informações
              </strong>

              <div style={styles.infoRow}>
                <span>📱 WhatsApp</span>
                <strong>
                  {whatsapp ||
                    'Não informado'}
                </strong>
              </div>

              <div style={styles.infoRow}>
                <span>📍 Endereço</span>
                <strong>
                  {endereco ||
                    'Não informado'}
                </strong>
              </div>

              <div style={styles.infoRow}>
                <span>
                  🛵 Taxa de entrega
                </span>
                <strong>
                  {dinheiro(
                    converterDinheiro(
                      taxaEntrega
                    ) || 0
                  )}
                </strong>
              </div>

              <div style={styles.infoRow}>
                <span>
                  🛒 Pedido mínimo
                </span>
                <strong>
                  {dinheiro(
                    converterDinheiro(
                      pedidoMinimo
                    ) || 0
                  )}
                </strong>
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
                background:
                  corPrimaria
              }}
              type="submit"
              disabled={salvando}
            >
              {salvando
                ? 'Salvando...'
                : 'Salvar informações'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  // ============================================================
  // TELA APARÊNCIA
  // ============================================================

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

          <h1 style={styles.title}>
            Aparência
          </h1>

          <p style={styles.subtitle}>
            Personalize a identidade visual
            do seu cardápio.
          </p>

          <div style={styles.productForm}>
            <label style={styles.label}>
              Logo do restaurante

              <input
                id="logoRestaurante"
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
              <div
                style={styles.logoPreviewBox}
              >
                <img
                  src={logoPreview}
                  alt="Logo do restaurante"
                  style={styles.logoPreview}
                />
              </div>
            )}

            <label style={styles.label}>
              Imagem de capa

              <input
                id="capaRestaurante"
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
                alt="Capa do restaurante"
                style={styles.coverPreview}
              />
            )}

            <small style={styles.hint}>
              JPG, PNG ou WebP. Máximo 5 MB
              por imagem.
            </small>

            <label style={styles.label}>
              Cor principal

              <input
                type="color"
                value={corPrimaria}
                onChange={(e) =>
                  setCorPrimaria(
                    e.target.value
                  )
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
                  setCorSecundaria(
                    e.target.value
                  )
                }
                style={styles.colorInput}
              />
            </label>

            <div
              style={{
                ...styles.preview,
                background:
                  corSecundaria
              }}
            >
              {coverPreview && (
                <img
                  src={coverPreview}
                  alt="Prévia da capa"
                  style={styles.previewCover}
                />
              )}

              <div
                style={styles.previewContent}
              >
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Prévia da logo"
                    style={styles.previewLogo}
                  />
                )}

                <strong
                  style={{
                    fontSize: '20px'
                  }}
                >
                  {restaurante.name}
                </strong>

                <p>
                  Veja como a identidade do
                  seu cardápio ficará.
                </p>

                <button
                  type="button"
                  style={{
                    ...styles.previewButton,
                    background:
                      corPrimaria
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
                background:
                  corPrimaria
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

  // ============================================================
  // TELA CATEGORIAS
  // ============================================================

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
            Organize os produtos do seu
            cardápio.
          </p>

          <form
            style={styles.formBox}
            onSubmit={criarCategoria}
          >
            <input
              style={styles.input}
              value={novaCategoria}
              onChange={(e) =>
                setNovaCategoria(
                  e.target.value
                )
              }
              placeholder="Ex.: Pizzas"
            />

            <button
              style={styles.primary}
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

          <div style={styles.list}>
            {categorias.length === 0 && (
              <div style={styles.empty}>
                Nenhuma categoria cadastrada.
              </div>
            )}

            {categorias.map(
              (categoria) => (
                <div
                  key={categoria.id}
                  style={styles.listItem}
                >
                  <strong>
                    {categoria.name}
                  </strong>

                  <div
                    style={styles.actions}
                  >
                    <button
                      style={
                        styles.secondary
                      }
                      type="button"
                      onClick={() =>
                        renomearCategoria(
                          categoria
                        )
                      }
                    >
                      Editar
                    </button>

                    <button
                      style={styles.danger}
                      type="button"
                      onClick={() =>
                        excluirCategoria(
                          categoria
                        )
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      </main>
    );
  }

  // ============================================================
  // TELA PRODUTOS
  // ============================================================

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
                  setNomeProduto(
                    e.target.value
                  )
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

                {categorias.map(
                  (categoria) => (
                    <option
                      key={categoria.id}
                      value={categoria.id}
                    >
                      {categoria.name}
                    </option>
                  )
                )}
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
                  setPrecoProduto(
                    e.target.value
                  )
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
                    e.target.files?.[0] ||
                      null
                  )
                }
              />
            </label>

            <small style={styles.hint}>
              JPG, PNG ou WebP. Máximo 5 MB.
            </small>

            <label
              style={styles.checkLabel}
            >
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

          {produtos.length === 0 && (
            <div style={styles.empty}>
              Nenhum produto cadastrado.
            </div>
          )}

          <div style={styles.productGrid}>
            {produtos.map(
              (produto) => (
                <article
                  key={produto.id}
                  style={
                    styles.productCard
                  }
                >
                  {produto.image_url ? (
                    <img
                      src={
                        produto.image_url
                      }
                      alt={produto.name}
                      style={
                        styles.productImage
                      }
                    />
                  ) : (
                    <div
                      style={
                        styles.noImage
                      }
                    >
                      🍕
                    </div>
                  )}

                  <div
                    style={
                      styles.productBody
                    }
                  >
                    <div
                      style={
                        styles.productTop
                      }
                    >
                      <strong
                        style={
                          styles.productName
                        }
                      >
                        {produto.name}
                      </strong>

                      {!produto.active && (
                        <span
                          style={
                            styles.inactive
                          }
                        >
                          Inativo
                        </span>
                      )}
                    </div>

                    {produto.description && (
                      <p
                        style={
                          styles.description
                        }
                      >
                        {
                          produto.description
                        }
                      </p>
                    )}

                    <strong
                      style={styles.price}
                    >
                      {dinheiro(
                        produto.price
                      )}
                    </strong>

                    <div
                      style={
                        styles.actions
                      }
                    >
                      <button
                        style={
                          styles.secondary
                        }
                        type="button"
                        onClick={() =>
                          alternarProduto(
                            produto
                          )
                        }
                      >
                        {produto.active
                          ? 'Desativar'
                          : 'Ativar'}
                      </button>

                      <button
                        style={
                          styles.danger
                        }
                        type="button"
                        onClick={() =>
                          excluirProduto(
                            produto
                          )
                        }
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      </main>
    );
  }

  // ============================================================
  // TELA ADICIONAIS
  // ============================================================

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
            Crie bordas, sabores e
            complementos.
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

                {produtos.map(
                  (produto) => (
                    <option
                      key={produto.id}
                      value={produto.id}
                    >
                      {produto.name}
                    </option>
                  )
                )}
              </select>
            </label>

            <label style={styles.label}>
              Nome do grupo

              <input
                style={styles.input}
                value={nomeGrupo}
                onChange={(e) =>
                  setNomeGrupo(
                    e.target.value
                  )
                }
                placeholder="Ex.: Escolha a borda"
              />
            </label>

            <label
              style={styles.checkLabel}
            >
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
                  setMaxSelecoes(
                    e.target.value
                  )
                }
              />
            </label>

            <button
              style={styles.primary}
              type="button"
              onClick={
                criarGrupoAdicional
              }
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

          {gruposAdicionais.length ===
            0 && (
            <div style={styles.empty}>
              Nenhum grupo de adicionais
              cadastrado.
            </div>
          )}

          <div style={styles.list}>
            {gruposAdicionais.map(
              (grupo) => {
                const produto =
                  produtos.find(
                    (item) =>
                      item.id ===
                      grupo.product_id
                  );

                const itensGrupo =
                  adicionais.filter(
                    (item) =>
                      item.group_id ===
                      grupo.id
                  );

                return (
                  <div
                    key={grupo.id}
                    style={
                      styles.productForm
                    }
                  >
                    <div>
                      <strong
                        style={
                          styles.productName
                        }
                      >
                        {grupo.name}
                      </strong>

                      <p
                        style={
                          styles.description
                        }
                      >
                        Produto:{' '}
                        {produto?.name ||
                          'Produto'}
                      </p>

                      <small
                        style={
                          styles.hint
                        }
                      >
                        {grupo.required
                          ? 'Obrigatório'
                          : 'Opcional'}
                        {' • '}
                        Máximo:{' '}
                        {
                          grupo.max_select
                        }
                      </small>
                    </div>

                    <div
                      style={
                        styles.addonForm
                      }
                    >
                      <input
                        style={
                          styles.input
                        }
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
                        style={
                          styles.input
                        }
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
                        style={
                          styles.primary
                        }
                        type="button"
                        onClick={() =>
                          criarAdicional(
                            grupo.id
                          )
                        }
                        disabled={
                          salvando
                        }
                      >
                        + Adicionar
                      </button>
                    </div>

                    {itensGrupo.map(
                      (adicional) => (
                        <div
                          key={
                            adicional.id
                          }
                          style={
                            styles.listItem
                          }
                        >
                          <div>
                            <strong>
                              {
                                adicional.name
                              }
                            </strong>

                            <div
                              style={
                                styles.price
                              }
                            >
                              {dinheiro(
                                adicional.price
                              )}
                            </div>
                          </div>

                          <button
                            style={
                              styles.danger
                            }
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
                        excluirGrupoAdicional(
                          grupo
                        )
                      }
                    >
                      Excluir grupo
                    </button>
                  </div>
                );
              }
            )}
          </div>
        </section>
      </main>
    );
  }

  // ============================================================
  // INÍCIO DO EDITOR
  // ============================================================

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
            {restaurante.status ===
            'active'
              ? 'Ativo'
              : restaurante.status ===
                'paused'
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
            <span style={styles.icon}>
              📂
            </span>

            <strong
              style={styles.cardTitle}
            >
              Categorias
            </strong>

            <small
              style={styles.cardText}
            >
              {categorias.length}{' '}
              cadastradas
            </small>
          </button>

          <button
            style={styles.card}
            onClick={() =>
              setTela('produtos')
            }
          >
            <span style={styles.icon}>
              🍕
            </span>

            <strong
              style={styles.cardTitle}
            >
              Produtos
            </strong>

            <small
              style={styles.cardText}
            >
              {produtos.length}{' '}
              cadastrados
            </small>
          </button>

          <button
            style={styles.card}
            onClick={() =>
              setTela('adicionais')
            }
          >
            <span style={styles.icon}>
              ➕
            </span>

            <strong
              style={styles.cardTitle}
            >
              Adicionais
            </strong>

            <small
              style={styles.cardText}
            >
              {gruposAdicionais.length}{' '}
              grupos cadastrados
            </small>
          </button>

          <button
            style={styles.card}
            onClick={() =>
              setTela('aparencia')
            }
          >
            <span style={styles.icon}>
              🎨
            </span>

            <strong
              style={styles.cardTitle}
            >
              Aparência
            </strong>

            <small
              style={styles.cardText}
            >
              Logo, capa e cores.
            </small>
          </button>

          <button
            style={styles.card}
            onClick={() =>
              setTela('informacoes')
            }
          >
            <span style={styles.icon}>
              📱
            </span>

            <strong
              style={styles.cardTitle}
            >
              Informações
            </strong>

            <small
              style={styles.cardText}
            >
              WhatsApp, endereço e entrega.
            </small>
          </button>

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

function EditorCard({
  icon,
  title,
  text
}) {
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
    padding: '20px',
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
    fontWeight: '700',
    cursor: 'pointer'
  },

  danger: {
    border: '1px solid #fecaca',
    background: '#fff1f2',
    color: '#dc2626',
    borderRadius: '9px',
    padding: '9px 12px',
    fontWeight: '700',
    cursor: 'pointer'
  },

  error: {
    background: '#fff1f2',
    color: '#b91c1c',
    padding: '13px',
    borderRadius: '11px',
    margin: '15px 0'
  },

  empty: {
    background: '#fff',
    color: '#6b7280',
    padding: '20px',
    borderRadius: '15px'
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
  },

  moneyField: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #d1d5db',
    borderRadius: '11px',
    overflow: 'hidden',
    background: '#fff'
  },

  moneyPrefix: {
    padding: '14px',
    background: '#f3f4f6',
    color: '#374151',
    fontWeight: '800',
    borderRight: '1px solid #d1d5db'
  },

  moneyInput: {
    width: '100%',
    border: 0,
    outline: 'none',
    padding: '14px',
    fontSize: '16px'
  },

  infoPreview: {
    display: 'grid',
    gap: '14px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '18px'
  },

  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    paddingTop: '10px',
    borderTop: '1px solid #e5e7eb'
  }
};
