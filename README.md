# Portal de Fornecedores - MVP (Equipe de Compras)

Aplicação web enxuta para centralização do cadastro de fornecedores, construída exatamente conforme as especificações do documento de planejamento (**PRD, TRD, Fluxo de UX, Briefing de Design e Esquema de Back-end**).

## Estrutura de Arquivos
- `index.html`: Interface completa em arquivo único utilizando **Tailwind CSS (via CDN)** e **Alpine.js (via CDN)**, seguindo o padrão visual corporativo (`bg-blue-900`, `bg-gray-50`, cards `bg-white shadow-sm`, modais com `bg-black/50`).
- `app.js`: Lógica de autenticação com **Supabase Auth**, consulta automática de CNPJ na **BrasilAPI** (com fallback automático para digitação manual imediata em caso de falha) e operações de CRUD completo.
- `schema.sql`: Script SQL completo para ser executado no **SQL Editor** do Supabase, contendo as tabelas `fornecedores` e `contatos`, chaves estrangeiras e políticas de segurança **Row Level Security (RLS)** restritas a usuários autenticados (`auth.role() = 'authenticated'`).

## Como Executar
1. **Teste Imediato (Modo Demonstração Local)**:
   - Basta abrir o arquivo `index.html` diretamente no navegador (ou utilizando a extensão *Live Server* no VS Code).
   - Caso as credenciais do Supabase ainda não tenham sido preenchidas no `app.js`, o sistema ativará automaticamente o **Modo Demonstração Local**, permitindo fazer login com qualquer e-mail/senha, consultar CNPJs reais via **BrasilAPI** e salvar fornecedores no `localStorage`.

2. **Conectando ao Supabase em Produção**:
   - No painel do Supabase, acesse o **SQL Editor**, cole o conteúdo do arquivo `schema.sql` e clique em **Run**.
   - Desative o cadastro público (*Sign Up*) em **Authentication -> Providers -> Email** (desmarque *"Allow new users to sign up"*).
   - Crie os usuários da equipe de compras manualmente em **Authentication -> Users -> Add user**.
   - Abra o arquivo `app.js` e substitua as constantes `SUPABASE_URL` e `SUPABASE_ANON_KEY` pelas credenciais do seu projeto.
