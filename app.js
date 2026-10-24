/**
 * ============================================================================
 * PORTAL DE FORNECEDORES - LÓGICA DE NEGÓCIOS E INTEGRAÇÕES (app.js)
 * Stack: Alpine.js + Supabase (Auth & Database) + BrasilAPI (CNPJ)
 * ============================================================================
 */

// 1. CONFIGURAÇÃO DO SUPABASE
// Substitua os valores abaixo pela URL e Anon Key do seu projeto no Supabase.
// Enquanto mantiver os valores padrão, o sistema operará automaticamente em
// "Modo Demonstração Local" (persistindo no localStorage) para testes imediatos.
const SUPABASE_URL = 'https://cdixejhxblubzscshetc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaXhlamh4Ymx1YnpzY3NoZXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MTQ3NzYsImV4cCI6MjEwODM5MDc3Nn0.FqNgKyltbfD4F6GNUyxGpgvr5RtoO3cx2dmx79S0yOw';

const usarSupabaseReal =
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('SUA_SUPABASE_URL') &&
    SUPABASE_URL.startsWith('http');

const supabaseClient = usarSupabaseReal
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// Dados iniciais de exemplo para o Modo Demonstração Local
const DADOS_INICIAIS_DEMO = [
    {
        id: 'forn-demo-1',
        cnpj: '04922092000184',
        razao_social: 'SIGMA-ALDRICH BRASIL LTDA',
        cidade: 'BARUERI',
        uf: 'SP',
        status: 'ativo',
        contatos: [
            {
                id: 'cont-1',
                nome: 'Carlos Eduardo Mendes',
                email: 'cotacoes.lab@merckgroup.com',
                telefone: '(11) 3732-3100'
            }
        ]
    },
    {
        id: 'forn-demo-2',
        cnpj: '61418042000131',
        razao_social: 'AGILENT TECHNOLOGIES BRASIL LTDA',
        cidade: 'BARUERI',
        uf: 'SP',
        status: 'ativo',
        contatos: [
            {
                id: 'cont-2',
                nome: 'Fernanda Rocha (Cromatografia)',
                email: 'vendas.brasil@agilent.com',
                telefone: '(11) 4197-3600'
            },
            {
                id: 'cont-3',
                nome: 'Suporte Técnico Padrões',
                email: 'suporte@agilent.com',
                telefone: '0800 728 1405'
            }
        ]
    },
    {
        id: 'forn-demo-3',
        cnpj: '84683408000192',
        razao_social: 'LOGISTICA E TRANSPORTES CATARINENSE S/A',
        cidade: 'JOINVILLE',
        uf: 'SC',
        status: 'inativo',
        contatos: [
            {
                id: 'cont-4',
                nome: 'Roberto Alves',
                email: 'comercial@transcatarinense.com.br',
                telefone: '(47) 3433-9000'
            }
        ]
    }
];

function fornecedoresApp() {
    return {
        // Estado de Autenticação
        modoDemo: !usarSupabaseReal,
        usuarioLogado: null,
        carregandoLogin: false,
        erroLogin: '',
        formLogin: {
            email: '',
            senha: ''
        },

        // Estado da Lista Principal
        fornecedores: [],
        carregandoLista: false,
        termoBusca: '',
        filtroStatus: 'todos',

        // Estado do Modal e Formulário de Cadastro/Edição
        modalAberto: false,
        modoEdicao: false,
        buscandoCNPJ: false,
        camposLiberados: false,
        salvandoFornecedor: false,
        avisoAPI: {
            visivel: false,
            tipo: 'sucesso',
            mensagem: ''
        },
        formFornecedor: {
            id: null,
            cnpj: '',
            razao_social: '',
            cidade: '',
            uf: '',
            status: 'ativo',
            contatos: [{ nome: '', email: '', telefone: '' }]
        },

        // Notificação Toast
        toast: {
            visivel: false,
            tipo: 'sucesso',
            mensagem: ''
        },

        // ====================================================================
        // INICIALIZAÇÃO E AUTENTICAÇÃO
        // ====================================================================
        async initApp() {
            if (this.modoDemo) {
                const sessaoSalva = localStorage.getItem('demo_sessao_compras');
                if (sessaoSalva) {
                    this.usuarioLogado = JSON.parse(sessaoSalva);
                    await this.carregarFornecedores();
                }
                return;
            }

            // Verifica sessão ativa no Supabase Auth
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.user) {
                this.usuarioLogado = session.user;
                await this.carregarFornecedores();
            }

            // Escuta alterações de autenticação
            supabaseClient.auth.onAuthStateChange((_event, session) => {
                this.usuarioLogado = session?.user || null;
            });
        },

        async fazerLogin() {
            this.erroLogin = '';
            this.carregandoLogin = true;

            try {
                if (this.modoDemo) {
                    await new Promise(r => setTimeout(r, 400));
                    this.usuarioLogado = { email: this.formLogin.email };
                    localStorage.setItem('demo_sessao_compras', JSON.stringify(this.usuarioLogado));
                    await this.carregarFornecedores();
                    this.exibirToast('sucesso', 'Login efetuado com sucesso (Modo Demo Local).');
                } else {
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: this.formLogin.email.trim(),
                        password: this.formLogin.senha
                    });
                    if (error) throw error;
                    this.usuarioLogado = data.user;
                    await this.carregarFornecedores();
                    this.exibirToast('sucesso', 'Bem-vindo ao Portal de Fornecedores!');
                }
                this.formLogin.senha = '';
            } catch (err) {
                this.erroLogin = 'Falha na autenticação: verifique seu e-mail e senha.';
                console.error(err);
            } finally {
                this.carregandoLogin = false;
            }
        },

        async fazerLogout() {
            if (this.modoDemo) {
                localStorage.removeItem('demo_sessao_compras');
                this.usuarioLogado = null;
                return;
            }
            await supabaseClient.auth.signOut();
            this.usuarioLogado = null;
        },

        // ====================================================================
        // LISTAGEM E FILTRAGEM DE FORNECEDORES
        // ====================================================================
        get fornecedoresFiltrados() {
            const termo = this.termoBusca.trim().toLowerCase();
            const termoLimpoCNPJ = termo.replace(/\D/g, '');

            return this.fornecedores.filter(f => {
                const bateStatus =
                    this.filtroStatus === 'todos' || f.status === this.filtroStatus;

                if (!termo) return bateStatus;

                const bateRazao = (f.razao_social || '').toLowerCase().includes(termo);
                const bateCidade = (f.cidade || '').toLowerCase().includes(termo);
                const bateCNPJ =
                    termoLimpoCNPJ.length > 0 &&
                    (f.cnpj || '').replace(/\D/g, '').includes(termoLimpoCNPJ);
                const bateContato = (f.contatos || []).some(
                    c =>
                        (c.nome || '').toLowerCase().includes(termo) ||
                        (c.email || '').toLowerCase().includes(termo)
                );

                return bateStatus && (bateRazao || bateCidade || bateCNPJ || bateContato);
            });
        },

        async carregarFornecedores() {
            this.carregandoLista = true;
            try {
                if (this.modoDemo) {
                    const salvo = localStorage.getItem('demo_fornecedores_db');
                    if (salvo) {
                        this.fornecedores = JSON.parse(salvo);
                    } else {
                        this.fornecedores = DADOS_INICIAIS_DEMO;
                        localStorage.setItem('demo_fornecedores_db', JSON.stringify(this.fornecedores));
                    }
                } else {
                    const { data, error } = await supabaseClient
                        .from('fornecedores')
                        .select('id, cnpj, razao_social, cidade, uf, status, contatos (id, nome, email, telefone)')
                        .order('razao_social', { ascending: true });

                    if (error) throw error;
                    this.fornecedores = data || [];
                }
            } catch (err) {
                console.error('Erro ao listar fornecedores:', err);
                this.exibirToast('erro', 'Não foi possível carregar a lista de fornecedores.');
            } finally {
                this.carregandoLista = false;
            }
        },

        // ====================================================================
        // INTEGRAÇÃO BRASILAPI (CONSULTA DE CNPJ COM FALLBACK MANUAL)
        // ====================================================================
        async buscarCNPJ() {
            const cnpjLimpo = (this.formFornecedor.cnpj || '').replace(/\D/g, '');

            if (cnpjLimpo.length !== 14) {
                this.avisoAPI = {
                    visivel: true,
                    tipo: 'erro',
                    mensagem: 'CNPJ inválido. Digite os 14 números antes de consultar ou preencha os campos manualmente abaixo.'
                };
                this.camposLiberados = true;
                return;
            }

            this.buscandoCNPJ = true;
            this.avisoAPI.visivel = false;

            try {
                const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);

                if (!response.ok) {
                    throw new Error(`Retorno HTTP ${response.status}`);
                }

                const dados = await response.json();

                this.formFornecedor.razao_social = dados.razao_social || dados.nome_fantasia || '';
                this.formFornecedor.cidade = dados.municipio || '';
                this.formFornecedor.uf = dados.uf || '';
                this.camposLiberados = true;

                this.avisoAPI = {
                    visivel: true,
                    tipo: 'sucesso',
                    mensagem: 'Dados localizados na Receita Federal via BrasilAPI! Confira as informações e adicione o contato comercial.'
                };
            } catch (err) {
                console.warn('Falha ao consultar BrasilAPI. Liberando preenchimento manual:', err);
                // Requisito crítico do PRD/TRD: liberar imediatamente os campos para digitação manual em caso de falha
                this.camposLiberados = true;
                this.avisoAPI = {
                    visivel: true,
                    tipo: 'erro',
                    mensagem: 'Não foi possível obter os dados automaticamente na BrasilAPI (indisponibilidade ou CNPJ não localizado). Os campos foram liberados para digitação manual imediata.'
                };
            } finally {
                this.buscandoCNPJ = false;
            }
        },

        // ====================================================================
        // MODAL E OPERAÇÕES CRUD (CRIAR, EDITAR, INATIVAR)
        // ====================================================================
        abrirModalNovo() {
            this.modoEdicao = false;
            this.camposLiberados = false;
            this.avisoAPI.visivel = false;
            this.formFornecedor = {
                id: null,
                cnpj: '',
                razao_social: '',
                cidade: '',
                uf: '',
                status: 'ativo',
                contatos: [{ nome: '', email: '', telefone: '' }]
            };
            this.modalAberto = true;
        },

        abrirModalEdicao(fornecedor) {
            this.modoEdicao = true;
            this.camposLiberados = true;
            this.avisoAPI.visivel = false;

            const contatosCopia =
                fornecedor.contatos && fornecedor.contatos.length > 0
                    ? fornecedor.contatos.map(c => ({ ...c }))
                    : [{ nome: '', email: '', telefone: '' }];

            this.formFornecedor = {
                id: fornecedor.id,
                cnpj: this.formatarCNPJ(fornecedor.cnpj),
                razao_social: fornecedor.razao_social,
                cidade: fornecedor.cidade,
                uf: fornecedor.uf,
                status: fornecedor.status,
                contatos: contatosCopia
            };
            this.modalAberto = true;
        },

        fecharModal() {
            this.modalAberto = false;
        },

        adicionarLinhaContato() {
            this.formFornecedor.contatos.push({ nome: '', email: '', telefone: '' });
        },

        removerLinhaContato(index) {
            if (this.formFornecedor.contatos.length > 1) {
                this.formFornecedor.contatos.splice(index, 1);
            }
        },

        async salvarFornecedor() {
            const cnpjLimpo = (this.formFornecedor.cnpj || '').replace(/\D/g, '');
            if (cnpjLimpo.length !== 14) {
                this.exibirToast('aviso', 'O CNPJ deve conter 14 dígitos numéricos.');
                return;
            }

            if (!this.formFornecedor.razao_social.trim()) {
                this.camposLiberados = true;
                this.exibirToast('aviso', 'Preencha a Razão Social do fornecedor.');
                return;
            }

            this.salvandoFornecedor = true;

            try {
                const dadosFornecedor = {
                    cnpj: cnpjLimpo,
                    razao_social: this.formFornecedor.razao_social.trim(),
                    cidade: this.formFornecedor.cidade.trim(),
                    uf: (this.formFornecedor.uf || '').trim().toUpperCase(),
                    status: this.formFornecedor.status
                };

                const contatosValidos = this.formFornecedor.contatos
                    .filter(c => c.nome && c.nome.trim() !== '')
                    .map(c => ({
                        nome: c.nome.trim(),
                        email: (c.email || '').trim(),
                        telefone: (c.telefone || '').trim()
                    }));

                if (this.modoDemo) {
                    if (this.modoEdicao) {
                        const idx = this.fornecedores.findIndex(f => f.id === this.formFornecedor.id);
                        if (idx !== -1) {
                            this.fornecedores[idx] = {
                                ...this.fornecedores[idx],
                                ...dadosFornecedor,
                                contatos: contatosValidos
                            };
                        }
                    } else {
                        const jaExiste = this.fornecedores.some(
                            f => f.cnpj.replace(/\D/g, '') === cnpjLimpo
                        );
                        if (jaExiste) {
                            this.exibirToast('erro', 'Já existe um fornecedor cadastrado com este CNPJ.');
                            this.salvandoFornecedor = false;
                            return;
                        }
                        this.fornecedores.unshift({
                            id: 'forn-' + Date.now(),
                            ...dadosFornecedor,
                            contatos: contatosValidos
                        });
                    }
                    localStorage.setItem('demo_fornecedores_db', JSON.stringify(this.fornecedores));
                } else {
                    let fornecedorId = this.formFornecedor.id;

                    if (this.modoEdicao) {
                        const { error: errUpdate } = await supabaseClient
                            .from('fornecedores')
                            .update(dadosFornecedor)
                            .eq('id', fornecedorId);
                        if (errUpdate) throw errUpdate;

                        // Atualiza contatos (remove anteriores e reinsere os atuais de forma simples e direta)
                        await supabaseClient
                            .from('contatos')
                            .delete()
                            .eq('fornecedor_id', fornecedorId);
                    } else {
                        const { data: novoForn, error: errInsert } = await supabaseClient
                            .from('fornecedores')
                            .insert([dadosFornecedor])
                            .select()
                            .single();
                        if (errInsert) throw errInsert;
                        fornecedorId = novoForn.id;
                    }

                    if (contatosValidos.length > 0) {
                        const payloadContatos = contatosValidos.map(c => ({
                            fornecedor_id: fornecedorId,
                            ...c
                        }));
                        const { error: errContatos } = await supabaseClient
                            .from('contatos')
                            .insert(payloadContatos);
                        if (errContatos) throw errContatos;
                    }

                    await this.carregarFornecedores();
                }

                this.fecharModal();
                this.exibirToast(
                    'sucesso',
                    this.modoEdicao
                        ? 'Cadastro do fornecedor atualizado com sucesso!'
                        : 'Fornecedor cadastrado com sucesso!'
                );
            } catch (err) {
                console.error('Erro ao salvar fornecedor:', err);
                const msg =
                    err?.code === '23505'
                        ? 'Já existe um fornecedor cadastrado com este CNPJ.'
                        : 'Erro ao salvar os dados do fornecedor.';
                this.exibirToast('erro', msg);
            } finally {
                this.salvandoFornecedor = false;
            }
        },

        async alternarStatusFornecedor(fornecedor) {
            const novoStatus = fornecedor.status === 'ativo' ? 'inativo' : 'ativo';
            const acaoTexto = novoStatus === 'inativo' ? 'inativar' : 'reativar';

            if (!confirm(`Deseja realmente ${acaoTexto} o fornecedor "${fornecedor.razao_social}"?`)) {
                return;
            }

            try {
                if (this.modoDemo) {
                    fornecedor.status = novoStatus;
                    localStorage.setItem('demo_fornecedores_db', JSON.stringify(this.fornecedores));
                } else {
                    const { error } = await supabaseClient
                        .from('fornecedores')
                        .update({ status: novoStatus })
                        .eq('id', fornecedor.id);
                    if (error) throw error;
                    fornecedor.status = novoStatus;
                }

                this.exibirToast(
                    'sucesso',
                    `Fornecedor ${novoStatus === 'ativo' ? 'reativado' : 'inativado'} com sucesso.`
                );
            } catch (err) {
                console.error('Erro ao alterar status:', err);
                this.exibirToast('erro', 'Não foi possível alterar o status do fornecedor.');
            }
        },

        // ====================================================================
        // UTILITÁRIOS DE FORMATAÇÃO E INTERFACE
        // ====================================================================
        aplicarMascaraCNPJ() {
            this.formFornecedor.cnpj = this.formatarCNPJ(this.formFornecedor.cnpj);
        },

        formatarCNPJ(valor) {
            const digitos = (valor || '').replace(/\D/g, '').slice(0, 14);
            return digitos
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        },

        exibirToast(tipo, mensagem) {
            this.toast = { visivel: true, tipo, mensagem };
            setTimeout(() => {
                this.toast.visivel = false;
            }, 4500);
        }
    };
}
