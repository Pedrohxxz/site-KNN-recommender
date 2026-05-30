# KNN Retail Recommender

Um sistema inteligente de recomendação de produtos para varejo, baseado em algoritmos de machine learning (KNN, K-Means e PCA). Processa dados de transações em CSV e fornece recomendações personalizadas com análise de segmentação de clientes.

##  Visão Geral

O **KNN Retail Recommender** é uma aplicação web que utiliza técnicas avançadas de análise de dados e machine learning para:

- **Recomendação de produtos** baseada em similaridade entre clientes (KNN - K-Nearest Neighbors)
- **Segmentação de clientes** em grupos homogêneos (K-Means)
- **Visualização em 2D** da distribuição de clientes (PCA - Principal Component Analysis)
- **Análise de dados** com limpeza automática e normalização L2
- **Mapeamento flexível** de colunas CSV para adaptação a diferentes formatos

##  Funcionalidades Principais

### 1. Upload e Processamento de Dados

- Suporte para upload de arquivos CSV de qualquer transação retail
- Detecção automática e inteligente de colunas (cliente, produto, quantidade, preço)
- Limpeza de dados com remoção automática de registros inválidos
- Normalização L2 dos vetores de compra

### 2. Sistema de Recomendação KNN

- Calcula similaridade de cosseno entre perfis de clientes
- Identifica 6 vizinhos mais próximos para cada cliente
- Recomenda produtos não adquiridos pelos vizinhos
- Scores ponderados pela distância (similaridade)
- Interface interativa para seleção de cliente e quantidade de recomendações

### 3. Segmentação com K-Means

- Agrupa clientes em 4 segmentos baseado em padrões de compra
- Inicialização inteligente dos centroides
- 40 iterações de otimização
- Análise de distribuição por segmento

### 4. Redução Dimensional com PCA

- Reduz dados de alta dimensão para visualização em 2D
- Power iteration para cálculo eficiente de componentes principais
- Visualiza distribuição espacial dos clientes
- Mantém até 800 amostras para renderização otimizada

### 5. Análise Exploratória

- Dashboard com 5 seções principais
- Resumo estatístico: linhas processadas, clientes, produtos, taxa de remoção
- Log detalhado do pré-processamento
- Visualizações com Chart.js (scatter plot, donut chart, bar charts)
- Top 5 produtos por segmento

##  Estrutura do Projeto

```
/site
├── index.html          # Estrutura HTML da aplicação
├── style.css          # Estilos CSS (tema dark moderno com acentos cyan/purple)
├── script.js          # Lógica JavaScript (algoritmos e interações)
└── README.md          # Este arquivo
```

### Organização de Código

**HTML (index.html)**

- 5 seções principais documentadas
- Modal para mapeamento de colunas
- Componentes reutilizáveis com classes CSS bem estruturadas
- Acessibilidade com labels apropriados

**CSS (style.css)**

- Design responsivo (breakpoints em 900px e 560px)
- Sistema de cores com CSS variables
- Efeitos visuais: blur, gradientes, transições suaves
- Grid layout para disposição de componentes

**JavaScript (script.js)**

- ~800 linhas de código bem documentado
- Funções puras para algoritmos matemáticos
- Event listeners para interação do usuário
- Processamento assíncrono com feedback visual

##  Algoritmos Utilizados

### K-Nearest Neighbors (KNN)

```
Para cada cliente:
1. Calcula distância de cosseno para todos os outros clientes
2. Seleciona 6 vizinhos mais próximos
3. Agrega produtos dos vizinhos ponderados pela similaridade
4. Filtra produtos já adquiridos pelo cliente
5. Retorna top-N produtos com maiores scores
```

### K-Means Clustering

```
1. Inicializa 4 centroides aleatoriamente
2. Para 40 iterações:
   a. Atribui cada ponto ao centroide mais próximo
   b. Recalcula centroide como média de seus pontos
   c. Repete até convergência
3. Gera labels de cluster para visualização
```

### Principal Component Analysis (PCA)

```
1. Calcula média dos dados
2. Centraliza os dados em torno da origem
3. Usa power iteration para encontrar PC1 (primeira componente)
4. Deflaciona dados para encontrar PC2 (segunda componente)
5. Projeta dados nos 2 primeiros componentes principais
```

### Normalização L2

```
Para cada cliente:
1. Calcula vetor de compras por produto
2. Normaliza: vetor = vetor / ||vetor||₂
3. Garante vetores unitários para cálculo de similaridade
```

## Como Usar

### Passo 1: Preparar o Dataset

Organize seus dados em um arquivo CSV com as seguintes colunas (nomes podem variar):

- **Cliente** (obrigatório): ID único do cliente
- **Produto** (obrigatório): Nome ou código do produto
- **Quantidade** (opcional): Quantidade comprada
- **Preço** (opcional): Valor unitário ou total

Exemplo:

```csv
customer_id,product_name,quantity,price
C001,Notebook,1,2500.00
C001,Mouse,2,50.00
C002,Notebook,1,2500.00
C002,Keyboard,1,150.00
```

### Passo 2: Upload do Arquivo

1. Abra a aplicação no navegador
2. Clique em "Selecionar arquivo CSV" ou arraste o arquivo
3. A detecção automática identificará as colunas

### Passo 3: Mapear Colunas

O sistema sugerirá automaticamente o mapeamento, mas você pode:

- Selecionar manualmente cada coluna
- Indicar quais campos são obrigatórios e opcionais
- Escolher modo de quantidade: binário ou por preço

### Passo 4: Análise e Resultados

Após confirmação:

1. **Seção 02** - Resumo do dataset e estatísticas
2. **Seção 03** - Digite cliente e quantidade, clique em "Recomendar"
3. **Seção 04** - Visualize segmentação em 2D e distribuição
4. **Seção 05** - Analise top 5 produtos por segmento

## 🛠️ Tecnologias

| Tecnologia        | Função                              |
| ----------------- | ----------------------------------- |
| HTML5             | Estrutura semântica                 |
| CSS3              | Styling responsivo com Grid/Flexbox |
| JavaScript (ES6+) | Lógica, algoritmos e interações     |
| PapaParse         | Parse eficiente de CSV              |
| Chart.js          | Visualização de gráficos            |
| Fonts do Google   | Tipografia (Syne, DM Sans, DM Mono) |

## Fluxo de Processamento

```
1. Upload CSV
   ↓
2. Detecção de Colunas
   ↓
3. Mapeamento Manual (se necessário)
   ↓
4. Parse e Limpeza
   ├─ Remove registros sem cliente
   ├─ Remove registros sem produto
   ├─ Remove quantidade/preço ≤ 0
   ↓
5. Construção da Matriz Cliente-Produto
   ↓
6. Normalização L2
   ↓
7. Treinamento KNN (embedding)
   ↓
8. K-Means (4 clusters)
   ↓
9. PCA 2D
   ↓
10. Renderização de Resultados
    ├─ Estatísticas
    ├─ KNN interface
    ├─ Scatter plot + Donut
    └─ Top produtos por segmento
```

## Design e UX

### Tema Visual

- **Paleta de cores**: Dark mode com acentos cyan (#00e5ff), purple (#7c3aed), amber (#f59e0b), emerald (#10b981)
- **Tipografia**: Syne (títulos), DM Sans (corpo), DM Mono (dados numéricos)
- **Responsividade**: Adaptável para desktop, tablet e mobile

### Componentes

- Cards com borders suaves e gradientes
- Modal overlay para mapeamento de colunas
- Sliders interativos para seleção de parâmetros
- Progress bar com steps animados
- Tooltips informativos

## 📈 Exemplo de Saída

### Estatísticas

```
Linhas originais: 10.000
Clientes únicos: 1.250
Produtos únicos: 480
Linhas utilizadas: 9.850 (98.5%)
Removidas: 150
```

### Recomendação

```
Cliente: C001
Recomendações: 5

1. Monitor 4K        | Score: 0.87
2. Headset Gamer     | Score: 0.82
3. Webcam HD         | Score: 0.75
4. Hub USB-C         | Score: 0.71
5. Mousepad Gamer    | Score: 0.68
```

## Detalhes Técnicos

### Detecção Automática de Colunas

O sistema utiliza heurísticas com palavras-chave em português e inglês:

- **Cliente**: customerid, customer_id, cliente, user_id, etc.
- **Produto**: description, product, item, produto, nome, etc.
- **Quantidade**: quantity, qty, qtd, quant, amount, etc.
- **Preço**: unitprice, price, valor, preço, cost, etc.

### Complexidade Computacional

- Parse: O(n) onde n = número de linhas
- Limpeza: O(n)
- Matriz: O(n × m) onde m = produtos
- KNN: O(c² × m) onde c = clientes (com aproximação de 6 vizinhos)
- K-Means: O(k × i × c × m) onde k=4, i=40
- PCA: O(sample × iterations × m) com power iteration

### Performance

- Até 10.000 linhas: < 2 segundos
- Até 50.000 linhas: 2-5 segundos
- Amostragem automática para PCA em datasets grandes

## Segurança e Privacidade

- Processamento **100% no cliente** (navegador)
- Nenhum dado é enviado para servidores externos
- Arquivos não são armazenados
- Sessão limpa ao recarregar a página

## Requisitos

### Navegador

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Suporta JavaScript ES6+

### Sistema

- Sem requisitos de servidor backend
- Pode ser servido por qualquer servidor HTTP estático
- Tamanho total: < 50KB (HTML + CSS + JS)

## Deployment

### Local

```bash
# Simples servidor HTTP
python -m http.server 8000
# ou
npx http-server
```

### Produção

- Deploy em qualquer plataforma estática (GitHub Pages, Netlify, Vercel, etc.)
- Não requer build process

## Referências e Estudos

- **KNN**: Métrica de similaridade baseada em cosseno
- **K-Means**: Lloyd's algorithm com inicialização aleatória
- **PCA**: Power iteration method para autovalores
- **Normalização**: L2 norm (Euclidean normalization)

## Informações do Projeto

- **Autor**: Pedro / UNIFACS
- **Tema**: A3 - Inteligência Artificial
- **Data**: Maio 2026
- **Status**: Completo e funcional

## Suporte

Para dúvidas ou sugestões sobre o projeto, consulte a documentação inline no código ou analise o console do navegador para mensagens de debug.

---