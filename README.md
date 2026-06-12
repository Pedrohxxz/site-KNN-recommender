# KNN Retail Recommender

Um sistema inteligente de recomendação de produtos para varejo, baseado em algoritmos de machine learning (KNN, K-Means e PCA). Processa dados de transações em CSV e fornece recomendações personalizadas com análise de segmentação de clientes.

## Visão Geral

O **KNN Retail Recommender** é uma aplicação web que utiliza técnicas avançadas de análise de dados e machine learning para:

- **Recomendação de produtos** baseada em similaridade entre clientes (KNN - K-Nearest Neighbors)
- **Segmentação de clientes** em grupos homogêneos (K-Means)
- **Visualização em 2D** da distribuição de clientes (PCA - Principal Component Analysis)
- **Análise de dados** com limpeza automática e normalização L2
- **Mapeamento flexível** de colunas CSV para adaptação a diferentes formatos

## Funcionalidades Principais

### 1. Upload e Processamento de Dados

- Suporte para upload de arquivos CSV de qualquer transação retail
- Detecção automática e inteligente de colunas (cliente, produto, quantidade, preço)
- Limpeza de dados com remoção automática de registros inválidos
- Normalização L2 dos vetores de compra

### 2. Sistema de Recomendação KNN com Co-Ocorrência

- Calcula similaridade de cosseno entre perfis de clientes
- Identifica os 6 vizinhos mais próximos para cada cliente
- **Nova funcionalidade: Matriz de co-ocorrência** produto × produto
  - Registra quantos clientes compraram cada par de produtos
  - Aumenta scores para produtos frequentemente comprados juntos
- Recomenda produtos não adquiridos pelos vizinhos
- Scores ponderados pela distância (vizinho) + co-ocorrência (0.3 × peso cooc)
- Interface interativa para seleção de cliente e quantidade de recomendações

### 3. Segmentação com K-Means

- Agrupa clientes em **5 segmentos** baseado em padrões de compra
- Inicialização inteligente dos centroides
- 40 iterações de otimização com Lloyd's algorithm
- Análise de distribuição por segmento

### 4. Redução Dimensional com PCA

- Reduz dados de alta dimensão para visualização em 2D
- **Power iteration method** para cálculo eficiente de componentes principais
  - Calcula PC1 (primeira componente) com 20 iterações
  - Deflaciona dados e calcula PC2 (segunda componente)
- Visualiza distribuição espacial dos clientes
- Amostra até 800 clientes automaticamente para renderização otimizada

### 5. Análise Exploratória

- Dashboard com 5 seções principais
- Resumo estatístico: linhas processadas, clientes, produtos, taxa de remoção
- Log detalhado do pré-processamento
- Visualizações com Chart.js (scatter plot, donut chart, bar charts)
- Top 5 produtos por segmento

## Estrutura do Projeto

```
/site
├── index.html          # Estrutura HTML da aplicação (5 seções)
├── Styles.css          # Estilos CSS (tema dark moderno com acentos cyan/purple)
├── App.js              # Lógica JavaScript (algoritmos e interações)
└── README.md           # Este arquivo
```

### Organização de Código

**HTML (index.html)**

- 5 seções principais documentadas (Upload → Stats → KNN → Segmentação → Top Produtos)
- Modal para mapeamento de colunas com detecção automática
- Componentes reutilizáveis com classes CSS bem estruturadas
- Acessibilidade com labels apropriados

**CSS (Styles.css)**

- Design responsivo (adaptável para desktop, tablet e mobile)
- Sistema de cores com CSS variables (tema dark com gradientes)
- Efeitos visuais: blur, gradientes, transições suaves, animações
- Grid layout e Flexbox para disposição de componentes
- ~400 linhas de código bem estruturado

**JavaScript (App.js)**

- ~700 linhas de código bem documentado
- Funções puras para algoritmos matemáticos (KNN, K-Means, PCA, Normalização L2)
- Detecção heurística de colunas com suporte multilíngue (PT-BR/EN)
- Matriz de co-ocorrência para recomendações aprimoradas
- Event listeners para interação do usuário com feedback visual
- Processamento assíncrono com progress bar animado

## Algoritmos Utilizados

### K-Nearest Neighbors (KNN) com Co-Ocorrência

```
1. Constrói matriz binária cliente × produto (1 = comprou, 0 = não comprou)
2. Calcula matriz de co-ocorrência: cooc = binaryMatrix.T @ binaryMatrix
   - cooc[i][j] = número de clientes que compraram produto i E produto j
3. Para cada cliente:
   a. Calcula similaridade (distância de cosseno) para todos os outros clientes
   b. Seleciona 6 vizinhos mais próximos
   c. Para cada vizinho, itera sobre produtos não comprados pelo cliente:
      - peso_vizinho = 1 / (rank + 1)
      - peso_cooc = soma(cooc[produto, p] para cada p comprado pelo cliente)
      - score = peso_vizinho + 0.3 × peso_cooc
   d. Filtra produtos já adquiridos pelo cliente
   e. Retorna top-N produtos ordenados por score descendente
```

### K-Means Clustering (5 Clusters)

```
1. Inicializa 5 centroides distribuídos no espaço amostral
2. Para 40 iterações (Lloyd's algorithm):
   a. Atribui cada cliente ao centroide mais próximo (distância euclidiana)
   b. Recalcula cada centroide como média dos seus clientes
   c. Verifica convergência
3. Gera labels de cluster (0-4) para visualização e análise de segmentos
```

### Principal Component Analysis (PCA) - Power Iteration

```
1. Calcula média dos dados e centraliza em torno da origem
2. Power iteration para PC1 (20 iterações):
   a. Inicializa vetor aleatório v
   b. Itera: v = (A.T @ A) @ v, v = v / ||v||
   c. Converge para autovetor de maior autovalor
3. Deflaciona dados: A_deflated = A - λ₁ × PC1 ⊗ PC1.T
4. Power iteration para PC2 (20 iterações) na matriz deflacionada
5. Projeta dados nos 2 primeiros componentes principais para visualização
```

### Normalização L2 (Euclidean Normalization)

```
Para cada cliente:
1. Calcula vetor de compras por produto (quantidade ou binário)
2. Normaliza: vetor = vetor / ||vetor||₂
3. Garante todos os vetores com norma = 1
4. Permite cálculo de similaridade por produto escalar (dot product = cosine similarity)
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
   ├─ Matriz binária: comprou (1) ou não (0)
   ├─ Matriz de co-ocorrência: frequência de produtos comprados juntos
   ↓
6. Normalização L2
   ↓
7. Treinamento KNN com Co-Ocorrência
   ├─ Cálculo de similaridade cosseno
   ├─ Matriz de co-ocorrência produto × produto
   ↓
8. K-Means (5 clusters)
   ↓
9. PCA 2D (Power Iteration)
   ↓
10. Renderização de Resultados
    ├─ Estatísticas
    ├─ KNN interface com scores ponderados
    ├─ Scatter plot (PCA) + Donut (distribuição)
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
- Matriz Binária e Co-ocorrência: O(n + c × p²) onde c = clientes, p = produtos
- Normalização L2: O(c × p)
- KNN: O(c² × p) com similaridade cosseno + co-ocorrência O(n vizinhos × p)
- K-Means: O(k × i × c × p) onde k=5 clusters, i=40 iterações
- PCA: O(p² × sample × 20 + deflate) com power iteration

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

- **KNN + Co-ocorrência**: Recomendação híbrida combinando similaridade cosseno com matriz de co-compra
- **K-Means**: Lloyd's algorithm com 5 clusters e 40 iterações
- **PCA**: Power iteration method para cálculo eficiente de componentes principais
- **Normalização L2**: Euclidean normalization para vetores unitários
- **Matriz de Co-Ocorrência**: binaryMatrix.T @ binaryMatrix para capturar padrões de compra conjunta

## Informações do Projeto

- **Autores**: Pedro Oliveira / Pedro Fernandes / Felipe Borges UNIFACS
- **Tema**: A3 - Inteligência Artificial
- **Data**: Maio 2026
- **Status**: Completo e funcional

## Suporte

Para dúvidas ou sugestões sobre o projeto, consulte a documentação inline no código ou analise o console do navegador para mensagens de debug.

---
