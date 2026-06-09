<h1 align="center">Painel Tático COOP — API Backend</h1>

<p align="center">
  <strong>Servidor Node.js/Express para o sistema de gestão operacional</strong>
</p>

## 🚀 Como subir na Vercel (Separado)

Como separamos o Frontend e o Backend para resolver problemas de rotas, você deve fazer o deploy deste backend como um **projeto independente** na Vercel.

### Passo 1: Subir no GitHub
Crie um repositório no GitHub APENAS para o conteúdo desta pasta `backend` e suba os arquivos.

### Passo 2: Criar Projeto na Vercel
1. Acesse o dashboard da Vercel.
2. Clique em **Add New > Project**.
3. Importe o repositório do seu Backend.
4. O *Framework Preset* pode ficar em **Other** (a Vercel vai detectar o Node.js).
5. Clique em **Deploy**.

### Passo 3: Variáveis de Ambiente
Vá em **Settings > Environment Variables** do seu projeto Backend na Vercel e adicione todas as credenciais do Firebase e Cloudinary, além do `JWT_SECRET` e `ALLOWED_ORIGIN` (que será a URL do seu Frontend na Vercel).

---

## 🛠️ Stack Tecnológica

- **Node.js + Express**
- **TypeScript**
- **Firebase Web SDK** (Firestore)
- **Cloudinary** (Upload de imagens)
- **JWT + Bcrypt** (Autenticação)

## 💻 Rodando Localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (usando tsx)
npm run dev
```

O servidor rodará na porta `5000` por padrão.
