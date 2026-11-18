# Análise do produto: o guia consegue ensinar uma voz a uma IA?

Data: 18 de novembro de 2026. Versão analisada: `d488a40` (primeira versão).

## Veredito

O produto ensina muito bem o que é uma voz, mas o guia que ele exporta descreve a voz da ferramenta, não a da marca. Tudo no guia sai das frases prontas do próprio produto e nada sai da marca.

Para uma inteligência artificial (IA) escrever no estilo, a maior mudança é inverter isso: os textos reais da marca viram o centro, e os controles viram o ajuste.

## O que manter

- A tese: regra verificável e exemplo valem mais que adjetivo.
- A escada de 5 degraus, com a mesma mensagem em cada nível.
- "A voz fica, o tom muda" por situação.
- O medidor de regras verificáveis.

## Os problemas, do mais grave ao menos

### 1. Os exemplos são de outra empresa

Mais da metade do guia (52% das palavras) são exemplos sobre o relatório mensal de uma financeira fictícia. Uma "Padaria Flor" recebe um guia que cita o próprio nome 2 vezes e relatório, pagamento e boleto 23 vezes.

Exemplo é o que o modelo mais imita, então ele tende a repetir esse formato (saudação, quatro parágrafos curtos, chamada no fim) em tudo.

### 2. Os textos reais são jogados fora

O diagnóstico lê os textos aprovados da marca, transforma em 7 números e descarta o resto (`js/app.js:393`). Eles eram o melhor material que o guia podia ter.

### 3. O teste com o Claude é viciado

Ele pede as mesmas três situações cujos exemplos já estão no guia (`js/app.js:330`). Não mostra se o guia funciona num pedido novo.

### 4. O guia fala com uma pessoa, não com o modelo

- Diz "energia +1 (vira 4)" sem explicar o que é o 4. O guia só traz a regra do nível base.
- O recado "rascunhos, revise antes de usar" vai junto e desautoriza os exemplos.
- Pede uma meta de legibilidade que o modelo não consegue calcular enquanto escreve.
- Mistura duas línguas no mesmo guia.
- Dá a um eixo neutro o mesmo espaço do eixo que define a voz.

### 5. Exemplo que contradiz a regra

Em 3.000 vozes sorteadas, 52% exportam um guia com algum exemplo que o próprio medidor reprova, quase sempre por frase acima do limite. Com frase curta, são 967 de 977. Os personagens prontos e a configuração inicial passam.

Quando regra e exemplo discordam, o modelo tende a seguir o exemplo.

### 6. Falta onde a voz mora

Não há campo para o que a marca faz e para quem, no que acredita, como abre e fecha um texto, ou o que nunca faz. As situações são fixas.

## O que fazer

| # | Sugestão | O que muda | Esforço de trabalho |
|---|---|---|---|
| 1 | Textos reais viram os exemplos do guia, marcados por situação. Sem textos, gerar rascunhos sobre o negócio da marca e pedir aprovação | O guia passa a ser da marca | Baixo a médio |
| 2 | Reescrever o guia para o modelo: contraste com os degraus vizinhos ("assim, não assim"), situações por extenso, uma língua só, traços marcantes primeiro | Menos ruído, regras que dá para seguir | Baixo |
| 3 | Testar com pedidos novos, escritos pelo usuário, e passar o resultado por um diagnóstico às cegas | Uma nota real: "o guia transmitiu 5 de 7 eixos" | Médio |
| 4 | Aprovar ou reprovar com motivo: aprovado vira exemplo, reprovado vira "assim não" | O guia melhora com o uso | Médio |
| 5 | Campos novos: negócio e leitor, crenças, abertura e fecho, "nunca fazemos", pares de palavras, situações próprias | Captura o que os controles não captam | Médio |
| 6 | Diagnóstico que extrai as manias da marca, não só números | Regras específicas em vez de genéricas | Baixo |
| 7 | Exportar o medidor junto, como verificador que a IA roda no próprio texto | A IA confere antes de entregar | Médio |

**Ordem recomendada:** começar por 1 e 2. São baratos e consertam o guia em si. Depois 3 e 4, que fazem a ferramenta melhorar com o uso em vez de só gerar um guia.

**Onde parar de investir:** no motor de frases prontas (`js/scenes-pt.js` e `js/scenes-en.js`). Ele é cerca de um terço do código e não cresce para outros negócios. Serve bem como demonstração sem chave, e só.

## Modelo e esforço do Claude para implementar cada ponto

A lógica: modelo mais forte onde o resultado depende da qualidade da escrita ou de uma decisão de desenho; modelo mais barato onde o trabalho é tela e formulário. O repositório é pequeno, então `xhigh` não é necessário em nenhum ponto.

| # | Ponto | Modelo | Esforço | Por quê |
|---|---|---|---|---|
| 1 | Textos reais como exemplos | Opus 5.5 | `high` | Mexe no estado, na tela e no guia ao mesmo tempo |
| 2 | Reescrever o guia para o modelo | Fable | `high` | Pouco código; o que vale é a qualidade do texto do guia, que é o coração do produto |
| 3 | Teste com pedidos novos e diagnóstico às cegas | Opus 5.5 | `high` | Recurso novo; é preciso desenhar como comparar o resultado com os controles |
| 4 | Aprovar ou reprovar com motivo | Sonnet 5.5 | `medium` | Tela e estado, trabalho previsível |
| 5 | Campos novos | Sonnet 5.5 | `medium` | Formulário e novas seções do guia |
| 6 | Diagnóstico que extrai manias | Fable | `high` | De novo, o trabalho é escrever boas instruções para um modelo |
| 7 | Exportar o medidor como verificador | Sonnet 5.5 | `medium` | Empacotar código que já existe |

Para as chamadas que o próprio produto faz ao Claude, o que já está no código serve: Opus 5.5, esforço `low` para escrever e `medium` para diagnosticar. O teste às cegas do ponto 3 usa o mesmo do diagnóstico.

## Como os números foram medidos

- Rodando o próprio código do repositório (`buildGuide`, `composeText`, `measure`), sem chamar o Claude.
- "52% das palavras": guia da configuração inicial, cerca de 1.000 palavras, das quais 523 estão na seção de exemplos.
- "3.000 vozes sorteadas": fundação, eixos e acabamento sorteados de forma uniforme; 6 textos por voz (3 situações, 2 línguas), os mesmos que o guia exporta. Dos 18.000 textos, 5.233 (29%) falharam em alguma regra: frases acima do limite (4.219), legibilidade (648), ritmo (309) e informalidade (230). Um mesmo texto pode falhar em mais de uma.
- Nenhum teste foi feito com o Claude de verdade. O que se diz aqui sobre como o modelo reage ao guia vem da leitura do guia e do comportamento conhecido dos modelos, não de medição.
