# SGCM — Sistema de Gerenciamento Comercial Modular

Sistema profissional para pequenos negócios. Desenvolvido com HTML, CSS e JavaScript puro. Funciona imediatamente ao abrir o `index.html`, sem servidor ou instalação.

---

## 📋 Pré-requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Conexão com internet (apenas para carregar fontes e Chart.js)
- Sem necessidade de servidor, banco de dados ou instalação

---

## 🆕 Novidades (2026)

### Fase 1
- Paginação avançada em serviços, clientes e agendamentos
- Exportação de clientes para PDF
- Sincronização global do modo escuro

### Fase 2
- **Dashboard com gráficos (Chart.js):** Receita mensal e serviços mais vendidos
- **Múltiplos funcionários:** Login, níveis de acesso (admin/atendente), página de funcionários
- **Comissões:** Relatório de comissões por funcionário, exportação PDF
- **WhatsApp integrado:** Botão para contato direto com clientes
- **Sidebar dinâmica:** Menus diferentes para admin/atendente
- **Ajustes gerais:** Campos de funcionário em agendamentos, melhorias de segurança e usabilidade

---

## 🔐 Acesso ao Sistema

Após implementar o módulo de funcionários, use as credenciais:

| Perfil | Email | Senha |
|--------|-------|-------|
| **Administrador** | admin@sistema.com | admin123 |
| **Atendente** | atendente@sistema.com | atendente123 |

> ⚠️ **Importante:** Altere a senha do administrador após o primeiro acesso.

---

## 🚀 Como usar

1. Abra o arquivo `index.html` em qualquer navegador moderno
2. Você será redirecionado para a tela de **Login**
3. Use as credenciais padrão acima
4. Os dados de demonstração serão carregados automaticamente
5. Navegue pelas seções pelo menu lateral (varia conforme perfil)

---

## 📁 Estrutura do Projeto

/sistema
index.html → Dashboard principal
/css
main.css → Design system completo (variáveis, componentes)
/js
db.js → Banco de dados (LocalStorage)
ui.js → Utilitários, notificações, formatadores
mobile.js → Menu responsivo (hamburguer)
auth.js → 🔐 Autenticação e funcionários (NOVO)
charts.js → 📊 Gráficos com Chart.js (NOVO)
/pages
login.html → 🔐 Tela de acesso (NOVO)
clientes.html → Cadastro e gestão de clientes
servicos.html → Cadastro de serviços/produtos
agendamentos.html → Agenda e controle de atendimentos
historico.html → Histórico de atendimentos com relatórios
funcionarios.html → 👥 Gestão de funcionários (NOVO)
comissoes.html → 💰 Relatório de comissões (NOVO)
config.html → Configurações visuais e do negócio

---

## 🎨 Personalização

### Mudar as cores
Em `config.html`, vá em **Cor Principal** e selecione uma cor ou insira um HEX personalizado.

Ou edite diretamente no CSS (`css/main.css`):
```css
:root {
  --primary: #2563EB; /* Sua cor aqui */
}
```

Mudar o nome do negócio

Em config.html, campo Nome do Estabelecimento. Atualiza automaticamente todo o sistema.
Ativar/Desativar módulos

Em config.html, seção Módulos Ativos:

    Duração dos Serviços → útil para barbearias, esmalterias, etc.

    Histórico → para estabelecimentos que precisam de relatórios

🏪 Adaptações por tipo de negócio
Negócio	Módulo Duração	Módulo Histórico
Barbearia	✅ Ativo	✅ Ativo
Esmalteria	✅ Ativo	✅ Ativo
Lava-Rápido	❌ Opcional	✅ Ativo
Pet Shop	✅ Ativo	✅ Ativo
Restaurante	❌ Desativo	✅ Ativo
🔧 Funcionalidades
Dashboard

    Cards com totais: clientes, agendamentos, receita do mês

    Agenda do dia com horários e status

    Top serviços mais realizados (com barra de progresso)

    Progresso do dia em tempo real

    Gráficos de receita mensal e serviços mais vendidos (Chart.js)

Clientes

    Cadastro completo (nome, telefone, email, observações)

    Busca em tempo real

    Editar e excluir com confirmação

    Ver histórico individual do cliente

    Avatar colorido gerado automaticamente

    Botão WhatsApp integrado para contato rápido

Serviços

    Cards visuais por serviço

    Preço, duração e descrição

    Emoji automático por nome

    Módulo de duração configurável

    Paginação avançada

Agendamentos

    Criar agendamento com cliente + serviço + data/hora

    Seleção de funcionário responsável

    Filtros: Hoje / Amanhã / Esta Semana / Todos / Data específica

    Marcar como concluído (envia para histórico automaticamente)

    Status: Agendado / Concluído / Cancelado

Histórico

    Todos os atendimentos concluídos

    Filtros por período (de/até)

    Métricas: Receita Total, Total de Atendimentos, Ticket Médio, Receita do Mês

    Exportação de dados em JSON

Funcionários (Admin)

    Cadastro de funcionários (nome, email, senha, cargo)

    Definição de comissão (%) por funcionário

    Ativar/Inativar usuários

    Níveis de acesso: Administrador / Atendente

Comissões

    Relatório de comissões por funcionário

    Filtros por período (data inicial e final)

    Cálculo automático baseado na receita gerada

    Exportação para PDF com layout profissional

Configurações

    Nome e emoji do estabelecimento

    Cor principal (10 cores predefinidas + seletor livre)

    Módulos on/off

    Exportar backup JSON

    Restaurar dados demo

    Sidebar dinâmica por perfil de usuário

🔒 Segurança

    Autenticação: Login com email e senha (hash simples)

    Níveis de acesso: Admin (total) / Atendente (restrito)

    Sessão: Mantida enquanto o navegador não for fechado

    Dados: Armazenados localmente no dispositivo do usuário

    ⚠️ Aviso para produção: Troque a senha padrão do administrador e não compartilhe credenciais entre funcionários.

💾 Armazenamento de Dados

Os dados são salvos no LocalStorage do navegador. Para cada negócio (cada computador), os dados ficam separados.

Chaves utilizadas:

    sgcm_config — configurações do sistema

    sgcm_clientes — lista de clientes

    sgcm_servicos — lista de serviços

    sgcm_agendamentos — agendamentos

    sgcm_historico — histórico de atendimentos

    sgcm_usuarios — funcionários (NOVO)

    sgcm_session — sessão do usuário logado (NOVO)

📦 Dependências Externas

    Chart.js v4.4.0 - Biblioteca de gráficos (CDN)

    Google Fonts - Fontes Sora e JetBrains Mono

Todas são carregadas automaticamente via CDN, sem necessidade de instalação.
📱 Responsividade

O sistema é responsivo para tablets e desktops. Em telas menores (< 768px):

    Sidebar se transforma em drawer (gaveta lateral)

    Botão hamburguer para abrir/fechar o menu

    Overlay escuro ao fundo quando menu aberto

    Modais se comportam como bottom sheet

🛠 Tecnologias

    HTML5 semântico

    CSS3 com variáveis customizáveis e Dark Mode

    JavaScript ES6+ (sem frameworks)

    Google Fonts: Sora + JetBrains Mono

    Chart.js para gráficos interativos

    LocalStorage como cache/offline fallback
    Supabase como sincronização compartilhada em tempo real

📋 Roadmap (Próximas Versões)
Fase 3 (Preparação para Venda)

    Script de deploy automático

    Documentação comercial (guia do usuário)

    Contrato de licenciamento

Fase 4 (Opcional - Sob consulta)

    Sincronização com Google Sheets (multi-dispositivo)

    Backup automático na nuvem

    App mobile (PWA)

    Integração com WhatsApp API (envio de lembretes)

    Relatórios em Excel/CSV

    Pagamentos integrados (Mercado Pago, Stripe)

📞 Suporte

Para dúvidas, sugestões ou contratempos, entre em contato com o desenvolvedor.

---

## ⚙️ Configurar Supabase (sincronização remota) — Rápido

Passos mínimos para habilitar a sincronização remota usando Supabase Storage e a API REST. O app já vem com um bootstrap padrão do projeto para sincronizar automaticamente em qualquer navegador/dispositivo, e o LocalStorage fica como cache local/offline:

1. Crie um projeto no Supabase
    - Acesse https://supabase.com e crie um novo projeto (escolha região e senha do banco).

2. Aplicar o esquema SQL
    - Abra o painel do seu projeto → SQL Editor → New query.
    - Cole o conteúdo de [supabase/schema.sql](supabase/schema.sql#L1) e execute. Isso cria as tabelas e políticas necessárias para o template.

3. Criar um bucket de Storage
    - Vá em Storage → Buckets → New bucket.
    - Nome sugerido: qualquer nome fácil de identificar para a instalação.
    - O importante é que as policies do Storage permitam arquivos com o padrão `sgcm-backup-*.json`.

4. Copiar Project URL e ANON KEY
    - Vá em Settings → API → Project URL e anon (public) key.
    - NÃO use a `service_role` key no front-end. A `anon` key é pública por definição.

5. Configurar no app
    - Abra o app (local ou deploy) e vá em [pages/config.html](pages/config.html#L1).
    - Na seção "Sincronização Remota", cole `Project URL`, `ANON KEY` e o nome do `bucket` criado.
    - Clique em `Salvar Config` e use `Testar Conexão` para validar.

6. Enviar / Baixar backup (teste)
    - Use o botão `⬆️ Enviar backup` para enviar um snapshot JSON para o Storage.
    - Em outro dispositivo ou navegador, cole a mesma configuração e clique em `⬇️ Baixar backup` para importar os dados.

7. Troubleshooting rápido
    - Erro 401/403 ao enviar: verifique a `ANON KEY` e se o bucket está público.
    - Se o bucket estiver privado, confirme se as policies de `storage.objects` foram aplicadas corretamente no SQL Editor.
    - Resposta vazia ao baixar: confirme o nome do arquivo (o sistema usa `sgcm-backup-latest.json`).

8. Observações de segurança e modelo de venda
    - Este repositório é pensado para vender como "cópia por cliente": cada cliente cria o próprio projeto Supabase (isolamento de dados).
    - A `ANON KEY` é pública — não coloque dados sensíveis dentro do front-end que exijam credenciais secretas.

## 🚀 Deploy no Vercel (estático)

1. Crie um repositório Git (GitHub/GitLab) com este projeto.
2. Acesse https://vercel.com, clique em "Import Project" e conecte seu repositório.
3. Escolha o projeto e finalize a importação. Não é necessário `build command` — o site será servido como estático. Use o diretório root como saída.
4. Após deploy, abra a aplicação e configure o Supabase via `pages/config.html` (passo 5 acima).

Dica: se quiser pré-configurar as credenciais em ambiente, você pode adicionar um pequeno script de build que injete variáveis (opcional). Para a maioria dos casos de uso aqui, configurar via `config.html` pós-deploy é o mais simples.

---

Se quiser, eu adiciono um guia passo-a-passo com capturas de tela ou um script que aplique automaticamente o `schema.sql` via CLI (supabase CLI). Quer que eu adicione isso agora?
