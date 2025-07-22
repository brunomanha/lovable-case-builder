# 🤖 IA Legal - Sistema de Análise Inteligente de Casos

Uma plataforma moderna de análise de documentos legais com Inteligência Artificial, desenvolvida com React, TypeScript e Tailwind CSS.

## 🎯 Visão Geral

O **IA Legal** é uma aplicação frontend completa que demonstra como seria um sistema de análise de documentos legais utilizando IA. O projeto inclui autenticação, dashboard de casos, upload de arquivos e simulação de processamento por IA.

## ✨ Funcionalidades

### 🔐 Autenticação
- **Login**: Sistema de login com validação
- **Registro**: Criação de conta com validações robustas
- **Credenciais de Demo**: `demo@email.com` / `123456`

### 📊 Dashboard
- **Lista de Casos**: Visualização de todos os casos do usuário
- **Estatísticas**: Contadores de casos pendentes, processando e concluídos
- **Busca e Filtros**: Sistema de busca em tempo real
- **Cards Responsivos**: Interface adaptável para mobile e desktop

### 📄 Gerenciamento de Casos
- **Novo Caso**: Formulário para criação de casos
- **Upload de Arquivos**: 
  - Suporte a múltiplos arquivos (PDF, DOC, DOCX, TXT, imagens)
  - Validação de tamanho (máx. 10MB por arquivo)
  - Preview de arquivos selecionados
- **Status em Tempo Real**: Acompanhamento do processamento
- **Detalhes**: Modal completo com informações e timeline

### 🤖 Simulação de IA
- **Processamento Simulado**: Estados de pending → processing → completed
- **Respostas da IA**: Análises detalhadas dos documentos
- **Timeline**: Histórico de ações do caso

## 🛠️ Stack Tecnológica

### Frontend
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para styling
- **shadcn/ui** para componentes
- **Lucide React** para ícones
- **React Router** para navegação
- **date-fns** para manipulação de datas

### Arquitetura Backend (Recomendada)
```
📦 Backend Sugerido
├── Node.js + Express
├── PostgreSQL (banco de dados)
├── JWT + bcrypt (autenticação)
├── AWS S3 ou MinIO (storage)
├── n8n (automação e IA)
└── Docker (containerização)
```

## 🚀 Como Executar

### 1. Clonar o Repositório
```bash
git clone <URL_DO_REPOSITORIO>
cd ia-legal
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Executar em Desenvolvimento
```bash
npm run dev
```

### 4. Acessar a Aplicação
```
http://localhost:8080
```

### 5. Fazer Login
Use as credenciais de demonstração:
- **Email**: `demo@email.com`
- **Senha**: `123456`

## 🎨 Design System

### Paleta de Cores
- **Primary**: `hsl(217 91% 60%)` - Azul corporativo
- **Success**: `hsl(152 81% 46%)` - Verde para sucesso
- **Warning**: `hsl(38 92% 50%)` - Laranja para alertas
- **Destructive**: `hsl(0 84% 60%)` - Vermelho para erros

### Componentes Reutilizáveis
- **Buttons**: Variações primary, secondary, outline, ghost
- **Cards**: Layout consistente com hover effects
- **Forms**: Inputs com validação e feedback visual
- **Modals**: Dialogs responsivos com scroll areas
- **Badges**: Status indicators com cores semânticas

## 🔧 Integração com Backend

### Para conectar com backend real, recomendamos usar Supabase:

1. **Clique no botão Supabase** no Lovable
2. **Configure as tabelas**:
   ```sql
   -- Usuários
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     email TEXT UNIQUE NOT NULL,
     password_hash TEXT NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Casos
   CREATE TABLE cases (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id),
     title TEXT NOT NULL,
     description TEXT NOT NULL,
     status TEXT DEFAULT 'pending',
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Anexos
   CREATE TABLE attachments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     case_id UUID REFERENCES cases(id),
     filename TEXT NOT NULL,
     file_size INTEGER,
     file_url TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Respostas da IA
   CREATE TABLE ai_responses (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     case_id UUID REFERENCES cases(id),
     response_text TEXT NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Configure RLS** (Row Level Security):
   ```sql
   ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
   ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;

   -- Políticas de acesso
   CREATE POLICY "Users can view own cases" ON cases
     FOR SELECT USING (auth.uid() = user_id);
   ```

## 🤖 Integração com n8n

### Fluxo Recomendado:
1. **Webhook Trigger**: Recebe dados do caso
2. **Download Files**: Baixa arquivos do S3
3. **AI Processing**: Processa com OpenAI/Claude
4. **Database Update**: Atualiza status no PostgreSQL
5. **Response**: Retorna resultado

### Exemplo de Webhook n8n:
```javascript
// Node.js function no n8n
const caseData = $input.all()[0].json;

// Processar arquivos com IA
const aiResponse = await processWithAI(caseData.attachments);

// Atualizar banco
await updateCase(caseData.caseId, {
  status: 'completed',
  ai_response: aiResponse
});

return { status: 'success', response: aiResponse };
```

## 📱 Responsividade

- **Mobile First**: Design otimizado para dispositivos móveis
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch Friendly**: Botões e áreas de toque adequados
- **Progressive Enhancement**: Funciona sem JavaScript

## 🔒 Segurança

### Frontend
- **Input Validation**: Validação de formulários
- **File Validation**: Verificação de tipos e tamanhos
- **XSS Protection**: Sanitização de dados

### Backend (Recomendado)
- **JWT Tokens**: Autenticação stateless
- **bcrypt**: Hash de senhas
- **CORS**: Configuração adequada
- **Rate Limiting**: Proteção contra ataques
- **HTTPS**: Comunicação segura

## 🚢 Deploy

### Lovable (Recomendado)
1. Clique em **"Publish"** no Lovable
2. Configure domínio personalizado se necessário

### Outras Opções
- **Vercel**: `npm run build && vercel deploy`
- **Netlify**: `npm run build && netlify deploy`
- **AWS S3 + CloudFront**: Para hosting estático

## 📋 API Endpoints (Backend)

```typescript
// Autenticação
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh

// Casos
GET /api/cases
POST /api/cases
GET /api/cases/:id
PUT /api/cases/:id
DELETE /api/cases/:id

// Upload
POST /api/upload/signed-url
POST /api/cases/:id/submit

// Webhook n8n
POST /webhook/ia-case
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

- **Documentação**: [docs.lovable.dev](https://docs.lovable.dev)
- **Discord**: [Lovable Community](https://discord.com/channels/1119885301872070706/1280461670979993613)
- **Email**: suporte@ialegal.com

---

**Desenvolvido com ❤️ usando Lovable**