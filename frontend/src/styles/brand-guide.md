# 🎨 OmniFy HUB - Guia de Identidade Visual

## 📋 Conceito

**OmniFy HUB** representa:
- **OMNI** = Universal, onipresente, conectividade total
- **FY** = Transformação digital (like Spotify, Shopify)
- **HUB** = Centro de conexões, núcleo inteligente

A identidade visual é **futurística e cyberpunk**, transmitindo tecnologia avançada, inovação e inteligência artificial.

---

## 🎨 Paleta de Cores

### Cores Principais (Brand Colors)

| Nome | Hex | HSL | Uso |
|------|-----|-----|-----|
| **Cyan Neon** | `#00F0FF` | `184 100% 50%` | Primária, CTAs, destaques |
| **Cyan Dim** | `#00B8C4` | `184 100% 38%` | Hover states, secundário |
| **Magenta** | `#9D00FF` | `277 100% 50%` | Acentos, gradientes |
| **Magenta Dim** | `#7B00C7` | `277 100% 39%` | Hover states |
| **Neon Green** | `#00FF9D` | `157 100% 50%` | Sucesso, online status |
| **Electric Orange** | `#FF6B00` | `25 100% 50%` | Alertas, notificações |
| **Gold** | `#FFD700` | `51 100% 50%` | Premium, especial |

### Dark Mode (Default)

| Elemento | Cor | Hex |
|----------|-----|-----|
| Background | Deep Space | `#050810` |
| Card | Dark Surface | `#0D1220` |
| Sidebar | Darker | `#0A0E1A` |
| Text Primary | Ice White | `#E8F4F8` |
| Text Muted | Gray Blue | `#7A8BA8` |
| Border | Cyan Glass | `rgba(0,240,255,0.15)` |

### Light Mode

| Elemento | Cor | Hex |
|----------|-----|-----|
| Background | Soft Gray | `#F0F4F8` |
| Card | Pure White | `#FFFFFF` |
| Sidebar | White | `#FFFFFF` |
| Text Primary | Dark Blue | `#0A1628` |
| Text Muted | Steel Gray | `#546A7B` |
| Border | Cyan Glass | `rgba(0,145,168,0.2)` |
| Primary (Light) | Deep Cyan | `#0091A8` |

---

## 🔤 Tipografia

### Fontes

| Tipo | Fonte | Uso |
|------|-------|-----|
| **Display** | Orbitron | Títulos, logo, headings |
| **Body** | Exo 2 | Texto principal, UI |
| **Mono** | JetBrains Mono | Código, dados técnicos |

### Hierarquia

```css
h1 { font-family: 'Orbitron'; font-weight: 700; letter-spacing: 0.02em; }
h2 { font-family: 'Orbitron'; font-weight: 600; letter-spacing: 0.02em; }
body { font-family: 'Exo 2'; font-weight: 400; }
code { font-family: 'JetBrains Mono'; }
```

---

## 🌈 Gradientes

### Gradient Primary (Omni Gradient)
```css
background: linear-gradient(135deg, #00F0FF 0%, #9D00FF 50%, #FF6B00 100%);
```

### Gradient Cyber
```css
background: linear-gradient(135deg, #00F0FF 0%, #00FF9D 100%);
```

### Gradient Energy
```css
background: linear-gradient(135deg, #9D00FF 0%, #FF6B00 100%);
```

### Gradient Glow
```css
background: radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, transparent 70%);
```

---

## ✨ Efeitos Visuais

### Neon Glow
```css
box-shadow: 
  0 0 5px var(--omni-cyan),
  0 0 10px var(--omni-cyan),
  0 0 20px rgba(0, 240, 255, 0.4);
```

### Glass Effect (Glassmorphism)
```css
background: rgba(13, 18, 32, 0.8);
backdrop-filter: blur(20px);
border: 1px solid rgba(0, 240, 255, 0.1);
```

### Futuristic Card
```css
background: linear-gradient(145deg, rgba(13, 18, 32, 0.9), rgba(10, 14, 26, 0.95));
border: 1px solid rgba(0, 240, 255, 0.1);
box-shadow: 
  0 4px 24px rgba(0, 0, 0, 0.4),
  inset 0 1px 0 rgba(255, 255, 255, 0.05);
```

---

## 🔵 Logo

### Elementos do Logo

1. **Anéis Concêntricos** - Representam conectividade omnichannel
   - Anel externo: Cyan (#00F0FF)
   - Anel médio: Magenta (#9D00FF)
   - Anel interno: Green (#00FF9D)

2. **Núcleo Central** - Representa o HUB
   - Gradiente multicolorido pulsante
   - Efeito de glow

3. **Linhas de Conexão** - Representam fluxo de dados
   - Verticais e horizontais em cyan/magenta

### Tipografia do Logo
```
OMNI - Cor: #00F0FF (Cyan)
FY   - Gradiente: #9D00FF → #FF6B00
HUB  - Cor: #9D00FF (70% opacity)
```

---

## 📐 Border Radius

| Tamanho | Valor |
|---------|-------|
| Small | `8px` |
| Medium | `10px` |
| Large | `12px` |

---

## 🎬 Animações

### Pulse Glow
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 5px var(--omni-cyan), 0 0 10px var(--omni-cyan); }
  50% { box-shadow: 0 0 10px var(--omni-cyan), 0 0 20px var(--omni-cyan), 0 0 30px var(--omni-cyan); }
}
```

### Float
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

### Spin Slow (Logo rings)
```css
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## 📱 Responsividade

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## ✅ Do's and Don'ts

### ✅ Faça
- Use gradientes para destacar elementos importantes
- Mantenha contraste alto entre texto e fundo
- Use efeitos de glow com moderação
- Siga a hierarquia de cores

### ❌ Não Faça
- Não misture todas as cores neon em um só elemento
- Não use fontes diferentes das definidas
- Não remova o backdrop blur dos cards
- Não use cores fora da paleta definida

---

## 🛠️ Classes Utilitárias

```css
.gradient-text      /* Texto com gradiente primário */
.gradient-text-cyber /* Texto com gradiente cyan-green */
.neon-glow          /* Efeito neon cyan */
.neon-glow-magenta  /* Efeito neon magenta */
.neon-border        /* Borda com glow */
.glass              /* Efeito glassmorphism */
.futuristic-card    /* Card estilizado */
.cyber-button       /* Botão com efeito futurístico */
.grid-pattern       /* Background com grid */
.pulse-glow         /* Animação de pulso */
.scrollbar-thin     /* Scrollbar customizada */
```

---

## 📦 Componentes

### OmnifyLogo
```tsx
import { OmnifyLogo } from '@/components/OmnifyLogo'

<OmnifyLogo 
  size="sm" | "md" | "lg"
  collapsed={boolean}
  showText={boolean}
  animated={boolean}
/>
```

---

*OmniFy HUB - Conectando o Futuro* ✨

