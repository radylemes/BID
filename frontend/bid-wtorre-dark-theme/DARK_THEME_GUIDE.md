# BID WTORRE - Dark Theme Professional

## 📋 Visão Geral

Este guia fornece instruções completas para implementar o tema escuro profissional na sua aplicação Angular BID WTORRE. O tema foi desenvolvido com foco em:

- **Acessibilidade**: Alto contraste para melhor legibilidade
- **Profissionalismo**: Paleta de cores sofisticada e refinada
- **Consistência**: Variáveis CSS reutilizáveis para manutenção fácil
- **Performance**: Otimizado para carregamento rápido
- **Responsividade**: Funciona perfeitamente em todos os dispositivos

---

## 🎨 Paleta de Cores

### Cores Primárias

| Cor | Hex | Uso |
|-----|-----|-----|
| Primária | `#6366f1` | Botões, links, destaques |
| Primária Escura | `#4f46e5` | Estados hover de botões |
| Primária Clara | `#818cf8` | Backgrounds secundários |
| Primária Mais Clara | `#c7d2fe` | Backgrounds leves |

### Cores de Fundo

| Cor | Hex | Uso |
|-----|-----|-----|
| Fundo Principal | `#0f172a` | Background da página |
| Fundo Secundário | `#1e293b` | Cards e containers |
| Fundo Terciário | `#334155` | Elementos hover |
| Fundo Surface | `#1a1f35` | Sidebar e superfícies |
| Fundo Surface Alt | `#232d45` | Variações de surface |

### Cores de Texto

| Cor | Hex | Uso |
|-----|-----|-----|
| Texto Primário | `#f1f5f9` | Texto principal |
| Texto Secundário | `#cbd5e1` | Texto secundário |
| Texto Terciário | `#94a3b8` | Texto desabilitado |
| Texto Muted | `#64748b` | Labels e hints |

### Cores de Status

| Status | Hex | Uso |
|--------|-----|-----|
| Sucesso | `#10b981` | Operações bem-sucedidas |
| Aviso | `#f59e0b` | Alertas e avisos |
| Perigo | `#ef4444` | Erros e ações destrutivas |
| Info | `#3b82f6` | Informações gerais |

---

## 📁 Arquivos Fornecidos

### 1. `dark-theme.css`
Arquivo CSS completo com:
- Variáveis CSS para todas as cores
- Estilos globais
- Componentes (botões, cards, inputs, etc.)
- Animações e transições
- Utilities reutilizáveis

**Localização**: `/client/src/dark-theme.css`

### 2. Preview Interativo
Uma página React completa mostrando todos os componentes do tema.

**Localização**: `/client/src/pages/Home.tsx`

---

## 🚀 Como Integrar na Sua Aplicação Angular

### Passo 1: Copiar o CSS

1. Copie o arquivo `dark-theme.css` para seu projeto Angular:
   ```bash
   cp dark-theme.css src/assets/styles/
   ```

2. Importe o CSS no seu arquivo `styles.css` ou `styles.scss` global:
   ```css
   @import 'assets/styles/dark-theme.css';
   ```

### Passo 2: Atualizar o HTML

Adicione a classe `dark-theme` ao elemento `<body>` ou ao elemento raiz da sua aplicação:

```html
<body class="dark-theme">
  <app-root></app-root>
</body>
```

Ou no seu componente raiz:

```html
<div class="dark-theme">
  <router-outlet></router-outlet>
</div>
```

### Passo 3: Usar as Variáveis CSS

Nos seus componentes, use as variáveis CSS definidas:

```css
.meu-componente {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-lg);
}
```

### Passo 4: Aplicar Classes Utility

Use as classes utility fornecidas para estilização rápida:

```html
<!-- Texto -->
<p class="text-primary">Texto primário</p>
<p class="text-secondary">Texto secundário</p>
<p class="text-muted">Texto muted</p>

<!-- Backgrounds -->
<div class="bg-primary">Fundo primário</div>
<div class="bg-secondary">Fundo secundário</div>

<!-- Sombras -->
<div class="shadow-sm">Sombra pequena</div>
<div class="shadow-lg">Sombra grande</div>

<!-- Bordas -->
<div class="border-primary">Borda primária</div>
<div class="rounded-lg">Borda arredondada</div>
```

---

## 🎯 Componentes Principais

### Botões

```html
<!-- Primário -->
<button class="btn-primary">Clique aqui</button>

<!-- Secundário -->
<button class="btn-secondary">Clique aqui</button>

<!-- Sucesso -->
<button class="btn-success">Sucesso</button>

<!-- Perigo -->
<button class="btn-danger">Perigo</button>
```

### Cards

```html
<div class="card">
  <h3>Título do Card</h3>
  <p>Conteúdo do card</p>
</div>
```

### Badges

```html
<span class="badge-primary">Primária</span>
<span class="badge-success">Sucesso</span>
<span class="badge-warning">Aviso</span>
<span class="badge-danger">Perigo</span>
```

### Alertas

```html
<div class="alert alert-success">
  ✓ Operação realizada com sucesso!
</div>

<div class="alert alert-warning">
  ⚠ Verifique os dados antes de prosseguir
</div>

<div class="alert alert-danger">
  ✗ Erro ao processar a solicitação
</div>

<div class="alert alert-info">
  ℹ Esta é uma mensagem informativa
</div>
```

### Inputs

```html
<input type="text" placeholder="Digite algo..." />
<textarea placeholder="Digite uma mensagem..."></textarea>
<select>
  <option>Opção 1</option>
  <option>Opção 2</option>
</select>
```

### Tabelas

```html
<table>
  <thead>
    <tr>
      <th>Coluna 1</th>
      <th>Coluna 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Dado 1</td>
      <td>Dado 2</td>
    </tr>
  </tbody>
</table>
```

---

## 🎨 Customização

### Modificar Cores

Para customizar as cores, edite as variáveis CSS no início do arquivo `dark-theme.css`:

```css
:root {
  --color-primary: #6366f1; /* Altere aqui */
  --color-primary-dark: #4f46e5;
  --color-primary-light: #818cf8;
  /* ... mais cores ... */
}
```

### Adicionar Novas Variáveis

Você pode adicionar novas variáveis CSS conforme necessário:

```css
:root {
  --color-custom: #yourcolor;
  --spacing-custom: 2.5rem;
  --shadow-custom: 0 10px 30px rgba(0, 0, 0, 0.5);
}
```

### Modificar Espaçamento

Altere os valores de spacing conforme sua preferência:

```css
:root {
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
}
```

---

## 📐 Tipografia

### Hierarquia de Títulos

- **H1**: 36px, Bold - Títulos principais
- **H2**: 30px, Bold - Subtítulos
- **H3**: 24px, Bold - Seções
- **H4**: 20px, Bold - Subseções
- **H5**: 18px, Bold - Labels
- **H6**: 16px, Bold - Pequenos títulos

### Tamanhos de Texto

- **XS**: 12px - Labels e hints
- **SM**: 14px - Texto secundário
- **Base**: 16px - Texto padrão
- **LG**: 18px - Destaques
- **XL**: 20px - Títulos menores
- **2XL**: 24px - Títulos
- **3XL**: 30px - Títulos grandes
- **4XL**: 36px - Títulos principais

---

## ✨ Animações

### Classes de Animação

```html
<!-- Fade In -->
<div class="animate-fade-in">Conteúdo</div>

<!-- Slide In Up -->
<div class="animate-slide-in-up">Conteúdo</div>

<!-- Slide In Down -->
<div class="animate-slide-in-down">Conteúdo</div>

<!-- Pulse -->
<div class="animate-pulse">Conteúdo</div>
```

### Transições

Use as variáveis de transição para consistência:

```css
.meu-elemento {
  transition: all var(--transition-fast); /* 150ms */
  /* ou */
  transition: all var(--transition-base); /* 200ms */
  /* ou */
  transition: all var(--transition-slow); /* 300ms */
}
```

---

## 🔍 Acessibilidade

### Contraste de Cores

Todas as combinações de cores foram testadas para garantir contraste adequado (WCAG AA):

- Texto primário sobre fundo primário: ✓ Aprovado
- Texto secundário sobre fundo secundário: ✓ Aprovado
- Botões e links: ✓ Aprovado

### Focus Rings

Todos os elementos interativos têm focus rings visíveis:

```css
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### Responsividade

O tema é totalmente responsivo:

```css
@media (max-width: 768px) {
  /* Estilos para mobile */
}
```

---

## 🐛 Troubleshooting

### Problema: Cores não aparecem

**Solução**: Verifique se o arquivo CSS foi importado corretamente e se a classe `dark-theme` está aplicada ao elemento raiz.

### Problema: Textos invisíveis

**Solução**: Certifique-se de que está usando as classes de texto corretas (`text-primary`, `text-secondary`, etc.) em vez de cores hardcoded.

### Problema: Sombras não aparecem

**Solução**: Use as variáveis de sombra fornecidas (`shadow-sm`, `shadow-md`, `shadow-lg`) em vez de valores customizados.

### Problema: Animações muito rápidas/lentas

**Solução**: Ajuste as variáveis de transição:
```css
--transition-fast: 150ms;
--transition-base: 200ms;
--transition-slow: 300ms;
```

---

## 📊 Comparação: Antes vs Depois

### Antes (Tema Claro)
- Fundo branco (#ffffff)
- Texto escuro (#1a1a1a)
- Cores vibrantes e contrastantes
- Menos adequado para uso prolongado

### Depois (Tema Escuro)
- Fundo escuro (#0f172a)
- Texto claro (#f1f5f9)
- Cores sofisticadas e refinadas
- Reduz fadiga ocular
- Mais profissional

---

## 💡 Boas Práticas

1. **Use Variáveis CSS**: Sempre use as variáveis CSS em vez de valores hardcoded
2. **Mantenha Consistência**: Use as mesmas cores e espaçamentos em toda a aplicação
3. **Teste Acessibilidade**: Verifique o contraste de cores em ferramentas como WebAIM
4. **Responsive First**: Sempre teste em dispositivos móveis
5. **Performance**: Use classes utility em vez de CSS customizado quando possível

---

## 📞 Suporte

Se encontrar problemas ou tiver dúvidas:

1. Verifique se todos os arquivos foram copiados corretamente
2. Limpe o cache do navegador (Ctrl+Shift+Delete)
3. Verifique o console do navegador para erros
4. Certifique-se de que o CSS está sendo carregado (F12 > Network)

---

## 📝 Changelog

### v1.0.0 (2026-03-06)
- Lançamento inicial do tema escuro profissional
- Paleta de cores completa
- Componentes básicos
- Animações e transições
- Documentação completa

---

## 📄 Licença

Este tema é fornecido como está para uso em sua aplicação BID WTORRE.

---

**Desenvolvido com ❤️ para BID WTORRE**
